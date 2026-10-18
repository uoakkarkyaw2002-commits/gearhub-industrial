const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('store: no announcement strip, fixed wide banner, category page without forced height',()=>{
 const css=pub('style.css');
 assert.match(css,/\.announcement\{display:none!important\}/);
 assert.match(css,/\.hero\.hero-image-only\{min-height:0!important;height:auto!important;aspect-ratio:2\/1/);
 assert.match(css,/aspect-ratio:3\/1/);assert.match(css,/aspect-ratio:4\/1/);
 assert.match(css,/#category-view\.category-view\{min-height:0\}/);
 assert.match(pub('store.js'),/setProperty\("--banner-fill"/);
});

test('admin: full-width header on PC and a sidebar group that folds',()=>{
 assert.match(pub('site-admin.css'),/\.admin-page>header\.nav\{max-width:none/);
 assert.match(pub('site-admin.css'),/a\[aria-expanded="false"\]\+\.admin-sidebar-subnav\{display:none\}/);
 assert.match(pub('admin.js'),/admin-sidebar a\+\.admin-sidebar-subnav/);
});
