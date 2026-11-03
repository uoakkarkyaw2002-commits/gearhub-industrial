const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('1.1.269: Permissions-Policy lets our own pages use the camera (photo scanner); other features stay off',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(s,/const permissionsPolicy="camera=\(self\), microphone=\(\), geolocation=\(\)/);
 assert.doesNotMatch(s,/camera=\(\),/);
});
test('1.1.270: photo search shows the alike products (˄ ˅) instead of "No match found" when two are close',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','photo-scan.js'),'utf8');
 assert.match(js,/function likely\(thumb,seconds,best\)\{if\(best&&best\.score>=SURE&&best\.list\?\.length\)\{found\(best\.list\.filter\(m=>m\.score>=SURE-0\.1\)\.slice\(0,3\),thumb,seconds\);return\}none\(thumb,seconds,best\)\}/);
 assert.match(js,/stop\(\);likely\(thumb,seconds,bestSeen\);return/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),/photo-scan\.js\?v=1\.1\.274/);
});
test('1.1.271: faster scan — a clear match in one frame, a look-alike streak of three; most of the screen is scanned',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','photo-scan.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(js,/const QUICK=0\.75,QUICK_LEAD=0\.05,STREAK=3;/);
 assert.match(js,/if\(a&&streak\.n>=\(a\.score>=0\.8\?2:STREAK\)\)\{/);
 assert.match(css,/\.photo-scanner-frame\{position:absolute;left:50%;top:50%;width:min\(88vw,560px\);height:min\(64vh,640px\)/);
});
test('1.1.272: the scanner keeps two frames on the way and sends smaller frames',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','photo-scan.js'),'utf8');
 assert.match(js,/if\(inflight>=2\)\{loop=setTimeout\(tick,120\);return\}/);
 assert.match(js,/blob=await jpeg\(video,\.\.\.region,384,\.75\)/);
 assert.match(js,/loop=setTimeout\(tick,350\);/);
});
