// Private attachments. The existing voice/call transport remains separate.
const crypto=require('node:crypto'),multer=require('multer');
const {validToken}=require('./security');
const model=require('./platform-model');
function installChatFiles(router,{db,shopOf,user,manages,buyerChat,thread,append,messages,shopName,userName,notify,notifyBuyer}){
 db.exec(`CREATE TABLE IF NOT EXISTS platform_chat_files(id TEXT PRIMARY KEY,message_id INTEGER NOT NULL UNIQUE,shop_id INTEGER NOT NULL,chat_id INTEGER NOT NULL,user_id INTEGER NOT NULL,name TEXT NOT NULL,bytes INTEGER NOT NULL,data BLOB NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS platform_chat_files_shop ON platform_chat_files(shop_id,chat_id);
CREATE INDEX IF NOT EXISTS platform_chat_files_sender ON platform_chat_files(user_id,created_at);`);
 const fail=(status,message)=>{const e=Error(message);e.status=status;throw e};
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0,parts:2}}).single('file');
 const filename=value=>{let name=String(value||'attachment');if(Array.from(name).every(c=>c.codePointAt(0)<=255)){const decoded=Buffer.from(name,'latin1').toString('utf8');if(!decoded.includes('\uFFFD'))name=decoded}return Array.from(name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,160).join('')||'attachment'};
 function authorize(fromShop){return(req,res,next)=>{try{
  res.set('Cache-Control','no-store');
  if(!validToken(req.session.csrfToken,req.get('x-csrf-token')))fail(403,'Reload the page: security token missing or expired.');
  const shop=shopOf(req.params.slug),me=user(req);let chat=null;
  if(fromShop){if(!manages(me,shop))fail(403,'Only the shop can answer this chat.');chat=thread(req,shop)}
  else if(shop.owner_id===me.id)fail(400,'This is your own shop.');
  const count=db.prepare("SELECT COUNT(*) n FROM platform_chat_files WHERE user_id=? AND created_at>=datetime('now','-1 day')").get(me.id).n;
  if(count>=20)fail(429,'You can send up to 20 files a day.');
  req.chatFileContext={shop,me,chat};next();
 }catch(e){next(e)}}}
 const parse=(req,res,next)=>upload(req,res,error=>{if(error)return res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({error:error.code==='LIMIT_FILE_SIZE'?'Choose a file no larger than 5 MB.':'Choose one file (maximum 5 MB).'});next()});
 function save(fromShop){return(req,res,next)=>{try{
  const {shop,me}=req.chatFileContext,file=req.file;if(!file||!file.buffer?.length)fail(400,'Choose a file that is not empty.');
  const name=filename(file.originalname),id=crypto.randomUUID();let chat=req.chatFileContext.chat;
  db.transaction(()=>{
   if(db.prepare("SELECT COUNT(*) n FROM platform_chat_files WHERE user_id=? AND created_at>=datetime('now','-1 day')").get(me.id).n>=20)fail(429,'You can send up to 20 files a day.');
   const limits=model.permissions(db,shop);if(!limits.permissions.uploads)fail(403,'File uploads are not available for this shop.');
   if(limits.usedBytes+file.size>limits.storageLimit)fail(413,'Shop storage limit reached. Ask the platform owner for capacity.');
   if(!chat)chat=buyerChat(shop,me);
   append(shop,chat,fromShop,{kind:'file',body:'📎 '+name});
   const messageId=db.prepare('SELECT last_insert_rowid() id').get().id;
   db.prepare('INSERT INTO platform_chat_files(id,message_id,shop_id,chat_id,user_id,name,bytes,data) VALUES(?,?,?,?,?,?,?,?)').run(id,messageId,shop.id,chat.id,me.id,name,file.size,file.buffer);
  })();
  if(fromShop)notifyBuyer(chat.user_id,shop,'💬 '+shopName(shop),'📎 '+name);else notify(shop,{title:'💬 '+userName(me.id),body:'📎 '+name,url:'/shops/'+shop.slug+'/?chat=1'});
  res.status(201).json(fromShop?{role:'shop',name:userName(chat.user_id),messages:messages(shop,chat.id)}:{role:'buyer',shop:shopName(shop),messages:messages(shop,chat.id)});
 }catch(e){next(e)}}}
 router.post('/chat/:slug/files/upload',authorize(false),parse,save(false));
 router.post('/chat/:slug/:chat/files',authorize(true),parse,save(true));
 router.get('/chat/:slug/files/:id',(req,res,next)=>{try{
  const shop=shopOf(req.params.slug),me=user(req);
  const file=db.prepare('SELECT f.name,f.bytes,f.data,c.user_id FROM platform_chat_files f JOIN platform_chats c ON c.id=f.chat_id AND c.shop_id=f.shop_id JOIN platform_chat_messages m ON m.id=f.message_id AND m.shop_id=f.shop_id AND m.chat_id=f.chat_id WHERE f.shop_id=? AND f.id=? AND m.kind=\'file\'').get(shop.id,String(req.params.id));
  if(!file||(!manages(me,shop)&&file.user_id!==me.id))fail(404,'File not found.');
  const ascii=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').replace(/^[. ]+/,'')||'attachment';
  res.set({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`,'Content-Length':file.bytes,'X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox','Cache-Control':'private, no-store'}).end(file.data);
 }catch(e){next(e)}});
}
module.exports={installChatFiles};
