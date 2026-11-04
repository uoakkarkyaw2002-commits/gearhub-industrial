// 1.1.310 owner's picture: no "Shop by department"; Promotion banner on Home instead of the bottom-bar tab;
// up to 5 hero pictures that change by themselves.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('home hero slides, promotion banner and settings for 5 pictures',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),css=read('public/home-hero.css'),js=read('public/hero-slides.js'),store=read('public/store.js'),admin=read('public/admin.html'),adminJs=read('public/admin.js'),tenant=read('lib/tenant-admin.js'),server=read('server.js');
 for(const tag of html.match(/\/(?:home-hero\.css|hero-slides\.js)\?v=[0-9.]+/g))assert.ok(sw.includes('"'+tag+'"'),tag);
 assert.match(css,/\.popular-categories\{display:none!important\}/);assert.match(css,/\.mobile-bottom-nav \[data-store-view="promotion"\]\{display:none!important\}/);
 assert.match(js,/promo\.dataset\.storeView='promotion'/,'the banner opens the Promotion page');assert.match(js,/slice\(0,5\)/);
 assert.match(store,/new CustomEvent\("gearhub:hero",\{detail:\[heroImage,\.\.\.\[2,3,4,5\]/);
 for(const n of [2,3,4,5]){assert.ok(admin.includes('id="site-hero-image-url-'+n+'"'));assert.ok(tenant.includes("'heroImageUrl"+n+"'"))}
 assert.match(adminJs,/\["heroImageUrl"\+n,\$\("site-hero-image-url-"\+n\)\?\.value\|\|""\]/);assert.match(server,/\.\.\.moreHero, colors/);
});
