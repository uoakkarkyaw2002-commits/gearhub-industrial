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
test('assetlinks.json is built from ANDROID_PACKAGE and ANDROID_SHA256 and is 404 without a fingerprint',()=>{
 const server=read('server.js');
 assert.match(server,/app\.get\("\/\.well-known\/assetlinks\.json"/);
 assert.match(server,/if\(!fingerprints\.length\)return res\.sendStatus\(404\);/);
 assert.match(server,/delegate_permission\/common\.handle_all_urls/);
});
