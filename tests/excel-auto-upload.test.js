// Excel auto upload from the shop's Windows PC: the PC program sends the shop's secret upload key.
const {test}=require('node:test');const assert=require('node:assert/strict');
const express=require('express');const session=require('express-session');const Database=require('better-sqlite3');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');const vm=require('node:vm');const {once}=require('node:events');
const {createPlatform}=require('../lib/platform');const {originGuard}=require('../lib/security');

test('a PC upload with the shop key replaces the shop Excel file; no key or a wrong key is refused',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gearhub-auto-upload-'));const db=new Database(path.join(root,'gearhub.sqlite'));db.pragma('foreign_keys=ON');
 const app=express();app.use(express.json());app.use(session({secret:'Auto-upload-test-secret-123456',resave:false,saveUninitialized:false}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 app.use('/api',originGuard(base));
 app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:base,env:{PLATFORM_OWNER_EMAIL:'owner@gmail.com'},identityProvider:async()=>({})}));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true})});
 const user=db.prepare("INSERT INTO platform_users(google_sub,email,name) VALUES('seller','seller@gmail.com','Seller')").run().lastInsertRowid;
 const shop=db.prepare("INSERT INTO platform_shops(owner_id,slug,name,plan_id) VALUES(?,?,?,1)").run(user,'polestar','POLESTAR').lastInsertRowid;
 const key='ghk_'+'a1'.repeat(24);
 db.prepare('INSERT INTO platform_upload_keys(shop_id,key_hash) VALUES(?,?)').run(shop,crypto.createHash('sha256').update(key).digest('hex'));
 const zip=Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.from('workbook')]);
 const send=(headers,name='Daily.xlsx',body=zip)=>{const form=new FormData();form.append('file',new Blob([body]),name);return fetch(base+'/api/platform/spreadsheets/auto-upload',{method:'POST',headers,body:form})};
 assert.equal((await send({Origin:base})).status,401,'no key');
 assert.equal((await send({Origin:base,'X-Upload-Key':'ghk_'+'b2'.repeat(24)})).status,401,'wrong key');
 assert.equal((await send({'X-Upload-Key':key})).status,403,'the PC program must send the site origin');
 const first=await send({Origin:base,'X-Upload-Key':key});assert.equal(first.status,201,await first.clone().text());
 const second=await send({Origin:base,'X-Upload-Key':key},'Daily.xlsm');assert.equal(second.status,201);
 const list=await (await fetch(base+'/api/platform/store/polestar/spreadsheets')).json();
 assert.equal(list.files.length,1,'the new upload replaces the old file');assert.equal(list.files[0].name,'Daily.xlsm');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM platform_files WHERE shop_id=? AND kind='spreadsheet'").get(shop).n,1);
 assert.ok(db.prepare('SELECT last_used_at FROM platform_upload_keys WHERE shop_id=?').get(shop).last_used_at,'last upload time is kept');
});

test('only a hash of the key is stored, a new key replaces the old one, and only the shop owner can make it',()=>{
 const platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
 assert.match(platform,/router\.post\("\/shops\/:id\/upload-key", wrap\(\(req, res\) => \{ const \{ shop \} = shopFor\(req, "uploads"\); const key = "ghk_" \+ crypto\.randomBytes\(24\)\.toString\("hex"\);/);
 assert.match(platform,/ON CONFLICT\(shop_id\) DO UPDATE SET key_hash=excluded\.key_hash/);
 assert.ok(platform.indexOf('"/spreadsheets/auto-upload"')<platform.indexOf('validToken(req.session.csrfToken'),'the PC program needs no browser session');
});

test('the downloaded Windows program: picks the file, watches it, uploads after each save, starts with the PC',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','public','excel-auto-upload.js'),'utf8'),ctx);
 const bat=ctx.window.GearHubExcelAutoUpload.build({key:'ghk_'+'c3'.repeat(24),origin:'https://skyshopmm.com',shop:"Ko's shop"});
 assert.ok(bat.startsWith('@echo off\r\n'),'Windows line endings');
 assert.match(bat,/iex \$t\.Substring\(\$t\.IndexOf\('#'\+'PS-START'\)\)/);
 assert.match(bat,/\$Key='ghk_(c3){24}'; \$Origin='https:\/\/skyshopmm\.com'; \$Shop='Ko''s shop'/,'quotes in the shop name are safe');
 assert.match(bat,/OpenFileDialog/);assert.match(bat,/GetFolderPath\('Startup'\)/);
 assert.match(bat,/\[IO\.File\]::Open\(\$f\.FullName,'Open','Read','ReadWrite'\)/,'reads the file even while Excel has it open');
 assert.match(bat,/DefaultRequestHeaders\.Add\('Origin',\$cfg\.origin\)/);
 assert.match(bat,/'\/api\/platform\/spreadsheets\/auto-upload'/);
 assert.match(bat,/Start-Sleep -Seconds 60/);
 const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
 assert.match(html,/<script src="\/excel-auto-upload\.js\?v=20261023-auto-1"><\/script><script src="\/excel-library\.js\?v=20261023-folder-1"><\/script>/);
 assert.match(html,/id="excel-auto-upload" class="excel-auto-upload" hidden/);
});
