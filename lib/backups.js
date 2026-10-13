const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const {writeBackupManifest}=require('./backup-manifest');
function createBackupService({db,dataDir,uploadDir,receiptDir,notifications}) {
 const directory=path.join(dataDir,'backups');
 const intervalHours=Number(process.env.BACKUP_INTERVAL_HOURS||24);
 const retention=Number(process.env.BACKUP_RETENTION||7);
 if (!Number.isFinite(intervalHours)||intervalHours<1||intervalHours>168) throw new Error('BACKUP_INTERVAL_HOURS must be between 1 and 168.');
 if (!Number.isInteger(retention)||retention<1||retention>90) throw new Error('BACKUP_RETENTION must be between 1 and 90.');
 db.exec('CREATE TABLE IF NOT EXISTS backup_status (id INTEGER PRIMARY KEY CHECK(id=1), last_success TEXT, last_failure TEXT, last_offsite_success TEXT)');
 let running=null,timer;
 function status(){const row=db.prepare('SELECT last_success,last_failure,last_offsite_success FROM backup_status WHERE id=1').get()||{};return {...row,running:Boolean(running),offsiteConfigured:Boolean(process.env.BACKUP_S3_BUCKET)||process.env.BACKUP_EMAIL_ENABLED==='true',emailBackupEnabled:process.env.BACKUP_EMAIL_ENABLED==='true',intervalHours,retainedLocalCopies:retention};}
 async function perform(){
  let stage;
  const name='gearhub-'+new Date().toISOString().replace(/[:.]/g,'-')+'.tar.gz';
  const archive=path.join(directory,name);
  const partial=archive+'.partial';
  try {
   await fs.promises.mkdir(directory,{recursive:true,mode:0o700});
   stage=await fs.promises.mkdtemp(path.join(directory,'.stage-'));
   const root=path.join(stage,'gearhub-backup');await fs.promises.mkdir(root,{mode:0o700});
   await db.backup(path.join(root,'gearhub.sqlite'));
   await fs.promises.cp(uploadDir,path.join(root,'uploads'),{recursive:true});
   await fs.promises.cp(receiptDir,path.join(root,'receipts'),{recursive:true});
   await writeBackupManifest(root);
   await exec('tar',['-czf',partial,'-C',stage,'gearhub-backup'],{timeout:120000});
   await fs.promises.chmod(partial,0o600);
   await fs.promises.rename(partial,archive);
   const archives=(await fs.promises.readdir(directory)).filter(file=>/^gearhub-.*\.tar\.gz$/.test(file)).sort().reverse();
   await Promise.all(archives.slice(retention).map(file=>fs.promises.unlink(path.join(directory,file))));
   let offsite=false;
   if(process.env.BACKUP_S3_BUCKET){
    const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
    const client=new S3Client({region:process.env.BACKUP_S3_REGION||'auto',endpoint:process.env.BACKUP_S3_ENDPOINT||undefined,forcePathStyle:process.env.BACKUP_S3_FORCE_PATH_STYLE==='true',credentials:process.env.BACKUP_S3_ACCESS_KEY_ID?{accessKeyId:process.env.BACKUP_S3_ACCESS_KEY_ID,secretAccessKey:process.env.BACKUP_S3_SECRET_ACCESS_KEY}:undefined});
    try{await client.send(new PutObjectCommand({Bucket:process.env.BACKUP_S3_BUCKET,Key:(process.env.BACKUP_S3_PREFIX||'gearhub/')+name,Body:fs.createReadStream(archive),ContentLength:(await fs.promises.stat(archive)).size,ContentType:'application/gzip',...(process.env.BACKUP_S3_ENCRYPTION?{ServerSideEncryption:process.env.BACKUP_S3_ENCRYPTION}:{})}),{abortSignal:AbortSignal.timeout(120000)});offsite=true;}finally{client.destroy();}
   }
   if(process.env.BACKUP_EMAIL_ENABLED==='true'){
    if(!notifications)throw new Error('Email backup delivery is unavailable.');
    await notifications.backup(archive);offsite=true;
   }
   const now=new Date().toISOString();
   db.prepare("INSERT INTO backup_status(id,last_success,last_failure,last_offsite_success) VALUES(1,? ,NULL,?) ON CONFLICT(id) DO UPDATE SET last_success=excluded.last_success,last_failure=NULL,last_offsite_success=COALESCE(excluded.last_offsite_success,backup_status.last_offsite_success)").run(now,offsite?now:null);
   console.log(JSON.stringify({event:'backup_success',offsite,at:now}));return {ok:true,offsite,createdAt:now};
  }catch(error){
   const now=new Date().toISOString();
   try{db.prepare('INSERT INTO backup_status(id,last_failure) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_failure=excluded.last_failure').run(now);}catch{}
   // Failed offsite uploads still retain the complete local archive for recovery.
   console.error(JSON.stringify({event:'backup_failure',at:now,code:error.code||error.name}));
   await notifications?.alert('backup-failure','The automatic off-site backup failed. A complete local archive is retained if archive creation succeeded. Check the backup panel for its last success.').catch(()=>{});throw error;
  }finally{await fs.promises.rm(partial,{force:true}).catch(()=>{});if(stage)await fs.promises.rm(stage,{recursive:true,force:true}).catch(()=>{});}
 }
 function run(){if(!running)running=perform().finally(()=>{running=null});return running;}
 function start(){
  const schedule=()=>run().catch(()=>{});
  const last=status().last_success;
  if(!last||Date.now()-Date.parse(last)>=intervalHours*3600000||(status().offsiteConfigured&&!status().last_offsite_success))schedule();
  timer=setInterval(()=>{const state=status();if(!state.last_success||state.last_failure||Date.now()-Date.parse(state.last_success)>=intervalHours*3600000)schedule();},Math.min(intervalHours,1)*3600000).unref();
 }
 return {status,run,start,stop(){clearInterval(timer);}};
}
module.exports={createBackupService};
