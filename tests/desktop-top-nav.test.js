// PC: the store navigation sits in the top header (Home / Category / Promotion / Cart / Settings)
// and the language button beside the Excel icon is hidden. Phones keep the bottom nav.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('PC header holds the five store navigation buttons',()=>{
 const html=read('index.html');
 const nav=html.match(/<nav class="desktop-top-nav"[\s\S]*?<\/nav>/);assert.ok(nav,'desktop-top-nav exists');
 for(const hook of ['data-store-view="home"','data-store-view="category"','data-store-view="promotion"','data-store-action="open-cart"','data-store-view="profile"'])assert.ok(nav[0].includes(hook),hook);
 assert.match(nav[0],/class="desktop-nav-item active" data-store-view="home"/,'Home starts active');
 assert.ok(html.indexOf('desktop-top-nav')<html.indexOf('class="nav-actions"'),'nav sits before the Excel button');
});

test('PC shows the top nav and hides the language button; phones hide the top nav',()=>{
 const css=read('desktop.css');
 assert.match(css,/\.nav \.desktop-top-nav\{display:none\}/,'hidden on phones (beats .nav nav)');
 const pc=css.slice(css.indexOf('@media (min-width:851px){\n .home-navigation{'));
 assert.match(pc,/\.home-navigation \.desktop-top-nav\{display:flex/);
 assert.match(pc,/\.home-navigation \.nav-actions #lang,\.home-navigation \.nav-actions #cart-open\{display:none!important\}/);
 assert.match(pc,/\.desktop-nav-item\.active\{background:#e8f4ea/);
 assert.match(pc,/\.mobile-bottom-nav\{display:none!important\}/);
});
