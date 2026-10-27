// skyshopmm.com opening page: illustrated sunset background (owner's request), only for visitors applying.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('platform page shows the sunset scene behind the application card',()=>{
 const html=read('platform.html'),css=read('platform.css'),svg=read('images/platform-scene.svg');
 assert.match(html,/<img class="sky-scene" src="\/scene-asset\/picture" alt="" aria-hidden="true" \/><\/picture>/);
 assert.match(css,/\.sky-scene,\.sky-layer\{display:none\}/);
 assert.match(css,/body\.onboarding \.sky-scene,body\.onboarding \.sky-layer\{display:block;position:fixed;inset:0/);
 assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/@media \(prefers-reduced-motion:reduce\)\{\*\{animation:none!important\}\}/);
 assert.ok(!/<script/i.test(svg),'no scripts inside the picture');
});

test('visitors get the top menu; 1.1.204: the sign-in card opens by itself on the Home page and again from Sign in',()=>{
 const html=read('platform.html'),css=read('platform.css'),js=read('platform.js');
 assert.match(html,/<nav class="site-nav" id="site-nav" aria-label="Main" hidden><a href="\/platform\.html" data-platform-link>Home<\/a><a href="#about">About<\/a><a href="#service">Service<\/a><a href="#contact">Contact<\/a><button type="button" class="nav-signin" id="signin-open" aria-expanded="false" aria-controls="account">Sign in<\/button><\/nav>/);
 assert.match(js,/document\.body\.classList\.toggle\("visitor",landing\);/);
 assert.match(js,/if \(landing\) \{ signIn\(true\); return; \}/);
 assert.match(html,/<title>skyshopmm\.com<\/title>/,'1.1.205 owner: the tab shows only skyshopmm.com');
 assert.match(js,/\$\("signin-open"\)\?\.addEventListener\("click",\(\)=>signIn\(true\)\);/);
 assert.match(css,/body\.visitor #account\{display:none\}/);
 assert.match(css,/body\.visitor\.signin-open #account\{display:grid;position:fixed;inset:0/);
});
