// The storefront Excel library script must parse and recognise a shop page path.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('excel-library.js finds the shop slug from /shops/<slug>/',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8');
 const literal=js.match(/location\.pathname\.match\((\/.*?\/)\)/)[1];
 const re=new Function('return '+literal)();
 assert.equal(re.exec('/shops/psm-test-shop/')[1],'psm-test-shop');
 assert.equal(re.exec('/shops/psm-test-shop')[1],'psm-test-shop');
 assert.equal(re.exec('/'),null);
});
test('the Excel panel opens (.modal needs .open) and the list query uses real columns',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8'),platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
 assert.match(js,/modal\.hidden=false;modal\.classList\.add\('open'\)/);
 assert.match(js,/modal\.hidden=true;modal\.classList\.remove\('open'\)/);
 assert.doesNotMatch(platform,/created_at FROM platform_files/,'platform_files has no created_at column');
});
test('the GearHub owner can upload Excel files to any shop',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8');
 assert.match(js,/else if\(body\.isOwner\)\{[\s\S]*fetch\('\/api\/platform\/owner'\)[\s\S]*item\.slug===slug&&!item\.legacy/);
});
test('visitors do not see the Excel upload form',()=>{
 assert.match(fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8'),/\.excel-library-card form\[hidden\]\{display:none\}/);
});
test('.xlsm workbooks are accepted and every file is stored with a spreadsheet type',()=>{
 const platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
 assert.match(platform,/\\\.\(xlsx\|xlsm\|xls\|csv\)\$/);
 assert.match(platform,/xlsm: "application\/vnd\.ms-excel\.sheet\.macroEnabled\.12"/);
 assert.match(platform,/\.run\(id, shop\.id, kind, spreadsheet\?\.mime \|\| file\.mimetype,/);
 assert.match(html,/accept="\.xlsx,\.xlsm,\.xls,\.csv,/);
});
test('Excel preview script parses, phones reach it from Settings, and import never wipes unlinked fields',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),lib=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
 assert.doesNotThrow(()=>new Function(map));assert.doesNotMatch(map,/\\\\[\/.dnru]/,'no double-escaped regex characters');
 assert.match(html,/id="excel-settings-open" hidden/);assert.match(lib,/settingsOpen\.addEventListener\('click',\(\)=>open\.click\(\)\)/);
 assert.match(platform,/description=COALESCE\(\?,description\),category=COALESCE\(\?,category\),price=COALESCE\(\?,price\),stock=COALESCE\(\?,stock\),active=1 WHERE id=\? AND shop_id=\?/);
});
