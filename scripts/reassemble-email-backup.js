const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
async function reassemble(manifestPath){
 const directory=path.dirname(path.resolve(manifestPath));const m=JSON.parse(await fs.promises.readFile(manifestPath,'utf8'));
 const safe=n=>typeof n==='string'&&/^[a-zA-Z0-9._-]+$/.test(n)&&n!=='.'&&n!=='..';
 if(m.format!=='gearhub-email-parts'||m.version!==1||!safe(m.archive)||!m.archive.endsWith('.tar.gz')||!Number.isSafeInteger(m.bytes)||m.bytes<=0||!/^[a-f0-9]{64}$/.test(m.sha256)||!Array.isArray(m.parts)||!m.parts.length||m.parts.length>100)throw Error('Invalid recovery manifest.');
 if(new Set(m.parts.map(p=>p.filename)).size!==m.parts.length||m.parts.some((p,i)=>!safe(p.filename)||p.filename!==m.archive+'.part-'+String(i+1).padStart(3,'0')||!Number.isSafeInteger(p.bytes)||p.bytes<=0||p.bytes>12*1024*1024||!/^[a-f0-9]{64}$/.test(p.sha256))||m.parts.reduce((n,p)=>n+p.bytes,0)!==m.bytes)throw Error('Invalid part list.');
 const output=path.join(directory,m.archive),temporary=output+'.reassembling';let handle,created=false;
 try{handle=await fs.promises.open(temporary,'wx',0o600);created=true;const hash=crypto.createHash('sha256');let bytes=0;
 for(const part of m.parts){const file=path.join(directory,part.filename),stat=await fs.promises.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==part.bytes)throw Error('Missing or invalid recovery part.');const partHash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file)){partHash.update(chunk);hash.update(chunk);bytes+=chunk.length;await handle.writeFile(chunk);}if(partHash.digest('hex')!==part.sha256)throw Error('Recovery part checksum mismatch.');}
 if(bytes!==m.bytes||hash.digest('hex')!==m.sha256)throw Error('Archive checksum mismatch.');await handle.sync();await handle.close();handle=null;
 // Link with exclusive semantics; never overwrite an existing recovery archive.
 await fs.promises.link(temporary,output);return {ok:true,bytes,parts:m.parts.length};
 }finally{await handle?.close();if(created)await fs.promises.unlink(temporary).catch(()=>{});}
}
if(require.main===module)reassemble(process.argv[2]||'').then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Recovery set validation failed. Original parts were not changed; existing output was not overwritten.');process.exitCode=1;});
module.exports={reassemble};
