// Play Store app (Trusted Web Activity) for skyshopmm.com: a web manifest with PNG icons, and the
// Digital Asset Links file that lets Android open the site full screen.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('skyshopmm.com has an installable manifest with 192/512 and maskable PNG icons',()=>{
 const m=JSON.parse(read('public/skyshop.webmanifest')),html=read('public/platform.html');
 assert.equal(m.name,'SkyShopMM');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');
 for(const size of ['192x192','512x512'])assert.ok(m.icons.some(i=>i.sizes===size&&i.type==='image/png'),size);
 assert.ok(m.icons.some(i=>i.purpose==='maskable'));
 for(const i of m.icons)assert.ok(fs.existsSync(path.join(__dirname,'../public',i.src)),i.src);
 assert.match(html,/<link rel="manifest" href="\/skyshop\.webmanifest" \/>/);
});
test('assetlinks.json names the PWABuilder upload key plus ANDROID_SHA256',()=>{
 const server=read('server.js');
 assert.match(server,/app\.get\("\/\.well-known\/assetlinks\.json"/);
 assert.ok(server.includes('"60:A4:18:25:73:64:2E:C3:5E:2A:6E:51:14:93:BD:FA:69:B5:C1:04:33:93:00:E8:82:B5:FF:55:3F:3F:1F:5F"'),'upload key');
 assert.match(server,/delegate_permission\/common\.handle_all_urls/);
});
