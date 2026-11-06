const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
// 1.1.347 Google Play rejected the app: the privacy policy must name the app, package, developer and contact like the store listing.
test('English privacy policy and terms name the app, package, developer and contact',()=>{
 for(const f of ['privacy.html','terms.html']){
  const html=fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
  for(const s of ['SkyShopMM','com.skyshopmm.app','TECH4MM','uoakkarkyaw2002@gmail.com','09-766472432','https://skyshopmm.com','/delete-account.html'])assert.ok(html.includes(s),f+' has '+s);
  assert.ok(!/<script/i.test(html),f+' has no scripts');
 }
});

// 1.1.348 owner (Android): alerts switched on, but after closing and reopening the app the switch was off.
test('the alerts switch makes a fresh phone subscription when the old one was lost',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','settings-alerts.js'),'utf8');
 assert.ok(js.includes('gh-alerts-on:')&&js.includes('await turnOn(true)'),'self-heal when the phone had turned alerts on');
 assert.ok(js.includes('localStorage.removeItem(onKey)'),'turning off really stays off');
});
