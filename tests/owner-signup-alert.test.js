// 1.1.246 owner: "new shops arrived and I did not know" — a phone the GearHub owner switched on gets a new-shop alert.
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{once}=require('node:events');
const {createPlatform}=require('../lib/platform'),{createOrderPush}=require('../lib/order-push'),{originGuard}=require('../lib/security');
test('1.1.246: a new shop alerts the GearHub owner\'s phones (owner switch + GearHub main admin), not other shops',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-signup-alert-')),db=new Database(path.join(root,'g.sqlite'));
 const app=express();app.use(express.json());app.use(session({secret:'Signup-alert-test-secret-123456789',resave:false,saveUninitialized:false}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const sent=[];const orderPush=createOrderPush({db,subject:'https://shop.test',sender:{generateVAPIDKeys:()=>({publicKey:'BPub'+'x'.repeat(80),privateKey:'priv'}),sendNotification:async(sub,payload)=>{sent.push({endpoint:sub.endpoint,...JSON.parse(payload)});return {statusCode:201}}}});
 app.use('/api',originGuard(base));
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:base,orderPush,env:{PLATFORM_OWNER_EMAIL:'owner@gmail.com',GOOGLE_CLIENT_ID:'fixture'},identityProvider:async(code,nonce)=>({sub:code,email:code+'@gmail.com',email_verified:true,name:code,nonce})}));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 const client=()=>{const c={cookie:'',csrf:''};c.call=async(p,method='GET',body)=>{const h={Origin:base,'X-CSRF-Token':c.csrf};if(c.cookie)h.Cookie=c.cookie;if(body){h['Content-Type']='application/json';body=JSON.stringify(body)}const r=await fetch(base+'/api/platform'+p,{method,headers:h,body,redirect:'manual'});const k=r.headers.get('set-cookie');if(k)c.cookie=k.split(';')[0];return {status:r.status,data:r.status===302?null:await r.json().catch(()=>null)}};c.me=async()=>{const r=await c.call('/me');c.csrf=r.data.csrfToken||c.csrf;return r.data};c.login=async n=>{await c.me();const s=await c.call('/auth/start','POST',{});const st=new URL(s.data.url,base).searchParams.get('state');await c.call('/auth/callback?code='+n+'&state='+st);return c.me()};return c};
 const sub=n=>({endpoint:'https://push.example.test/'+n+'x'.repeat(12),keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,n.length)]).toString('base64url'),auth:Buffer.alloc(16,7).toString('base64url')}});
 const seller=client();await seller.login('seller');assert.equal((await seller.call('/applications','POST',{name:'First Shop'})).status,201);
 const shop=(await seller.me()).shop;
 // The seller's own phone: shop alerts only.
 assert.equal((await seller.call('/shops/'+shop.id+'/push/subscribe','POST',{subscription:sub('seller')})).status,200);
 // The GearHub owner switches alerts on in that shop's app.
 const owner=client();await owner.login('owner');assert.equal((await owner.call('/shops/'+shop.id+'/push/subscribe','POST',{subscription:sub('owner')})).status,200);
 sent.length=0;
 const next=client();await next.login('newbie');assert.equal((await next.call('/applications','POST',{name:'Kz'})).status,201);
 await new Promise(r=>setTimeout(r,50));
 const alerts=sent.filter(x=>x.kind==='signup');
 assert.deepEqual(alerts.map(x=>x.endpoint),[sub('owner').endpoint]);
 assert.match(alerts[0].title,/New shop · Kz/);assert.match(alerts[0].body,/newbie@gmail\.com/);assert.equal(alerts[0].url,'/platform.html?view=console');
 // Switching off removes the owner's phone from new-shop alerts.
 await owner.call('/shops/'+shop.id+'/push/unsubscribe','POST',{endpoint:sub('owner').endpoint});sent.length=0;
 const third=client();await third.login('third');await third.call('/applications','POST',{name:'Siam Pi'});await new Promise(r=>setTimeout(r,50));
 assert.equal(sent.filter(x=>x.kind==='signup').length,0);
});
