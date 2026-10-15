const crypto=require('node:crypto');
const express=require('express');
const {csrfToken,validToken}=require('./security');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const capability=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function validateSubscription(s){
 if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048)throw Error('Invalid subscription.');
 const u=new URL(s.endpoint),allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!allowed.includes(u.hostname))throw Error('Unsupported push provider.');
 for(const [k,n]of [['p256dh',65],['auth',16]]){const v=s.keys?.[k];if(typeof v!=='string'||!/^[A-Za-z0-9_-]+={0,2}$/.test(v)||Buffer.from(v,'base64url').length!==n)throw Error('Invalid push keys.');}
 if(Buffer.from(s.keys.p256dh,'base64url')[0]!==4)throw Error('Invalid public key.');
 return {endpoint:u.href,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
function createWebPush({db,env=process.env,version=require('../package.json').version,send,now=()=>Date.now()}){
 db.exec(`CREATE TABLE IF NOT EXISTS push_devices(id INTEGER PRIMARY KEY,scope TEXT NOT NULL,endpoint TEXT NOT NULL UNIQUE,subscription TEXT NOT NULL,token_hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS push_releases(version TEXT PRIMARY KEY,commit_sha TEXT NOT NULL,deployment_id TEXT NOT NULL,confirmed_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS push_deliveries(device_id INTEGER NOT NULL,version TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,code TEXT,PRIMARY KEY(device_id,version));
 CREATE TABLE IF NOT EXISTS push_tests(id INTEGER PRIMARY KEY,device_id INTEGER NOT NULL,created_at INTEGER NOT NULL,due_at INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'queued');`);
 const configured=()=>Boolean(env.WEB_PUSH_PUBLIC_KEY&&env.WEB_PUSH_PRIVATE_KEY&&env.WEB_PUSH_SUBJECT&&env.WEB_PUSH_RELEASE_TOKEN);
 function identity(scope){
  if(scope==='/')return {name:'GearHub',url:'/#app-update',icon:'/app-icon.png'};
  const match=typeof scope==='string'&&scope.match(/^\/shops\/([a-z0-9-]+)\/$/);if(!match||env.PLATFORM_ENABLED!=='true')return null;
  const shop=db.prepare('SELECT * FROM platform_shops WHERE slug=? AND legacy=0').get(match[1]);if(!shop)return null;
  if(!require('./platform-model').permissions(db,shop).permissions.selling||db.prepare('SELECT status FROM platform_users WHERE id=?').get(shop.owner_id)?.status!=='active')return null;
  const a=JSON.parse(shop.settings).appearance||{};return {name:String(a.brandName||shop.name).slice(0,100),url:scope+'#app-update',icon:scope+'app-icon-192.png'};
 }
 function subscribe(scope,token,raw){
  if(!identity(scope)||!capability(token))throw Error('Invalid shop or device.');const sub=validateSubscription(raw),old=db.prepare('SELECT * FROM push_devices WHERE endpoint=?').get(sub.endpoint);
  if(old&&(old.token_hash!==hash(token)||old.scope!==scope))throw Error('Subscription belongs to another installation.');
  if(!old&&db.prepare('SELECT count(*) n FROM push_devices').get().n>=10000)throw Error('Push registration capacity reached.');
  db.transaction(()=>{db.prepare('UPDATE push_devices SET enabled=0 WHERE scope=? AND token_hash=?').run(scope,hash(token));db.prepare(`INSERT INTO push_devices(scope,endpoint,subscription,token_hash,created_at) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription,enabled=1`).run(scope,sub.endpoint,JSON.stringify(sub),hash(token),now());}).immediate();
 }
 function disable(scope,token){if(!capability(token))throw Error('Invalid device.');db.prepare('UPDATE push_devices SET enabled=0 WHERE scope=? AND token_hash=?').run(scope,hash(token));}
 function state(scope,token){return capability(token)&&Boolean(db.prepare('SELECT 1 FROM push_devices WHERE scope=? AND token_hash=? AND enabled=1').get(scope,hash(token)));}
 function confirm({releaseVersion,commit,deploymentId}){
  if(!configured()||releaseVersion!==version||!env.RENDER_GIT_COMMIT||commit!==env.RENDER_GIT_COMMIT||!/^dep-[a-z0-9]+$/.test(deploymentId||''))throw Error('Release does not match the running deployment.');
  db.transaction(()=>{const old=db.prepare('SELECT * FROM push_releases WHERE version=?').get(version);if(old){if(old.commit_sha!==commit)throw Error('Version already announced for another commit.');return;}
   db.prepare('INSERT INTO push_releases VALUES(?,?,?,?)').run(version,commit,deploymentId,now());
   db.prepare("INSERT INTO push_deliveries(device_id,version) SELECT id,? FROM push_devices WHERE enabled=1").run(version);
  }).immediate();return {ok:true};
 }
 let working=false;
 async function deliver(){if(working||!configured())return;working=true;try{
  // Retry only a previously confirmed release of this exact running build; never announce on restart.
  const release=db.prepare('SELECT * FROM push_releases WHERE version=? AND commit_sha=?').get(version,env.RENDER_GIT_COMMIT||'');if(!release)return;
  const rows=db.prepare("SELECT q.*,d.scope,d.subscription,d.enabled FROM push_deliveries q JOIN push_devices d ON d.id=q.device_id WHERE q.version=? AND q.state IN ('queued','retry','sending') AND q.next_at<=? AND q.attempts<5 ORDER BY q.next_at LIMIT 25").all(version,now());
  for(const row of rows){const id=identity(row.scope);if(!row.enabled||!id||now()-release.confirmed_at>7*86400000){db.prepare("UPDATE push_deliveries SET state='cancelled' WHERE device_id=? AND version=?").run(row.device_id,version);continue;}
   db.prepare("UPDATE push_deliveries SET state='sending',attempts=attempts+1,next_at=? WHERE device_id=? AND version=?").run(now()+300000,row.device_id,version);
   try{const subscription=validateSubscription(JSON.parse(row.subscription));const payload={type:'app-update',version,title:id.name+' · Update အသစ်ရပါပြီ',body:'Version '+version+' — Settings → Update app',url:id.url,icon:id.icon,tag:'gearhub-update-'+version};
    const transport=send||require('web-push').sendNotification;await transport(subscription,JSON.stringify(payload),{TTL:86400,urgency:'normal',topic:hash(row.scope+version).slice(0,32),timeout:10000,vapidDetails:{subject:env.WEB_PUSH_SUBJECT,publicKey:env.WEB_PUSH_PUBLIC_KEY,privateKey:env.WEB_PUSH_PRIVATE_KEY}});
    db.prepare("UPDATE push_deliveries SET state='sent',code=NULL WHERE device_id=? AND version=?").run(row.device_id,version);
   }catch(e){const code=Number(e.statusCode)||0,expired=[404,410].includes(code),retry=!expired&&(code===0||code===429||code>=500)&&row.attempts<4;
    if(expired)db.prepare('UPDATE push_devices SET enabled=0 WHERE id=?').run(row.device_id);
    db.prepare('UPDATE push_deliveries SET state=?,code=?,next_at=? WHERE device_id=? AND version=?').run(expired?'expired':retry?'retry':'failed',String(code||'transport'),now()+Math.min(3600000,60000*2**row.attempts),row.device_id,version);
    // Do not log endpoints, keys, provider bodies, or customer data.
   }
  }
 }finally{working=false;}}
 function queueTest(scope,token){
  if(!capability(token)||!db.prepare('SELECT 1 FROM push_releases WHERE version=? AND commit_sha=?').get(version,env.RENDER_GIT_COMMIT||''))throw Error('Release not confirmed live.');
  const device=db.prepare('SELECT id FROM push_devices WHERE scope=? AND token_hash=? AND enabled=1').get(scope,hash(token));if(!device||!identity(scope))throw Error('Device not enabled.');
  const old=db.prepare('SELECT id FROM push_tests WHERE device_id=? AND created_at>?').get(device.id,now()-600000);if(old)throw Error('Wait ten minutes before another test.');
  db.prepare('INSERT INTO push_tests(device_id,created_at,due_at) VALUES(?,?,?)').run(device.id,now(),now()+30000);return {ok:true,delaySeconds:30};
 }
 async function deliverTests(){
  if(!configured()||!db.prepare('SELECT 1 FROM push_releases WHERE version=? AND commit_sha=?').get(version,env.RENDER_GIT_COMMIT||''))return;
  const rows=db.prepare("SELECT t.*,d.scope,d.subscription,d.enabled FROM push_tests t JOIN push_devices d ON d.id=t.device_id WHERE t.state='queued' AND t.due_at<=? LIMIT 10").all(now());
  for(const row of rows){const id=identity(row.scope);const claimed=db.prepare("UPDATE push_tests SET state='sending' WHERE id=? AND state='queued'").run(row.id);if(!claimed.changes)continue;
   if(!row.enabled||!id||now()-row.created_at>300000){db.prepare("UPDATE push_tests SET state='cancelled' WHERE id=?").run(row.id);continue;}
   try{const transport=send||require('web-push').sendNotification;await transport(validateSubscription(JSON.parse(row.subscription)),JSON.stringify({type:'app-update',version,title:id.name+' · Test notification',body:'ဤ device အတွက်သာ စမ်းသပ်မှု — Settings → Update app',url:id.url,icon:id.icon}),{TTL:120,urgency:'normal',timeout:10000,vapidDetails:{subject:env.WEB_PUSH_SUBJECT,publicKey:env.WEB_PUSH_PUBLIC_KEY,privateKey:env.WEB_PUSH_PRIVATE_KEY}});db.prepare("UPDATE push_tests SET state='sent' WHERE id=?").run(row.id);}catch(e){if([404,410].includes(e.statusCode))db.prepare('UPDATE push_devices SET enabled=0 WHERE id=?').run(row.device_id);db.prepare("UPDATE push_tests SET state='failed' WHERE id=?").run(row.id);}
  }
  db.prepare('DELETE FROM push_tests WHERE created_at<?').run(now()-86400000);
 }
 const router=express.Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.get('/config',(req,res)=>res.json({configured:configured(),publicKey:configured()?env.WEB_PUSH_PUBLIC_KEY:null,csrfToken:csrfToken(req)}));
 router.post('/confirm-release',async(req,res)=>{if(!capability(env.WEB_PUSH_RELEASE_TOKEN)||!validToken(env.WEB_PUSH_RELEASE_TOKEN,req.get('authorization')?.replace(/^Bearer /,'')))return res.sendStatus(403);try{res.json(confirm(req.body));}catch{return res.status(409).json({error:'Release confirmation rejected.'});}});
 router.use((req,res,next)=>{if(!configured())return res.status(503).json({error:'Web Push is not configured yet.'});if(!validToken(req.session.csrfToken,req.get('x-csrf-token')))return res.sendStatus(403);next();});
 router.post('/state',(req,res)=>res.json({enabled:state(req.body.scope,req.body.token)}));
 router.post('/test',(req,res)=>{try{res.json(queueTest(req.body.scope,req.body.token));}catch{return res.status(409).json({error:'Test requires this enabled device, a confirmed live release, and ten minutes between tests.'});}});
 router.post('/subscribe',(req,res)=>{try{subscribe(req.body.scope,req.body.token,req.body.subscription);res.json({ok:true});}catch{return res.status(400).json({error:'Cannot register this shop/device subscription.'});}});
 router.post('/unsubscribe',(req,res)=>{try{disable(req.body.scope,req.body.token);res.json({ok:true});}catch{return res.sendStatus(400);}});
 return {router,subscribe,disable,state,confirm,deliver,queueTest,deliverTests,identity,configured};
}
module.exports={createWebPush,validateSubscription};
