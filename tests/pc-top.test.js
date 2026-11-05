const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('1.1.321: PC shop Home in the owner picture — 🔔 💬 at the right of the top bar, Cart badge, Profile ⌄, hero ‹ ›, machines on Promotion',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),js=read('public/pc-top.js'),css=read('public/pc-top.css');
 for(const tag of ['/pc-top.css?v=1.1.321','/pc-top.js?v=1.1.321'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
 assert.ok(sw.includes('"/images/promo-machines.png?v=1.1.321"'));assert.ok(fs.existsSync(path.join(__dirname,'..','public','images','promo-machines.png')));
 assert.match(js,/const wide=matchMedia\('\(min-width:1024px\)'\)/);
 assert.match(js,/if\(wide\.matches\)\{if\(box\.parentElement!==header\)header\.append\(box\)\}else if\(home&&box\.parentElement!==home\)home\.append\(box\)/,'buttons go back into the banner on phones');
 assert.match(js,/className='pc-cart-badge'/);assert.match(js,/className='pc-hero-arrow '/);
 assert.match(css,/^\.pc-cart-badge,\.pc-chevron,\.pc-search-glass,\.pc-hero-arrow,\.pc-promo-machines\{display:none\}/m,'nothing new shows on phones');
 assert.match(css,/@media \(min-width:1024px\) and \(max-width:1399px\)\{/,'tighter menu on narrower computers');
});
