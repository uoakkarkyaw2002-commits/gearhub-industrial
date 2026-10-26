// Owner's request: a new seller shop shows no GearHub hero (gear picture, "INDUSTRIAL SUPPLY · BUILT FOR WORK",
// "Browse our products.", "Browse equipment"), no gear in the logo circle, no "Industrial equipment" heading,
// and its navigation uses the owner's default picture until the shop sets its own.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('new seller shops hide GearHub defaults and get the default navigation picture',()=>{
 const store=read('public/store.js'),css=read('public/style.css');
 assert.match(store,/const SHOP_NAV_DEFAULT="\/images\/shop-nav-default\.jpg";/);
 assert.match(store,/checkedImageUrl\(site\.navigationBackgroundUrl\)\|\|\(tenantStore\?SHOP_NAV_DEFAULT:wallpaper\|\|heroImage\)/,'a shop picture first, else the default; GearHub itself unchanged');
 assert.match(store,/if\(homeFallback\)homeFallback\.hidden=!!logo\|\|tenantStore/,'no gear in a shop without a logo');
 assert.match(store,/if\(hero\)hero\.hidden=!heroImage;/,'no hero without the shop\'s own hero picture');
 assert.match(store,/const own=key=>\["en","my"\]\.some\(l=>String\(site\.translations\?\.\[l\]\?\.\[key\]\|\|""\)\.trim\(\)\);/,'any text a shop saved (POLESTAR) stays');
 assert.match(store,/applyLanguage\(\);applySiteLayout\(activeSiteLayout\);if\(tenantStore\)hideShopDefaults\(site,heroImage\);/);
 assert.match(css,/\.hero\[hidden\],\[data-i18n="featured"\]\[hidden\],\[data-i18n="featuredText"\]\[hidden\]\{display:none!important\}/);
 const jpg=fs.readFileSync(path.join(__dirname,'..','public','images','shop-nav-default.jpg'));assert.equal(jpg[0],0xff);assert.equal(jpg[1],0xd8);assert.ok(jpg.length<200000);
});

test("GearHub's three info cards never show in a seller shop, new or old",()=>{
 const store=read('public/store.js'),css=read('public/style.css'),index=read('public/index.html');
 assert.match(store,/function hideShopDefaults\(site,heroImage\)\{[^}]*document\.documentElement\.classList\.add\("seller-shop"\);/);
 assert.match(css,/\.seller-shop \.benefits\{display:none!important\}/);
 assert.match(index,/<section class="wrap benefits" id="about" data-home-content><article><span>🏭<\/span><h3 data-i18n="industrial">/,'GearHub keeps them on its own store');
});
