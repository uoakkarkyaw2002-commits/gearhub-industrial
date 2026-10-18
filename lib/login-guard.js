// GearHub admin login guard. The per-IP rate limit lives in memory and resets on
// every deploy, and an attacker with many addresses can spread guesses across
// them. This guard counts wrong passwords from ALL addresses in the database, so
// it survives restarts: too many failures lock the password login for a while.
// The emailed password-reset code still works during a lock and clears it.
const WINDOW_MS=15*60*1000,MAX_FAILURES=10,BASE_LOCK_MS=15*60*1000,MAX_LOCK_MS=24*60*60*1000;
function createLoginGuard({db,now=()=>Date.now(),onLock=()=>{}}){
 db.exec('CREATE TABLE IF NOT EXISTS admin_login_guard (id INTEGER PRIMARY KEY CHECK(id=1),failures INTEGER NOT NULL DEFAULT 0,window_start INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0,lock_count INTEGER NOT NULL DEFAULT 0,last_success INTEGER)');
 db.prepare('INSERT OR IGNORE INTO admin_login_guard(id) VALUES(1)').run();
 const read=()=>db.prepare('SELECT * FROM admin_login_guard WHERE id=1').get();
 function status(){const row=read(),t=now();return row.locked_until>t?{locked:true,retryAfter:Math.ceil((row.locked_until-t)/1000)}:{locked:false};}
 function failure(){
  const t=now();let lock=null;
  db.transaction(()=>{
   const row=read();
   if(row.locked_until>t)return;
   const fresh=t-row.window_start>WINDOW_MS,failures=(fresh?0:row.failures)+1;
   if(failures>=MAX_FAILURES){
    // Each lock in a row doubles (15 min, 30 min, 1 h ... up to 24 h) until a good login.
    const ms=Math.min(MAX_LOCK_MS,BASE_LOCK_MS*2**row.lock_count);lock={ms,failures};
    db.prepare('UPDATE admin_login_guard SET failures=0,window_start=?,locked_until=?,lock_count=lock_count+1 WHERE id=1').run(t,t+ms);
   }else db.prepare('UPDATE admin_login_guard SET failures=?,window_start=? WHERE id=1').run(failures,fresh?t:row.window_start);
  }).immediate();
  if(lock){try{onLock(lock);}catch{}}
  return status();
 }
 function success(){db.prepare('UPDATE admin_login_guard SET failures=0,window_start=0,locked_until=0,lock_count=0,last_success=? WHERE id=1').run(now());}
 function clear(){db.prepare('UPDATE admin_login_guard SET failures=0,window_start=0,locked_until=0,lock_count=0 WHERE id=1').run();}
 return {status,failure,success,clear};
}
module.exports={createLoginGuard,WINDOW_MS,MAX_FAILURES,BASE_LOCK_MS,MAX_LOCK_MS};
