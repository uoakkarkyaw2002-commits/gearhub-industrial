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
 const add=async(pid,svg,bg)=>{const id='img'+pid;fs.writeFileSync(path.join(media,'7',id+'.jpg'),await shape(svg,bg));db.prepare('INSERT INTO platform_products VALUES(?,7,?,?,?,?,?,1)').run(pid,'SKU-'+pid,'Part '+pid,'Gears',id,JSON.stringify({imageIds:[id]}));db.prepare("INSERT INTO platform_files VALUES(?,7,'image',1,?)").run(id,id+'.jpg');await ps.learn(shop)};
 return {ps,shop,shape,gear,photos,add,done:()=>fs.rmSync(media,{recursive:true,force:true})};
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

test('#5 smarter search finds spelling mistakes, any word order and codes without dashes',()=>{
 const {matches}=require('../public/smart-search.js'),t='switch starter k1001858a electrical parts sany';
 for(const q of ['startr swich','starter switch','k100-1858','k1001858','electrcal'])assert.equal(matches(t,q),true,q);
 for(const q of ['pump','gear wheel'])assert.equal(matches(t,q),false,q);
 const store=read('public/store.js'),index=read('public/index.html'),sw=read('public/sw.js');
 assert.match(store,/if\(window\.GearHubSmartSearch&&q\.trim\(\)\.length>=3\)\{const seen=new Set\(list\);list=list\.concat\(/,'exact matches first, then the smart ones');
 assert.match(index,/<script src="\/smart-search\.js\?v=([^"]+)"><\/script><script src="\/store\.js\?v=\1"><\/script>/);
 assert.match(sw,/"\/smart-search\.js\?v=1\.1\.207"/);
});

test('#6 similar parts: the product that looks most alike comes first; a product is never similar to itself',async()=>{
 const {ps,shop,gear,add,done}=await shopWithPhotos();
 try{
  await add(3,'<g transform="rotate(20 200 200) scale(.9) translate(20 20)">'+gear+'</g>','#f2f2f2');
  const r=await ps.similar(shop,1);
  assert.equal(r.ready,true);assert.equal(r.products[0].id,'3','the other gear');assert.ok(!r.products.some(p=>p.id==='1'));
  assert.ok(r.products.every((p,i,a)=>i===0||a[i-1].score>=p.score));
  const platform=read('lib/platform.js'),ui=read('public/similar-parts.js');
  assert.match(platform,/"\/store\/:slug\/similar\/:product"/);
  assert.match(ui,/window\.openGallery=function\(id,index\)\{open\(id,index\);/,"shown each time a product's photos open");
 }finally{done()}
});

test('#7 #8 reading text: part numbers on a label, amount and transaction ID on a payment receipt',async()=>{
 const sharp=require('sharp'),{createOcr,labelCodes,matchCodes,readReceipt}=require('../lib/ocr');
 const page=lines=>sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="'+(80+lines.length*70)+'"><rect width="100%" height="100%" fill="#fff"/>'+lines.map((l,i)=>'<text x="40" y="'+(80+i*70)+'" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#111">'+l+'</text>').join('')+'</svg>')).png().toBuffer();
 const ocr=createOcr();
 const label=await ocr.read(await page(['POLESTAR PARTS','PART NO: K1001858A']));
 assert.deepEqual(matchCodes(labelCodes(label),[{id:6,sku:'K1001858A',partNo:'K1001858A'},{id:7,sku:'300426-00202'}]).map(m=>m.id),['6']);
 // OCR swaps (O/0, I/1) and codes printed inside longer ones still match.
 assert.deepEqual(matchCodes(['K1OO1858A','XX300426002O2'],[{id:6,sku:'K1001858A'},{id:7,sku:'300426-00202'}]).map(m=>m.id),['6','7']);
 const receipt=readReceipt(await ocr.read(await page(['Transfer Successful','-55,000.00 Ks','Transaction ID 01003984529183745','To 09 123 456 789'])),55000);
 assert.equal(receipt.amount,55000);assert.equal(receipt.matches,true);assert.equal(receipt.transactionId,'01003984529183745');
 assert.equal(readReceipt('Amount 50,000 MMK\nTransaction No. 9876543210123',55000).matches,false,'a different amount is flagged');
 const platform=read('lib/platform.js'),scan=read('public/photo-scan.js');
 assert.match(platform,/"\/store\/:slug\/read-label"/);
 assert.match(platform,/"\/shops\/:id\/orders\/:order\/receipt-read"[\s\S]{0,200}const \{ shop \} = shopFor\(req, "orders"\);/,'only the shop (or GearHub owner) reads its receipts');
 assert.match(platform,/if \(d\.receiptRead\?\.receiptId === o\.receipt_id\) return res\.json\(d\.receiptRead\);/,'each receipt is read once');
 assert.match(scan,/class="photo-scanner-label"/);
});

test('#8 the receipt line under an order is styled and only shown when the order has a receipt',()=>{
 const od=read('public/order-detail.js'),css=read('public/site-admin.css'),tenant=read('public/tenant-admin.js');
 assert.match(od,/\(order\.hasReceipt\?'<p class="od-ai-receipt" data-ai-receipt="'\+Number\(order\.id\)\+'" hidden><\/p>':''\)/);
 assert.match(od,/shown=html;host\.innerHTML=html;readReceipt\(host\);/);
 assert.match(css,/\.od-ai-receipt\.od-ai-warn\{background:#fff6e5;color:#7a4b00\}/);
 assert.match(tenant,/receiptRead:async o=>\{const r=await call\('\/orders\/'\+encodeURIComponent\(o\.id\)\+'\/receipt-read'\);/);
});
