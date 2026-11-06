const test=require('node:test');const assert=require('node:assert');const crypto=require('crypto');const Database=require('better-sqlite3');
const {createNativePush}=require('../lib/native-push');
// 1.1.359: alerts for the native Android app through Firebase (HTTP v1), data-only messages.
function setup(extra={}){
 const db=new Database(':memory:');db.exec("CREATE TABLE platform_user_data(user_id INTEGER NOT NULL,k TEXT NOT NULL,v TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,k))");
 const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const calls=[];const fetchImpl=async(url,opt)=>{calls.push({url,opt});
  if(/oauth2/.test(url))return{ok:true,status:200,json:async()=>({access_token:'tok',expires_in:3600})};
  const token=JSON.parse(opt.body).message.token;if(extra.gone&&token===extra.gone)return{ok:false,status:404,json:async()=>({error:{message:'gone',details:[{errorCode:'UNREGISTERED'}]}})};
  return{ok:true,status:200,json:async()=>({name:'m'})}};
 const env={FCM_SERVICE_ACCOUNT:JSON.stringify({client_email:'x@y.iam.gserviceaccount.com',private_key:privateKey,project_id:'demo-proj'})};
 return {db,calls,np:createNativePush({db,env:extra.noAccount?{}:env,fetchImpl})};
}
test('without a service account nothing is sent',async()=>{
 const {np,calls}=setup({noAccount:true});assert.equal(np.enabled(),false);np.save(1,'a'.repeat(30));
 assert.deepEqual(await np.toUser(1,{title:'t',body:'b'}),{sent:0,failed:0});assert.equal(calls.length,0);
});
test('saves tokens per person (max 5, no duplicates) and rejects junk',()=>{
 const {np}=setup();assert.throws(()=>np.save(1,'x'),/Bad token/);
 for(let i=0;i<7;i++)np.save(1,'tok'+String(i).repeat(10)+'_abcdefghij');np.save(1,'tok6'.repeat(1)+String(6).repeat(10)+'_abcdefghij');
 assert.equal(np.tokens(1).length,5);assert.equal(np.tokens(2).length,0);
});
test('sends a high-priority data message per token; a gone token is forgotten',async()=>{
 const gone='gone'+'g'.repeat(30),good='good'+'h'.repeat(30);const {np,calls}=setup({gone});np.save(7,gone);np.save(7,good);
 const r=await np.toUser(7,{title:'📞 Shop',body:'Voice call',url:'/shops/a/?call=1',kind:'call',video:true,tag:'gearhub-call'});
 assert.deepEqual(r,{sent:1,failed:1});
 const sends=calls.filter(c=>/messages:send/.test(c.url));assert.equal(sends.length,2);
 const m=JSON.parse(sends[0].opt.body).message;assert.equal(m.android.priority,'HIGH');assert.equal(m.data.kind,'call');assert.equal(m.data.video,'1');assert.ok(!m.notification,'data only');
 assert.equal(sends[0].opt.headers.Authorization,'Bearer tok');assert.deepEqual(np.tokens(7),[good]);
 assert.equal(calls.filter(c=>/oauth2/.test(c.url)).length,1,'access token reused');
});
