// PC: the top menu stays on every store page and stays at the top while scrolling (owner's request).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('PC top menu shows on Category, Promotion and Settings and stays pinned',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','desktop.css'),'utf8');
 const tail=css.slice(css.lastIndexOf('/* PC: the top menu stays on every page'));
 assert.match(tail,/@media \(min-width:851px\)\{\n body>\.home-navigation,body\.non-home-view>\.home-navigation\{display:flex!important;position:sticky;top:0;z-index:40;/);
 // It comes after style.css's old "hide on non-home pages" rule, and desktop.css loads after style.css.
 const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
 assert.ok(html.indexOf('/style.css?v=')<html.indexOf('/desktop.css?v='));
});
