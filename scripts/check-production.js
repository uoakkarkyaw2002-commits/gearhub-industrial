const fs=require('node:fs');const path=require('node:path');
require('dotenv').config();
const failures=[];
let origin;try{origin=new URL(process.env.PUBLIC_ORIGIN);}catch{}
if(!origin||origin.protocol!=='https:'||origin.username||origin.password)failures.push('PUBLIC_ORIGIN must be the HTTPS storefront origin.');
if(!process.env.DATA_DIR||!path.isAbsolute(process.env.DATA_DIR))failures.push('DATA_DIR must be the absolute persistent disk mount.');
if(Buffer.byteLength(process.env.SESSION_SECRET||'')<32)failures.push('SESSION_SECRET must have at least 32 bytes.');
if(process.env.VERCEL)failures.push('Use a persistent Node service rather than Vercel functions.');
if(!process.env.BACKUP_S3_BUCKET)failures.push('Configure BACKUP_S3_BUCKET for off-site recovery.');
if(process.env.DATA_DIR&&fs.existsSync(process.env.DATA_DIR)){try{const stat=fs.statfsSync(process.env.DATA_DIR);if(stat.bavail*stat.bsize<100*1024*1024)failures.push('Less than 100 MB of storage is available.');}catch{failures.push('Cannot inspect persistent storage.');}}
if(failures.length){for(const message of failures)console.error(message);process.exitCode=1;}else console.log('Production environment checks passed. Verify the disk mount, off-site backup and restore drill in the deployment checklist.');
