const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
// 1.1.347 Google Play rejected the app: the privacy policy must name the app, package, developer and contact like the store listing.
test('English privacy policy and terms name the app, package, developer and contact',()=>{
 for(const f of ['privacy.html','terms.html']){
  const html=fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
  for(const s of ['SkyShopMM','com.skyshopmm.app','TECH4MM','uoakkarkyaw2002@gmail.com','09-766472432','https://skyshopmm.com','/delete-account.html'])assert.ok(html.includes(s),f+' has '+s);
  assert.ok(!/<script/i.test(html),f+' has no scripts');
 }
});
