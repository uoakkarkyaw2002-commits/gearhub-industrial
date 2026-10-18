const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const Database=require('better-sqlite3');const {createBackupService}=require('../lib/backups');
function setup(t,env){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gearhub-disk-test-'));for(const n of ['uploads','receipts'])fs.mkdirSync(path.join(root,n));
 fs.writeFileSync(path.join(root,'uploads','photo.bin'),Buffer.alloc(4096,7));
 const db=new Database(path.join(root,'gearhub.sqlite'));db.exec('CREATE TABLE example(id INTEGER)');
 const previous={};for(const [k,v]of Object.entries(env)){previous[k]=process.env[k];if(v===undefined)delete process.env[k];else process.env[k]=v;}
 const sent=[];const notifications={backup:async a=>sent.push(a),alert:async()=>{}};
 const service=createBackupService({db,dataDir:root,uploadDir:path.join(root,'uploads'),receiptDir:path.join(root,'receipts'),notifications});
 t.after(()=>{service.stop();db.close();fs.rmSync(root,{recursive:true,force:true});for(const k of Object.keys(env)){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}});
 const count=()=>fs.readdirSync(path.join(root,'backups')).filter(n=>n.endsWith('.tar.gz')).length;
 return {service,count,sent};
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('with an off-site copy, only 3 local backups stay on the small disk',async t=>{
 const {service,count,sent}=setup(t,{BACKUP_EMAIL_ENABLED:'true',BACKUP_RETENTION:'7',BACKUP_S3_BUCKET:undefined,BACKUP_LOCAL_KEEP:undefined,BACKUP_MIN_FREE_MB:'50'});
 for(let i=0;i<5;i++){await service.run();await tick();}
 assert.equal(count(),3);assert.equal(sent.length,5);
});
test('without off-site, the configured retention is kept',async t=>{
 const {service,count}=setup(t,{BACKUP_EMAIL_ENABLED:undefined,BACKUP_S3_BUCKET:undefined,BACKUP_RETENTION:'4',BACKUP_MIN_FREE_MB:'50'});
 for(let i=0;i<5;i++){await service.run();await tick();}
 assert.equal(count(),4);
});
test('a backup never fills the disk: old copies go first, then it is skipped safely',async t=>{
 const {service,count}=setup(t,{BACKUP_EMAIL_ENABLED:undefined,BACKUP_S3_BUCKET:undefined,BACKUP_RETENTION:'5',BACKUP_MIN_FREE_MB:'50'});
 for(let i=0;i<3;i++){await service.run();await tick();}
 assert.equal(count(),3);
 process.env.BACKUP_MIN_FREE_MB=String(1024*1024*1024); // pretend the disk needs far more room than exists
 await assert.rejects(service.run(),e=>e.code==='ENOSPC');
 assert.equal(count(),1,'older local copies were removed, the newest one is kept');
 assert.equal(service.status().lastAttempt.stage,'disk-space');
});
