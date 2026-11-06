// Private, independently playable call segments. Stored in SQLite so existing database backups include them.
const express=require('express'),crypto=require('node:crypto');
const fail=(status,message)=>{const e=Error(message);e.status=status;throw e};
function ensure(db){db.exec(`CREATE TABLE IF NOT EXISTS platform_call_recordings(id TEXT PRIMARY KEY,shop_id INTEGER NOT NULL,chat_id INTEGER NOT NULL,buyer_id INTEGER NOT NULL,recorder_id INTEGER NOT NULL,source TEXT NOT NULL,upload_key TEXT NOT NULL,video INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'recording',message_id INTEGER,created_at INTEGER NOT NULL,ended_at INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS platform_call_recordings_message ON platform_call_recordings(shop_id,message_id);
CREATE TABLE IF NOT EXISTS platform_call_recording_parts(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,recording_id TEXT NOT NULL,seq INTEGER NOT NULL,mime TEXT NOT NULL,secs INTEGER NOT NULL,bytes INTEGER NOT NULL,data BLOB NOT NULL,UNIQUE(shop_id,recording_id,seq));`)}
function install(router,{db,user,shopOf,manages,route,byId,limits}){
 // Live signaling is intentionally in memory. Recover already-saved segments if the server restarted mid-call.
 db.transaction(()=>{
  for(const r of db.prepare('SELECT * FROM platform_call_recordings WHERE message_id IS NULL').all()){
   const saved=db.prepare('SELECT COALESCE(SUM(secs),0) secs FROM platform_call_recording_parts WHERE shop_id=? AND recording_id=?').get(r.shop_id,r.id).secs;
   if(!saved||!db.prepare('SELECT id FROM platform_chats WHERE shop_id=? AND id=?').get(r.shop_id,r.chat_id))continue;
   const ownerId=db.prepare('SELECT owner_id FROM platform_shops WHERE id=?').get(r.shop_id)?.owner_id;
   const body=(r.video?'📹 Video':'📞 Voice')+' call · '+Math.floor(saved/60)+':'+String(saved%60).padStart(2,'0')+' (partial recording)';
   const message=db.prepare("INSERT INTO platform_chat_messages(shop_id,chat_id,from_shop,body,kind) VALUES(?,?,?,?,'call')").run(r.shop_id,r.chat_id,r.recorder_id===ownerId?1:0,body);
   db.prepare("UPDATE platform_chats SET updated_at=CURRENT_TIMESTAMP WHERE shop_id=? AND id=?").run(r.shop_id,r.chat_id);
   db.prepare("UPDATE platform_call_recordings SET message_id=?,state='partial',ended_at=? WHERE shop_id=? AND id=?").run(Number(message.lastInsertRowid),Date.now(),r.shop_id,r.id);
  }
 }).immediate();
 const parts=r=>db.prepare('SELECT id,seq,mime,secs,bytes FROM platform_call_recording_parts WHERE shop_id=? AND recording_id=? ORDER BY seq').all(r.shop_id,r.id);
 const info=r=>r?{id:r.id,video:Boolean(r.video),state:r.state,parts:parts(r)}:null;
 const find=id=>db.prepare('SELECT * FROM platform_call_recordings WHERE id=?').get(String(id));
 const access=(req,write=false,finishing=false)=>{
  const me=user(req),r=find(req.params.id);if(!r)fail(404,'Recording not found.');
  const shop=db.prepare('SELECT slug FROM platform_shops WHERE id=?').get(r.shop_id);if(!shop)fail(404,'Recording not found.');
  const s=shopOf(shop.slug);
  if(write){const key=String(req.get('x-recording-key')||'');if(me.id!==r.recorder_id||!/^[a-f0-9]{48}$/.test(key)||!crypto.timingSafeEqual(Buffer.from(key),Buffer.from(r.upload_key)))fail(404,'Recording not found.');if(!finishing&&(r.state!=='recording'||r.ended_at&&Date.now()-r.ended_at>300000))fail(409,'This recording is closed.');}
  else if(me.id!==r.buyer_id&&!manages(me,s))fail(404,'Recording not found.');
  return {r,shop:s};
 };
 router.post('/call/:id/recording',route((req,res)=>{
  const me=user(req),{c}=byId(req,me);if(c.state!=='active')fail(409,'The call is not connected.');
  if(!c.recordingCaller||!c.recordingCallee)fail(409,'Call recording requires updated apps on both phones.');
  const source=String(req.body?.source||'');if(!/^[a-f0-9-]{36}$/.test(source))fail(400,'Bad recording source.');
  const shop=shopOf(c.slug),l=limits(shop);if(!l.current||!l.permissions.uploads||l.usedBytes>=l.storageLimit)fail(413,'Shop storage is full. The call can continue without recording.');
  db.prepare('INSERT OR IGNORE INTO platform_call_recordings(id,shop_id,chat_id,buyer_id,recorder_id,source,upload_key,video,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(c.id,shop.id,c.chatId,c.buyerId,me.id,source,crypto.randomBytes(24).toString('hex'),c.video?1:0,Date.now());
  const r=find(c.id),owns=r.recorder_id===me.id&&r.source===source;
  res.json({id:r.id,owns,...(owns?{key:r.upload_key}:{})});
 }));
 router.post('/call-recordings/:id/parts',express.raw({type:()=>true,limit:'8mb'}),route((req,res)=>{
  const {r,shop}=access(req,true),seq=Number(req.query.seq),secs=Number(req.query.secs),b=req.body;
  if(!Number.isSafeInteger(seq)||seq<0||seq>1440||!Number.isSafeInteger(secs)||secs<1||secs>90||!Buffer.isBuffer(b)||b.length<32)fail(400,'Bad recording segment.');
  const existing=db.prepare('SELECT id FROM platform_call_recording_parts WHERE shop_id=? AND recording_id=? AND seq=?').get(r.shop_id,r.id,seq);if(existing)return res.json({id:existing.id});
  const count=db.prepare('SELECT COUNT(*) n FROM platform_call_recording_parts WHERE shop_id=? AND recording_id=?').get(r.shop_id,r.id).n;if(seq!==count)fail(409,'Upload recording segments in order.');
  const format=b.readUInt32BE(0)===0x1a45dfa3?'webm':b.toString('latin1',4,8)==='ftyp'?'mp4':'';if(!format)fail(400,'Unsupported recording format.');
  const l=limits(shop);if(!l.current||!l.permissions.uploads||l.usedBytes+b.length>l.storageLimit)fail(413,'Shop storage is full. The call can continue without recording.');
  const mime=(r.video?'video/':'audio/')+format;
  const id=db.prepare('INSERT INTO platform_call_recording_parts(shop_id,recording_id,seq,mime,secs,bytes,data) VALUES(?,?,?,?,?,?,?)').run(r.shop_id,r.id,seq,mime,secs,b.length,b).lastInsertRowid;
  res.status(201).json({id:Number(id)});
 }));
 router.post('/call-recordings/:id/finish',route((req,res)=>{
  const {r}=access(req,true,true);if(r.state!=='recording')return res.json({ok:true});db.prepare('UPDATE platform_call_recordings SET state=? WHERE shop_id=? AND id=?').run(req.body?.failed?'partial':'ready',r.shop_id,r.id);res.json({ok:true});
 }));
 router.get('/call-recordings/:id/parts/:part',route((req,res)=>{
  const {r}=access(req),p=db.prepare('SELECT mime,data,bytes FROM platform_call_recording_parts WHERE shop_id=? AND recording_id=? AND id=?').get(r.shop_id,r.id,Number(req.params.part)||-1);if(!p)fail(404,'Recording segment not found.');
  const size=p.bytes,range=req.get('range');res.set({'Content-Type':p.mime,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'private, no-store'});
  if(!range)return res.set('Content-Length',size).end(p.data);
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||!m[1]&&!m[2])return res.status(416).set('Content-Range','bytes */'+size).end();
  const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]&&m[2]?Math.min(Number(m[2]),size-1):size-1;
  if(start>end||start>=size)return res.status(416).set('Content-Range','bytes */'+size).end();
  res.status(206).set({'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1}).end(p.data.subarray(start,end+1));
 }));
 return {
  status:c=>{const r=find(c.id);return r?{state:r.state,video:Boolean(r.video)}:null},
  link:(c,messageId)=>db.prepare('UPDATE platform_call_recordings SET message_id=?,ended_at=? WHERE shop_id=? AND id=?').run(messageId,Date.now(),shopOf(c.slug).id,c.id),
  forMessage:(shopId,messageId)=>info(db.prepare('SELECT * FROM platform_call_recordings WHERE shop_id=? AND message_id=?').get(shopId,messageId))
 };
}
module.exports={ensure,install};
