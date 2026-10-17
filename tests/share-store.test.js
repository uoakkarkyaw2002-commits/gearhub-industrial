const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('Settings offers Share My Store with a scannable QR and copyable link',()=>{
  const html=pub('index.html');
  for(const id of ['share-store-action','share-modal','share-qr','share-link','share-copy','share-download'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.ok(html.indexOf('/qrcode.js')<html.indexOf('/settings.js'),'QR library loads before Settings');
  const qrcode=require('../public/qrcode.js'),qr=qrcode(0,'M');qr.addData('https://shop.test/shops/polestar/');qr.make();
  assert.match(qr.createSvgTag({scalable:true}),/^<svg/);
});
test('offline shell caches the exact asset versions the page loads',()=>{
  const html=pub('index.html'),sw=pub('sw.js');
  const shell=JSON.parse(sw.match(/const SHELL = (\[.*?\]);/)[1]);
  for(const url of html.match(/(?:src|href)="\/[^"]+\.(?:js|css)(?:\?[^"]*)?"/g).map(a=>a.split('"')[1]))assert.ok(shell.includes(url),url+' missing from service worker shell');
});
