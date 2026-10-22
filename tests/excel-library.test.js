// The storefront Excel library script must parse and recognise a shop page path.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('excel-library.js finds the shop slug from /shops/<slug>/',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8');
 const literal=js.match(/location\.pathname\.match\((\/.*?\/)\)/)[1];
 const re=new Function('return '+literal)();
 assert.equal(re.exec('/shops/psm-test-shop/')[1],'psm-test-shop');
 assert.equal(re.exec('/shops/psm-test-shop')[1],'psm-test-shop');
 assert.equal(re.exec('/'),null);
});
test('the Excel panel opens (.modal needs .open) and the list query uses real columns',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8'),platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
 assert.match(js,/modal\.hidden=false;modal\.classList\.add\('open'\)/);
 assert.match(js,/modal\.hidden=true;modal\.classList\.remove\('open'\)/);
 assert.doesNotMatch(platform,/created_at FROM platform_files/,'platform_files has no created_at column');
});
