// 1.1.291 owner "User show": the shop owner chooses what visitors see of every product.
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform'),view=require('../lib/visitor-view');

test('visitors of a shop get only the fields the owner left on, and only the first photos',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-vv-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','A');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'vv','VV',1,'active')");
 db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES('p1',10,'image','image/jpeg',1,'1.jpg',1),('p2',10,'image','image/jpeg',1,'2.jpg',1),('p3',10,'image','image/jpeg',1,'3.jpg',1)").run();
 db.prepare('INSERT INTO platform_products(shop_id,sku,name,description,category,price,stock,image_id,details) VALUES(10,?,?,?,?,5000,3,?,?)').run('SKU-1','Pump','Secret description','Parts','p1',JSON.stringify({partNo:'K5V140',descriptionMy:'မြန်မာ',imageIds:['p1','p2','p3']}));
 const app=express();app.use(express.json(),session({secret:'vv-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true});});
 let s=await(await fetch(base+'/api/platform/store/vv')).json();
 assert.equal(s.viewer,'visitor');assert.equal(s.products[0].sku,'SKU-1','everything shows until the owner turns something off');
 db.prepare('UPDATE platform_shops SET settings=? WHERE id=10').run(JSON.stringify({visitorView:{sku:false,partNo:false,description:false,price:false,photos:2}}));
 s=await(await fetch(base+'/api/platform/store/vv')).json();const p=s.products[0],d=JSON.parse(p.details);
 assert.equal(p.sku,'');assert.equal(d.partNo,undefined);assert.equal(p.description,'');assert.equal(d.descriptionMy,undefined);
 assert.deepEqual(d.imageIds,['p1','p2']);assert.equal(p.price,5000,'the cart still needs the price; the page hides it');
 assert.deepEqual(s.settings.visitorView,{sku:false,partNo:false,price:false,stock:true,description:false,photos:2});
 assert.doesNotMatch(JSON.stringify(s.products),/SKU-1|K5V140|Secret description|p3/);
 const feed=await(await fetch(base+'/api/platform/feed')).json();
 assert.equal(feed.items[0].price,null);assert.equal(feed.items[0].description,'');assert.equal(feed.items[0].images.length,2);
});

test('settings are checked, GearHub store uses the same rules, and the page hides price and stock',()=>{
 assert.deepEqual(view.normalize({sku:false,photos:99}),{sku:false,partNo:true,price:true,stock:true,description:true,photos:0});
 assert.deepEqual(view.hidden({price:false,stock:false}),['price','stock']);
 const main=view.forVisitorMain({sku:'A',part_no:'B',description_en:'x',description_my:'y',imageUrls:['1','2','3']},{sku:false,partNo:false,description:false,photos:1});
 assert.deepEqual([main.sku,main.part_no,main.description_en,main.description_my,main.imageUrls],['','','','',['1']]);
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('server.js'),/res\.json\(isGearHubOwner\(req\) \? rows\.map\(publicProduct\) : rows\.map\(p => visitorView\.forVisitorMain\(publicProduct\(p\), view\)\)\);/);
 assert.match(read('server.js'),/visitorView: previous\.visitorView,/,'saving Appearance keeps the User show choices');
 assert.match(read('public/style.css'),/html\[data-visitor-hide~="price"\] \.product \.price/);
 assert.match(read('public/tenant-admin.js'),/if\(suffix==='\/visitor-view'\)return await call\('\/visitor-view',options\);/);
 assert.match(read('public/admin.html'),/<script src="\/user-show\.js\?v=[^"]+"><\/script>/);
});
