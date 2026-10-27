const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');const nodemailer=require('nodemailer');
function createNotifications({db,dataDir,env=process.env,transportFactory=nodemailer.createTransport}){
 db.exec('CREATE TABLE IF NOT EXISTS notification_status (event TEXT PRIMARY KEY,last_attempt INTEGER,last_sent INTEGER,last_failure INTEGER,message_id TEXT)');
 const enabled=env.ALERT_EMAIL_ENABLED==='true',backupEnabled=env.BACKUP_EMAIL_ENABLED==='true';
 const recipient=String(env.PASSWORD_RESET_EMAIL||'').trim();
 const configured=Boolean(env.SMTP_USER&&env.SMTP_APP_PASSWORD&&/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient));
 let transport,timer;
 const pending=new Map(),memory=new Map();
 function record(event,values){memory.set(event,{event,...memory.get(event),...values});}
 function writeState(action){try{action();}catch{}}
 function smtp(){if(!configured)throw new Error('Recovery Gmail SMTP settings are not configured.');if(!transport)transport=transportFactory({host:'smtp.gmail.com',port:465,secure:true,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:45000,auth:{user:env.SMTP_USER,pass:String(env.SMTP_APP_PASSWORD).replace(/\s+/g,'')}});return transport;}
 async function deliver(event,message){
  const now=Date.now();record(event,{last_attempt:now});writeState(()=>db.prepare('INSERT INTO notification_status(event,last_attempt) VALUES(?,?) ON CONFLICT(event) DO UPDATE SET last_attempt=excluded.last_attempt').run(event,now));
  try{
   const result=await smtp().sendMail({from:env.SMTP_USER,to:recipient,...message});
   const accepted=(result.accepted||[]).some(address=>String(address).toLowerCase()===recipient.toLowerCase());
   if(!accepted||(result.rejected||[]).length)throw new Error('Recovery Gmail did not accept the message.');
   const sent=Date.now();record(event,{last_sent:sent,last_failure:null});writeState(()=>db.prepare('UPDATE notification_status SET last_sent=?,last_failure=NULL,message_id=? WHERE event=?').run(sent,String(result.messageId||''),event));
   console.log(JSON.stringify({event:'email_delivery_success',kind:event,at:new Date().toISOString()}));return {accepted:true};
  }catch(error){const failed=Date.now();record(event,{last_failure:failed});writeState(()=>db.prepare('UPDATE notification_status SET last_failure=? WHERE event=?').run(failed,event));console.error(JSON.stringify({event:'email_delivery_failure',kind:event,code:error.code||error.name}));throw error;}
 }
 async function backup(archive){
  if(!backupEnabled)throw new Error('Email backups are disabled.');
  const size=(await fs.promises.stat(archive)).size;
  const base=path.basename(archive),subject='GearHub daily recovery backup — '+new Date().toISOString().slice(0,10);
  const privacy='Keep this message private. SMTP acceptance confirms submission, not inbox placement.';
  if(size<=18*1024*1024)return deliver('backup',{subject,text:'The attached archive contains the GearHub database, product images and payment receipts. To restore, stop the service and follow DEPLOYMENT.md. '+privacy,attachments:[{filename:base,path:archive,contentType:'application/gzip'}]});
  // Keep each MIME message comfortably below Gmail's 25 MB total limit.
  // Stream from the existing immutable archive: no second on-disk archive or full-buffer copy.
  const chunkBytes=12*1024*1024,total=Math.ceil(size/chunkBytes);
  if(total>100)throw Object.assign(new Error('Email recovery set is too large. Configure object storage.'),{code:'BACKUP_EMAIL_TOO_LARGE'});
  const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(archive))hash.update(chunk);
  const manifest={format:'gearhub-email-parts',version:1,archive:base,bytes:size,sha256:hash.digest('hex'),parts:[]};
  for(let i=0;i<total;i++){
   const start=i*chunkBytes,end=Math.min(size,start+chunkBytes)-1,partHash=crypto.createHash('sha256');
   for await(const chunk of fs.createReadStream(archive,{start,end}))partHash.update(chunk);
   manifest.parts.push({filename:base+'.part-'+String(i+1).padStart(3,'0'),bytes:end-start+1,sha256:partHash.digest('hex')});
  }
  for(let i=0;i<total;i++){
   const start=i*chunkBytes,end=Math.min(size,start+chunkBytes)-1;
   await deliver('backup',{subject:subject+' — '+base+' — part '+(i+1)+'/'+total,text:'This is one part of a recovery set, not an independently restorable archive. Save every numbered part and the recovery manifest from the final completion email into a private folder. Run scripts/reassemble-email-backup.js with the manifest path, then verify:restore before any restore. A partial set is NOT a successful backup. '+privacy,attachments:[{filename:manifest.parts[i].filename,content:fs.createReadStream(archive,{start,end}),contentType:'application/octet-stream'}]});
  }
  // The caller records off-site success only after all parts AND this manifest are accepted.
  return deliver('backup',{subject:subject+' — '+base+' — complete '+total+'-part set',text:'All '+total+' parts have been submitted. Save the numbered attachments and this manifest together. Verify checksums with scripts/reassemble-email-backup.js; follow DEPLOYMENT.md before restoring. '+privacy,attachments:[{filename:base+'.parts.json',content:JSON.stringify(manifest,null,2),contentType:'application/json'}]});
 }
 function alert(event,description,{once=false}={}){
  if(!enabled)return Promise.resolve({disabled:true});
  if(pending.has(event))return pending.get(event);
  let row=memory.get(event);try{const saved=db.prepare('SELECT last_sent,last_attempt FROM notification_status WHERE event=?').get(event);if(saved)row={last_sent:Math.max(saved.last_sent||0,row?.last_sent||0),last_attempt:Math.max(saved.last_attempt||0,row?.last_attempt||0)};}catch{}
  if((once&&row?.last_sent)|| (row?.last_attempt&&Date.now()-row.last_attempt<60*60*1000))return Promise.resolve({throttled:true});
  const job=deliver(event,{subject:'GearHub service alert: '+event,text:description+'\n\nCheck Render service logs and the Backup & monitoring panel. No customer information is included in this alert.'}).finally(()=>pending.delete(event));pending.set(event,job);return job;
 }
 function status(){let rows;try{rows=db.prepare('SELECT event,last_sent,last_failure FROM notification_status').all();}catch{rows=[];}const merged=new Map(rows.map(row=>[row.event,row]));for(const [event,row]of memory)merged.set(event,{...merged.get(event),...row});rows=[...merged.values()];const lastSent=Math.max(0,...rows.map(row=>row.last_sent||0));return {enabled,backupEnabled,configured,lastSent:lastSent?new Date(lastSent).toISOString():null,hasFailure:rows.some(row=>row.last_failure)};}
 async function check(){
  let issue;
  try{db.prepare('SELECT 1').get();const disk=fs.statfsSync(dataDir);if(disk.bavail*disk.bsize<=100*1024*1024)issue=['low-disk','Less than 100 MB remains on the shop data disk.'];}
  catch{issue=['database-or-disk','The database or durable disk check failed.'];}
  if(issue)await alert(...issue).catch(()=>{});
  await alert('monitoring-enabled','Recovery Gmail alerts are enabled for backup failures, server errors and low disk space.',{once:true}).catch(()=>{});
 }

 // New shop application: one email per application to the GearHub owner's recovery Gmail.
 function application({name,slug,email,reason,origin}){
  if(!enabled)return Promise.resolve({disabled:true});
  const clean=v=>String(v??'').replace(/[\r\n]+/g,' ').slice(0,300);
  return deliver('application',{subject:'GearHub: new shop application — '+clean(name),text:['A new shop is waiting for your approval.','','Shop name: '+clean(name),'Shop URL: /shops/'+clean(slug)+'/','Google account: '+clean(email),'Reason: '+clean(reason||'—'),'','Review it in the owner dashboard: '+String(origin||'')+'/platform.html?view=console'].join('\n')});
 }
 return {backup,alert,application,status,start(){if(!enabled)return;alert('monitoring-enabled','Recovery Gmail alerts are enabled for backup failures, server errors and low disk space.',{once:true}).catch(()=>{});check().catch(()=>{});timer=setInterval(()=>check().catch(()=>{}),5*60*1000).unref();},stop(){clearInterval(timer);transport?.close?.();}};
}
module.exports={createNotifications};
