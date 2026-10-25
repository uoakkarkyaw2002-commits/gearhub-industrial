// Photo search: the shop's scan button sends the camera frame to the server, which compares it with every
// product photo (DINOv2 image model) and the best match is highlighted like an Excel search match.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('the scan button runs a live camera scanner and asks the shop server; the best match is highlighted',()=>{
 const scan=read('public/photo-scan.js'),store=read('public/store.js'),index=read('public/index.html');
 assert.match(scan,/navigator\.mediaDevices\.getUserMedia\(\{video:\{facingMode:\{ideal:'environment'\}/,'the scan button opens the camera at once');
 assert.match(scan,/const API='\/api\/platform\/store\/'\+encodeURIComponent\(decodeURIComponent\(slug\)\)\+'\/photo-search';/);
 assert.match(scan,/'X-CSRF-Token':await csrf\(\)/);
 assert.match(scan,/const SURE=0\.6,LEAD=0\.03;/,'blank or blurred frames (~0.35) never count');
 assert.match(scan,/if\(sure&&last===a\.id\)/,'the same product sure twice in a row');
 assert.match(scan,/el\.classList\.add\('photo-match'\)/);
 assert.match(scan,/gallery\.type='file';gallery\.accept='image\/\*'/,'photos from the gallery');
 assert.doesNotMatch(scan,/first time only|loadGraphModel/,'no on-phone model and no first-time message');
 assert.doesNotMatch(store,/photoScanIds/);
 assert.ok(!fs.existsSync(path.join(root,'public','vendor','tf.min.js')),'the on-phone model is gone');
 assert.match(index,/<script src="\/photo-scan\.js\?v=20261026-server-scan-1"><\/script>/);
});

test('the photo-search API is public per shop, rate limited, takes a picture and stays inside the shop',()=>{
 const platform=read('lib/platform.js'),ps=read('lib/photo-search.js');
 const route=platform.slice(platform.indexOf('"/store/:slug/photo-search"'),platform.indexOf('"/store/:slug/orders"'));
 assert.match(route,/rateLimit\(\{ windowMs: 60 \* 1000, limit: 120 \}\)/);
 assert.match(route,/express\.raw\(\{ type: \["image\/jpeg", "image\/png", "image\/webp"\], limit: "4mb" \}\)/);
 assert.match(route,/const s = publicShop\(req\.params\.slug\);/);
 for(const q of ps.matchAll(/(SELECT|UPDATE|DELETE)[^"]*platform_(products|files)[^"]*/g))assert.match(q[0],/shop_id=\?/,q[0]);
 assert.ok(fs.statSync(path.join(root,'models','dinov2-small-q8.onnx')).size>2e7);
 assert.match(read('.npmrc'),/onnxruntime-node-install-cuda=skip/,'no GPU downloads on Render');
});

test('the server finds the product whose photo looks like the scan (real model run)',async()=>{
 const sharp=require('sharp'),Database=require('better-sqlite3'),{createPhotoSearch}=require('../lib/photo-search');
 const media=fs.mkdtempSync(path.join(os.tmpdir(),'photo-search-'));fs.mkdirSync(path.join(media,'7'));
 const shape=(svg,bg='#ffffff')=>sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="'+bg+'"/>'+svg+'</svg>')).jpeg().toBuffer();
 const gear='<circle cx="200" cy="200" r="150" fill="#c9a227"/><circle cx="200" cy="200" r="55" fill="#ffffff"/>'+[0,1,2,3,4,5].map(i=>'<rect x="190" y="40" width="20" height="40" fill="#ffffff" transform="rotate('+i*60+' 200 200)"/>').join('');
 const shaft='<rect x="40" y="170" width="320" height="60" rx="20" fill="#5b6470"/><rect x="60" y="160" width="40" height="80" fill="#3d444d"/>';
 const db=new Database(':memory:');db.exec("CREATE TABLE platform_shops(id INTEGER,legacy INTEGER);CREATE TABLE platform_products(id INTEGER,shop_id INTEGER,image_id TEXT,details TEXT,active INTEGER);CREATE TABLE platform_files(id TEXT,shop_id INTEGER,kind TEXT,ready INTEGER,filename TEXT);");
 for(const [pid,svg] of [[1,gear],[2,shaft]]){const id='img'+pid;fs.writeFileSync(path.join(media,'7',id+'.jpg'),await shape(svg));db.prepare('INSERT INTO platform_products VALUES(?,7,?,?,1)').run(pid,id,JSON.stringify({imageIds:[id]}));db.prepare("INSERT INTO platform_files VALUES(?,7,'image',1,?)").run(id,id+'.jpg')}
 // another shop's photo must never be compared
 db.prepare("INSERT INTO platform_files VALUES('other',8,'image',1,'x.jpg')").run();db.prepare("INSERT INTO platform_products VALUES(9,8,'other','{}',1)").run();
 const ps=createPhotoSearch({db,media}),shop={id:7};
 const scan=await shape('<g transform="translate(60 40) scale(.8) rotate(12 200 200)">'+gear+'</g>','#8a7a66');
 assert.equal((await ps.search(shop,scan)).ready,false,'learns the shop first');
 await ps.learn(shop);
 const r=await ps.search(shop,scan);
 assert.equal(r.ready,true);assert.deepEqual(r.matches.map(m=>m.id),['1','2']);assert.ok(r.matches[0].score>r.matches[1].score);
 assert.ok(fs.existsSync(path.join(media,'7','.photo-looks','img1.dinov2s.f32')),'looks are kept next to the photos');
 fs.rmSync(media,{recursive:true,force:true});
});
