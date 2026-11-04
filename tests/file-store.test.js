// 1.1.282 owner: shops' uploads are kept in Cloudflare R2; the Render disk keeps only a cache of them.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{Readable}=require('node:stream');
const Database=require('better-sqlite3'),{createFileStore}=require('../lib/file-store');
function fakeR2(){const objects=new Map(),calls=[];return {objects,calls,async send({name,input}){calls.push(name+' '+input.Key);
 if(name==='PutObjectCommand'){const parts=[];for await(const c of input.Body)parts.push(c);objects.set(input.Key,Buffer.concat(parts));return {}}
 if(name==='GetObjectCommand'){if(!objects.has(input.Key))throw Object.assign(Error('NoSuchKey'),{name:'NoSuchKey'});return {Body:Readable.from([objects.get(input.Key)])}}
 if(name==='DeleteObjectCommand'){objects.delete(input.Key);return {}}
 if(name==='ListObjectsV2Command'){return {Contents:[...objects].map(([Key,b])=>({Key,Size:b.length})),IsTruncated:false}}}}}
function setup(t,opts={}){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'file-store-'));const db=new Database(':memory:');t.after(()=>{db.close();fs.rmSync(dataDir,{recursive:true,force:true})});
 const shopDir=path.join(dataDir,'platform-media','7');fs.mkdirSync(path.join(shopDir,'.photo-looks'),{recursive:true});
 const put=(name,bytes,ageMin=30)=>{const f=path.join(shopDir,name);fs.writeFileSync(f,Buffer.alloc(bytes,name.length));const when=new Date(Date.now()-ageMin*60000);fs.utimesSync(f,when,when);return f};
 const r2=fakeR2(),store=createFileStore({db,dataDir,env:{FILES_S3_BUCKET:'gearhub-files',...opts.env},client:opts.noClient?null:r2,cacheBytes:opts.cacheBytes});return {dataDir,db,put,r2,store,shopDir}}

test('off without FILES_S3_BUCKET: nothing is copied and files are read as before',async t=>{
 const {put,store,r2}=setup(t,{env:{FILES_S3_BUCKET:''},noClient:true});const f=put('a.jpg',10);
 assert.equal(store.enabled,false);assert.deepEqual(await store.sweep(),{copied:0,removed:0});assert.equal(await store.ensureLocal(f),f);assert.equal(r2.calls.length,0);
});

test('every shop file older than 10 minutes is copied to R2 once; new uploads, image variants and learning folders are not',async t=>{
 const {put,store,r2,shopDir}=setup(t);put('photo.jpg',100);put('photo.jpg.opt.webp',50);put('fresh.jpg',100,1);fs.writeFileSync(path.join(shopDir,'.photo-looks','x.f32'),'v');
 assert.deepEqual(await store.sweep(),{copied:1,removed:0});assert.deepEqual([...r2.objects.keys()],['files/7/photo.jpg']);
 assert.deepEqual(await store.sweep(),{copied:0,removed:0},'never copied twice');
 assert.equal(store.status().files,1);
});

test('over the cache size the least recently used copied files leave the disk, and come back from R2 when needed',async t=>{
 const {put,store,r2,db}=setup(t,{cacheBytes:1000});const old=put('old.jpg',600,120),recent=put('recent.jpg',600,60);
 await store.sweep();// copies both; 1200 > 1000 → the older one goes
 db.prepare("UPDATE file_store SET used_at=? WHERE key='7/recent.jpg'").run(new Date().toISOString());
 await store.sweep();
 assert.equal(fs.existsSync(old),false,'old copy removed from the disk');assert.equal(fs.existsSync(recent),true,'recently used one kept');
 assert.equal(await store.ensureLocal(old),old);assert.equal(fs.readFileSync(old).length,600,'fetched back whole');
 assert.ok(r2.calls.includes('GetObjectCommand files/7/old.jpg'));
});

test('a file is never removed from the disk before R2 has it; deleting a file or a shop deletes its R2 copy',async t=>{
 const {put,store,r2,dataDir}=setup(t,{cacheBytes:10});const a=put('a.jpg',100),fresh=put('b.jpg',100,1);
 await store.sweep();assert.equal(fs.existsSync(fresh),true,'not yet in R2, so it stays');
 await store.remove(a);assert.equal(r2.objects.has('files/7/a.jpg'),false);assert.equal(store.status().files,0);
 const c=put('c.jpg',100);await store.sweep();await store.removeShop(7);assert.equal(r2.objects.size,0);void c;void dataDir;
});

test('every reader of shop files fetches a missing one back first',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),platform=read('lib/platform.js');
 assert.equal((platform.match(/await files\.ensureLocal\(/g)||[]).length,4,'receipts, spreadsheets, images, receipt reading');
 assert.match(platform,/createPhotoSearch\(\{ db, media, ensure: files\.ensureLocal,/);
 assert.match(read('lib/photo-search.js'),/v = await look\(await ensure\(p\.file\)\);/);
 assert.match(read('lib/drive-backup.js'),/const file = await ensure\(path\.join\(media, String\(shop\.id\), f\.filename\)\);/);
 assert.match(read('lib/tenant-install.js'),/if\(!fs\.existsSync\(p\)\)\{files\?\.ensureLocal\(p\)/);
 assert.match(read('server.js'),/createFileStore\(\{db,dataDir,/);
});

test('1.1.283: Settings gets the whole R2 bucket size (shop files and backups), and only the GearHub owner sees R2 and Drive',async t=>{
 const {put,store,r2}=setup(t);put('a.jpg',300);await store.sweep();r2.objects.set('gearhub/backup.tar.gz',Buffer.alloc(700));
 assert.deepEqual(await store.usage(),{bytes:1000,files:2,fileBytes:300,bucket:'gearhub-files'});
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8'),drive=fs.readFileSync(path.join(__dirname,'..','lib','drive-backup.js'),'utf8'),settings=fs.readFileSync(path.join(__dirname,'..','public','settings.js'),'utf8');
 assert.match(server,/if \(isGearHubOwner\(_req\)\) \{/);
 assert.match(drive,/trashed=false and mimeType!='/,'only files GearHub put in Drive (drive.file scope)');
 assert.match(settings,/Cloudflare R2/);assert.match(settings,/Google Drive/);
});
