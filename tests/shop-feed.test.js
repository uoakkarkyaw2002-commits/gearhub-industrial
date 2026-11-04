const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express'), session = require('express-session'), Database = require('better-sqlite3');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const model = require('../lib/platform-model'), {createPlatform} = require('../lib/platform');

test('public feed pages all eligible shops with stable cursors and only owned, ready product photos', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-feed-')),db=new Database(':memory:');model.migrate(db);
  db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','secret-a@example.test','A'),(11,'b','secret-b@example.test','B'),(12,'c','secret-c@example.test','C');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'feed-a','Feed A',1,'active'),(11,11,'feed-b','Feed B',1,'active'),(12,12,'hidden','Hidden',1,'active')");
  const add=db.prepare('INSERT INTO platform_products(shop_id,sku,name,description,category,price,stock,image_id,details) VALUES(?,?,?,?,?,1000,0,?,?)');
  const ids=[];
  for(let i=0;i<25;i++)ids.push(Number(add.run(i%2?10:11,'SKU'+i,'Item '+i,'Caption '+i,'Parts','owned-'+(i%2?10:11),JSON.stringify({imageIds:['owned-10','owned-11','pending'],promotionPrice:800,secret:'private detail'})).lastInsertRowid));
  const hidden=Number(add.run(12,'HIDDEN','Private stock','Do not leak','Parts',null,'{}').lastInsertRowid);
  const inactive=Number(add.run(10,'INACTIVE','Inactive','Do not leak','Parts',null,'{}').lastInsertRowid);db.prepare('UPDATE platform_products SET active=0 WHERE shop_id=? AND id=?').run(10,inactive);
  const trashed=Number(add.run(11,'TRASH','Deleted','Do not leak','Parts',null,'{}').lastInsertRowid);db.prepare('UPDATE platform_products SET trashed_at=CURRENT_TIMESTAMP WHERE shop_id=? AND id=?').run(11,trashed);
  db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES('owned-10',10,'image','image/jpeg',10,'a.jpg',1),('owned-11',11,'image','image/jpeg',10,'b.jpg',1),('pending',10,'image','image/jpeg',10,'pending.jpg',0)").run();
  db.prepare('UPDATE platform_shops SET settings=? WHERE id=10').run(JSON.stringify({bankAccountNumber:'private-account',appearance:{brandName:'Branded A',logoUrl:'/api/platform/images/owned-11'}}));
  db.prepare("UPDATE platform_shops SET status='suspended' WHERE id=12").run();
  const app=express();app.use(express.json(),session({secret:'feed-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
  app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(root,{recursive:true,force:true});});
  const response=await fetch(base+'/api/platform/feed');assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
  const first=await response.json();assert.equal(first.items.length,20);assert.equal(first.items[0].id,ids.at(-1));assert.equal(first.nextBefore,String(ids.at(-20)));
  for(const item of first.items){
    const shopId=item.shop.name==='Branded A'?10:11;
    assert.deepEqual(item.images,['/api/platform/images/owned-'+shopId]);
    assert.equal(item.shop.logo,null,'cross-shop branding is never adopted');
    assert.equal(item.price,800);assert.equal(item.originalPrice,1000);assert.equal(item.stock,0,'out-of-stock public items remain discoverable');
    assert.ok(![hidden,inactive,trashed].includes(item.id));
  }
  assert.doesNotMatch(JSON.stringify(first),/private-account|secret-[abc]@|private detail|owner_id|settings/);
  add.run(10,'NEW','Arrived between pages','New caption','Parts',null,'{}');
  const second=await(await fetch(base+'/api/platform/feed?before='+first.nextBefore)).json();assert.equal(second.items.length,5);assert.equal(second.nextBefore,null);
  assert.deepEqual([...first.items,...second.items].map(item=>item.id),[...ids].reverse(),'new inserts cannot duplicate or skip existing pages');
  for(const cursor of ['-1','0','1.5','NaN','9007199254740993','1&before=2'])assert.equal((await fetch(base+'/api/platform/feed?before='+cursor)).status,400);
  db.prepare("UPDATE platform_users SET status='suspended' WHERE id=10").run();
  let visible=await(await fetch(base+'/api/platform/feed')).json();assert.ok(visible.items.every(item=>item.shop.name==='Feed B'));
  db.prepare("UPDATE platform_shops SET ends_at='2000-01-01T00:00:00Z' WHERE id=11").run();
  visible=await(await fetch(base+'/api/platform/feed')).json();assert.deepEqual(visible,{items:[],nextBefore:null});
});

test('Shops navigation preserves existing destinations and the confirmed build gate', () => {
  const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
  const html=read('index.html');
  for(const name of ['mobile-bottom-nav','desktop-top-nav']){
    const nav=html.match(new RegExp('<nav class="'+name+'"[\\s\\S]*?</nav>'))[0];
    const views=[...nav.matchAll(/data-store-view="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(views,['home','shops','category','promotion','profile']);
    assert.match(nav,/data-store-action="open-cart"/);
  }
  assert.match(read('store.js'),/window\.GearHubShops\?\.setActive\(storeView==="shops"\)/);
  assert.match(read('back-nav.js'),/\["shops-photo-dialog","shops-photo-close"\]/);
  assert.match(read('sw.js'),/"\/shops-feed\.js\?v=1\.1\.298"/);
  assert.match(fs.readFileSync(path.join(__dirname,'../lib/shop-releases.js'),'utf8'),/function published\(\)/,'feed frontend follows the existing saved-build approval gate');
});
