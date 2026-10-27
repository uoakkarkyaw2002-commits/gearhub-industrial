// Free AI (FREE_AI_PLAN.md): everything runs on the shop server, with no outside service.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

async function shopWithPhotos(){
 const sharp=require('sharp'),Database=require('better-sqlite3'),{createPhotoSearch}=require('../lib/photo-search');
 const media=fs.mkdtempSync(path.join(os.tmpdir(),'free-ai-'));fs.mkdirSync(path.join(media,'7'));
 const shape=(svg,bg='#ffffff')=>sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="'+bg+'"/>'+svg+'</svg>')).jpeg().toBuffer();
 const gear='<circle cx="200" cy="200" r="150" fill="#c9a227"/><circle cx="200" cy="200" r="55" fill="#ffffff"/>'+[0,1,2,3,4,5].map(i=>'<rect x="190" y="40" width="20" height="40" fill="#ffffff" transform="rotate('+i*60+' 200 200)"/>').join('');
 const shaft='<rect x="40" y="170" width="320" height="60" rx="20" fill="#5b6470"/><rect x="60" y="160" width="40" height="80" fill="#3d444d"/>';
 const settings={categories:[{id:1,category_en:'Power',category_my:'Power'},{id:2,category_en:'Gears',category_my:'ဂီယာ',parent_en:'Power',parent_id:1},{id:3,category_en:'Shafts',category_my:'Shafts'}]};
 const db=new Database(':memory:');db.exec("CREATE TABLE platform_shops(id INTEGER,legacy INTEGER,settings TEXT);CREATE TABLE platform_products(id INTEGER,shop_id INTEGER,sku TEXT,name TEXT,category TEXT,image_id TEXT,details TEXT,active INTEGER);CREATE TABLE platform_files(id TEXT,shop_id INTEGER,kind TEXT,ready INTEGER,filename TEXT);");
 const photos={};
 for(const [pid,svg,cat,cid] of [[1,gear,'Gears',2],[2,shaft,'Shafts',3]]){const id='img'+pid;photos[pid]=await shape(svg);fs.writeFileSync(path.join(media,'7',id+'.jpg'),photos[pid]);db.prepare('INSERT INTO platform_products VALUES(?,7,?,?,?,?,?,1)').run(pid,'SKU-'+pid,pid===1?'Gear wheel':'Drive shaft',cat,id,JSON.stringify({imageIds:[id],categoryId:cid}));db.prepare("INSERT INTO platform_files VALUES(?,7,'image',1,?)").run(id,id+'.jpg')}
 const shop={id:7,settings:JSON.stringify(settings)},ps=createPhotoSearch({db,media});await ps.learn(shop);
 return {ps,shop,shape,gear,photos,done:()=>fs.rmSync(media,{recursive:true,force:true})};
}

test('#2 #3 #4 a new product photo: category of its look-alikes, the same part already in the shop, dark or blurred',async()=>{
 const sharp=require('sharp'),{ps,shop,shape,gear,photos,done}=await shopWithPhotos();
 try{
  const newGear=await shape('<g transform="translate(60 40) scale(.8) rotate(12 200 200)">'+gear+'</g>','#8a7a66');
  const r=await ps.insight(shop,newGear);
  assert.equal(r.ready,true);assert.equal(r.categories[0].name,'Gears');assert.equal(r.categories[0].id,2);assert.equal(r.categories[0].path,'Power › Gears');assert.equal(r.categories[0].example,'Gear wheel');
  assert.deepEqual(r.duplicates,[],'a different photo of a gear is not a duplicate');
  const same=await ps.insight(shop,photos[1]);assert.equal(same.duplicates[0].id,'1');assert.equal(same.duplicates[0].sku,'SKU-1');
  assert.deepEqual((await ps.insight(shop,photos[1],{exclude:1})).duplicates,[],'editing that product itself is not a duplicate');
  assert.deepEqual([r.quality.dark,r.quality.blurry],[false,false]);
  const dark=await sharp(newGear).linear(0.2,0).jpeg().toBuffer();assert.equal((await ps.quality(dark)).dark,true);
  const blurred=await sharp(newGear).blur(6).jpeg().toBuffer();assert.equal((await ps.quality(blurred)).blurry,true);
 }finally{done()}
});

test('the shop admin asks the server (seller shops only) and shows advice under "Choose photos"',()=>{
 const platform=read('lib/platform.js'),ui=read('public/product-ai.js'),admin=read('public/admin.html'),tenant=read('public/tenant-admin.js');
 const route=platform.slice(platform.indexOf('"/shops/:id/ai/photo"'),platform.indexOf('"/store/:slug/orders"'));
 assert.match(route,/const \{ shop \} = shopFor\(req, "products"\);/,'only this shop\'s owner or the GearHub owner');
 assert.match(route,/rateLimit\(\{ windowMs: 60 \* 1000, limit: 60 \}\)/);
 assert.match(tenant,/ai:\(suffix,options=\{\}\)=>call\('\/ai'\+suffix,options\)/);
 assert.match(ui,/input\.addEventListener\("change",check\);/);
 assert.match(ui,/if\(id\)id\.value=c\.id\?\?"";/,'one tap fills the category with its ID');
 assert.match(admin,/<script src="\/product-ai\.js\?v=[^"]+"><\/script>/);
});
