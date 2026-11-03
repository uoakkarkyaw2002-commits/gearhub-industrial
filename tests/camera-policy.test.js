const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('1.1.269: Permissions-Policy lets our own pages use the camera (photo scanner); other features stay off',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(s,/const permissionsPolicy="camera=\(self\), microphone=\(\), geolocation=\(\)/);
 assert.doesNotMatch(s,/camera=\(\),/);
});
test('1.1.269: photo search shows the alike products (˄ ˅) instead of "No match found" when two are close',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','photo-scan.js'),'utf8');
 assert.match(js,/function likely\(thumb,seconds,best\)\{if\(best&&best\.score>=SURE&&best\.list\?\.length\)\{found\(best\.list\.filter\(m=>m\.score>=SURE-0\.1\)\.slice\(0,3\),thumb,seconds\);return\}none\(thumb,seconds,best\)\}/);
 assert.match(js,/stop\(\);likely\(thumb,seconds,bestSeen\);return/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),/photo-scan\.js\?v=1\.1\.269/);
});
