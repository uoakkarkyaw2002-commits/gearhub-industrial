const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
test('1.1.325: + Add offers Personal, Business and Category; Category is the admin\'s own Product categories',()=>{
 const menu=read('public/profile-menu.js'),admin=read('public/admin.js'),html=read('public/admin.html');
 assert.match(menu,/work:'Business'/);assert.doesNotMatch(menu,/work:'Work'/);
 assert.match(menu,/data-pm="category"/);
 assert.match(menu,/'\/admin\.html\?categories=1':admin\('\?categories=1'\)/,'shops and GearHub open their own admin category manager');
 assert.ok(!fs.existsSync('public/category-sheet.js'),'no second category editor');
 assert.match(admin,/get\("categories"\)!=="1"/);assert.match(admin,/data-content-id="category-manager-content"/);
 assert.match(admin,/sessionStorage\.setItem\("gh-open-profile","1"\)/,'← returns to the Profile');
 assert.match(html,/\/admin\.js\?v=1\.1\.325/);
});
