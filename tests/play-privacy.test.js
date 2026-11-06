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

// 1.1.353 owner: other apps ask for Notifications/Camera when opened; SkyShopMM asked nothing.
test('the installed app asks for notifications, camera and microphone once, from a tap',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','permission-ask.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');
 assert.ok(js.includes("android-app://")&&js.includes('Notification.requestPermission')&&js.includes('getUserMedia')&&js.includes("gh-perm-ask-v1"),'asks once inside the app');
 const tag=html.match(/\/permission-ask\.js\?v=[^"]+/)?.[0];assert.ok(tag&&sw.includes('"'+tag+'"'),'tag in index and SHELL');
});
