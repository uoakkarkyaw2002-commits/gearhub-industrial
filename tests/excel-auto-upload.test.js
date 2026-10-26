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
 assert.match(html,/<script src="\/excel-auto-upload\.js\?v=1\.1\.191"><\/script><script src="\/excel-library\.js\?v=1\.1\.191"><\/script>/);
 assert.match(html,/id="excel-auto-upload" class="excel-auto-upload" hidden/);
});

test('Mac download is an executable command ZIP with safely quoted shop names and valid shell syntax',()=>{
 const ctx={window:{},TextEncoder};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/excel-auto-upload.js'),'utf8'),ctx);
 const options={key:'ghk_'+'c3'.repeat(24),origin:'https://skyshopmm.com',shop:"Ko's $(printf unsafe) shop",slug:'polestar'};
 const api=ctx.window.GearHubExcelAutoUpload,script=api.buildMac(options),zip=Buffer.from(api.macArchive(options));
 const {spawnSync}=require('node:child_process');
 assert.equal(spawnSync('/bin/bash',['-n'],{input:script,encoding:'utf8'}).status,0);
 const assignment=script.split('\n').find(line=>line.startsWith('shop='));
 assert.equal(spawnSync('/bin/bash',['-c',assignment+'\nprintf "%s" "$shop"'],{encoding:'utf8'}).stdout,options.shop);
 const nameLength=zip.readUInt16LE(26),name=zip.subarray(30,30+nameLength).toString(),size=zip.readUInt32LE(18);
 assert.equal(name,'SkyShop-Excel-AutoUpload-polestar.command');
 assert.equal(zip.subarray(30+nameLength,30+nameLength+size).toString(),script);
 const central=30+nameLength+size;assert.equal(zip.readUInt32LE(central),0x02014b50);
 assert.equal(zip.readUInt32LE(central+38)>>>16,0o100755,'the Mac command is executable after unzipping');
 assert.match(script,/launchctl bootstrap/);assert.match(script,/<key>RunAtLoad<\/key><true\/>/);
});

test('Mac watcher retries a failed upload, preserves the workbook and sends its shop key and origin',async t=>{
 const {spawn}=require('node:child_process'),http=require('node:http');
 const ctx={window:{},TextEncoder};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/excel-auto-upload.js'),'utf8'),ctx);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-mac-watch-'));let child,server;
 t.after(async()=>{if(child?.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}if(server)await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});});
 const requests=[];server=http.createServer((req,res)=>{const chunks=[];req.on('data',v=>chunks.push(v));req.on('end',()=>{requests.push({headers:req.headers,body:Buffer.concat(chunks).toString(),url:req.url});res.writeHead(requests.length===1?500:201);res.end('{}');});});server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port,key='ghk_'+'c3'.repeat(24),file=path.join(root,'Daily "quoted"; sheet.xlsm');
 const workbook=Buffer.from('fixture-workbook');fs.writeFileSync(file,workbook);
 const script=ctx.window.GearHubExcelAutoUpload.buildMac({key,origin,shop:'Fixture',slug:'fixture'});
 const watcher=script.match(/<<'SKYSHOP_WATCHER'\n([\s\S]*?)SKYSHOP_WATCHER\n/)[1];
 fs.writeFileSync(path.join(root,'watch.sh'),watcher);fs.writeFileSync(path.join(root,'file'),file);fs.writeFileSync(path.join(root,'key'),key);fs.writeFileSync(path.join(root,'origin'),origin);
 const bin=path.join(root,'bin');fs.mkdirSync(bin);
 fs.writeFileSync(path.join(bin,'stat'),'#!/bin/sh\nprintf "stable-stamp"\n',{mode:0o755});
 fs.writeFileSync(path.join(bin,'sleep'),'#!/bin/sh\nexec /bin/sleep 0.05\n',{mode:0o755});
 let stderr='';child=spawn('/bin/bash',[path.join(root,'watch.sh')],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH},stdio:['ignore','ignore','pipe']});child.stderr.on('data',chunk=>{stderr+=chunk});
 const deadline=Date.now()+15000;
 while(!fs.existsSync(path.join(root,'last.txt'))&&child.exitCode===null&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 assert.ok(fs.existsSync(path.join(root,'last.txt')),'watcher must complete its retry: '+stderr);
 assert.equal(fs.readFileSync(path.join(root,'last.txt'),'utf8'),'stable-stamp');
 await new Promise(r=>setTimeout(r,120));assert.equal(requests.length,2,'failed request retried; unchanged successful file is not uploaded again');
 for(const r of requests){assert.equal(r.url,'/api/platform/spreadsheets/auto-upload');assert.equal(r.headers['x-upload-key'],key);assert.equal(r.headers.origin,origin);assert.match(r.body,/fixture-workbook/);assert.match(r.body,/name="file"/);}
 assert.deepEqual(fs.readFileSync(file),workbook,'source workbook is never modified');
});
