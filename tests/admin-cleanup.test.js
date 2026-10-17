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
