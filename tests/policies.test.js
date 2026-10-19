const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('policies page has Terms, Privacy, Seller rules and contact, with no scripts',()=>{
 const html=pub('policies.html');
 for(const id of ['terms','privacy','seller','contact'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/name="viewport"/);assert.match(html,/09-766472432/);assert.match(html,/အခမဲ့/);
 assert.ok(!/<script/i.test(html),'static page needs no JavaScript (CSP script-src self)');
});
test('every store footer and the seller application link to the policies',()=>{
 const index=pub('index.html');
 for(const anchor of ['#terms','#privacy','#seller'])assert.ok(index.includes('href="/policies.html'+anchor+'"'),anchor);
 assert.match(pub('shop-application.js'),/href="\/policies\.html#seller"/);
});
