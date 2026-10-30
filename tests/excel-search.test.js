// 1.1.215 owner: a shop search also lists the matching Excel rows (sheet BC) under the products.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('search lists Excel rows from sheet BC and opens the viewer at that row',()=>{
 const js=read('excel-search.js'),map=read('excel-map.js'),html=read('index.html'),sw=read('sw.js');
 assert.match(js,/const SHEET='BC',LIMIT=30;/);
 assert.match(js,/products\.after\(box\)/,'rows sit under the products');
 assert.match(map,/window\.GearHubExcelViewer=\{/);
 assert.match(map,/async function readSheet\(sheet,from=book\)\{/,'reading a sheet for search does not touch the open viewer');
 assert.doesNotMatch(map.slice(map.indexOf('async function readSheet'),map.indexOf('\n }\n',map.indexOf('async function readSheet'))),/\bbook\./);
 assert.match(map,/box\.addEventListener\('click',e=>\{const b=e\.target\.closest\('\[data-excel-preview\]'\);if\(b\)openBook\(b\)\}\);/,'the folder list still opens files');
 assert.ok(html.indexOf('/excel-map.js')<html.indexOf('/excel-search.js'));
 for(const f of ['excel-map.js','excel-search.js','style.css']){const tag=html.match(new RegExp('/'+f.replace('.','\\.')+'\\?v=[^"]+'))[0];assert.ok(sw.includes('"'+tag+'"'),f)}
});
