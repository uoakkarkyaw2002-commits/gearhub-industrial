// Photo search: a scan button in the search bar finds the shop's products that look like a photo.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('photo search: live camera scanner, quiet background learning, best match highlighted like Excel search',()=>{
 const scan=read('photo-scan.js'),store=read('store.js'),index=read('index.html');
 assert.ok(fs.statSync(path.join(__dirname,'..','public','vendor','tf.min.js')).size>1e6,'TF.js is served from this site (CSP allows no outside scripts)');
 const model=JSON.parse(read('vendor/mobilenet/model.json'));assert.deepEqual(model.weightsManifest[0].paths,['group1-shard1of1.bin']);
 assert.match(scan,/if\(!\('regeneratorRuntime' in window\)\)window\.regeneratorRuntime=undefined;/,'TF.js would otherwise call Function(), which the CSP blocks');
 assert.match(scan,/gallery\.type='file';gallery\.accept='image\/\*'/,'photos from the gallery');
 assert.match(scan,/raws=\[1,\.7,\.55\]\.map\(crop=>look\(model,img,crop\)\)/,'a saved photo: whole and two centre crops');
 assert.doesNotMatch(store,/photoScanIds/,'the list is not filtered; the match is highlighted instead');
 assert.match(scan,/navigator\.mediaDevices\.getUserMedia\(\{video:\{facingMode:\{ideal:'environment'\}/,'the scan button opens the camera at once');
 assert.match(scan,/if\(votes\.length===3&&votes\.every\(v=>v===id\)\)/,'same product first in 3 looks in a row');
 assert.match(scan,/el\.classList\.add\('photo-match'\)/);
 assert.doesNotMatch(scan,/first time only/,'learning is quiet (owner did not want a first-time message)');
 assert.match(index,/<script src="\/photo-scan\.js\?v=20261025-photo-scan-4"><\/script>/);
});
