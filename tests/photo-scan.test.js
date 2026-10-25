// Photo search: a scan button in the search bar finds the shop's products that look like a photo.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('photo search runs on the phone with same-site files and lists the closest products first',()=>{
 const scan=read('photo-scan.js'),store=read('store.js'),index=read('index.html');
 assert.ok(fs.statSync(path.join(__dirname,'..','public','vendor','tf.min.js')).size>1e6,'TF.js is served from this site (CSP allows no outside scripts)');
 const model=JSON.parse(read('vendor/mobilenet/model.json'));assert.deepEqual(model.weightsManifest[0].paths,['group1-shard1of1.bin']);
 assert.match(scan,/if\(!\('regeneratorRuntime' in window\)\)window\.regeneratorRuntime=undefined;/,'TF.js would otherwise call Function(), which the CSP blocks');
 assert.match(scan,/input\.type='file';input\.accept='image\/\*'/,'camera or gallery');
 assert.match(scan,/const raw=\[1,\.7,\.55\]\.map\(crop=>look\(model,img,crop\)\)/);
 assert.match(store,/const scan=window\.photoScanIds;if\(scan\)\{const rank=new Map/);
 assert.match(index,/<script src="\/photo-scan\.js\?v=20261025-photo-scan-2"><\/script>/);
});
