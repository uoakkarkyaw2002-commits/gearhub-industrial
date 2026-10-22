// Owner's video: tapping the cart button rolls a cart in, drops a box into it, rolls it out,
// then shows a green circle with a tick and returns to the normal button.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('adding to cart plays the button animation (adding, then success, then normal)',()=>{
 const js=read('store.js');
 assert.match(js,/animateCartFly\(sourceButton,p\);playCartButton\(sourceButton\);cart\[id\]=now\+n;/,'runs only after the stock check passes');
 assert.match(js,/function playCartButton\(button\)\{if\(!button\?\.classList\.contains\("add"\)\|\|window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\)return;/);
 assert.match(js,/class="cart-fx-cart"[\s\S]*class="cart-fx-box"[\s\S]*class="cart-fx-check"/);
 assert.match(js,/button\.classList\.add\("is-adding"\);button\._cartFxAdding=setTimeout\(\(\)=>\{button\.classList\.replace\("is-adding","is-success"\);button\._cartFxDone=setTimeout\(\(\)=>button\.classList\.remove\("is-success"\),1300\)\},1300\)/);
});

test('animation styles apply on PC and phones (top level, not phone-only)',()=>{
 const css=read('style.css'),tail=css.slice(css.indexOf('/* Add to cart button animation'));
 assert.ok(tail.length>100);
 for(const rule of ['.products .product .add.is-adding .cart-fx-cart{animation:cart-fx-roll','.products .product .add.is-adding .cart-fx-box{animation:cart-fx-drop','.products .product .add.is-success{background:#22a35a','@keyframes cart-fx-roll','@keyframes cart-fx-check'])assert.ok(tail.includes(rule),rule);
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');assert.equal((clean.match(/\{/g)||[]).length,(clean.match(/\}/g)||[]).length);
});
