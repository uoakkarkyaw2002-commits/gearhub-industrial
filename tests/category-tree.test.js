// Admin category editor uses the owner's tree design: green gear/folder squares joined by
// green lines, a product-count pill and a › / ⌄ chevron on every row.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('category rows render as a tree',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','site-admin.css'),'utf8');
 assert.match(js,/<span class="category-tree-icon" aria-hidden="true">\$\{depth\?CATEGORY_FOLDER:CATEGORY_PLANT\}<\/span>/);
 assert.match(js,/<span class="category-count">\$\{count\} \$\{count===1\?'product':'products'\}<\/span>/);
 assert.match(js,/\$\{expanded\?'⌄':'›'\}/);
 assert.match(js,/<span class="category-add-plus" aria-hidden="true">\+<\/span>Add \$\{depth\?'Child subcategory':'Subcategory'\}/);
 assert.match(css,/#category-manager-rows \.category-design-children>\*::before\{content:"";position:absolute;left:var\(--cx\)/,'tree connector lines');
 assert.match(css,/#category-manager-rows\{--tree:#14a03f;display:grid;grid-template-columns:minmax\(0,1fr\)/,'rows never overflow the screen');
 assert.match(css,/#category-manager-rows \.category-design-row\{min-width:0;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important/);
});
test('main categories use a plant icon and Add rows keep the line connected',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','site-admin.css'),'utf8');
 assert.match(js,/const CATEGORY_PLANT='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M12 1\.8c1\.7/);
 assert.match(css,/\.category-design-children>\.category-add-sub::before,#category-manager-rows \.category-design-children>\.category-add-sub::after\{left:calc\(var\(--cx\) - 1px\);top:-12px\}/);
});
