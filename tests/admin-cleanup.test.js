const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('admin header has one View store and one Log out icon button',()=>{
  const html=pub('admin.html'),nav=html.slice(html.indexOf('<div class="nav-actions">'),html.indexOf('</header>'));
  assert.equal((nav.match(/<a /g)||[]).length,1,'a single View store link');assert.doesNotMatch(nav,/⌂/);
  assert.match(nav,/id="view-store-link"[^>]*>\s*<svg/);assert.match(nav,/id="logout"[^>]*>\s*<svg/);
  assert.doesNotMatch(pub('tenant-admin.js'),/tenant-home-button/);
});
test('appearance editor has no duplicate category banner and no margin/padding layout editor',()=>{
  assert.doesNotMatch(pub('admin.html'),/site-category-banner-url|remove-category-banner/);
  assert.match(pub('admin.js'),/data-category-banner-upload/,'per-category banner upload stays');
  assert.doesNotMatch(pub('admin.js'),/renderSiteLayoutEditor|data-layout-padding/);
  assert.doesNotMatch(pub('tenant-admin.js'),/site-layout-editor/);
});
test('hero shows only the photo and Promotion tab needs a promoted product',()=>{
  const store=pub('store.js');
  assert.match(store,/hero-image-only/);assert.doesNotMatch(store,/linear-gradient\(90deg,\$\{dark\}d9 0%,\$\{dark\}80 48%,\$\{dark\}25 100%\),url\(\$\{JSON\.stringify\(heroImage\)\}\)/);
  assert.match(pub('style.css'),/\.hero\.hero-image-only>\*\{display:none!important\}/);
  assert.match(store,/function updatePromotionVisibility\(\)/);assert.match(store,/function renderProducts\(\)\{\n updatePromotionVisibility\(\);/);
});
test('navigation background no longer replaces the page wallpaper',()=>{
  const store=pub('store.js');
  assert.match(store,/const wallpaper=checkedImageUrl\(site\.wallpaperUrl\)/);
  assert.doesNotMatch(store,/wallpaper=navigationBackground\|\|/);
});
test('Frontend Text is hidden and bottom nav centres visible tabs',()=>{
  assert.match(pub('admin.html'),/<details class="appearance-extra" hidden>/);
  assert.match(pub('style.css'),/\.mobile-bottom-nav\{grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\)\}/);
});
test('static files skip sessions, are gzip-ready and session expiry writes are throttled',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.ok(server.indexOf('app.use(express.static(path.join(__dirname, "public")')<server.indexOf('app.use(session('),'public files are served before sessions');
  assert.match(server,/app\.use\(compression\(/);
  assert.match(server,/now - last < 10 \* 60 \* 1000/);
  assert.match(server,/\["admin\.js", "admin\.html"\]\.includes/,'admin page stays uncached');
});
test('tenant storefront downloads the shop once for concurrent requests',async()=>{
  const vm=require('node:vm');let calls=0;const window={};
  const shop={name:'A',settings:{},products:[],service:{usedBytes:0,storageLimit:1,endsAt:null,state:'active'}};
  vm.runInNewContext(pub('tenant-store.js'),{window,document:{querySelectorAll:()=>[],querySelector:()=>null},location:{pathname:'/shops/a/',origin:'https://x.test'},Response,URL,encodeURIComponent,decodeURIComponent,fetch:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return new Response(JSON.stringify(shop));}});
  await Promise.all(['/api/products','/api/categories','/api/config','/api/storage'].map(u=>window.GearHubTenantStore.fetch(u)));
  assert.equal(calls,1);
});
test('owner dashboard shows seller shops as cards on phones',()=>{
  const js=pub('platform.js'),css=pub('platform.css');
  for(const c of ['td-shop','td-owner','td-plan','td-storage','td-expiry','td-status','td-actions'])assert.match(js,new RegExp('class="'+c));
  assert.match(css,/\.shop-table thead\{display:none\}/);
  assert.match(css,/grid-template-areas:"shop status" "owner plan" "storage expiry" "actions actions"/);
  assert.match(pub('platform.html'),/id="logout" class="logout-btn"/);
});
test('one promotion rule: only a whole price above 0 and below the normal price counts',()=>{
  const {promotionPrice,salePrice}=require('../lib/promotion');
  assert.equal(promotionPrice(1000000,800000),800000);
  for(const bad of [null,undefined,'',0,'0',-5,1000000,1200000,'abc',12.5])assert.equal(promotionPrice(1000000,bad),null,String(bad));
  assert.equal(salePrice(1000000,null),1000000);assert.equal(salePrice(1000000,'800000'),800000);
  const store=pub('store.js');
  assert.match(store,/function promoPrice\(p\)/);assert.match(store,/total\+=salePrice\(p\)\*n/);
  assert.match(store,/const promoted=products\.filter\(p=>promoPrice\(p\)!==null\)/);
  assert.match(store,/promo-badge/);
});
test('GearHub owner can open any seller admin; others see a friendly switch-account card',()=>{
  const t=pub('tenant-admin.js');
  assert.match(t,/if\(!shop&&me\.isOwner\)/);assert.match(t,/tenant-denied-switch/);
  assert.match(pub('admin.js'),/name="promotionPrice"/);assert.doesNotMatch(t,/name="promotionPrice"/);
});
test('category banner shows the whole picture on phones',()=>{
  const css=pub('style.css');
  assert.match(css,/#category-view \.category-feature-banner\.has-image\{aspect-ratio:auto!important/);
  assert.match(css,/#category-view \.category-feature-banner\.has-image>img:not\(\[hidden\]\)\{position:static;display:block;width:100%;height:auto;object-fit:contain\}/);
});
