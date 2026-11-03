const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('1.1.261: Play Store account deletion page explains how to delete and what is deleted',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','delete-account.html'),'utf8');
 assert.match(html,/Delete your SkyShopMM account/);assert.match(html,/09-766472432/);assert.match(html,/Data that is deleted/);assert.match(html,/Data that is kept/);
 assert.doesNotMatch(html,/<script/,'static page, no scripts');
});
