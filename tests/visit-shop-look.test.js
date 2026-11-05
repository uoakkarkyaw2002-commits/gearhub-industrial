const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
test('1.1.327: visiting another shop shows its counts + caption header, Home/Category/exit and a round delivery Cart',()=>{
 const js=read('public/visit-shop.js'),css=read('public/visit-shop.css'),html=read('public/index.html'),sw=read('public/sw.js');
 assert.match(js,/'\/api\/platform\/profile\/'\+encodeURIComponent\(slug\)/);assert.match(js,/className='visit-cart'/);assert.match(js,/navCart\.click\(\)/);
 assert.match(js,/className='visit-verified'/,'own class: the seller cleanup removes .settings-verified');
 assert.match(css,/@media \(max-width:1023px\)/);assert.match(css,/^\.visit-cart,\.visit-verified,\.visit-stats,\.visit-caption\{display:none\}/m,'nothing new on PC');
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.ok(fs.existsSync('public/images/cart-scooter.png'));
 for(const tag of ['/visit-shop.css?v=1.1.327','/visit-shop.js?v=1.1.327'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
 assert.ok(sw.includes('"/images/cart-scooter.png?v=1.1.327"'));
});
