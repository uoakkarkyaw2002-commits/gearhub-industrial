const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform');
test('private attachments enforce chat membership, CSRF, size, quota, safe downloads and shop cleanup',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-chatfiles-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'shop','shop@example.test','Shop'),(11,'other-shop','other@example.test','Other shop'),(20,'buyer','buyer@example.test','Buyer'),(21,'other','otherbuyer@example.test','Other buyer'),(30,'boss','boss@example.test','Boss');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active'),(11,11,'shop-b','Shop B',1,'active');INSERT OR REPLACE INTO platform_meta(key,value) VALUES('owner_sub','boss')");
 const app=express();app.use(express.json(),session({secret:'chat-file-fixture-'.repeat(4),resave:false,saveUninitialized:false}));
 app.post('/fixture/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{PLATFORM_OWNER_EMAIL:'boss@example.test'}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 async function as(id){let cookie='';if(id){const r=await fetch(base+'/fixture/'+id,{method:'POST'});cookie=r.headers.get('set-cookie').split(';')[0]}const r=await fetch(base+'/api/platform/me',{headers:{cookie}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const token=(await r.json()).csrfToken;
  return {request:(url,method='GET',body,csrf=token)=>fetch(base+url,{method,headers:{cookie,'X-CSRF-Token':csrf,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined}),upload(url,bytes,name='quote.pdf',csrf=token){const f=new FormData();f.append('file',new Blob([bytes],{type:'text/html'}),name);return this.request(url,'POST',f,csrf)}}
 }
 const guest=await as(0),buyer=await as(20),owner=await as(10),other=await as(21),otherShop=await as(11),boss=await as(30),upload='/api/platform/chat/shop-a/files/upload';
 assert.equal((await guest.upload(upload,'x')).status,401);assert.equal((await buyer.upload(upload,'x','a.pdf','bad')).status,403);assert.equal(db.prepare('SELECT COUNT(*) n FROM platform_chats').get().n,0);
 const bytes=Buffer.from('<script>alert("never inline")</script>'),name='ဈေးနှုန်းစာရင်း.pdf';let response=await buyer.upload(upload,bytes,name);assert.equal(response.status,201);let d=await response.json(),made=d.messages.at(-1);assert.equal(made.kind,'file');assert.equal(made.file.name,name);assert.equal(made.file.bytes,bytes.length);assert.ok(made.body.startsWith('📎 '));
 const chat=db.prepare('SELECT id FROM platform_chats WHERE shop_id=? AND user_id=?').get(10,20).id,url=made.file.url;
 for(const person of [buyer,owner,boss]){const r=await person.request(url);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/octet-stream');assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.ok(r.headers.get('content-disposition').includes(encodeURIComponent(name)));assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes)}
 assert.equal((await guest.request(url)).status,401);assert.equal((await other.request(url)).status,404);assert.equal((await otherShop.request(url)).status,404);assert.equal((await owner.request(url.replace('shop-a','shop-b'))).status,404);
 const reply='/api/platform/chat/shop-a/'+chat+'/files';assert.equal((await other.upload(reply,'x')).status,403);response=await owner.upload(reply,'owner file','../invoice.txt');assert.equal(response.status,201);d=await response.json();assert.equal(d.messages.at(-1).fromShop,true);assert.equal(d.messages.at(-1).file.name,'invoice.txt');assert.equal((await buyer.request(d.messages.at(-1).file.url)).status,200);
 const count=()=>db.prepare('SELECT COUNT(*) n FROM platform_chat_files WHERE shop_id=?').get(10).n,used=count();
 assert.equal((await owner.upload(reply,Buffer.alloc(5*1024*1024+1))).status,413);assert.equal((await owner.upload(reply,'')).status,400);assert.equal(count(),used);
 const limits=model.permissions(db,db.prepare('SELECT * FROM platform_shops WHERE id=?').get(10));assert.equal(limits.usedBytes,bytes.length+10);
 db.prepare('UPDATE platform_shops SET storage_override=? WHERE id=?').run(limits.usedBytes+1,10);assert.equal((await owner.upload(reply,'too large for quota')).status,413);assert.equal(count(),used);db.prepare('UPDATE platform_shops SET storage_override=NULL WHERE id=?').run(10);
 // Read-after-upload follows the original chat API, with no extra public file URL.
 d=await(await owner.request('/api/platform/chat/shop-a/'+chat)).json();assert.equal(d.messages.filter(m=>m.kind==='file').length,2);assert.equal(d.messages[0].file.url,url);
 for(let i=0;i<19;i++)assert.equal((await owner.upload(reply,'x','a.txt')).status,201);assert.equal((await owner.upload(reply,'x')).status,429,'20 files per sender/day');
 const deletion=await boss.request('/api/platform/owner/shops/10','DELETE',{confirmDelete:'shop-a'});assert.equal(deletion.status,200);assert.equal(count(),0,'shop removal also removes private file bytes');
});
