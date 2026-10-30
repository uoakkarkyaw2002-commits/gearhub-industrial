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
test('1.1.216: Excel rows are drawn like the sheet (letters, row numbers, header row, sideways scroll)',()=>{
 const js=read('excel-search.js'),css=read('style.css');
 assert.match(js,/<thead><tr class="excel-results-letters">/);assert.match(js,/line\(head,'excel-results-header'\)/);
 assert.match(css,/\.excel-results-grid\{max-height:70vh;overflow:auto;/);
 assert.match(css,/\.excel-results-grid tr>th:first-child\{position:sticky;left:0;z-index:1\}/);
 assert.match(css,/\.excel-results-grid thead tr>th:first-child\{z-index:4\}/);
});
test('1.1.217: two views — matching rows only, or the whole sheet that jumps to each match',()=>{
 const js=read('excel-search.js');
 assert.match(js,/data-excel-mode="rows"[^]*ရှာတာပဲ[^]*data-excel-mode="sheet"[^]*Excel လို/);
 assert.match(js,/const MODE_KEY='gh-excel-search-mode'/,'the chosen view is remembered');
 assert.match(js,/data-excel-step="-1"[^]*data-excel-step="1"/);
 assert.match(js,/if\(mode==='sheet'\)\{fit\(\);go\(0\)\}/);
 assert.match(js,/if\(f\.sz\)out\.push\('font-size:'\+f\.sz\+'pt'\)/,'the file font size (bigger, like Excel)');
});
test('1.1.218: the Excel view hides the products and the sheet fills the screen',()=>{
 const js=read('excel-search.js'),css=read('style.css');
 assert.match(js,/box\.hidden=false;full\(mode==='sheet'\);/);
 assert.match(js,/if\(q\.length<2\)\{box\.hidden=true;box\.innerHTML='';full\(false\);return\}/,'clearing the search brings the products back');
 assert.match(css,/body\.excel-sheet-mode #products\{display:none!important\}/);
});
test('1.1.219: the view choice sits in the Excel files panel; the sheet runs edge to edge',()=>{
 const js=read('excel-search.js'),css=read('style.css');
 assert.match(js,/const help=document\.querySelector\('\.excel-library-help'\);/);
 assert.doesNotMatch(js,/class="excel-results-head"/,'no title/mode row above the sheet');
 assert.match(css,/\.excel-results\{position:relative;width:100vw;margin-left:calc\(50% - 50vw\);margin-right:calc\(50% - 50vw\)\}/);
 assert.match(css,/\.excel-sheet-open \.excel-search-setting\{display:none\}/);
});
