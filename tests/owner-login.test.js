const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const Database=require('better-sqlite3');

test('GearHub password login keeps an existing Google owner session through rotation and restart',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-owner-login-'));
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');
 const port=listener.address().port;await new Promise(r=>listener.close(r));
 const origin='http://127.0.0.1:'+port,password='Owner login fixture password 2026';
 let server,db,logs='';
 const stop=async()=>{if(server?.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}};
 t.after(async()=>{await stop();db?.close();fs.rmSync(root,{recursive:true,force:true});});
 const start=async()=>{
  server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'test',PORT:String(port),DATA_DIR:root,UPLOAD_DIR:path.join(root,'uploads'),PUBLIC_ORIGIN:origin,SESSION_SECRET:'Owner-login-test-secret-2026-abcdefghijklmnopqrstuvwxyz',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:password,PLATFORM_ENABLED:'true',PLATFORM_OWNER_EMAIL:'owner@gmail.com',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',BACKUP_S3_BUCKET:'',BACKUP_EMAIL_ENABLED:'false',ALERT_EMAIL_ENABLED:'false',SEED_DEMO:'false'}});
  server.stdout.on('data',v=>logs+=v);server.stderr.on('data',v=>logs+=v);
  for(let n=0;n<150;n++){if(server.exitCode!==null)throw Error(logs);try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}
  throw Error('Fixture startup timed out: '+logs);
 };
 class Client{
  cookie='';token='';
  async call(url,method='GET',body){
   const headers={Origin:origin};if(this.cookie)headers.Cookie=this.cookie;if(this.token)headers['X-CSRF-Token']=this.token;
   if(body!==undefined)headers['Content-Type']='application/json';
   const response=await fetch(origin+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
   const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
   const data=await response.json();if(data.csrfToken)this.token=data.csrfToken;
   return {status:response.status,data};
  }
 }
 await start();db=new Database(path.join(root,'gearhub.sqlite'));
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(42,'owner-fixture','owner@gmail.com','Owner'),(43,'seller-fixture','seller@gmail.com','Seller');INSERT INTO platform_meta(key,value) VALUES('owner_sub','owner-fixture')");
 // Seed only the local fixture's server-side session with the exact identity field
 // written by the verified Google callback. No authentication shortcut is added to the app.
 const googleSession=async id=>{
  const client=new Client();assert.equal((await client.call('/api/platform/me')).status,200);
  const sid=decodeURIComponent(client.cookie.split('=')[1]).slice(2).split('.')[0];
  const value=JSON.parse(db.prepare('SELECT sess FROM sessions WHERE sid=?').get(sid).sess);value.platformUser=id;
  db.prepare('UPDATE sessions SET sess=? WHERE sid=?').run(JSON.stringify(value),sid);
  return client;
 };
 const owner=await googleSession(42);
 assert.equal((await owner.call('/api/platform/me')).data.isOwner,true);
 const oldCookie=owner.cookie,oldToken=owner.token;
 assert.equal((await owner.call('/api/admin/login','POST',{password})).status,200);
 assert.notEqual(owner.cookie,oldCookie,'password login still rotates the session ID');
 assert.notEqual(owner.token,oldToken,'password login still replaces the CSRF token');
 const ownerAfterLogin=await owner.call('/api/platform/me');
 assert.equal(ownerAfterLogin.data.user?.id,42,'existing verified Google identity survives password login');
 assert.equal(ownerAfterLogin.data.isOwner,true);
 assert.equal((await owner.call('/api/platform/owner')).status,200);
 assert.equal((await owner.call('/api/admin/me')).status,200);
 const stale=new Client();stale.cookie=oldCookie;
 assert.equal((await stale.call('/api/platform/me')).data.user,null,'the previous session ID is revoked');
 assert.equal((await stale.call('/api/admin/me')).status,401);
 await stop();await start();
 assert.equal((await owner.call('/api/platform/me')).data.isOwner,true,'saved owner login survives server restart');
 assert.equal((await owner.call('/api/admin/me')).status,200);
 const visitor=new Client();await visitor.call('/api/admin/csrf');
 assert.equal((await visitor.call('/api/admin/login','POST',{password})).status,200);
 assert.equal((await visitor.call('/api/platform/me')).data.isOwner,false,'password login alone does not create a Google owner identity');
 assert.equal((await visitor.call('/api/platform/owner')).status,401);
 const seller=await googleSession(43);
 assert.equal((await seller.call('/api/admin/login','POST',{password})).status,200);
 assert.equal((await seller.call('/api/platform/me')).data.user.id,43);
 assert.equal((await seller.call('/api/platform/owner')).status,403,'preserving a seller identity cannot promote it to owner');
 owner.token=(await owner.call('/api/platform/me')).data.csrfToken;
 assert.equal((await owner.call('/api/admin/logout','POST',{})).status,200);
 assert.equal((await owner.call('/api/platform/me')).data.user,null,'explicit logout still clears both identities');
});
