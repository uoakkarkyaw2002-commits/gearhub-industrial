// Owner's request: no product limit. Shops add as many products as they like (storage stays the limit),
// and Plans no longer has an "Active product limit" field.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('a plan never limits how many products a shop has',()=>{
 const model=read('lib/platform-model.js'),platform=read('lib/platform.js'),ui=read('public/platform.js');
 assert.match(model,/productLimit: Infinity,/,'creating, Excel import and restoring from trash all check this one value');
 assert.doesNotMatch(ui,/Active product limit|productLimit/,'the field is gone from Plans');
 assert.match(platform,/product_limit=COALESCE\(\?,product_limit\)/,'saving a plan without the field keeps the stored value');
 assert.match(platform,/p\.productLimit === undefined \? 100000 : integer\(p\.productLimit, 100000\)/);
});
