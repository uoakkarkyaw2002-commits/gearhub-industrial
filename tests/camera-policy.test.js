const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('1.1.269: Permissions-Policy lets our own pages use the camera (photo scanner); other features stay off',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(s,/const permissionsPolicy="camera=\(self\), microphone=\(\), geolocation=\(\)/);
 assert.doesNotMatch(s,/camera=\(\),/);
});
