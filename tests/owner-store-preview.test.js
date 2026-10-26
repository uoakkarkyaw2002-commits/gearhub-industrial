const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const publicFile=(name)=>fs.readFileSync(path.join(__dirname,'..','public',name),'utf8');
const os=require('node:os');
const express=require('express'),Database=require('better-sqlite3');
const {pageSecurity}=require('../lib/security');
const {installTenantApps}=require('../lib/tenant-install');
const model=require('../lib/platform-model');

test('production headers allow same-origin storefront previews but still block framing admin and other pages',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-preview-')),db=new Database(':memory:');
 t.after(()=>{db.close();fs.rmSync(root,{recursive:true,force:true});});
 model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'preview','preview@example.test','Preview');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'preview-shop','Preview shop',1,'active')");
 const app=express();app.use(pageSecurity());
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 installTenantApps(app,{db,dataDir:root,publicDir:path.join(__dirname,'../public'),publicOrigin:base});
 app.use(express.static(path.join(__dirname,'../public')));
 const normal=await fetch(base+'/platform.html'),normalCsp=normal.headers.get('content-security-policy');
 assert.match(normalCsp,/(?:^|;)upgrade-insecure-requests(?:;|$)/,'production still upgrades insecure requests');
 const framed=await fetch(base+'/shops/preview-shop');
 assert.equal(framed.status,200);assert.equal(framed.url,base+'/shops/preview-shop/');
 assert.equal(framed.headers.get('x-frame-options'),'SAMEORIGIN');
 assert.equal(framed.headers.get('content-security-policy'),normalCsp.replace("frame-ancestors 'none'","frame-ancestors 'self'"),'all other CSP protections stay identical');
 assert.match(await framed.text(),/<title>Preview shop<\/title>/);
 for(const url of ['/platform.html','/admin.html','/shops/preview-shop/admin','/shops/preview-shop/app.webmanifest','/shops/missing/']){
  const response=await fetch(base+url);
  assert.equal(response.headers.get('x-frame-options'),'DENY',url);
  assert.equal(response.headers.get('content-security-policy'),normalCsp,url);
 }
});

test('owner View opens the exact public shop in an in-console preview',()=>{
 const js=publicFile('platform.js'),css=publicFile('platform.css');
 assert.match(js,/const showStorePreview = \(slug\) =>/);
 assert.match(js,/src="\$\{url\}"/);
 assert.match(js,/href="\$\{url\}" target="_blank"/);
 assert.match(js,/data-view-shop\]\"\)\.forEach\(\(b\) => \(b\.onclick = \(\) => showStorePreview/);
 assert.match(css,/\.store-preview-dialog\{position:absolute;inset:0;max-width:none;height:100dvh/);
 assert.match(css,/\.store-preview-frame\{display:block;flex:1;min-height:0;width:100%;height:100%/);
});
