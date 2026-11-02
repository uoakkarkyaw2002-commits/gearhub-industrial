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
test('1.1.235: phone product photos in the owner design (chips, overlay count/download, See all; tap a card)',()=>{
 const html=pub('index.html'),store=pub('store.js'),similar=pub('similar-parts.js'),css=pub('style.css');
 assert.match(html,/id="gallery-ids"/);
 assert.match(store,/Part No : /);assert.match(store,/function galleryPlace\(\)/);
 assert.match(similar,/gallery-similar-all/);assert.doesNotMatch(similar,/gallery-similar-view/);
 assert.match(css,/\.gallery-ids,\.gallery-similar \.gallery-similar-all,\.gallery-dl-icon\{display:none\}/);
});
test('1.1.236: phone photo sheet has no side arrows and a bigger tray download icon',()=>{
 const css=pub('style.css');
 assert.doesNotMatch(css,/\.gallery-stage \.gallery-arrow\{display:grid/);
 assert.match(pub('index.html'),/class="gallery-dl-icon"/);
 assert.match(css,/\.gallery-stage \.gallery-dl\{position:absolute;right:10px;bottom:10px;z-index:2;width:58px;height:58px/);
});
test('1.1.237: phone download parachute is sized for the bigger button',()=>{
 assert.match(pub('style.css'),/\.gallery-stage \.gallery-dl-drop\{left:46px;width:40px;height:57px\}/);
});
test('1.1.238: phone photo sheet close X is drawn centred',()=>{
 assert.match(pub('style.css'),/\.gallery-modal #gallery-close::before,\.gallery-modal #gallery-close::after\{content:"";position:absolute;left:50%;top:50%/);
});
test('1.1.242: shop Settings has Contact us and an owner-only Notifications switch; shop admin no longer shows the alerts card',()=>{
 const html=pub('index.html'),js=pub('settings-alerts.js'),admin=pub('admin-extras.js');
 assert.match(html,/href="tel:09766472432"[^]*Contact us[^]*09-766472432/);
 assert.match(js,/role="switch"/);assert.match(js,/me\.isOwner\|\|Number\(me\.shop\?\.id\)===Number\(store\.id\)/);
 assert.match(js,/\/api\/platform\/shops\/"\+shopId\+"\/push"/);
 assert.match(admin,/if\(SHOP_SCOPE\)return;/);
});
test('1.1.244: Notifications switch only for the shop owner; app sign-in stays in the installed app',()=>{
 const js=pub('settings-alerts.js'),login=pub('app-login.js'),admin=pub('tenant-admin.js');
 assert.match(js,/if\(!store\?\.id\|\|!me\?\.user\|\|!\(me\.isOwner\|\|Number\(me\.shop\?\.id\)===Number\(store\.id\)\)\)return;/);
 assert.match(login,/\/api\/platform\/auth\/claim/);assert.match(login,/handoff:id/);
 assert.match(admin,/GearHubAppLogin\.standalone\(\)/);
 assert.match(pub('admin.html'),/app-login\.js\?v=1\.1\.243"><\/script><script src="\/tenant-admin\.js/);
});
