const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
test('1.1.323: + Add offers Personal, Business and Category; Category edits on the Profile without Admin',()=>{
 const menu=read('public/profile-menu.js'),sheet=read('public/category-sheet.js'),html=read('public/index.html'),sw=read('public/sw.js');
 assert.match(menu,/work:'Business'/);assert.doesNotMatch(menu,/work:'Work'/);
 assert.match(menu,/data-pm="category"/);assert.match(menu,/GearHubCategorySheet\?\.open\(/);
 assert.match(sheet,/'\/api\/platform\/shops\/'\+shopId\+'\/categories'/);assert.match(sheet,/call\(url,'PUT',\{categories:named\}\)/);
 assert.doesNotMatch(sheet,/\/admin/);
 for(const tag of html.match(/\/category-sheet\.(?:js|css)\?v=[0-9.]+/g))assert.ok(sw.includes('"'+tag+'"'),tag);
 assert.ok(html.indexOf('/category-sheet.js')<html.indexOf('/profile-menu.js'));
});
