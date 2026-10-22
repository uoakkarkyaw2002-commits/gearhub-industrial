// An app update never reloads the page while the admin is typing or has unsaved
// category edits, so adding a new category is not thrown back to the dashboard.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('update reload waits for typing and unsaved category edits',()=>{
 const updates=read('public/updates.js'),admin=read('public/admin.js');
 assert.match(updates,/window\.__gearhubCategoryDirty \|\|\n\s+document\.activeElement\?\.matches\?\.\("input:not\(\[readonly\]\)/);
 assert.match(admin,/const markCategoriesDirty=\(dirty=true\)=>\{window\.__gearhubCategoryDirty=dirty;\};/);
 assert.match(admin,/function addCategory\(parent\)\{if\(categorySaving\)return;markCategoriesDirty\(\);/);
 assert.match(admin,/markCategoriesDirty\(false\);categoryEditing\.clear\(\);renderCategoryManager\(result\.categories\)/);
 assert.match(read('public/admin.html'),/\/updates\.js\?v=20261022-ready-1/);
});
test('the 20-second refresh never reloads categories over unsaved edits',()=>{
 const admin=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.match(admin,/async function loadCategoryManager\(\)\{try\{const loaded=await api\("\/api\/admin\/categories"\);[\s\S]{0,140}if\(window\.__gearhubCategoryDirty\)return;/);
});
