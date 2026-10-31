const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('Settings offers Share My Store with a scannable QR and copyable link',()=>{
  const html=pub('index.html');
  for(const id of ['share-store-action','share-modal','share-qr','share-link','share-copy','share-download'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.ok(!html.includes('/qrcode.js'),'QR library is not loaded with every page');
  const settings=pub('settings.js'),qrSrc=settings.match(/script\.src = "(\/qrcode\.js[^"]*)"/)[1];
  assert.match(settings,/await loadQr\(\)/);assert.ok(pub('sw.js').includes('"'+qrSrc+'"'),'QR library stays cached for offline Share');
  const qrcode=require('../public/qrcode.js'),qr=qrcode(0,'M');qr.addData('https://shop.test/shops/polestar/');qr.make();
  assert.match(qr.createSvgTag({scalable:true}),/^<svg/);
});
test('offline shell caches the exact asset versions the page loads',()=>{
  const html=pub('index.html'),sw=pub('sw.js');
  const shell=JSON.parse(sw.match(/const SHELL = (\[.*?\]);/)[1]);
  for(const url of html.match(/(?:src|href)="\/[^"]+\.(?:js|css)(?:\?[^"]*)?"/g).map(a=>a.split('"')[1]))assert.ok(shell.includes(url),url+' missing from service worker shell');
});

test('1.1.233: Save QR image makes a PNG card ahead of time and opens the phone share sheet (Photos) or downloads',()=>{
 const js=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/settings.js'),'utf8');
 assert.match(js,/function makeQrPicture\(qr, name, link, file, logoUrl\)/);
 assert.match(js,/qrcode\(0, "H"\)/);
 assert.match(js,/class="share-qr-logo"/);
 assert.match(js,/x\.drawImage\(logo, [^\n]*lx, ly, box, box\)/);
 assert.match(js,/img\[data-site-logo\]/);
 assert.match(js,/"#6fd39a"/);
 assert.match(pub('index.html'),/class="share-poster"[^]*id="share-poster-link"/);
 assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/style.css'),'utf8'),/#share-qr \.share-qr-logo\{/);
 assert.match(pub('style.css'),/\.share-poster\{/);
 assert.match(js,/qrPicture = new File\(\[blob\], file, \{ type: "image\/png" \}\)/);
 assert.match(js,/navigator\.canShare\?\.\(\{ files: \[qrPicture\] \}\)[^\n]*navigator\.share\(\{ files: \[qrPicture\] \}\)/);
});
test('1.1.235: phone product photos in the owner design (chips, overlay count/download, See all, View)',()=>{
 const html=pub('index.html'),store=pub('store.js'),similar=pub('similar-parts.js'),css=pub('style.css');
 assert.match(html,/id="gallery-ids"/);
 assert.match(store,/Part No : /);assert.match(store,/function galleryPlace\(\)/);
 assert.match(similar,/gallery-similar-all/);assert.match(similar,/gallery-similar-view/);
 assert.match(css,/\.gallery-ids,\.gallery-similar \.gallery-similar-all,\.gallery-similar-view\{display:none\}/);
});
