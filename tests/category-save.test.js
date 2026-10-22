// Saving categories frees the editor at once: the page refresh after a save runs in the
// background, so Add/Save never go dead and a slow refresh is never shown as a failed save.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('category save does not wait for the page refresh',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.match(js,/let result;try\{result=await api\("\/api\/admin\/categories",\{method:"PUT"[\s\S]{0,200}return;\}finally\{categorySaving=false;button\.disabled=false;\}/);
 assert.match(js,/toast\("Categories saved"\);refreshAll\(\)\.catch\(\(\)=>\{\}\);/);
 assert.doesNotMatch(js,/toast\("Categories saved"\);await refreshAll\(\)/);
});
