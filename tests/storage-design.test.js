// 1.1.315 owner's picture: the GearHub owner's Server Storage is one green card (closed = header only).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Server Storage card uses the owner picture pieces and keeps the backup buttons',()=>{
 const js=read('public/settings.js'),css=read('public/storage-design.css'),html=read('public/index.html'),sw=read('public/sw.js');
 for(const f of ['head-open.jpg','head-closed.jpg','r2.png','drive.png','shops.png','buoy.png','store.png','db.png','cal.png','chev.png','run.jpg','dl.jpg'])assert.ok(fs.existsSync(path.join(__dirname,'..','public/images/storage',f)),f);
 assert.match(js,/id="storage-backup-run" class="ss-run"/);assert.match(js,/id="storage-backup-download" class="ss-download" href="\/api\/admin\/backup"/);
 assert.match(js,/storageOpen \? "head-open\.jpg" : "head-closed\.jpg"/);
 assert.match(css,/--u:calc\(100cqw \/ 960\)/,'sizes follow the picture at any width');
 const tag=html.match(/\/storage-design\.css\?v=[0-9.]+/)[0];assert.ok(sw.includes('"'+tag+'"'));
});
