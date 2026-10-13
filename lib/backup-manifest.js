const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
async function databaseChecksum(root){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(path.join(root,'gearhub.sqlite')))hash.update(chunk);return hash.digest('hex');}
async function writeBackupManifest(root){
 const manifest={version:2,createdAt:new Date().toISOString(),includes:['gearhub.sqlite','uploads','receipts'],databaseFilename:'gearhub.sqlite',uploadDirectory:'uploads',receiptDirectory:'receipts',checksumAlgorithm:'SHA-256',checksums:{'gearhub.sqlite':await databaseChecksum(root)}};
 if(fs.existsSync(path.join(root,'platform-media'))){manifest.includes.push('platform-media');manifest.platformMediaDirectory='platform-media';}
 await fs.promises.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});return manifest;
}
function validateBackupManifest(root){
 const file=path.join(root,'manifest.json');if(!fs.existsSync(file))return {present:false,version:null};
 const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('Invalid backup manifest file.');
 let m;try{m=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('Invalid backup manifest JSON.');}
 if(!m||![1,2].includes(m.version)||typeof m.createdAt!=='string'||!Number.isFinite(Date.parse(m.createdAt))||!Array.isArray(m.includes)||!['gearhub.sqlite','uploads','receipts'].every(n=>m.includes.includes(n)))throw Error('Invalid or unsupported backup manifest metadata.');
 if(m.version===2){
  if(m.databaseFilename!=='gearhub.sqlite'||m.uploadDirectory!=='uploads'||m.receiptDirectory!=='receipts'||m.checksumAlgorithm!=='SHA-256'||!/^[a-f0-9]{64}$/.test(m.checksums?.['gearhub.sqlite']||''))throw Error('Invalid backup manifest component metadata.');
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'gearhub.sqlite'))).digest('hex');if(actual!==m.checksums['gearhub.sqlite'])throw Error('Backup database checksum mismatch.');
 }
 return {present:true,version:m.version};
}
module.exports={writeBackupManifest,validateBackupManifest};
