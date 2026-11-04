// 1.1.212 owner: opening another shop inside an installed app (GearHub app → POLESTAR) asks to add that
// shop as its own app instead of mixing the two.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('app-switch runs only inside an installed app and remembers the app\'s own shop per session',()=>{
 const js=read('public/app-switch.js');
 assert.match(js,/if\(!standalone\)return;/);
 assert.match(js,/let home=get\(sessionStorage,'gh-app-home'\);if\(home===null\)\{set\(sessionStorage,'gh-app-home',here\);home=here\}/);
 assert.match(js,/if\(!here\|\|home===here\)return;/,'its own shop and GearHub pages never ask');
 assert.match(js,/const installed=async\(\)=>\{try\{return typeof navigator\.getInstalledRelatedApps==='function'/,'1.1.295: Android\/PC skip the ask when that shop app is installed');assert.match(js,/const auto=!get\(localStorage,'gh-app-own:'\+here\)&&!get\(localStorage,'gh-app-asked:'\+here\);/,'"I have it" stops the automatic ask (1.1.253: the Settings row stays)');
 assert.match(js,/x-safari-https:\/\//,'iPhone opens Safari to add the app');
 assert.match(js,/const path=gearhub\?'\/index\.html':'\/shops\/'\+encodeURIComponent\(here\)\+'\/\?install=1'/,'1.1.213: the app is added from the shop Home page (name + logo, opens on Home)');
});
test('app-switch is loaded on shop pages and admin and cached offline',()=>{
 const sw=read('public/sw.js');
 for(const page of ['public/index.html','public/admin.html','public/platform.html']){const tag=read(page).match(/\/app-switch\.js\?v=[^"]+/)?.[0];assert.ok(tag,page);assert.ok(sw.includes('"'+tag+'"'),page+' tag in SHELL');}
});
test('1.1.257: GearHub\'s own store (/index.html) also gets "Create GearHub app" inside another app',()=>{
 const js=read('public/app-switch.js');
 assert.match(js,/gearhub=!match&&location\.pathname==='\/index\.html'/);
 assert.match(js,/const path=gearhub\?'\/index\.html':/);
 assert.match(js,/const shopName=\(\)=>gearhub\?'GearHub':/);
});
