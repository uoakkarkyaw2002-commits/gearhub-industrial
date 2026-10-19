// Shop photos are fitted to the frame they are shown in, and the storefront never cuts
// them: the hero keeps one 5:2 shape on phone and PC, the category banner is 4:1.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('hero shows the whole picture in one 5:2 shape on every screen',()=>{
 const css=pub('style.css'),tail=css.slice(css.lastIndexOf('/* Hero: one 5:2 shape'));
 assert.match(tail,/\.hero\.hero-image-only\{[^}]*aspect-ratio:5\/2!important/);
 assert.match(tail,/\.hero\.hero-image-only::after\{[^}]*var\(--hero-fill,none\) center\/contain no-repeat/);
 assert.match(tail,/\.hero\.hero-image-only::before\{[^}]*filter:blur/);
 assert.match(pub('store.js'),/hero\.style\.setProperty\("--hero-fill"/);
});

test('category banner is 4:1 and as wide as its column on PC',()=>{
 const css=pub('style.css'),tail=css.slice(css.lastIndexOf('/* Category banner: 4:1'));
 assert.match(tail,/#category-view \.category-feature-banner\.has-image\{aspect-ratio:4\/1!important\}/);
 assert.match(tail,/@media\(min-width:851px\)\{#category-view \.category-feature-banner\.has-image\{width:100%!important;margin-inline:0!important\}\}/);
});

test('admin fits hero, banner, navigation, wallpaper and logo before upload',()=>{
 const admin=pub('admin.js'),html=pub('admin.html');
 assert.match(html,/<script src="\/image-fit\.js\?v=[^"]+"><\/script><script src="\/admin\.js/);
 assert.match(admin,/"site-hero-image-url":\{width:1600,height:640/);assert.match(admin,/CATEGORY_BANNER_FRAME=\{width:1600,height:400/);
 assert.match(admin,/"site-logo-url":\{width:512,height:512,label:"Logo",pad:"white"\}/);
 assert.match(admin,/await fitToFrame\(file,CATEGORY_BANNER_FRAME\)/);assert.match(admin,/file=await fitToFrame\(picked,SITE_IMAGE_FRAMES\[/);
 assert.match(html,/5:2 · 1600 × 640/);assert.match(admin,/4:1 · 1600 × 400/);
});

test('auto mode fills close shapes and keeps very different shapes whole',()=>{
 const context={window:{},document:{}};vm.runInNewContext(pub('image-fit.js'),context);const {autoMode}=context.window.GearHubImageFit;
 assert.equal(autoMode({width:1600,height:640},1600,640),'fill');
 assert.equal(autoMode({width:1600,height:700},1600,640),'fill');
 assert.equal(autoMode({width:1600,height:800},1600,640),'whole');
 assert.equal(autoMode({width:1080,height:1920},1600,400),'whole');
});

test('phones show the category banner across the full width; empty banner is a neat strip on PC',()=>{
 const store=pub('store.js'),css=pub('style.css');
 assert.match(store,/const phoneCategoryBanner=matchMedia\("\(max-width:850px\)"\)/);
 assert.match(store,/if\(phoneCategoryBanner\.matches\)\{if\(banner\.nextElementSibling!==browser\)browser\.before\(banner\)\}else if\(banner\.parentElement!==results\)results\.prepend\(banner\)/);
 assert.match(css,/#category-view\.category-products-mode>\.category-feature-banner/);
 assert.match(css,/\.category-feature-banner:not\(\.has-image\)\{display:flex!important;align-items:center;width:100%!important;aspect-ratio:4\/1!important/);
});
