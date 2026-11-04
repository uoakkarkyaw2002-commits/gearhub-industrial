// 1.1.309 owner (Facebook video): plain bottom bar with a light pill, no bubble, no dark tap square;
// tapping Home / Discover again goes to the top and reloads.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Facebook-like bottom bar and tap-again reload',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),css=read('public/fb-nav.css'),pull=read('public/pull-refresh.js');
 const tag=html.match(/\/fb-nav\.css\?v=[0-9.]+/)[0];assert.ok(sw.includes('"'+tag+'"'),'in SHELL');
 assert.match(css,/-webkit-tap-highlight-color:transparent/);assert.match(css,/\.liquid-nav-bubble\{display:none!important\}/);
 assert.match(css,/\.bottom-nav-item\.active>span\{background:#e3f3df!important/);
 assert.match(pull,/\[data-store-view="home"\],\.mobile-bottom-nav \[data-store-view="shops"\]'\);\n\s*if\(!tab\|\|busy\|\|!tab\.classList\.contains\('active'\)\)return;/);
});
