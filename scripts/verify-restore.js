const fs=require('node:fs');const path=require('node:path');const Database=require('better-sqlite3');const os=require('node:os');
function verifyRestore(directory){
 const root=path.resolve(directory),file=path.join(root,'gearhub.sqlite');
 if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('Expected a regular staged gearhub.sqlite file.');
 for(const suffix of ['-wal','-shm'])if(fs.existsSync(file+suffix))throw Error('Staging contains WAL/SHM files; do not mix old sidecars with an online backup.');
 for(const name of ['uploads','receipts'])if(!fs.lstatSync(path.join(root,name)).isDirectory()||fs.lstatSync(path.join(root,name)).isSymbolicLink())throw Error('Expected private staged media directories without symlinks.');
 const manifest=require('../lib/backup-manifest').validateBackupManifest(root);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gearhub-restore-verify-'));let db;
 try{
  const copied=path.join(temp,'gearhub.sqlite');fs.copyFileSync(file,copied);db=new Database(copied,{readonly:true,fileMustExist:true});
  if(db.pragma('integrity_check',{simple:true})!=='ok'||db.pragma('foreign_key_check').length)throw Error('Backup database integrity or foreign-key verification failed.');
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
  for(const table of ['admins','products','orders','sessions','password_reset_codes','site_settings'])if(!tables.has(table))throw Error('Backup is missing required shop tables.');
  let missingUploads=0,missingReceipts=0;
  function present(folder,name){if(name!==path.basename(name))return false;const target=path.join(root,folder,name);try{const stat=fs.lstatSync(target);return stat.isFile()&&!stat.isSymbolicLink();}catch{return false;}}
  const uploadNames=new Set();
  function collect(value){if(typeof value==='string'){const match=value.match(/^\/uploads\/([a-f0-9]+\.(?:jpg|png|webp|gif|avif))$/i);if(match)uploadNames.add(match[1]);}else if(value&&typeof value==='object')Object.values(value).forEach(collect);}
  for(const row of db.prepare('SELECT image_urls FROM products').all())collect(JSON.parse(row.image_urls));
  for(const row of db.prepare('SELECT settings_json FROM site_settings').all())collect(JSON.parse(row.settings_json));
  for(const name of uploadNames)if(!present('uploads',name))missingUploads++;
  for(const row of db.prepare("SELECT receipt_path FROM orders WHERE receipt_path<>''").all())if(!present('receipts',row.receipt_path))missingReceipts++;
  if(tables.has('platform_files'))for(const row of db.prepare('SELECT shop_id,filename FROM platform_files WHERE ready=1').all()){
   if(!Number.isInteger(row.shop_id)||row.filename!==path.basename(row.filename))throw Error('Invalid tenant media reference.');
   const dir=path.join(root,'platform-media',String(row.shop_id)),target=path.join(dir,row.filename);
   try{if(fs.lstatSync(path.join(root,'platform-media')).isSymbolicLink()||fs.lstatSync(dir).isSymbolicLink()||!fs.lstatSync(target).isFile()||fs.lstatSync(target).isSymbolicLink())throw Error();}catch{throw Error('Backup references missing or unsafe tenant media.');}
  }
  if(missingUploads||missingReceipts)throw Error(`Backup references missing media: ${missingUploads} uploads, ${missingReceipts} receipts.`);
  return {ok:true,manifest,products:db.prepare('SELECT COUNT(*) n FROM products').get().n,orders:db.prepare('SELECT COUNT(*) n FROM orders').get().n,sessionsToInvalidate:db.prepare('SELECT COUNT(*) n FROM sessions').get().n,resetCodesToInvalidate:db.prepare('SELECT COUNT(*) n FROM password_reset_codes').get().n};
 }finally{db?.close();fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module){try{if(process.argv.length!==3)throw Error('Usage: node scripts/verify-restore.js /absolute/path/to/extracted/gearhub-backup');console.log(JSON.stringify(verifyRestore(process.argv[2])));console.log('Read-only verification complete. No sessions were deleted and no production files were replaced. Follow the stopped-service restore checklist.');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={verifyRestore};
