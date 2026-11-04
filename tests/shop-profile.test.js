// 1.1.303 owner: real followers / following / posts, Follow with Google sign-in, personal posts (photos + text)
// only on the profile and in Discover, never among the products.
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform');

test('profile counts, follow, personal posts and who may post or delete',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-profile-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','Owner A'),(11,'b','b@example.test','Owner B'),(20,'c','c@example.test','Buyer'),(21,'d','boss@example.test','Boss');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active'),(11,11,'shop-b','Shop B',1,'active');INSERT OR REPLACE INTO platform_meta(key,value) VALUES('owner_sub','d')");
 db.prepare('INSERT INTO platform_products(shop_id,sku,name,price,stock) VALUES(10,?,?,1,1)').run('A1','Part');
 db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES('img-a',10,'image','image/jpeg',1,'a.jpg',1),('img-b',11,'image','image/jpeg',1,'b.jpg',1)").run();
 const app=express();app.use(express.json(),session({secret:'profile-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
 app.post('/test-login/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{PLATFORM_OWNER_EMAIL:'boss@example.test'}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 async function as(id){let cookie='';const keep=r=>{const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r};if(id)keep(await fetch(base+'/test-login/'+id,{method:'POST'}));const token=(await keep(await fetch(base+'/api/platform/me',{headers:{cookie}})).json()).csrfToken;return (url,method='GET',body)=>fetch(base+'/api/platform'+url,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined})}
 const guest=await as(0),buyer=await as(20),a=await as(10),b=await as(11),boss=await as(21);
 const json=async r=>(await r).json();
 let p=await json(guest('/profile/shop-a'));assert.deepEqual([p.followers,p.following,p.posts,p.followed,p.canPost,p.shopId],[0,0,1,false,false,undefined]);
 assert.equal((await guest('/profile/shop-a/follow','POST',{})).status,401,'follow needs Google sign-in');
 assert.equal((await fetch(base+'/api/platform/profile/shop-a/follow',{method:'POST'})).status,403,'CSRF checked');
 assert.deepEqual(await json(buyer('/profile/shop-a/follow','POST',{})),{followed:true,followers:1});
 assert.deepEqual(await json(b('/profile/shop-a/follow','POST',{})),{followed:true,followers:2});
 assert.equal((await a('/profile/shop-a/follow','POST',{})).status,400,'not your own shop');
 assert.equal((await json(guest('/profile/shop-b'))).following,1,'Following = the shops the owner follows');
 assert.deepEqual((await json(buyer('/profile/following'))).slugs,['shop-a']);
 await buyer('/profile/following/import','POST',{slugs:['shop-b','nope','shop-a']});assert.deepEqual((await json(buyer('/profile/following'))).slugs.sort(),['shop-a','shop-b'],'the phone list moves to the account');
 assert.equal((await buyer('/profile/shop-a/posts','POST',{body:'hi'})).status,403,'only the shop posts');
 assert.equal((await a('/profile/shop-a/posts','POST',{body:' '})).status,400);
 p=await json(a('/profile/shop-a'));assert.deepEqual([p.canPost,p.shopId],[true,10]);
 const made=await json(a('/profile/shop-a/posts','POST',{body:'New stock\ntoday',imageIds:['img-a','img-b']}));
 assert.deepEqual([made.item.body,made.item.images],['New stock\ntoday',['/api/platform/images/img-a']],'another shop\'s photo is dropped');
 await boss('/profile/shop-a/posts','POST',{body:'From GearHub owner'});
 assert.equal((await json(guest('/profile/shop-a'))).posts,3,'products + personal posts');
 const list=await json(guest('/posts?shop=shop-a'));assert.deepEqual(list.items.map(i=>i.body),['From GearHub owner','New stock\ntoday']);assert.ok(list.items.every(i=>i.kind==='post'&&!i.canDelete));
 assert.deepEqual((await json(guest('/posts?q=stock'))).items.map(i=>i.postId),[made.item.postId]);
 assert.deepEqual((await json(guest('/posts?shops=shop-b'))).items,[]);
 assert.ok((await json(guest('/feed'))).items.every(i=>i.kind!=='post'&&i.name==='Part'),'personal posts never become products');
 // 1.1.308: likes and comments on a personal post; comments show the SkyShop name; the writer edits.
 const pid='p'+made.item.postId;
 assert.deepEqual(await json(buyer('/feed/shop-a/'+pid+'/like','POST',{})),{liked:true,likes:1});
 assert.equal((await buyer('/feed/shop-b/'+pid+'/like','POST',{})).status,404,'only under its own shop');
 assert.equal((await buyer('/feed/shop-a/p999/like','POST',{})).status,404);
 let cm=await json(b('/feed/shop-a/'+pid+'/comments','POST',{body:'Nice'}));assert.equal(cm.comments[0].name,'Shop B','a shop owner comments as the shop');
 await new Promise(r=>setTimeout(r,3100));
 cm=await json(boss('/feed/shop-a/'+pid+'/comments','POST',{body:'Hi'}));assert.equal(cm.comments[1].name,'SkyShopMM','the GearHub owner without a shop');
 cm=await json(buyer('/feed/shop-a/'+pid+'/comments','POST',{body:'Price?'}));assert.equal(cm.comments[2].name,'Buyer');assert.deepEqual([cm.comments[2].canEdit,cm.comments[0].canEdit],[true,false]);
 const cid=cm.comments[2].id;
 assert.equal((await b('/feed/shop-a/'+pid+'/comments/'+cid,'PUT',{body:'x'})).status,403,'only the writer edits');
 assert.equal((await json(buyer('/feed/shop-a/'+pid+'/comments/'+cid,'PUT',{body:'Price please?'}))).comments[2].body,'Price please?');
 const listed=(await json(buyer('/posts?shop=shop-a'))).items.find(i=>i.id===pid);assert.deepEqual([listed.likes,listed.comments,listed.liked],[1,3,true]);
 assert.equal((await json(guest('/feed/shop-a/'+made.item.postId+'/comments'))).count,0,'a product with the same number is separate');
 assert.equal((await b('/profile/shop-a/posts/'+made.item.postId,'DELETE')).status,403);
 assert.equal((await a('/profile/shop-a/posts/'+made.item.postId,'DELETE')).status,200);
 assert.equal((await json(guest('/profile/shop-a'))).posts,2);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM platform_post_comments WHERE shop_id=10 AND product_id=?').get(-made.item.postId).n,0,'removing a post removes its comments');
});

test('the profile page, + Add sheet and Work link are wired',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const js=read('public/profile-menu.js'),feed=read('public/shops-feed.js'),admin=read('public/admin.js'),server=read('lib/platform.js');
 assert.match(js,/data-pm="personal"/);assert.match(js,/data-pm="work"/);assert.match(js,/\/admin\?add=1'/);
 assert.match(admin,/get\("add"\)!=="1"/,'Work opens the Add Product form');
 assert.match(feed,/fetch\('\/api\/platform\/posts'/,'Discover shows personal posts');
 assert.match(server,/DELETE FROM platform_posts WHERE shop_id=\?/,'deleting a shop removes its posts');
 assert.match(read('public/profile-menu.css'),/\.profile-home\{[^}]*min-height:calc\(100svh/,'the profile fills the screen');
});
