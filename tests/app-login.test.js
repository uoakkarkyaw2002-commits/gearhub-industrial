// 1.1.243: an installed iPhone app keeps its own cookies; Google sign-in finishes in iOS's browser sheet.
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{once}=require('node:events');
const {createPlatform}=require('../lib/platform'),{originGuard}=require('../lib/security');
test('1.1.243: Google sign-in finished in another browser sheet is claimed by the app with its handoff id, once',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-app-login-')),db=new Database(path.join(root,'g.sqlite'));
 const app=express();app.use(express.json());app.use(session({secret:'App-login-test-secret-123456789',resave:false,saveUninitialized:false}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 app.use('/api',originGuard(base));
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:base,env:{PLATFORM_OWNER_EMAIL:'owner@gmail.com',GOOGLE_CLIENT_ID:'fixture'},identityProvider:async(code,nonce)=>({sub:code,email:code+'@gmail.com',email_verified:true,name:code,nonce})}));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 const client=()=>{const c={cookie:'',csrf:''};c.call=async(p,method='GET',body)=>{const h={Origin:base,'X-CSRF-Token':c.csrf};if(c.cookie)h.Cookie=c.cookie;if(body){h['Content-Type']='application/json';body=JSON.stringify(body)}const r=await fetch(base+'/api/platform'+p,{method,headers:h,body,redirect:'manual'});const k=r.headers.get('set-cookie');if(k)c.cookie=k.split(';')[0];return {status:r.status,data:r.status===302?null:await r.json().catch(()=>null)}};c.me=async()=>{const r=await c.call('/me');c.csrf=r.data.csrfToken||c.csrf;return r.data};return c};
 const appC=client(),sheet=client(),handoff='ab'.repeat(24);
 await appC.me();
 const start=await appC.call('/auth/start','POST',{handoff});assert.equal(start.status,200);
 const state=new URL(start.data.url,base).searchParams.get('state');
 // The sheet has no cookies from the app, yet finishes the sign-in.
 const cb=await sheet.call('/auth/callback?code=seller&state='+state);assert.equal(cb.status,302);
 assert.equal((await sheet.me()).user.email,'seller@gmail.com');
 assert.equal((await sheet.call('/auth/callback?code=seller&state='+state)).status,400,'state is single use');
 assert.equal((await appC.me()).user,null);
 assert.equal((await appC.call('/auth/claim','POST',{handoff:'cd'.repeat(24)})).status,202,'unknown handoff waits');
 assert.equal((await appC.call('/auth/claim','POST',{handoff})).status,200);
 assert.equal((await appC.me()).user.email,'seller@gmail.com');
 const other=client();await other.me();assert.equal((await other.call('/auth/claim','POST',{handoff})).status,202,'handoff is single use');
 // The normal same-browser login still works without a handoff.
 const plain=client();await plain.me();const s2=await plain.call('/auth/start','POST',{});const st2=new URL(s2.data.url,base).searchParams.get('state');
 assert.equal((await plain.call('/auth/callback?code=buyer&state='+st2)).status,302);assert.equal((await plain.me()).user.email,'buyer@gmail.com');
});
