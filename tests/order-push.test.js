// Order alerts (push): keys are made once and kept, each store has its own phones,
// gone phones are forgotten, and a failure never throws into checkout.
const {test}=require('node:test');const assert=require('node:assert/strict');const Database=require('better-sqlite3');const fs=require('node:fs');const path=require('node:path');
const {createOrderPush,orderMessage}=require('../lib/order-push');
const phone=n=>({endpoint:'https://push.example.test/'+n,keys:{p256dh:'B'.repeat(87),auth:'a'.repeat(22)}});
function fake(){const sent=[];let made=0;return {sent,made:()=>made,generateVAPIDKeys:()=>{made++;return {publicKey:'P'+made+'x'.repeat(86),privateKey:'k'+made}},sendNotification:async(sub,payload)=>{if(sub.endpoint.endsWith('/gone')){const e=new Error('gone');e.statusCode=410;throw e}if(sub.endpoint.endsWith('/down'))throw new Error('network');sent.push({endpoint:sub.endpoint,...JSON.parse(payload)})}}}

test('VAPID keys are made once and kept; env keys win',()=>{
 const db=new Database(':memory:'),f=fake();
 const one=createOrderPush({db,sender:f}),two=createOrderPush({db,sender:f});
 assert.equal(one.publicKey(),two.publicKey());assert.equal(f.made(),1);
 assert.equal(createOrderPush({db,sender:f,env:{VAPID_PUBLIC_KEY:'ENVKEY',VAPID_PRIVATE_KEY:'x'}}).publicKey(),'ENVKEY');
});

test('each store only alerts its own phones; gone phones are removed; errors never throw',async()=>{
 const db=new Database(':memory:'),f=fake(),push=createOrderPush({db,sender:f,log:()=>{}});
 push.subscribe('shop:1',phone('alice'));push.subscribe('shop:2',phone('bob'));push.subscribe('shop:2',phone('gone'));push.subscribe('shop:2',phone('down'));
 assert.equal(await push.notify('shop:2',orderMessage({code:'GH-1',total:2500000,customer:'Ko Aung',url:'/shops/bob/admin#orders-content'})),1);
 assert.deepEqual(f.sent.map(s=>s.endpoint),['https://push.example.test/bob']);
 assert.equal(f.sent[0].title,'🔔 အော်ဒါအသစ် / New order');assert.equal(f.sent[0].body,'Ko Aung · 2,500,000 Ks · GH-1');
 assert.equal(push.count('shop:2'),2,'the 410 phone is forgotten, the temporarily down one is kept');
 assert.equal(push.has('shop:1',phone('alice').endpoint),true);assert.equal(push.has('shop:2',phone('alice').endpoint),false);
});

test('bad subscriptions are refused and a store keeps at most 20 phones',()=>{
 const db=new Database(':memory:'),push=createOrderPush({db,sender:fake()});
 assert.throws(()=>push.subscribe('main',{endpoint:'http://insecure/x',keys:phone('a').keys}),/not valid/);
 assert.throws(()=>push.subscribe('main',{endpoint:'https://push.example.test/x'}),/not valid/);
 for(let i=0;i<25;i++)push.subscribe('main',phone('p'+i));
 assert.equal(push.count('main'),20);assert.equal(push.has('main',phone('p24').endpoint),true);
});

test('service worker shows the alert and tapping it opens that store\'s orders',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');
 assert.match(sw,/self\.addEventListener\("push"/);assert.match(sw,/showNotification\(title/);
 assert.match(sw,/self\.addEventListener\("notificationclick"/);assert.match(sw,/clients\.openWindow\(target\.href\)/);
 const extras=fs.readFileSync(path.join(__dirname,'..','public','admin-extras.js'),'utf8');
 assert.match(extras,/pushManager\.subscribe\(\{userVisibleOnly:true,applicationServerKey:key\}\)/);
 assert.match(extras,/Add to Home Screen/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','public','tenant-admin.js'),'utf8'),/\/push\(\?:\\\/\(\?:subscribe\|unsubscribe\|test\)\)\?/);
});

test('every order is its own alert (no shared topic), the contact is https, and the last result is kept',async()=>{
 const db=new Database(':memory:'),calls=[];
 const sender={generateVAPIDKeys:()=>({publicKey:'P'+'x'.repeat(86),privateKey:'k'}),sendNotification:async(sub,payload,opts)=>{calls.push(opts);if(sub.endpoint.endsWith('/down')){const e=new Error('boom');e.statusCode=403;e.body='BadJwtToken';throw e}}};
 const push=createOrderPush({db,sender,subject:'http://127.0.0.1:8899',log:()=>{}});
 push.subscribe('main',phone('ok'));push.subscribe('main',phone('down'));
 for(let i=1;i<=5;i++)await push.notify('main',orderMessage({id:i,code:'GH-'+i,total:1000,customer:'B'+i,url:'/admin.html'}));
 assert.equal(calls.length,10,'5 orders x 2 phones');
 assert.ok(calls.every(o=>!('topic' in o)),'no topic: alerts are never merged');
 assert.ok(calls.every(o=>/^https:\/\//.test(o.vapidDetails.subject)),'an http origin is never used as the contact');
 const last=push.lastResult('main');assert.equal(last.sent,1);assert.equal(last.failed,1);assert.match(last.error,/403 BadJwtToken/);assert.equal(last.phones,2);
 assert.equal(orderMessage({id:7,code:'GH-7',total:1}).orderId,7);
});

test('an open admin is told about the alert; the phone notification always shows',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');
 assert.match(sw,/client\.postMessage\(\{ type: "gearhub-order-alert", orderId: data\.orderId \?\? null/);
 assert.match(sw,/await self\.registration\.showNotification\(title/);
 const extras=fs.readFileSync(path.join(__dirname,'..','public','admin-extras.js'),'utf8');
 assert.match(extras,/d\.type!=="gearhub-order-alert"/);assert.match(extras,/function chimeTimes\(n\)/);
 assert.match(extras,/ဖုန်း "\+Number\(alertsInfo\.count\|\|0\)/,'card shows how many phones and the last result');
});

test('a phone key that is not a real P-256 public key is refused at subscribe',()=>{
 const db=new Database(':memory:'),push=createOrderPush({db,sender:fake()});
 assert.throws(()=>push.subscribe('main',{endpoint:'https://push.example.test/x',keys:{p256dh:'A'.repeat(87),auth:'a'.repeat(22)}}),/not valid/);
 assert.throws(()=>push.subscribe('main',{endpoint:'https://push.example.test/x',keys:{p256dh:'B'.repeat(87),auth:'a'.repeat(8)}}),/not valid/);
 assert.deepEqual(push.subscribe('main',phone('ok')),{ok:true});
});

test('a device that allowed alerts but is no longer known to the server is connected again by itself (unless turned Off on purpose)',()=>{
 const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin-extras.js'),'utf8');
 assert.match(js,/async function ensureSubscribed\(\)/,'one shared way to subscribe');
 assert.match(js,/Notification\.permission==="granted"&&!healed&&!turnedOffOnPurpose\(\)/,'repair only when allowed, once per page, and not after an Off on purpose');
 assert.match(js,/rememberWanted\(false\)[\s\S]*unsubscribe/,'turning Off is remembered');
 assert.match(js,/rememberWanted\(true\);alertsInfo=\{\.\.\.\(alertsInfo\|\|\{\}\),\.\.\.\(await ensureSubscribed\(\)\)\}/,'turning On forgets it');
});
