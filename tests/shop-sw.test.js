// Each seller shop has its own service worker (/shops/<slug>/sw.js, scope /shops/<slug>/),
// so an installed shop app shows its order alerts under the shop's own name and icon.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');
const express=require('express');const Database=require('better-sqlite3');
const {installTenantApps}=require('../lib/tenant-install');const model=require('../lib/platform-model');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('the shop worker is served at the shop path, uncached, same code as /sw.js',async t=>{
 const db=new Database(':memory:');model.migrate(db);const app=express();
 installTenantApps(app,{db,dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'shop-sw-')),publicDir:path.join(__dirname,'..','public'),publicOrigin:'https://shop.test'});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const base='http://127.0.0.1:'+server.address().port;
 const ok=await fetch(base+'/shops/polestar/sw.js');assert.equal(ok.status,200);
 assert.match(ok.headers.get('content-type'),/javascript/);assert.equal(ok.headers.get('cache-control'),'no-cache');
 assert.equal(await ok.text(),pub('sw.js'));
 assert.equal((await fetch(base+'/shops/Bad_Slug/sw.js')).status,404);
});

test('shop pages register the shop worker; old alerts move to it without a tap',()=>{
 const expr='(location.pathname.match(/^\\/shops\\/[a-z0-9-]+\\//)||["/"])[0]+"sw.js"';
 for(const f of ['store.js','updates.js','app-install.js'])assert.ok(pub(f).includes('navigator.serviceWorker.register('+expr),f);
 const extras=pub('admin-extras.js');
 assert.ok(extras.includes('const SW_URL='+expr));
 assert.ok(extras.indexOf('const SW_URL=')<extras.indexOf('register(SW_URL'),'defined before use');
 assert.match(extras,/async function moveOldShopAlert\(\)/);
 assert.match(extras,/if\(!mine\?\.subscribed\)return;/,'only this shop\'s old alert is moved');
 assert.ok(extras.indexOf('await pushApi("/subscribe",{subscription:sub.toJSON()});\n  await pushApi("/unsubscribe",{endpoint:oldSub.endpoint})')>0,'new alert first, then the old one is dropped');
});
