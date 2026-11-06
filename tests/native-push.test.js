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

// 1.1.361: first phone test — answering was slow and every message rang twice (native alert + the old Chrome web alert).
test('answering a call is quick and the old web alert of the phone is removed',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.ok(r('public/voice-call.js').includes('call=accept')&&r('public/voice-call.js').includes('autoAccept&&!autoDone'),'accepted without a second tap');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/CallActivity.java').includes('\"call=accept\"'),'native Answer asks for it');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/MainActivity.java').includes('known'),'no waiting for Firebase when the address is known');
 assert.ok(r('public/user-data.js').includes('/api/platform/push/forget')&&r('lib/platform.js').includes('/push/forget')&&r('lib/order-push.js').includes('forget(endpoint)'),'the web alert of an app phone is forgotten');
});

// 1.1.362: second phone test — the ring doubled (notification sound + call screen + page), and the app asked to sign in again after closing.
test('one ringtone, the page stays quiet in the app, the app returns to the last shop',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/PushService.java').includes('FLAG_INSISTENT'),'the notification sound repeats until answered');
 assert.ok(!/\n\s*ring\(\);/.test(r('android/app/src/main/java/com/skyshopmm/app/CallActivity.java')),'the call screen is silent');
 assert.ok(r('public/voice-call.js').includes('inNativeApp&&!explicitCall'),'no second incoming screen in the app');
 assert.ok(r('public/user-data.js').includes('gh-last-shop')&&r('public/user-data.js').includes('location.replace(last)'),'back to the last shop when signed in');
});

// 1.1.364 owner: the opening picture/sound only for a plain start of the app; entering from a call or an alert goes straight in.
test('native: opening screen only after a plain app start',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/MainActivity.java').includes('App.cold && !fromCallOrAlert')&&r('android/app/src/main/java/com/skyshopmm/app/App.java').includes('static boolean cold = true'),'the app asks for it only on a cold plain start');
 assert.ok(r('public/skyshop-splash.js').includes('nativeQuiet')&&r('public/user-data.js').includes('gh-open-splash'),'the page shows it only when asked');
});

// 1.1.365 owner: the app went straight into the last shop and never asked which Gmail to use.
test('Settings has a Switch account row that signs out and opens the sign-in page',()=>{
 const js=require('fs').readFileSync(require('path').join(__dirname,'..','public','permission-ask.js'),'utf8');
 assert.ok(js.includes('switch-account-action')&&js.includes('/api/platform/logout')&&js.includes("platform.html?visitor"),'switch account');
});

// 1.1.366: the call alert has Answer / Decline buttons (banner when the phone is in use); Decline reaches the server by a key sent only to that phone.
test('call alert: Answer/Decline buttons and decline by key',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/PushService.java').includes('b.addAction(0, getString(R.string.answer)')&&r('android/app/src/main/java/com/skyshopmm/app/DeclineReceiver.java').includes('CallApi.decline'),'buttons on the alert');
 assert.ok(r('lib/shop-chat.js').includes("'/call/:id/decline-key'")&&r('lib/shop-chat.js').includes('crypto.timingSafeEqual(Buffer.from(key), Buffer.from(c.declineKey))')&&r('lib/native-push.js').includes('callId: m.callId, key: m.key'),'server: key checked, sent only to the called phone');
 assert.ok(r('public/voice-call.js').includes('typ srflx'),'connect sooner');
});

// 1.1.367: app open -> only the call screen (it rings itself, the alert stays quiet); locked phone -> unlock first, then open the call.
test('call: one screen when the app is open, unlock before answering',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const push=r('android/app/src/main/java/com/skyshopmm/app/PushService.java'),call=r('android/app/src/main/java/com/skyshopmm/app/CallActivity.java');
 assert.ok(push.includes('CHANNEL_CALLS_QUIET')&&push.includes('if (!appOpen) b.setFullScreenIntent')&&call.includes('selfRing'),'quiet alert, the screen rings itself');
 assert.ok(call.includes('requestDismissKeyguard'),'unlock before opening the app');
 assert.ok(r('lib/shop-chat.js').includes('fgSeen')&&r('public/voice-call.js').includes('?fg=1'),'the server knows when the page is on screen');
});

// 1.1.368: with the app open, Answer ended on the Home Screen (the open app page was cleared down to an old launcher instance that just finished).
test('answering with the app open restarts the app task instead of reusing it',()=>{
 const fs=require('fs'),path=require('path'),r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.ok(r('android/app/src/main/java/com/skyshopmm/app/CallActivity.java').includes('FLAG_ACTIVITY_CLEAR_TASK')&&r('android/app/src/main/java/com/skyshopmm/app/PushService.java').includes('FLAG_ACTIVITY_CLEAR_TASK')&&r('android/app/src/main/java/com/skyshopmm/app/MainActivity.java').includes('onNewIntent'),'fresh task + safety net');
});

// 1.1.368: Answer with the app open flashed the shop's opening cover before connecting.
test('entering from Answer shows no opening cover',()=>{
 const js=require('fs').readFileSync(require('path').join(__dirname,'..','public','skyshop-splash.js'),'utf8');
 assert.ok(js.includes('call=accept')&&js.includes('sky-call-wait')&&js.includes('el.remove()'),'plain connecting page instead of the cover');
});

// 1.1.369 (Android only): the call alert is taken away the moment Answer opens the app, not after the call has connected.
test('Answer clears the call alert at once',()=>{
 const js=require('fs').readFileSync(require('path').join(__dirname,'..','android/app/src/main/java/com/skyshopmm/app/MainActivity.java'),'utf8');
 assert.ok(js.includes('clearCallAlertIfAnswering')&&js.includes('call=accept')&&js.includes('PushService.CALL_ID'),'cancel on answer');
});
