// 1.1.324 owner: GearHub's own Profile works like a shop profile (followers, posts, personal details);
// only the GearHub owner may post or edit it, and its products stay in GearHub's own admin.
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform');

test('GearHub profile: counts, follow, details and posts by the GearHub owner only',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-home-profile-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','Seller'),(20,'c','c@example.test','Buyer'),(21,'d','boss@example.test','Boss');INSERT OR REPLACE INTO platform_meta(key,value) VALUES('owner_sub','d');CREATE TABLE products(id INTEGER PRIMARY KEY,active INTEGER);INSERT INTO products(active) VALUES(1),(1),(0);CREATE TABLE site_settings(id INTEGER PRIMARY KEY,settings_json TEXT);INSERT INTO site_settings VALUES(1,'{\"appIconUrl\":\"/uploads/gh.png\"}')");
 db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES('img-h',1,'image','image/jpeg',1,'h.jpg',1)").run();
 const app=express();app.use(express.json(),session({secret:'home-profile-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
 app.post('/test-login/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{PLATFORM_OWNER_EMAIL:'boss@example.test'}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 async function as(id){let cookie='';const keep=r=>{const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r};if(id)keep(await fetch(base+'/test-login/'+id,{method:'POST'}));const token=(await keep(await fetch(base+'/api/platform/me',{headers:{cookie}})).json()).csrfToken;return (url,method='GET',body)=>fetch(base+'/api/platform'+url,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined})}
 const guest=await as(0),buyer=await as(20),seller=await as(10),boss=await as(21),json=async r=>(await r).json();
 let p=await json(guest('/profile/gearhub'));
 assert.deepEqual([p.followers,p.following,p.posts,p.canPost,p.home,p.shopId],[0,0,2,false,true,undefined],'2 active GearHub products, no admin rights for a guest');
 p=await json(boss('/profile/gearhub'));assert.equal(p.canPost,true,'the GearHub owner manages it');assert.equal(p.shopId,undefined,'no shop admin APIs for the legacy shop');
 assert.equal((await json(buyer('/profile/gearhub/follow','POST',{}))).followers,1);
 assert.equal((await buyer('/profile/gearhub/about','PUT',{phone:'09 1'})).status,403,'a buyer cannot edit');
 assert.equal((await seller('/profile/gearhub/about','PUT',{phone:'09 1'})).status,403,'a seller cannot edit');
 assert.equal((await seller('/profile/shop-x/about','PUT',{})).status,404);
 assert.equal((await boss('/profile/gearhub/about','PUT',{email:'bad'})).status,400);
 assert.equal((await boss('/profile/gearhub/about','PUT',{description:'Industrial parts',address:'Yangon, Myanmar',phone:'09 766',email:'gh@example.test',birthday:'2020-01-02',work:'GearHub'})).status,200);
 assert.deepEqual((await json(guest('/profile/gearhub'))).about,{caption:'Industrial parts',address:'Yangon, Myanmar',phone:'09 766',email:'gh@example.test',birthday:'2020-01-02',work:'GearHub'});
 assert.equal((await seller('/profile/gearhub/posts','POST',{body:'hi'})).status,403);
 const made=await boss('/profile/gearhub/posts','POST',{body:'Hello from GearHub',imageIds:['img-h']});assert.equal(made.status,201);
 const item=(await made.json()).item;assert.deepEqual([item.shop.name,item.shop.logo,item.images],['GearHub','/uploads/gh.png',['/api/platform/images/img-h']]);
 const list=await json(guest('/posts?shop=gearhub'));assert.deepEqual(list.items.map(i=>i.body),['Hello from GearHub'],'its posts list (and Discover)');
 assert.equal((await json(guest('/profile/gearhub'))).posts,3);
 assert.equal((await seller('/profile/gearhub/photo','POST')).status,403,'only the GearHub owner uploads post photos');
 assert.equal((await boss('/profile/gearhub/posts/'+item.postId,'DELETE')).status,200);
});
