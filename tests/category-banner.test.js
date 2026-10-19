const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
// Category banners must all have the same shape whatever photo the shop uploads.
test('every category banner has one fixed shape and the whole photo fits inside',()=>{
 const tail=css.slice(css.lastIndexOf('/* Category banners: every banner has the same shape'));
 assert.match(tail,/#category-view \.category-feature-banner\.has-image\{aspect-ratio:5\/2!important;height:auto!important/);
 assert.match(tail,/\.has-image>img:not\(\[hidden\]\)\{position:absolute!important;inset:0;width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important/);
 assert.match(tail,/@media\(min-width:851px\)\{#category-view \.category-feature-banner\.has-image\{aspect-ratio:5\/2!important;width:min\(100%,640px\)!important;margin-inline:auto!important\}\}/);
 assert.match(css,/\.has-image::before\{[^}]*background:var\(--banner-fill\)/,'empty sides show a blur of the same photo');
});

test('a dark page colour keeps on-page headings readable',()=>{
 const store=fs.readFileSync(path.join(__dirname,'..','public','store.js'),'utf8');
 assert.match(store,/root\.classList\.toggle\("page-dark",0\.2126\*r\+0\.7152\*g\+0\.0722\*b<0\.5\)/);
 assert.match(css,/\.page-dark \.section-head h2,[^{]*\.page-dark \.settings-header h2[^{]*\{color:#eef5f0\}/);
});
test('one logo: the app icon is made from the logo and the hidden app icon field is filled automatically',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','admin.html'),'utf8'),admin=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(html,/id="site-app-icon-field" hidden/);
 assert.match(admin,/if\(target\.id==="site-logo-url"&&\$\("site-app-icon-url"\)\)\{[^}]*makeAppIcon\(file\)/);
 assert.match(server,/const icon=getSiteSettings\(\)\.appIconUrl\|\|getSiteSettings\(\)\.logoUrl;/);
 assert.equal((server.match(/if\(site\.appIconUrl\|\|site\.logoUrl\)/g)||[]).length,2,'both manifests fall back to the logo');
});

test('admin shows the recommended size beside every image, hides Colors, and a category tap keeps the page still',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','admin.html'),'utf8'),admin=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),store=fs.readFileSync(path.join(__dirname,'..','public','store.js'),'utf8');
 for(const cap of ['Logo image','Hero background image','Navigation background image','Page wallpaper image'])assert.match(html,new RegExp('appearance-image-caption">'+cap+'<small class="appearance-ratio">'),cap);
 assert.match(admin,/appearance-ratio">5:2 · 1600 × 640/);
 assert.match(html,/id="site-colors-card" hidden/);assert.match(html,/id="site-brand-color"|name="brand"|data-color/,'colour inputs stay in the form so saving keeps them');
 assert.match(store,/if\(top>=0&&top<innerHeight\*0\.6\)return;/);
 assert.match(css,/#category-products,#category-view\{scroll-margin-top:calc\(env\(safe-area-inset-top,0px\) \+ 12px\)\}/);
});

test('switching tabs fades in place and jumps to the top at once (no slide that snaps)',()=>{
 const store=fs.readFileSync(path.join(__dirname,'..','public','store.js'),'utf8');
 assert.match(css,/@keyframes store-view-arrive\{from\{opacity:\.45\}to\{opacity:1\}\}/);
 assert.ok(!/store-view-arrive\{[^}]*translate/.test(css));
 assert.match(store,/window\.scrollTo\(\{top:0,behavior:"instant"\}\)\}/);
});

test('the page wallpaper is a fixed screen-size layer, not a stretched body background (iPhone ignores fixed backgrounds)',()=>{
 const store=fs.readFileSync(path.join(__dirname,'..','public','store.js'),'utf8');
 assert.match(store,/document\.body\.style\.backgroundImage="";root\.style\.setProperty\("--app-page-background",pageBackground\|\|"none"\)/);
 assert.match(store,/wallpaperLayer\.id="app-wallpaper"/);
 assert.ok(!/backgroundAttachment=wallpaper\?"fixed"/.test(store));
 assert.match(css,/#app-wallpaper\{position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:var\(--app-page-background,none\);background-size:cover/);
});
