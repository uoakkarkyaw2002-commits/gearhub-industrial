const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
// Category banners must all have the same shape whatever photo the shop uploads.
test('every category banner has one fixed shape and the whole photo fits inside',()=>{
 const tail=css.slice(css.lastIndexOf('/* Category banners: every banner has the same shape'));
 assert.match(tail,/#category-view \.category-feature-banner\.has-image\{aspect-ratio:2\/1!important;height:auto!important/);
 assert.match(tail,/\.has-image>img:not\(\[hidden\]\)\{position:absolute!important;inset:0;width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important/);
 assert.match(tail,/@media\(min-width:851px\)\{#category-view \.category-feature-banner\.has-image\{aspect-ratio:3\/1!important\}\}/);
 assert.match(css,/\.has-image::before\{[^}]*background:var\(--banner-fill\)/,'empty sides show a blur of the same photo');
});
