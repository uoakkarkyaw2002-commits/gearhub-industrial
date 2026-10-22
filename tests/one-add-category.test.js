// The category editor has one add button: "+ Add Main Category" under the list.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('only the bottom Add Main Category button remains',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','admin.html'),'utf8'),js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.doesNotMatch(html,/id="add-category"/,'top "+ Add Category" button removed');
 assert.doesNotMatch(js,/\$\("add-category"\)/);
 assert.match(html,/id="add-main-category"/);
 assert.match(js,/\$\("add-main-category"\)\.addEventListener\("click",\(\)=>addCategory\(\)\);/);
});
