// skyshopmm.com (/) opens the "My shop" page; GearHub's own store stays at /index.html.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('the site root redirects to platform.html when shops are on',()=>{
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(server,/app\.get\("\/",\(req,res,next\)=>\{if\(process\.env\.PLATFORM_ENABLED!=="true"\)return next\(\);[^\n]*redirect\(302,"\/platform\.html"/);
 // The redirect is registered before the store page, and the store is still served at /index.html.
 assert.ok(server.indexOf('redirect(302,"/platform.html"')<server.indexOf('app.get(["/","/index.html"]'));
});
