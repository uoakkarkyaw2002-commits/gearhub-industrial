// skyshopmm.com ("/") opens the "My shop" page (1.1.130), so the GearHub link there must open GearHub's
// own store at /index.html; a link to "/" only reloaded the same page.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('the GearHub link on the My shop page opens GearHub\'s store',()=>{
 const page=fs.readFileSync(path.join(__dirname,'..','public','platform.html'),'utf8'),server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(page,/<a class="site-brand" href="\/index\.html">GearHub<\/a>/);
 assert.match(server,/app\.get\(\["\/","\/index\.html"\],/,'GearHub\'s store is served at /index.html');
});
