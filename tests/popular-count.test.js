const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('1.1.265: Popular categories count products in the category and all subcategories (seller shops send no product_count)',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','store.js'),'utf8');
 assert.match(js,/const categoryTotal=\(c,seen=new Set\(\)\)=>\{if\(seen\.has\(c\.id\)\)return 0;[\s\S]*?reduce\(\(n,x\)=>n\+categoryTotal\(x,seen\),0\)\};/);
 assert.match(js,/'\+categoryTotal\(c\)\+' '\+esc\(tr\('items'\)\)/);
 assert.doesNotMatch(js,/Number\(c\.product_count\|\|0\)\+' '\+esc\(tr\('items'\)\)/);
});
