const path=require('node:path');const fs=require('node:fs');
function contains(parent,child){const relative=path.relative(parent,child);return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));}
function runtimeConfig(env=process.env){
 const production=env.NODE_ENV==='production';let origin='';
 if(env.PUBLIC_ORIGIN){try{const url=new URL(env.PUBLIC_ORIGIN);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();origin=url.origin;}catch{throw new Error('PUBLIC_ORIGIN must be a plain HTTP(S) origin without credentials, a path, query or fragment.');}}
 if(production&&(!origin||!origin.startsWith('https://')))throw new Error('Set PUBLIC_ORIGIN to the HTTPS storefront origin in production.');
 if(production&&(env.VERCEL||!env.DATA_DIR))throw new Error('Production requires DATA_DIR on durable storage and a persistent Node service, not Vercel functions.');
 if(production&&!path.isAbsolute(env.DATA_DIR))throw new Error('Production DATA_DIR must be an absolute persistent disk path.');
 if(production&&env.WEB_CONCURRENCY!==undefined&&env.WEB_CONCURRENCY!=='1')throw new Error('SQLite production requires WEB_CONCURRENCY=1 and one Render instance.');
 const secret=String(env.SESSION_SECRET||'');
 if(production&&(Buffer.byteLength(secret)<32||new Set(secret).size<8||/changethis|changeme|example|your[-_ ]?secret/i.test(secret)))throw new Error('SESSION_SECRET must be a unique random value of at least 32 bytes, not a placeholder.');
 const dataDir=path.resolve(env.DATA_DIR||path.join(__dirname,'..','data'));const receiptDir=path.join(dataDir,'receipts');const backupDir=path.join(dataDir,'backups');const uploadDir=path.resolve(env.UPLOAD_DIR||path.join(dataDir,'uploads'));
 if(uploadDir===dataDir||contains(uploadDir,receiptDir)||contains(receiptDir,uploadDir)||contains(uploadDir,backupDir)||contains(backupDir,uploadDir))throw new Error('UPLOAD_DIR must not overlap the database, receipts or backup directory.');
 if(production&&!contains(dataDir,uploadDir))throw new Error('Production uploads must be inside the configured persistent DATA_DIR.');
 for(const key of ['BACKUP_EMAIL_ENABLED','ALERT_EMAIL_ENABLED'])if(env[key]==='true'&&(!env.SMTP_USER||!env.SMTP_APP_PASSWORD||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(env.PASSWORD_RESET_EMAIL||'')))throw new Error('Enabled recovery email requires SMTP credentials and one valid PASSWORD_RESET_EMAIL.');
 if(env.BACKUP_S3_ENDPOINT){let url;try{url=new URL(env.BACKUP_S3_ENDPOINT);}catch{throw new Error('BACKUP_S3_ENDPOINT must be a valid URL.');}if((production&&url.protocol!=='https:')||url.username||url.password)throw new Error('Production BACKUP_S3_ENDPOINT must use HTTPS without URL credentials.');}
 if(Boolean(env.BACKUP_S3_ACCESS_KEY_ID)!==Boolean(env.BACKUP_S3_SECRET_ACCESS_KEY))throw new Error('Both S3 credential fields must be provided together, or omit both to use an AWS role.');
 return {production,publicOrigin:origin,dataDir,uploadDir,receiptDir,backupDir};
}
function validateStorage(config){
 const realData=fs.realpathSync(config.dataDir),realUpload=fs.realpathSync(config.uploadDir),realReceipt=fs.realpathSync(config.receiptDir);const realBackup=fs.existsSync(config.backupDir)?fs.realpathSync(config.backupDir):path.join(realData,'backups');
 if(realUpload===realData||contains(realUpload,realReceipt)||contains(realReceipt,realUpload)||contains(realUpload,realBackup)||contains(realBackup,realUpload))throw new Error('Resolved upload storage overlaps private receipts, backup or database storage.');
 if(config.production&&(!contains(realData,realUpload)||!contains(realData,realReceipt)||!contains(realData,realBackup)))throw new Error('Resolved storage must remain on the configured durable data tree.');
 for(const directory of [config.dataDir,config.uploadDir,config.receiptDir,...(fs.existsSync(config.backupDir)?[config.backupDir]:[])])fs.accessSync(directory,fs.constants.R_OK|fs.constants.W_OK|fs.constants.X_OK);
}
module.exports={runtimeConfig,validateStorage,contains};
