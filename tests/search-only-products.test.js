// 1.1.214 owner: while searching, the shop page shows only the search bar and the matching products.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('searching hides the banner, categories, catalog heading, filters, info cards, policies and footer',()=>{
 const js=read('store.js'),css=read('style.css'),html=read('index.html'),sw=read('sw.js');
 assert.match(js,/function renderProducts\(\)\{\n[^\n]*\n document\.body\.classList\.toggle\("searching",!!\$\("search"\)\.value\.trim\(\)\);/);
 assert.ok(css.includes('body.searching [data-home-content]:not(.mobile-search):not(#catalog),body.searching nav[aria-label="Policies"],body.searching #catalog .section-head,body.searching #catalog .filters{display:none!important}'));
 for(const asset of ['style.css','store.js']){const tag=html.match(new RegExp('/'+asset.replace('.','\\.')+'\\?v=[^"]+'))[0];assert.ok(sw.includes('"'+tag+'"'),asset);}
});
