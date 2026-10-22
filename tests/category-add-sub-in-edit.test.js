// A main category's edit panel has its own "+ Subcategory" button (no need to expand first).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('edit panel offers + Subcategory for main and subcategories',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.match(js,/\$\{depth<2\?`<button type="button" data-category-command="add-sub" data-category-key="\$\{key\}">＋ \$\{depth\?'Child subcategory':'Subcategory'\}<\/button>`:''\}<button type="button" data-category-command="done"/);
});
test('only real unsaved category drafts are kept across an update reload',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.match(js,/saveCategories=\(\)=>\{if\(window\.__gearhubCategoryDirty\)sessionStorage\.setItem\(/);
 assert.match(js,/return Array\.isArray\(draft\)&&draft\.length\?draft:rows;/);
});
