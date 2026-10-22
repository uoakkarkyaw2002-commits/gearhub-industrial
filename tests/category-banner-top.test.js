// The storefront category page shows no title above the banner; the banner sits at the top.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('category page hides the title above the banner',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(css,/#category-view:not\(\.category-products-mode\) \.category-page-top h2,#category-view:not\(\.category-products-mode\) \.category-page-top \.category-page-subtitle\{display:none\}/);
 assert.match(css,/@media\(max-width:850px\)\{#category-view:not\(\.category-products-mode\) \.category-page-top\{display:none!important\}\}/);
});
