const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),Database=require('better-sqlite3'),model=require('../lib/platform-model');
const {renameOnce,currentSlug,aliasMiddleware}=require('../lib/shop-alias');
test('1.1.239: POLESTAR link becomes /shops/polestar/ once; old links keep working',async()=>{
 const db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(20,'p','p@example.test','P');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status,settings) VALUES(20,20,'psm-test-shop','POLESTAR',1,'active','{\"appearance\":{\"x\":1}}');INSERT INTO platform_applications(user_id,name,slug,status) VALUES(20,'POLESTAR','psm-test-shop','approved')");
 renameOnce(db);renameOnce(db);
 const s=db.prepare("SELECT slug,settings FROM platform_shops WHERE id=20").get();
 assert.equal(s.slug,'polestar');assert.deepEqual(JSON.parse(s.settings),{appearance:{x:1},formerSlugs:['psm-test-shop']});
 assert.equal(db.prepare("SELECT slug FROM platform_applications WHERE user_id=20").get().slug,'polestar');
 assert.equal(currentSlug(db,'psm-test-shop'),'polestar');assert.equal(currentSlug(db,'polestar'),'');assert.equal(currentSlug(db,'nope'),'');
 const app=express();app.use(aliasMiddleware(db));app.get('/api/platform/store/:slug/similar/:id',(req,res)=>res.json({slug:req.params.slug,q:req.query.a}));app.use((req,res)=>res.status(404).end());
 const server=app.listen(0);const base='http://127.0.0.1:'+server.address().port;
 try{
  let r=await fetch(base+'/shops/psm-test-shop/?x=1',{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/shops/polestar/?x=1');
  r=await fetch(base+'/shops/psm-test-shop/admin',{redirect:'manual'});assert.equal(r.headers.get('location'),'/shops/polestar/admin');
  r=await fetch(base+'/shops/psm-test-shop',{redirect:'manual'});assert.equal(r.headers.get('location'),'/shops/polestar/');
  r=await fetch(base+'/api/platform/store/psm-test-shop/similar/5?a=b');assert.deepEqual(await r.json(),{slug:'polestar',q:'b'});
  r=await fetch(base+'/shops/polestar/',{redirect:'manual'});assert.equal(r.status,404);
 }finally{server.close()}
});
test('1.1.239: rename is skipped when the new link is already taken',()=>{
 const db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(20,'p','p@example.test','P'),(21,'q','q@example.test','Q');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id) VALUES(20,20,'psm-test-shop','POLESTAR',1),(21,21,'polestar','Other',1)");
 renameOnce(db);assert.equal(db.prepare("SELECT slug FROM platform_shops WHERE id=20").get().slug,'psm-test-shop');
});
