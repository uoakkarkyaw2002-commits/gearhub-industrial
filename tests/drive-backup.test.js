// Google Drive backup (owner's request): daily backups and every shop photo's original go to the owner's
// Google Drive folder "GearHub Backups". Google is replaced here by a small fake.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const Database=require('better-sqlite3');const {createDrive}=require('../lib/drive-backup');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

function fakeGoogle(){
 const calls=[],files=new Map();let n=0;const json=(d,status=200,headers={})=>new Response(JSON.stringify(d),{status,headers});
 const fetchImpl=async(url,o={})=>{
  url=String(url);calls.push((o.method||'GET')+' '+url.replace(/\?.*/,''));
  if(url.startsWith('https://oauth2.googleapis.com/token'))return fakeGoogle.revoked?json({error:'invalid_grant'},400):json({access_token:'t',expires_in:3600});
  if(url.includes('/upload/drive/v3/files'))return json({},200,{location:'https://upload.example/'+(++n)+'?'+encodeURIComponent(JSON.parse(o.body).name+'|'+JSON.parse(o.body).parents[0])});
  if(url.startsWith('https://upload.example/')){const [name,parent]=decodeURIComponent(url.split('?')[1]).split('|');let bytes=0;for await(const c of o.body)bytes+=c.length;const id='f'+(++n);files.set(id,{name,parent,bytes,created:n});return json({id});}
  if(url.startsWith('https://www.googleapis.com/drive/v3/files')){
   const u=new URL(url),q=u.searchParams.get('q')||'';
   if(o.method==='POST'){const b=JSON.parse(o.body),id='d'+(++n);files.set(id,{...b,parent:b.parents[0],folder:true,created:n});return json({id});}
   if(o.method==='DELETE'){files.delete(url.split('/').pop());return new Response(null,{status:204});}
   const parent=(q.match(/'([^']+)' in parents/)||[])[1],name=(q.match(/name='([^']+)'/)||[])[1];
   const list=[...files].filter(([,f])=>f.parent===parent&&(name?f.name===name&&f.folder:!f.folder)).sort((a,b)=>b[1].created-a[1].created).map(([id,f])=>({id,name:f.name}));
   return json({files:list});
  }
  throw Error('unexpected '+url);
 };
 return {calls,files,fetchImpl};
}
function setup(){
 const db=new Database(':memory:'),media=fs.mkdtempSync(path.join(os.tmpdir(),'drive-'));
 db.exec("CREATE TABLE platform_shops(id INTEGER,slug TEXT,legacy INTEGER);CREATE TABLE platform_files(id TEXT,shop_id INTEGER,kind TEXT,mime TEXT,filename TEXT,ready INTEGER);INSERT INTO platform_shops VALUES(7,'polestar',0),(8,'other',0);");
 fs.mkdirSync(path.join(media,'7'));fs.writeFileSync(path.join(media,'7','a.jpg'),'photo-a');fs.writeFileSync(path.join(media,'7','b.xlsx'),'sheet');
 db.exec("INSERT INTO platform_files VALUES('a',7,'image','image/jpeg','a.jpg',1),('b',7,'spreadsheet','text/csv','b.xlsx',1),('c',7,'image','image/jpeg','c.jpg',0)");
 const google=fakeGoogle();fakeGoogle.revoked=false;
 return {db,media,google,drive:createDrive({db,clientId:'id',clientSecret:'secret',media,keepBackups:2,fetchImpl:google.fetchImpl})};
}

test('the owner connects once; photo originals go to GearHub Backups/Photos/<shop>, each only once',async()=>{
 const {drive,google}=setup();
 assert.equal(drive.status().connected,false);
 drive.connect({refreshToken:'r',email:'owner@example.com'});await drive.sweep();
 const s=drive.status();assert.equal(s.connected,true);assert.equal(s.email,'owner@example.com');assert.equal(s.photosCopied,1);assert.equal(s.photosTotal,1,'only ready images count');
 const byName=name=>[...google.files.values()].find(f=>f.name===name);
 assert.ok(byName('GearHub Backups')?.folder);assert.equal(byName('Photos').parent,[...google.files].find(([,f])=>f.name==='GearHub Backups')[0]);
 assert.equal(byName('a.jpg').parent,[...google.files].find(([,f])=>f.name==='polestar')[0]);assert.equal(byName('a.jpg').bytes,7);
 assert.equal(byName('b.xlsx'),undefined,'Excel files are in the daily backup, not copied one by one');
 const before=google.calls.length;await drive.sweep();assert.equal(google.calls.filter((c,i)=>i>=before&&c.includes('upload')).length,0,'never copied twice');
});

test('a backup goes to the GearHub Backups folder and only the newest ones are kept',async()=>{
 const {drive,google,media}=setup();drive.connect({refreshToken:'r'});await drive.sweep();
 for(const name of ['gearhub-1.tar.gz','gearhub-2.tar.gz','gearhub-3.tar.gz']){const file=path.join(media,name);fs.writeFileSync(file,'archive');await drive.backup(file,name);}
 const names=[...google.files.values()].filter(f=>/^gearhub-/.test(f.name)).map(f=>f.name).sort();
 assert.deepEqual(names,['gearhub-2.tar.gz','gearhub-3.tar.gz']);assert.equal(drive.status().lastBackupName,'gearhub-3.tar.gz');
});

test('access removed in the Google account shows "not connected" and the error',async()=>{
 const {drive,media}=setup();drive.connect({refreshToken:'r'});fakeGoogle.revoked=true;
 const file=path.join(media,'gearhub-x.tar.gz');fs.writeFileSync(file,'x');
 await assert.rejects(drive.backup(file,'gearhub-x.tar.gz'),/Connect Google Drive again/);
 const s=drive.status();assert.equal(s.connected,false);assert.match(s.lastError,/Connect Google Drive again/);
 drive.disconnect();assert.equal(drive.status().connected,false);
});

test('backups, uploads and the owner console use Drive; only the GearHub owner connects it',()=>{
 const backups=read('lib/backups.js'),platform=read('lib/platform.js'),ui=read('public/platform.js'),server=read('server.js');
 assert.match(backups,/if\(drive\?\.connected\(\)\)\{step="drive-delivery";await drive\.backup\(archive,name\);offsite=true;\}/);
 assert.match(platform,/if \(kind === "image"\) drive\?\.photoSaved\(\);/);
 assert.match(platform,/router\.post\('\/owner\/drive\/connect',wrap\(\(req,res\)=>\{\n    owner\(req\);/);
 assert.match(platform,/scope:\["openid","email",drive\.SCOPE\],state,access_type:"offline",prompt:"consent"/);
 assert.match(platform,/if \(stored\.drive\) \{\n        owner\(req\);/,'the Drive sign-in only counts for the owner');
 assert.match(read('lib/drive-backup.js'),/const SCOPE = "https:\/\/www\.googleapis\.com\/auth\/drive\.file";/,'the app only sees its own files');
 assert.match(ui,/data-drive-action="connect">Connect Google Drive/);
 assert.match(server,/drive\?\.whenConnected\(\(\)=>backupService\.run\(\)\.catch\(\(\)=>\{\}\)\);/);
});
