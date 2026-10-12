const fs=require('node:fs');const path=require('node:path');const Database=require('better-sqlite3');const {runtimeConfig,validateStorage}=require('../lib/config');
function checkProduction(env=process.env){
 const failures=[];if(env.NODE_ENV!=='production')failures.push('NODE_ENV must be production.');
 let config;try{config=runtimeConfig({...env,NODE_ENV:'production'});}catch(error){failures.push(error.message);}
 if(!env.BACKUP_S3_BUCKET&&env.BACKUP_EMAIL_ENABLED!=='true')failures.push('Configure S3/R2 or optional recovery email for an off-site copy.');
 if(config){
  try{validateStorage(config);const disk=fs.statfsSync(config.dataDir);if(disk.bavail*disk.bsize<100*1024*1024)failures.push('Less than 100 MB of storage is available.');}catch{failures.push('Configured persistent data/upload/receipt directories must exist and be readable/writable.');}
  const file=path.join(config.dataDir,'gearhub.sqlite');
  let db;try{
   db=new Database(file,{readonly:true,fileMustExist:true});
   let saved={};const row=db.prepare('SELECT settings_json FROM site_settings WHERE id=1').get();if(row)saved=JSON.parse(row.settings_json);
   const payment={bankName:env.BANK_NAME,bankAccountName:env.BANK_ACCOUNT_NAME,bankAccountNumber:env.BANK_ACCOUNT_NUMBER,...saved.payment};
   if(['bankName','bankAccountName','bankAccountNumber'].some(key=>!String(payment[key]||'').trim()))failures.push('Owner-supplied bank/payment details must be configured (values are never printed).');
   const demos=db.prepare("SELECT COUNT(*) n FROM products WHERE active=1 AND (sku LIKE 'GH-DEMO-%' OR description_en LIKE '%Initial sample stock and price%')").get().n;
   if(demos)failures.push('Active demo/sample inventory needs owner review before sales.');
   if(env.SEED_DEMO==='true')failures.push('SEED_DEMO must be disabled for customer launch.');
  }catch{failures.push('An existing shop database and readable site settings are required for launch verification.');}finally{db?.close();}
 }
 return failures;
}
if(require.main===module){require('dotenv').config();const failures=checkProduction();if(failures.length){failures.forEach(message=>console.error(message));process.exitCode=1;}else console.log('Production configuration checks passed. Owner must still verify bank ownership, policies, durable mount, mailbox delivery and the restore drill.');}
module.exports={checkProduction};
