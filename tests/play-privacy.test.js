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

// 1.1.355 owner: a message must make the other phone ring, whichever way it goes (buyer -> shop, shop -> buyer).
test('chat alerts go to the buyer too, and the GearHub owner can chat as a buyer',()=>{
 const chat=fs.readFileSync(path.join(__dirname,'..','lib','shop-chat.js'),'utf8'),ud=fs.readFileSync(path.join(__dirname,'..','public','user-data.js'),'utf8');
 assert.ok(chat.includes("notifyBuyer(chat.user_id, shop, '💬 ' + shopName(shop), c.body)")&&chat.includes("'/user-push/subscribe'"),'shop answer alerts the buyer');
 assert.ok(chat.includes("req.query.as !== 'buyer'"),'buyer view for a person who also manages the shop');
 assert.ok(ud.includes('/api/platform/user-push/subscribe')&&ud.includes('enablePush'),'the phone is saved to the account');
});

// 1.1.357 owner: video call on top of the voice call.
test('video call: the chat has a video button, the server remembers the kind and logs it',()=>{
 const chat=fs.readFileSync(path.join(__dirname,'..','lib','shop-chat.js'),'utf8'),vc=fs.readFileSync(path.join(__dirname,'..','public','voice-call.js'),'utf8'),nc=fs.readFileSync(path.join(__dirname,'..','public','noti-chat.js'),'utf8');
 assert.ok(chat.includes('video:req.body?.video === true')&&chat.includes("'Video call'")&&chat.includes('video:c.video'),'server keeps the kind');
 assert.ok(vc.includes('offerToReceiveVideo')&&vc.includes('vc-remote')&&vc.includes("facingMode:'user'"),'client sends and shows video');
 assert.ok(nc.includes('data-nc="vcall"')&&nc.includes('start(cs,openChat===\'buyer\'?null:openChat,who,true)'),'video button in the chat');
});
