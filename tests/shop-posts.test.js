// 1.1.296 owner: Shops posts get likes and comments (Google sign-in only) and a Buy Now sheet; saved posts stay on the phone.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express'), session = require('express-session'), Database = require('better-sqlite3');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const model = require('../lib/platform-model'), {createPlatform} = require('../lib/platform');

test('likes and comments: signed-in only, CSRF checked, per shop, removable by writer, shop owner or GearHub owner', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-posts-')),db=new Database(':memory:');model.migrate(db);
  db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','owner-a@example.test','Shop A'),(11,'b','owner-b@example.test','Shop B'),(20,'c','buyer@example.test','Buyer'),(21,'d','boss@example.test','Boss');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active'),(11,11,'shop-b','Shop B',1,'active');INSERT OR REPLACE INTO platform_meta(key,value) VALUES('owner_sub','d')");
  const add=db.prepare('INSERT INTO platform_products(shop_id,sku,name,price,stock,details) VALUES(?,?,?,1000,5,?)');
  const a=Number(add.run(10,'A-1','Part A',JSON.stringify({partNo:'PN-A'})).lastInsertRowid),b=Number(add.run(11,'B-1','Part B','{}').lastInsertRowid);
  const app=express();app.use(express.json(),session({secret:'posts-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
  app.post('/test-login/:id',(req,res)=>{req.session.platformUser=Number(req.params.id);req.session.save(()=>res.end())});
  app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{PLATFORM_OWNER_EMAIL:'boss@example.test'}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
  async function as(id){
    let cookie='';const keep=r=>{const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r};
    if(id)keep(await fetch(base+'/test-login/'+id,{method:'POST'}));
    const token=(await keep(await fetch(base+'/api/platform/me',{headers:{cookie}})).json()).csrfToken;
    const f=(url,method='GET',body)=>fetch(base+'/api/platform'+url,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined});
    f.form=(url,form)=>fetch(base+'/api/platform'+url,{method:'POST',headers:{cookie,'X-CSRF-Token':token},body:form});return f;
  }
  const guest=await as(0),buyer=await as(20),ownerA=await as(10),ownerB=await as(11),boss=await as(21);
  let feed=await(await guest('/feed')).json();
  const itemA=feed.items.find(i=>i.id===a);
  assert.deepEqual([itemA.sku,itemA.partNo,itemA.likes,itemA.comments,itemA.liked,itemA.shop.slug],['A-1','PN-A',0,0,false,'shop-a']);
  assert.equal((await guest('/feed/shop-a/'+a+'/like','POST',{})).status,401,'Google sign-in is needed to like');
  assert.equal((await guest('/feed/shop-a/'+a+'/comments','POST',{body:'hi'})).status,401);
  assert.equal((await fetch(base+'/api/platform/feed/shop-a/'+a+'/like',{method:'POST'})).status,403,'no CSRF token');
  assert.equal((await buyer('/feed/shop-b/'+a+'/like','POST',{})).status,404,'a product is only a post of its own shop');
  assert.deepEqual(await(await buyer('/feed/shop-a/'+a+'/like','POST',{})).json(),{liked:true,likes:1});
  assert.deepEqual(await(await ownerB('/feed/shop-a/'+a+'/like','POST',{})).json(),{liked:true,likes:2});
  assert.deepEqual(await(await buyer('/feed/shop-a/'+a+'/like','POST',{})).json(),{liked:false,likes:1},'pressing again takes the like back');
  assert.equal((await buyer('/feed/shop-a/'+a+'/comments','POST',{body:'   '})).status,400);
  assert.equal((await buyer('/feed/shop-a/'+a+'/comments','POST',{body:'x'.repeat(1001)})).status,400);
  const posted=await(await buyer('/feed/shop-a/'+a+'/comments','POST',{body:'Do you have 2?'})).json();
  assert.equal(posted.count,1);assert.deepEqual([posted.comments[0].name,posted.comments[0].body,posted.comments[0].mine,posted.comments[0].canDelete],['Buyer','Do you have 2?',true,true]);
  assert.doesNotMatch(JSON.stringify(posted),/@example\.test/,'never shows e-mail addresses');
  assert.equal((await buyer('/feed/shop-a/'+a+'/comments','POST',{body:'again'})).status,429,'a short wait between comments');
  const id=posted.comments[0].id;
  // 1.1.316: replies hang under the first comment of a thread; each comment has its own likes.
  await new Promise(r=>setTimeout(r,3100));
  let th=await(await ownerA('/feed/shop-a/'+a+'/comments','POST',{body:'Yes, 2 left',parentId:id})).json();
  const reply=th.comments.find(c=>c.body==='Yes, 2 left');assert.equal(reply.parentId,id);
  await new Promise(r=>setTimeout(r,3100));
  th=await(await buyer('/feed/shop-a/'+a+'/comments','POST',{body:'Thanks',parentId:reply.id})).json();
  assert.equal(th.comments.find(c=>c.body==='Thanks').parentId,id,'a reply to a reply stays in the thread');
  assert.equal((await ownerB('/feed/shop-a/'+a+'/comments','POST',{body:'x',parentId:999999})).status,404);
  th=await(await ownerB('/feed/shop-a/'+a+'/comments/'+id+'/like','POST',{})).json();assert.deepEqual([th.comments[0].likes,th.comments[0].liked],[1,true]);
  th=await(await ownerB('/feed/shop-a/'+a+'/comments/'+id+'/like','POST',{})).json();assert.equal(th.comments[0].likes,0,'tap again takes it back');
  await ownerB('/feed/shop-a/'+a+'/comments/'+reply.id+'/like','POST',{});
  assert.equal((await guest('/feed/shop-a/'+a+'/comments/'+id+'/like','POST',{})).status,401);
  for(const c of th.comments.filter(c=>c.parentId))await ownerA('/feed/shop-a/'+a+'/comments/'+c.id,'DELETE');
  // 1.1.318: a sticker comment, and a photo comment (the photo is sent first, kept in the post's shop).
  await new Promise(r=>setTimeout(r,3100));
  assert.equal((await ownerB('/feed/shop-a/'+a+'/comments','POST',{sticker:'../x'})).status,400);
  th=await(await ownerB('/feed/shop-a/'+a+'/comments','POST',{sticker:'love'})).json();assert.equal(th.comments.find(c=>c.sticker==='love').body,'');
  assert.equal((await ownerB('/feed/shop-a/'+a+'/comments','POST',{photoId:'not-mine'})).status,400,'only a photo this person just sent');
  const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf00000301010018dd8db00000000049454e44ae426082','hex');
  const fd=new FormData();fd.append('file',new Blob([png],{type:'image/png'}),'p.png');
  const up=await ownerB.form('/feed/shop-a/'+a+'/comment-photo',fd);assert.equal(up.status,201,'photo upload');const {photoId}=await up.json();
  await new Promise(r=>setTimeout(r,3100));
  th=await(await ownerB('/feed/shop-a/'+a+'/comments','POST',{photoId})).json();const pc=th.comments.find(c=>c.photo);assert.equal(pc.photo,'/api/platform/images/'+photoId);
  assert.equal(db.prepare('SELECT shop_id FROM platform_files WHERE id=?').get(photoId).shop_id,10,'kept in the post shop storage');
  assert.equal((await ownerB('/feed/shop-a/'+a+'/comments','POST',{photoId})).status,400,'a photo is used once');
  await ownerB('/feed/shop-a/'+a+'/comments/'+pc.id,'DELETE');assert.equal(db.prepare('SELECT COUNT(*) n FROM platform_files WHERE id=?').get(photoId).n,0,'deleting the comment deletes the photo');
  for(const c of (await(await ownerB('/feed/shop-a/'+a+'/comments')).json()).comments.filter(c=>c.mine))await ownerB('/feed/shop-a/'+a+'/comments/'+c.id,'DELETE');

  const seen=await(await guest('/feed/shop-a/'+a+'/comments')).json();assert.deepEqual([seen.signedIn,seen.count,seen.comments[0].canDelete],[false,1,false]);
  assert.equal((await ownerB('/feed/shop-a/'+a+'/comments/'+id,'DELETE')).status,403,'another shop cannot remove it');
  assert.equal((await buyer('/feed/shop-b/'+b+'/comments/'+id,'DELETE')).status,404);
  assert.equal((await(await ownerA('/feed/shop-a/'+a+'/comments')).json()).comments[0].canDelete,true,'the shop owner can remove comments on the shop');
  assert.equal((await(await boss('/feed/shop-a/'+a+'/comments/'+id,'DELETE')).json()).count,0,'the GearHub owner can remove it too');
  feed=await(await ownerB('/feed')).json();assert.deepEqual([feed.items.find(i=>i.id===a).likes,feed.items.find(i=>i.id===a).liked],[1,true]);
  // 1.1.298: search, Trending and Following.
  const ids=r=>r.items.map(i=>i.id);
  assert.deepEqual(ids(await(await guest('/feed?q=part%20b')).json()),[b],'product name');
  assert.deepEqual(ids(await(await guest('/feed?q=a-1')).json()),[a],'SKU');
  assert.deepEqual(ids(await(await guest('/feed?q=shop%20b')).json()),[b],'shop name');
  assert.deepEqual(ids(await(await guest('/feed?q=%25')).json()),[],'% is a letter, not a wildcard');
  const trend=await(await guest('/feed?mode=trending')).json();assert.deepEqual([ids(trend),trend.nextBefore],[[a],null],'only liked or commented posts, most first');
  assert.deepEqual(ids(await(await guest('/feed?shops=shop-b')).json()),[b],'Following = the shops this phone follows');
  assert.deepEqual(ids(await(await guest('/feed?shops=nope')).json()),[]);
  db.prepare('UPDATE platform_shops SET settings=? WHERE id=10').run(JSON.stringify({visitorView:{sku:false,partNo:false}}));
  assert.deepEqual(ids(await(await guest('/feed?q=a-1')).json()),[],'a hidden SKU is not searchable');
  feed=await(await guest('/feed')).json();assert.deepEqual([feed.items.find(i=>i.id===a).sku,feed.items.find(i=>i.id===a).partNo],['',''],'User show switches still hide SKU / Part No');
});

test('the feed page has the new post design, Buy Now sheet, saved posts in Settings and comes back after sign-in', () => {
  const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
  const js=read('public/shops-feed.js'),html=read('public/index.html'),server=read('lib/platform.js'),store=read('public/store.js');
  for(const hook of ['data-feed-like','data-feed-comments','data-feed-buy','data-feed-save','data-feed-menu','shops-photo-count','data-feed-tab','data-feed-follow','shops-top-search'])assert.ok(js.includes(hook),hook);
  assert.match(js,/const SAVED = 'gh-saved-posts';/,'saved posts stay on the phone');
  assert.match(js,/const key = 'gh-shop-cart:' \+/,'Buy Now writes the cart of the post\'s own shop');
  assert.match(store,/addEventListener\("gearhub:cart-changed"/);
  assert.match(html,/id="saved-posts-action"/);
  assert.match(read('public/back-nav.js'),/\["shops-sheet","shops-sheet-close"\]/);
  assert.match(server,/if \(stored\.back\) return res\.redirect\(stored\.back\);/);
  assert.doesNotMatch(read('public/shops-feed.css'),/shops-post-track/,'1.1.298: one photo per post, no sideways scroller to catch a drag');
  assert.match(read('public/shops-feed.css'),/\.shops-post-media img\{position:absolute;inset:0;/,'the photo is drawn in the middle of its frame on iPhone');
  assert.match(server,/DELETE FROM platform_post_comments WHERE shop_id=\?/,'deleting a shop removes its comments');
});
