const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
test('1.1.327: visiting another shop shows its counts + caption header, Home/Category/exit and a round delivery Cart',()=>{
 const js=read('public/visit-shop.js'),css=read('public/visit-shop.css'),html=read('public/index.html'),sw=read('public/sw.js');
 assert.match(js,/'\/api\/platform\/profile\/'\+encodeURIComponent\(slug\)/);assert.match(js,/className='visit-cart'/);assert.match(js,/navCart\.click\(\)/);
 assert.match(js,/className='visit-verified'/,'own class: the seller cleanup removes .settings-verified');
 assert.match(css,/@media \(max-width:1023px\)/);assert.match(css,/^\.visit-cart,\.visit-verified,\.visit-stats,\.visit-caption\{display:none\}/m,'visit-only elements stay hidden outside the visiting state');
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(js,/classList\.add\('visit-profile'\)/,'the right button is the visited shop\'s Profile');assert.match(js,/ghStep\)!==0\)return;\s*event\.stopImmediatePropagation\(\);/,'one Back press leaves');
 assert.ok(fs.existsSync('public/images/cart-scooter.png'));
 for(const tag of ['/visit-shop.css?v=1.1.375','/visit-shop.js?v=1.1.327'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
 assert.ok(sw.includes('"/images/cart-scooter.png?v=1.1.327"'));
});

test('1.1.328: while visiting, no ☰ on the shop Profile and the search menu offers only Trash',()=>{
 const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('public/visit-shop.css'),/body\.visiting-shop #profile-menu-open\{display:none!important\}/);
 const js=read('public/search-filter.js');assert.match(js,/if\(visiting\(\)\)scope='product';/);assert.match(js,/\[data-scope="product"\]'\)\.hidden=visiting\(\);/);
});
