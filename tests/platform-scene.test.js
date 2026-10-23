// skyshopmm.com opening page: illustrated sunset background (owner's request), only for visitors applying.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('platform page shows the sunset scene behind the application card',()=>{
 const html=read('platform.html'),css=read('platform.css'),svg=read('images/platform-scene.svg');
 assert.match(html,/<img class="sky-scene" src="\/images\/platform-scene\.svg\?v=\d+" alt="" aria-hidden="true" \/>/);
 assert.match(css,/\.sky-scene\{display:none\}/);
 assert.match(css,/body\.onboarding \.sky-scene\{display:block;position:fixed;inset:0/);
 assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/@media \(prefers-reduced-motion:reduce\)\{\*\{animation:none!important\}\}/);
 assert.ok(!/<script/i.test(svg),'no scripts inside the picture');
});
