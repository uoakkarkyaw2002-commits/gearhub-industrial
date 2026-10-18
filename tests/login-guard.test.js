const {test}=require('node:test');const assert=require('node:assert/strict');const Database=require('better-sqlite3');
const fs=require('node:fs');const path=require('node:path');
const {createLoginGuard,MAX_FAILURES,WINDOW_MS,BASE_LOCK_MS,MAX_LOCK_MS}=require('../lib/login-guard');
function setup(){let t=1_000_000;const locks=[];const db=new Database(':memory:');const guard=createLoginGuard({db,now:()=>t,onLock:l=>locks.push(l)});return {db,guard,locks,tick:ms=>{t+=ms;}};}

test('wrong passwords from all addresses lock the admin login after the limit',()=>{
 const {guard,locks}=setup();
 for(let i=1;i<MAX_FAILURES;i++)assert.equal(guard.failure().locked,false);
 const locked=guard.failure();assert.equal(locked.locked,true);assert.equal(locked.retryAfter,BASE_LOCK_MS/1000);
 assert.equal(locks.length,1);assert.equal(locks[0].failures,MAX_FAILURES);
 assert.equal(guard.status().locked,true);
 // Guesses during a lock neither extend it nor send another alert.
 guard.failure();assert.equal(locks.length,1);assert.equal(guard.status().retryAfter,BASE_LOCK_MS/1000);
});

test('the lock expires, doubles when attacks continue and caps at 24 hours',()=>{
 const {guard,tick}=setup();
 const lockOnce=()=>{for(let i=0;i<MAX_FAILURES;i++)guard.failure();return guard.status().retryAfter*1000;};
 assert.equal(lockOnce(),BASE_LOCK_MS);tick(BASE_LOCK_MS);assert.equal(guard.status().locked,false);
 assert.equal(lockOnce(),BASE_LOCK_MS*2);tick(BASE_LOCK_MS*2);
 let last=0;for(let i=0;i<10;i++){last=lockOnce();tick(last);}
 assert.equal(last,MAX_LOCK_MS);
});

test('a correct login or a password reset clears the counter and the lock history',()=>{
 const {guard,tick}=setup();
 for(let i=0;i<MAX_FAILURES-1;i++)guard.failure();
 guard.success();
 for(let i=0;i<MAX_FAILURES-1;i++)assert.equal(guard.failure().locked,false);
 guard.failure();assert.equal(guard.status().locked,true);
 guard.clear();assert.equal(guard.status().locked,false);
 for(let i=0;i<MAX_FAILURES;i++)guard.failure();
 assert.equal(guard.status().retryAfter*1000,BASE_LOCK_MS);tick(1);
});

test('old failures outside the 15 minute window do not add up',()=>{
 const {guard,tick}=setup();
 for(let i=0;i<MAX_FAILURES-1;i++)guard.failure();
 tick(WINDOW_MS+1);
 for(let i=0;i<MAX_FAILURES-1;i++)assert.equal(guard.failure().locked,false);
});

test('the guard state is kept in the database so a restart does not reset it',()=>{
 const {db,guard}=setup();
 for(let i=0;i<MAX_FAILURES;i++)guard.failure();
 const again=createLoginGuard({db,now:()=>1_000_000});
 assert.equal(again.status().locked,true);
});

test('server checks the guard before the password and clears it on success and reset',()=>{
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 const login=server.slice(server.indexOf('app.post("/api/admin/login"'));
 assert.ok(login.indexOf('loginGuard.status()')<login.indexOf('bcrypt.compare'));
 assert.match(login,/loginGuard\.success\(\)/);
 assert.match(server,/loginGuard\.clear\(\)/);
 assert.match(server,/notifications\.alert\("admin-login-locked"/);
});
