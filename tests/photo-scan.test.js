// Photo search: the shop's scan button sends the camera frame to the server, which compares it with every
// product photo (DINOv2 image model) and the best match is highlighted like an Excel search match.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('the scan button runs a live camera scanner and asks the shop server; the best match is highlighted',()=>{
 const scan=read('public/photo-scan.js'),store=read('public/store.js'),index=read('public/index.html');
 assert.match(scan,/navigator\.mediaDevices\.getUserMedia\(\{video:\{facingMode:\{ideal:'environment'\}/,'the scan button opens the camera at once');
 assert.match(scan,/const API='\/api\/platform\/store\/'\+encodeURIComponent\(decodeURIComponent\(slug\)\)\+'\/photo-search';/);
 assert.match(scan,/'X-CSRF-Token':await csrf\(\)/);
 assert.match(scan,/const SURE=0\.6,LEAD=0\.03,/,'blank or blurred frames (~0.35) never count');
 assert.match(scan,/if\(quick\|\|\(sure&&last===a\.id\)\)/,'the same product sure twice in a row');
 assert.match(scan,/el\.classList\.add\('photo-match'\)/);
 assert.match(scan,/gallery\.type='file';gallery\.accept='image\/\*'/,'photos from the gallery');
 assert.doesNotMatch(scan,/first time only|loadGraphModel/,'no on-phone model and no first-time message');
 assert.doesNotMatch(store,/photoScanIds/);
 assert.ok(!fs.existsSync(path.join(root,'public','vendor','tf.min.js')),'the on-phone model is gone');
 assert.match(index,/<script src="\/photo-scan\.js\?v=1\.1\.277"><\/script>/);
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
 assert.deepEqual({photo:r.matches[0].photo,photos:r.matches[0].photos},{photo:1,photos:1},'says which of the product\'s photos matched (the reason)');assert.ok([0,1,2,3].includes(r.matches[0].view));
 assert.ok(fs.existsSync(path.join(media,'7','.photo-looks','img1.dinov2s.f32')),'looks are kept next to the photos');
 fs.rmSync(media,{recursive:true,force:true});
});

test('closing a product (✕ or Back) keeps the shop where it was (iPhone jumped to the top)',()=>{
 const back=read('public/back-nav.js'),store=read('public/store.js'),dialogs=read('public/dialogs.js');
 assert.match(back,/if\('scrollRestoration' in history\)history\.scrollRestoration='manual';/,'the browser restored the scroll it saved while the page was locked (0)');
 assert.match(store,/if\(!document\.body\.classList\.contains\("gallery-open"\)\)galleryScrollY=scrollY;/);
 assert.match(store,/if\(wasOpen\)scrollTo\(0,galleryScrollY\)/);
 assert.match(dialogs,/target\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(dialogs,/const opener=entry\.opener!==document\.body&&entry\.opener;/,'never focus the page itself');
});

test('the scanner counts seconds, stops after 15 s with "No match found", and says why it matches',()=>{
 const scan=read('public/photo-scan.js'),css=read('public/style.css');
 assert.match(scan,/const SURE=0\.6,LEAD=0\.03,LIMIT=8000;/);
 assert.match(scan,/clock=setInterval\(\(\)=>\{if\(started\)looking\(\)\},1000\)/,'a seconds count while it looks');
 assert.match(scan,/if\(elapsed\(\)\*1000>=LIMIT\)\{const seconds=elapsed\(\),thumb=blob\?URL\.createObjectURL\(blob\):'';stop\(\);likely\(thumb,seconds,bestSeen\);return\}/,'never looks forever');
 assert.match(scan,/say\(t\('No match found','တူတာ မရှိပါ'\)/);
 assert.match(scan,/t\('found in ',''\)\+secs\(took\)/,'how many seconds it took');
 assert.match(scan,/why\(m,at===0\?matches\[1\]:null\)/,'each match says why');
 assert.match(scan,/if\(isSure\(a,b\)\)found\(r\.matches,thumb,seconds\);else likely\(/,'a saved photo with no sure match says so too');
 assert.match(css,/\.photo-scan-panel\{flex-wrap:wrap\}/);assert.match(css,/\.photo-scan-why\{flex:0 0 100%;/,'the reason is a full-width line under the result');
});

test('1.1.273: a real scan on grass is matched by the part alone (background cut away)',async()=>{
 const os=require('node:os'),sharp=require('sharp'),Database=require('better-sqlite3'),{createPhotoSearch}=require('../lib/photo-search'),{objectOnWhite}=require('../lib/object-crop');
 const fx=f=>fs.readFileSync(path.join(__dirname,'fixtures','photo-scan',f));
 const scan=fx('scan-shaft-on-grass.jpg'),part=await objectOnWhite(scan);
 assert.ok(part,'the shaft stands out from the grass');
 const {data}=await sharp(part).resize(32,32,{fit:'fill'}).raw().toBuffer({resolveWithObject:true});
 let green=0;for(let i=0;i<data.length;i+=3)if(data[i+1]>data[i]+30&&data[i+1]>data[i+2]+30)green++;
 assert.ok(green<32*32*0.05,'almost no grass is left ('+green+' green pixels)');
 const media=fs.mkdtempSync(path.join(os.tmpdir(),'photo-real-'));fs.mkdirSync(path.join(media,'7'));
 const db=new Database(':memory:');db.exec("CREATE TABLE platform_shops(id INTEGER,legacy INTEGER);CREATE TABLE platform_products(id INTEGER,shop_id INTEGER,image_id TEXT,details TEXT,active INTEGER);CREATE TABLE platform_files(id TEXT,shop_id INTEGER,kind TEXT,ready INTEGER,filename TEXT)");
 for(const [pid,f] of [[1,'shop-drive-shaft.jpg'],[2,'shop-throttle-sensor.jpg']]){const id='p'+pid;fs.writeFileSync(path.join(media,'7',id+'.jpg'),fx(f));db.prepare('INSERT INTO platform_products VALUES(?,7,?,?,1)').run(pid,id,JSON.stringify({imageIds:[id]}));db.prepare("INSERT INTO platform_files VALUES(?,7,'image',1,?)").run(id,id+'.jpg')}
 const ps=createPhotoSearch({db,media}),shop={id:7};await ps.learn(shop);
 const r=await ps.search(shop,scan);
 assert.equal(r.matches[0].id,'1');assert.equal(r.matches[0].view,3,'matched by the part alone');assert.ok(r.matches[0].score-r.matches[1].score>0.3);
 fs.rmSync(media,{recursive:true,force:true});
});

test('1.1.275: look-alike Drive Shafts — parts compared upright with their shape; the right one is first for every owner scan',async()=>{
 const os=require('node:os'),Database=require('better-sqlite3'),{createPhotoSearch}=require('../lib/photo-search');
 const dir=path.join(__dirname,'fixtures','photo-scan','shafts'),files=fs.readdirSync(dir);
 const shops=files.filter(f=>f.startsWith('shop-')),scans=files.filter(f=>f.startsWith('scan-'));
 const media=fs.mkdtempSync(path.join(os.tmpdir(),'photo-shafts-'));fs.mkdirSync(path.join(media,'7'));
 const db=new Database(':memory:');db.exec("CREATE TABLE platform_shops(id INTEGER,legacy INTEGER);CREATE TABLE platform_products(id INTEGER,shop_id INTEGER,image_id TEXT,details TEXT,active INTEGER);CREATE TABLE platform_files(id TEXT,shop_id INTEGER,kind TEXT,ready INTEGER,filename TEXT)");
 const sku=f=>f.replace(/^(shop|scan)-|(-[ab])?\.jpg$/g,'');
 shops.forEach((f,i)=>{const id='s'+i;fs.copyFileSync(path.join(dir,f),path.join(media,'7',id+'.jpg'));db.prepare('INSERT INTO platform_products VALUES(?,7,?,?,1)').run(i+1,id,JSON.stringify({imageIds:[id]}));db.prepare("INSERT INTO platform_files VALUES(?,7,'image',1,?)").run(id,id+'.jpg')});
 const ps=createPhotoSearch({db,media}),shop={id:7};await ps.learnParts(shop);
 for(const f of scans){const r=await ps.search(shop,fs.readFileSync(path.join(dir,f)));
  assert.equal(sku(shops[Number(r.matches[0].id)-1]),sku(f),f+' → '+r.matches.map(m=>sku(shops[m.id-1])+' '+m.score).join(', '));assert.equal(r.matches[0].view,3)}
 assert.ok(fs.readdirSync(path.join(media,'7','.photo-looks')).some(f=>f.endsWith('.dinov2s-part.f32')),'parts are kept next to the photos');
 fs.rmSync(media,{recursive:true,force:true});
});

test('1.1.277: two look-alike parts (within 0.02) are never decided by two lucky frames; four frames are averaged',()=>{
 const scan=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/photo-scan.js'),'utf8');
 assert.match(scan,/const close=b&&a\.score-b\.score<CLOSE;\n  if\(a&&!close&&streak\.n>=/);
 assert.match(scan,/if\(frames>=AVERAGE_FRAMES\)\{const avg=\[\.\.\.tally\]\.map\(\(\[id,x\]\)=>\(\{\.\.\.x\.list,id,score:Math\.round\(x\.s\/frames\*1000\)\/1000\}\)\)\.sort/);
 assert.match(scan,/tally=new Map\(\);frames=0;trips=\[\];/,'each scan starts afresh');
});
