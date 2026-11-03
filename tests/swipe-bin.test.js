const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('1.1.258: products and orders swipe left into the Recycle Bin with a red border, arrow and bin',()=>{
 const js=read('public/swipe-bin.js'),admin=read('public/admin.html');
 assert.match(admin,/<script src="\/swipe-bin\.js\?v=1\.1\.258"><\/script>/);
 assert.match(js,/sel:'\[data-mobile-product-id\]'[\s\S]*\/api\/admin\/products\/'\+id\+'\/trash'/);
 assert.match(js,/sel:'#orders-table \[data-order-open\]'[\s\S]*\/api\/admin\/orders\/'\+id,\{method:'DELETE'/);
 assert.match(js,/\.swipe-armed\{outline:2\.5px solid #e5484d/);assert.match(js,/className='swipe-arrow'/);assert.match(js,/className='swipe-bin'/);
 assert.match(js,/if\(!confirm\(cur\.k\.ask\)\)\{reset\(\);return\}/,'asks once before moving');
 assert.doesNotMatch(read('public/admin.js'),/let inventorySwipe/,'the old swipe handler is gone (no double move)');
});
test('1.1.259: on phones opening another dashboard card closes the open one',()=>{
 const js=read('public/admin.js');
 assert.match(js,/requestAnimationFrame\(\(\)=>\{closeOtherMobileDashboardPanels\(id\);positionMobileDashboardDetail\(id\)/);
 assert.match(js,/function closeOtherMobileDashboardPanels\(id\)\{\n if\(!window\.matchMedia\("\(max-width:800px\)"\)\.matches/);
});
