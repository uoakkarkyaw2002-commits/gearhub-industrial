// 1.1.314 owner: 💬 buyer ↔ shop chat and 🔔 notifications for everyone (Google sign-in); Settings row is only a switch.
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform');
test('chat threads, answers, unread counts and notifications stay inside their shop',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-chat-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','Owner A'),(11,'b','b@example.test','Owner B'),(20,'c','c@example.test','Buyer'),(21,'d','d@example.test','Other');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active'),(11,11,'shop-b','Shop B',1,'active')");
 const pid=Number(db.prepare('INSERT INTO platform_products(shop_id,sku,name,price,stock) VALUES(10,?,?,1,1)').run('A1','Part').lastInsertRowid);
 const app=express();app.use(express.json(),session({secret:'chat-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
 app.post('/test-login/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 async function as(id){let cookie='';const keep=r=>{const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r};if(id)keep(await fetch(base+'/test-login/'+id,{method:'POST'}));const token=(await keep(await fetch(base+'/api/platform/me',{headers:{cookie}})).json()).csrfToken;return (url,method='GET',body)=>fetch(base+'/api/platform'+url,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined})}
 const guest=await as(0),buyer=await as(20),other=await as(21),a=await as(10),b=await as(11);const json=async r=>(await r).json();
 assert.equal((await guest('/chat/shop-a')).status,401);assert.deepEqual(await json(guest('/notifications/shop-a')),{signedIn:false,items:[]});
 assert.equal((await fetch(base+'/api/platform/chat/shop-a',{method:'POST'})).status,403,'CSRF');
 assert.equal((await buyer('/chat/shop-a','POST',{body:' '})).status,400);
 let d=await json(buyer('/chat/shop-a','POST',{body:'Do you have J71-33?'}));assert.deepEqual([d.role,d.messages.length,d.messages[0].fromShop],['buyer',1,false]);
 assert.equal((await a('/chat/shop-a','POST',{body:'x'})).status,400,'not to your own shop');
 let n=await json(a('/notifications/shop-a'));assert.equal(n.unreadChats,1);assert.ok(n.items.some(i=>i.kind==='chat'&&i.text.includes('Buyer')));
 const list=await json(a('/chat/shop-a'));assert.deepEqual([list.role,list.chats[0].name,list.chats[0].unread],['shop','Buyer',1]);
 const id=list.chats[0].id;
 assert.equal((await b('/chat/shop-a/'+id)).status,403,'another shop cannot read it');assert.equal((await other('/chat/shop-a/'+id)).status,403);
 assert.equal((await b('/chat/shop-b/'+id)).status,404,'chat ids are per shop');
 d=await json(a('/chat/shop-a/'+id));assert.equal(d.name,'Buyer');assert.equal((await json(a('/notifications/shop-a'))).unreadChats,0,'opening marks it read');
 d=await json(a('/chat/shop-a/'+id,'POST',{body:'Yes, 2 left.'}));assert.equal(d.messages[1].fromShop,true);
 n=await json(buyer('/notifications/shop-a'));assert.equal(n.unreadChats,1);assert.ok(n.items.some(i=>i.chat&&i.text.includes('Yes, 2 left.')));
 assert.equal((await json(buyer('/chat/shop-a'))).messages.length,2);assert.equal((await json(buyer('/notifications/shop-a'))).unreadChats,0);
 assert.deepEqual((await json(other('/chat/shop-a'))).messages,[],'another buyer sees only their own chat');
 // Likes, comments and follows reach the shop; an answer under a buyer's comment reaches the buyer.
 await buyer('/feed/shop-a/'+pid+'/like','POST',{});await buyer('/feed/shop-a/'+pid+'/comments','POST',{body:'Price?'});await buyer('/profile/shop-a/follow','POST',{});
 await a('/feed/shop-a/'+pid+'/comments','POST',{body:'100,000 Ks'});
 const kinds=(await json(a('/notifications/shop-a'))).items.map(i=>i.kind);for(const k of ['like','comment','follow','chat'])assert.ok(kinds.includes(k),k);
 assert.ok((await json(buyer('/notifications/shop-a'))).items.some(i=>i.kind==='reply'&&i.text.includes('100,000 Ks')));
 assert.ok((await json(b('/notifications/shop-a'))).items.every(i=>i.kind!=='chat'),'another shop owner is a buyer here, with no chat');
});
test('Settings Notifications row is only the switch; the top 🔔 / 💬 buttons are wired',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const alerts=read('public/settings-alerts.js'),html=read('public/index.html'),sw=read('public/sw.js');
 assert.doesNotMatch(alerts,/return;if\(slug&&!shopId\)return;openHistory\(\)/);assert.match(alerts,/function showCount\(items\)\{return;/);
 for(const tag of html.match(/\/noti-chat\.(?:js|css)\?v=[^"]+/g))assert.ok(sw.includes('"'+tag+'"'),tag);
 assert.match(read('public/noti-chat.js'),/banner\.append\(box\)/);
});

test('1.1.319: the GearHub owner sees GearHub alerts and every shop chat on GearHub Home',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-ownerchat-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','Owner A'),(20,'c','c@example.test','Buyer'),(21,'d','boss@example.test','Boss');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active');INSERT OR REPLACE INTO platform_meta(key,value) VALUES('owner_sub','d')");
 const app=express();app.use(express.json(),session({secret:'ownerchat-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
 app.post('/test-login/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{PLATFORM_OWNER_EMAIL:'boss@example.test'}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 async function as(id){let cookie='';const keep=r=>{const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r};if(id)keep(await fetch(base+'/test-login/'+id,{method:'POST'}));const token=(await keep(await fetch(base+'/api/platform/me',{headers:{cookie}})).json()).csrfToken;return (url,method='GET',body)=>fetch(base+'/api/platform'+url,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined})}
 const guest=await as(0),buyer=await as(20),a=await as(10),boss=await as(21);
 assert.deepEqual(await(await guest('/owner/notifications')).json(),{signedIn:false,items:[]},'buttons stay hidden for visitors');
 assert.equal((await a('/owner/notifications')).status,403,'a shop owner is not the GearHub owner');assert.equal((await buyer('/owner/chats')).status,403);
 await buyer('/chat/shop-a','POST',{body:'Price?'});
 const n=await(await boss('/owner/notifications')).json();assert.equal(n.unreadChats,1);assert.ok(n.items.some(i=>i.chat&&i.text.includes('Shop A')));
 const c=await(await boss('/owner/chats')).json();assert.deepEqual([c.chats[0].slug,c.chats[0].shop,c.chats[0].name,c.chats[0].unread],['shop-a','Shop A','Buyer',1]);
 const d=await(await boss('/chat/shop-a/'+c.chats[0].id,'POST',{body:'1,000 Ks'})).json();assert.equal(d.messages[1].fromShop,true,'the owner answers as the shop');
});
