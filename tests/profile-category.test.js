const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
test('1.1.326: + Add offers Personal, Business and Category; Category is the admin\'s own Product categories on the Profile',()=>{
 const menu=read('public/profile-menu.js'),admin=read('public/admin.js'),html=read('public/admin.html');
 assert.match(menu,/work:'Business'/);assert.doesNotMatch(menu,/work:'Work'/);
 assert.match(menu,/data-pm="category"/);
 assert.match(menu,/GearHubCategoryEditor\.open\(/,'shops edit categories on the Profile');assert.match(menu,/'\/admin\.html\?categories=1'/,'GearHub opens its own admin category manager');
 const editor=read('public/category-editor.js'),css=read('public/category-editor.css'),index=read('public/index.html'),sw=read('public/sw.js');
 assert.match(editor,/class="category-design-row/);assert.match(editor,/Select Parent Category/);assert.match(editor,/Save Categories/);assert.match(css,/#category-manager-rows/);
 for(const tag of index.match(/\/category-(?:editor|picker)\.(?:js|css)\?v=[^"]+/g))assert.ok(sw.includes('"'+tag+'"'),tag);
 assert.ok(!fs.existsSync('public/category-sheet.js'),'the 1.1.323 sheet is gone');
 assert.match(admin,/get\("categories"\)!=="1"/);assert.match(admin,/data-content-id="category-manager-content"/);
 assert.match(admin,/sessionStorage\.setItem\("gh-open-profile","1"\)/,'← returns to the Profile');
 assert.match(html,/\/admin\.js\?v=1\.1\.325/);
});
