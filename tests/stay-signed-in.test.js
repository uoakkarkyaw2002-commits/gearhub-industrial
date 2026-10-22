// Admins stay signed in: 30-day sessions extended on every visit, and a deploy/restart
// (502/503 for a moment) never sends a signed-in admin back to the login screen.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('sessions last 30 days and roll forward with use',()=>{
 const server=read('server.js');
 assert.match(server,/const SESSION_MAX_AGE = 1000 \* 60 \* 60 \* 24 \* 30;/);
 assert.match(server,/rolling: true,\n cookie: \{ httpOnly: true, sameSite: "lax", secure: production, path: "\/", maxAge: SESSION_MAX_AGE \}/);
 assert.doesNotMatch(server,/maxAge: 1000 \* 60 \* 60 \* 8/);
});
test('admin pages wait for the server during a deploy instead of logging out',()=>{
 assert.match(read('public/tenant-admin.js'),/r=await fetch\('\/api\/platform\/me',\{cache:'no-store'\}\);if\(r\.status<500\|\|i>=40\)break;/);
 assert.match(read('public/admin.js'),/if\(\(r&&r\.status<500\)\|\|!navigator\.onLine\)break;/);
});
