const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const {writeBackupManifest}=require('./backup-manifest');
function createBackupService({db,dataDir,uploadDir,receiptDir,notifications,drive}) {
 const directory=path.join(dataDir,'backups');
 const intervalHours=Number(process.env.BACKUP_INTERVAL_HOURS||24);
 const retention=Number(process.env.BACKUP_RETENTION||7);
 if (!Number.isFinite(intervalHours)||intervalHours<1||intervalHours>168) throw new Error('BACKUP_INTERVAL_HOURS must be between 1 and 168.');
 if (!Number.isInteger(retention)||retention<1||retention>90) throw new Error('BACKUP_RETENTION must be between 1 and 90.');
 db.exec('CREATE TABLE IF NOT EXISTS backup_status (id INTEGER PRIMARY KEY CHECK(id=1), last_success TEXT, last_failure TEXT, last_offsite_success TEXT)');
 let running=null,timer,lastAttempt=null;
 // Every local archive holds a full copy of all photos, so on the small server disk keep
 // only a few once an off-site copy exists, and never start one that would fill the disk.
 const offsiteOn=()=>Boolean(process.env.BACKUP_S3_BUCKET)||process.env.BACKUP_EMAIL_ENABLED==='true'||Boolean(drive?.connected());
 const localKeep=()=>offsiteOn()?Math.max(1,Math.min(retention,Number(process.env.BACKUP_LOCAL_KEEP||3)||3)):retention;
 const minFreeBytes=()=>Math.max(50,Number(process.env.BACKUP_MIN_FREE_MB||150)||150)*1024*1024;
 const localArchives=async()=>(await fs.promises.readdir(directory).catch(()=>[])).filter(file=>/^gearhub-.*\.tar\.gz$/.test(file)).sort().reverse();
 async function freeBytes(){try{const s=await fs.promises.statfs(directory);return s.bavail*s.bsize;}catch{return Infinity;}}
 async function makeRoom(){
  let archives=await localArchives();
  const sizes=await Promise.all(archives.map(f=>fs.promises.stat(path.join(directory,f)).then(s=>s.size).catch(()=>0)));
  // Staging copies the photos once more, then the archive is written: roughly 2.5x the last archive.
  const need=Math.round((sizes[0]||0)*2.5)+minFreeBytes();
  while(await freeBytes()<need&&archives.length>1){await fs.promises.unlink(path.join(directory,archives.pop())).catch(()=>{});}
  if(await freeBytes()<need)throw Object.assign(new Error('Server disk is almost full; backup skipped so the shop keeps working.'),{code:'ENOSPC'});
 }
 function status(){const row=db.prepare('SELECT last_success,last_failure,last_offsite_success FROM backup_status WHERE id=1').get()||{};return {...row,lastAttempt,running:Boolean(running),offsiteConfigured:offsiteOn(),emailBackupEnabled:process.env.BACKUP_EMAIL_ENABLED==='true',offsiteDestinations:destinations(),intervalHours,retainedLocalCopies:localKeep()};}
 // Names shown in the admin panel so the owner can see where copies go (no keys or URLs).
 function destinations(){const out=[];if(process.env.BACKUP_S3_BUCKET){const host=String(process.env.BACKUP_S3_ENDPOINT||'');out.push((/r2\.cloudflarestorage\.com/i.test(host)?'Cloudflare R2':'S3 storage')+' ('+String(process.env.BACKUP_S3_BUCKET).slice(0,63)+')');}if(process.env.BACKUP_EMAIL_ENABLED==='true')out.push('recovery Gmail');if(drive?.connected())out.push('Google Drive (GearHub Backups)');return out;}
 async function perform(){
  let stage,step="prepare",localArchiveComplete=false,archiveBytes=null;
  const name='gearhub-'+new Date().toISOString().replace(/[:.]/g,'-')+'.tar.gz';
  const archive=path.join(directory,name);
  const partial=archive+'.partial';
  try {
   await fs.promises.mkdir(directory,{recursive:true,mode:0o700});
   step="disk-space";
   await makeRoom();
   stage=await fs.promises.mkdtemp(path.join(directory,'.stage-'));
   const root=path.join(stage,'gearhub-backup');await fs.promises.mkdir(root,{mode:0o700});
   step="database";
   await db.backup(path.join(root,'gearhub.sqlite'));
   step="media";
   await fs.promises.cp(uploadDir,path.join(root,'uploads'),{recursive:true});
   await fs.promises.cp(receiptDir,path.join(root,'receipts'),{recursive:true});
   const platformMedia=path.join(dataDir,'platform-media');if(fs.existsSync(platformMedia))await fs.promises.cp(platformMedia,path.join(root,'platform-media'),{recursive:true});
   step="manifest";
   await writeBackupManifest(root);
   step="archive";
   await exec('tar',['-czf',partial,'-C',stage,'gearhub-backup'],{timeout:120000});
   await fs.promises.chmod(partial,0o600);
   await fs.promises.rename(partial,archive);
   localArchiveComplete=true;archiveBytes=(await fs.promises.stat(archive)).size;
   step="retention";
   const archives=await localArchives();
   await Promise.all(archives.slice(localKeep()).map(file=>fs.promises.unlink(path.join(directory,file))));
   let offsite=false;
   if(process.env.BACKUP_S3_BUCKET){
    step="s3-delivery";
    const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
    const client=new S3Client({region:process.env.BACKUP_S3_REGION||'auto',endpoint:process.env.BACKUP_S3_ENDPOINT||undefined,forcePathStyle:process.env.BACKUP_S3_FORCE_PATH_STYLE==='true',credentials:process.env.BACKUP_S3_ACCESS_KEY_ID?{accessKeyId:process.env.BACKUP_S3_ACCESS_KEY_ID,secretAccessKey:process.env.BACKUP_S3_SECRET_ACCESS_KEY}:undefined});
    try{await client.send(new PutObjectCommand({Bucket:process.env.BACKUP_S3_BUCKET,Key:(process.env.BACKUP_S3_PREFIX||'gearhub/')+name,Body:fs.createReadStream(archive),ContentLength:(await fs.promises.stat(archive)).size,ContentType:'application/gzip',...(process.env.BACKUP_S3_ENCRYPTION?{ServerSideEncryption:process.env.BACKUP_S3_ENCRYPTION}:{})}),{abortSignal:AbortSignal.timeout(120000)});offsite=true;}finally{client.destroy();}
   }
   if(drive?.connected()){step="drive-delivery";await drive.backup(archive,name);offsite=true;}
   if(process.env.BACKUP_EMAIL_ENABLED==='true'){
    step="email-delivery";
    if(!notifications)throw new Error('Email backup delivery is unavailable.');
    await notifications.backup(archive);offsite=true;
   }
   const now=new Date().toISOString();
   db.prepare("INSERT INTO backup_status(id,last_success,last_failure,last_offsite_success) VALUES(1,? ,NULL,?) ON CONFLICT(id) DO UPDATE SET last_success=excluded.last_success,last_failure=NULL,last_offsite_success=COALESCE(excluded.last_offsite_success,backup_status.last_offsite_success)").run(now,offsite?now:null);
   lastAttempt={at:now,ok:true,stage:"complete",localArchiveComplete,archiveBytes};
   console.log(JSON.stringify({event:'backup_success',offsite,at:now}));return {ok:true,offsite,createdAt:now};
  }catch(error){
   const now=new Date().toISOString();
   try{db.prepare('INSERT INTO backup_status(id,last_failure) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_failure=excluded.last_failure').run(now);}catch{}
   // Failed offsite uploads still retain the complete local archive for recovery.
   const allowedCodes=new Set(['ENOSPC','EACCES','ENOENT','ETIMEDOUT','ECONNRESET','ECONNREFUSED','EAUTH','EMESSAGE','BACKUP_EMAIL_TOO_LARGE']);
   const code=allowedCodes.has(error.code)?error.code:'BACKUP_FAILED';
   lastAttempt={at:now,ok:false,stage:step,code,localArchiveComplete,archiveBytes};
   console.error(JSON.stringify({event:'backup_failure',...lastAttempt}));
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
