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
test('Excel preview script parses, Excel opens from the folder button, and import never wipes unlinked fields',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),lib=fs.readFileSync(path.join(__dirname,'..','public','excel-library.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
 assert.doesNotThrow(()=>new Function(map));for(const bad of ['\\\\/shops','\\\\d/','\\\\.csv','\\\\r?','\\\\uFEFF'])assert.ok(!map.includes(bad),'double-escaped regex: '+bad);
 // Excel opens only from the folder button beside the search bar (not Settings, not the top bar).
 assert.doesNotMatch(html,/excel-settings-open|excel-nav-button/);
 assert.match(html,/<input id="search"[^>]*><\/div><button class="excel-folder-button" id="excel-library-open" type="button" aria-label="Excel files" title="Excel files" hidden>/);
 assert.match(lib,/open\.hidden=!slug;/);
 assert.match(platform,/description=COALESCE\(\?,description\),category=COALESCE\(\?,category\),price=COALESCE\(\?,price\),stock=COALESCE\(\?,stock\),active=1 WHERE id=\? AND shop_id=\?/);
});
test('Excel viewer shows sheets like a spreadsheet: tabs, letters, row numbers, merges, styles, dates',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 for(const piece of ['class="excel-tab','colName(c)','mergeCell','tabColor','formatDate','cellXfs','rowspan','DecompressionStream'])assert.ok(map.includes(piece),piece);
 assert.match(css,/\.excel-sheet thead th\{position:sticky;top:0/);assert.match(css,/\.excel-sheet th,\.excel-sheet td\{min-width:0/);
 // Excel dates: 46296 is 1 Oct 2026 and prints as 1-Oct-26 with d-mmm-yy.
 const fmt=map.slice(map.indexOf('// ---- Number formats ----'),map.indexOf('// ---- Workbook ----'));const ctx={};new Function('ctx',fmt+';ctx.formatNumber=formatNumber;')(ctx);
 assert.equal(ctx.formatNumber(46296,'d-mmm-yy'),'1-Oct-26');
 assert.equal(ctx.formatNumber(384563930,'#,##0'),'384,563,930');
 assert.equal(ctx.formatNumber(0.125,'0.0%'),'12.5%');
});
test('filled Excel cells keep light gridlines while workbook and conditional borders retain their styles',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8');
 const src=map.slice(map.indexOf(' const bordersOf='),map.indexOf(' // Sheet zoom'));
 const cellStyle=new Function('const zoom=1;'+src+';return cellStyle')();
 for(const fill of ['#FFFFFF','#00B050']){
  const style={fill,font:{},border:{left:'3px solid #FF0000'}};
  const cell={style,text:'Invoice'};
  const css=cellStyle(cell,{firstCol:true});
  assert.ok(css.includes('background-color:'+fill));
  assert.ok(css.includes('border-left:3px solid #FF0000'),'the first shown column draws its own left border');
  assert.doesNotMatch(cellStyle(cell),/border-left/,'elsewhere the cell to the left draws that edge (it gets it as edge.right)');
  assert.doesNotMatch(css,/border-(?:right|top|bottom)(?:-color)?:/,'unbordered edges inherit visible sheet gridlines');
  const conditional=cellStyle({...cell,cf:{fill:'#FFFFFF',border:{bottom:'2px solid #000000'}}});
  assert.ok(conditional.includes('border-bottom:2px solid #000000'));
  assert.doesNotMatch(conditional,/border-(?:right|top)(?:-color)?:/);
  assert.deepEqual(style,{fill,font:{},border:{left:'3px solid #FF0000'}},'rendering does not change workbook formatting');
 }
 // The file often sets only left/top borders; the edge shared with the next cell shows them (as in Excel).
 const plain={style:{font:{},border:{}},text:'x'};
 const shared=cellStyle(plain,{right:'1px solid #000',bottom:'1px solid #000'});
 assert.ok(shared.includes('border-right:1px solid #000')&&shared.includes('border-bottom:1px solid #000'));
 const own=cellStyle({style:{font:{},border:{right:'2px solid #F00'}},text:'x'},{right:'1px solid #000'});
 assert.ok(own.includes('border-right:2px solid #F00')&&!own.includes('border-right:1px'),'the cell\'s own border wins');
});
test('empty cells and cells next to bordered cells show the shared border (BC sheet lost its lines)',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8');
 assert.match(map,/const edgeAt=\(r,c,m\)=>\{const nc=colAfter\[c\+\(m\?m\.cs:1\)-1\],nr=rowAfter\[r\+\(m\?m\.rs:1\)-1\],edge=/);
 const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(css,/\.excel-sheet table\{border-collapse:separate;border-spacing:0;/,'collapsed borders let scrolled rows paint over the sticky column letters');
 assert.match(css,/\.excel-sheet td\{padding:2px 5px;border:0;border-right:1px solid #e2e2e2;border-bottom:1px solid #e2e2e2;/);
 assert.match(map,/\(cell\?' style="'\+esc\(cellStyle\(cell,edgeAt\(r,c,m\)\)\)\+'"':\(e=>e\.length\?' style="'\+esc\(e\.join\(';'\)\)\+'"':''\)\(edgeCss\(\{\},edgeAt\(r,c,m\)\)\)\)/);
});
test('Excel sheet opens full screen with one back arrow and exact column widths',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(map,/<button class="excel-fs-back" id="excel-fs-back" type="button" aria-label="Back">←<\/button>/);
 assert.match(map,/modal\?\.classList\.toggle\('excel-fullscreen',on\)/);
 assert.match(map,/let html='<table'\+\(sheet\.grid===false\?' class="excel-nogrid"':''\)\+' style="width:'\+total\+'px;font-size:'\+Math\.round\(11\*zoom\*10\)\/10\+'pt;--excel-zoom:'\+zoom\+'">/,'table width = sum of column widths (column A stays narrow)');
 assert.match(css,/\.excel-fullscreen \.excel-library-card\.excel-sheet-open\{position:fixed;inset:0;/);
 assert.match(css,/\.excel-fullscreen \.excel-preview>\.drawer-head,\.excel-fullscreen #excel-sheet-status,\.excel-fullscreen \.excel-map-panel\{display:none!important\}/);
});

test('one current Excel file is shown, replacement stays scoped, and the sheet can be searched as you type',()=>{
 const platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8'),map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8');
 assert.match(platform,/saveFile\(shop, req\.file, "spreadsheet", \{ replaceSpreadsheets: true \}\)/);
 assert.match(platform,/SELECT id,shop_id,filename,bytes FROM platform_files WHERE shop_id=\? AND kind='spreadsheet'/);
 assert.match(platform,/DELETE FROM platform_files WHERE id=\? AND shop_id=\? AND kind='spreadsheet'/);
 assert.match(platform,/kind='spreadsheet' AND ready=1 ORDER BY rowid DESC LIMIT 1/);
 assert.match(map,/id="excel-sheet-search" type="search"/);
 assert.match(map,/const visibleRows=Array\.from\(\{length:rows\},\(_,r\)=>r\)\.filter/);
 assert.match(map,/search\.addEventListener\('input'/);
});

test('excel viewer shows the file like Excel: conditional formats, hidden rows/columns, freeze panes',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 // The formula engine, run for real on the rules the owner's invoice sheet uses.
 const src=map.slice(map.indexOf(' function parseRange'),map.indexOf(' function applyConditionalFormats'));
 const colIndex=ref=>{let n=0;for(const ch of ref.replace(/[0-9]/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
 const {compileFormula,truthy}=new Function('colIndex',src+';return{compileFormula,truthy}')(colIndex);
 const cells={'36,15':'PSM-J75-20','44,3':'','44,4':5000};
 const ctx=(r,c)=>({r,c,get:(rr,cc)=>cells[rr+','+cc]??''});
 const filled=compileFormula('$P36<>""',{r:35,c:7});
 assert.equal(truthy(filled(ctx(36,9))),true);
 assert.equal(truthy(filled(ctx(37,9))),false);
 const any=compileFormula('OR($D45<>"", $E45<>"", $F45<>"")',{r:44,c:7});
 assert.equal(truthy(any(ctx(44,10))),true);
 assert.equal(truthy(compileFormula('AND(ISBLANK(A1),A2*2>=10)',{r:0,c:0})({r:0,c:0,get:(r)=>r===1?5:''})),true);
 assert.match(map,/const dxfColor=el=>el\?\.getAttribute\('auto'\)==='1'\?'#000000'/);
 assert.match(map,/if\(row\.getAttribute\('hidden'\)==='1'\)heights\[r\]=0/);
 assert.match(map,/const visibleCols=Array\.from\(\{length:cols\},\(_,c\)=>c\)\.filter\(c=>c>=frozen\.c0&&sheet\.widths\[c\]!==0\)/);
 // Frozen area starts at the sheet view's top-left cell (INV: frozen at C28 hides rows 1-27 and columns A-B).
 assert.match(map,/if\(ys\)\{frozen\.r0=\+tl\[2\]-1;frozen\.r1=frozen\.r0\+ys\}if\(xs\)\{frozen\.c0=colIndex\(tl\[1\]\);frozen\.c1=frozen\.c0\+xs\}/);
 assert.match(map,/filter\(r=>r>=frozen\.r0&&sheet\.heights\[r\]!==0/);
 // Accounting zero "-"?? shows as "-", like Excel.
 const fmt=new Function('const isDate=()=>false;'+map.slice(map.indexOf(' function formatNumber'),map.indexOf(' // ---- Workbook'))+';return formatNumber')();
 assert.equal(fmt(0,'_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)').trim(),'-');
 assert.match(css,/\.excel-sheet tr\.excel-frozen-row>td,\.excel-sheet tr\.excel-frozen-row>th\{position:sticky;z-index:20\}/);
});

test('excel viewer draws shapes and pictures (linked totals on the invoice)',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(map,/try\{sheet\.shapes=await readDrawing\(sheet\.path,doc\)\}catch\{sheet\.shapes=\[\]\}/);
 assert.match(map,/n=>n\.localName==='sp'\|\|n\.localName==='pic'/);
 assert.match(map,/placeShapes\(table\);/);
 assert.match(map,/return binary\?out\.blob\(\):out\.text\(\)/);
 assert.match(css,/#excel-grid \.excel-shape\{position:absolute/);
 assert.match(css,/\.excel-sheet tr\.excel-frozen-row>td\.excel-shape-host\{z-index:25\}/);
});

test('excel viewer: selection shows on filled cells; two-finger zoom smaller and bigger',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 // background shorthand would wipe the blue selection layer (background-image) on filled cells.
 assert.match(map,/if\(s\.fill\)css\.push\('background-color:'\+s\.fill\)/);
 assert.doesNotMatch(map,/css\.push\('background:'/);
 assert.match(map,/let zoom=1;const ZMIN=0\.3,ZMAX=3;/);
 assert.match(map,/grid\.addEventListener\('touchmove',e=>\{if\(!pinch\|\|e\.touches\.length!==2\)return;e\.preventDefault\(\)/);
 assert.match(map,/grid\.addEventListener\('wheel',e=>\{if\(!e\.ctrlKey\)return;/);
 assert.match(css,/#excel-grid\{touch-action:pan-x pan-y\}/);
});
test('a border on a merged range shows on the edge next to any of its cells (INV row 405 lost its thick line)',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8');
 assert.match(map,/const sideAt=\(key,side\)=>bordersOf\(sheet\.cells\.get\(key\)\)\[side\]\|\|\(coverOf\.has\(key\)\?bordersOf\(sheet\.cells\.get\(coverOf\.get\(key\)\)\)\[side\]:''\)\|\|'';/);
 assert.match(map,/right:nc===undefined\?'':sideAt\(r\+','\+nc,'left'\),bottom:nr===undefined\?'':sideAt\(nr\+','\+c,'top'\)/);
 // INV D36:F36 is merged and only D37 below has a (green) top border: only the D part of the edge shows.
 assert.match(map,/if\(new Set\(parts\.map\(p=>p\[2\]\)\)\.size>1\)\{edge\.bottomAll='';edge\.bottomParts=parts\}/);
});
test('Excel look: all rows, gridlines setting, rotated text, text spilling into empty cells, whole Myanmar words',()=>{
 const map=fs.readFileSync(path.join(__dirname,'..','public','excel-map.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
 assert.match(map,/const MAX_ROWS=1048576,MAX_COLS=16384;/,'BC has 2297 rows; the old 1500-row cap cut it');
 assert.match(map,/const grid=view0\?\.getAttribute\('showGridLines'\)!=='0';/);
 assert.match(css,/\.excel-sheet table\.excel-nogrid td\{border-right-color:transparent;border-bottom-color:transparent\}/);
 assert.match(map,/rot:\+\(a\?\.getAttribute\('textRotation'\)\|\|0\)/);
 assert.match(map,/s\.rot===90\?'writing-mode:vertical-rl;transform:rotate\(180deg\)'/);
 assert.match(map,/return '<div class="excel-spill" style="width:'/);
 assert.match(css,/\.excel-sheet td\.excel-spill-host\{overflow:visible\}/,'a class, not :has() (WebKit recalculated :has slowly on zoom)');
 assert.match(map,/if\(s\.wrap\)return t\.replace\(\/\[\\u1000-\\u109F\\uA9E0-\\uA9FF\\uAA60-\\uAA7F\]\+\/g,w=>'<span class="excel-word">'\+w\+'<\/span>'\);/);
 // Excel keeps rows above / columns left of a pane frozen low down hidden (owner's Excel photo of INV, 1.1.125).
 assert.match(map,/if\(ys\)\{frozen\.r0=\+tl\[2\]-1;frozen\.r1=frozen\.r0\+ys\}/);
 // A merged cell takes its right/bottom border from its last column/row (INV H34:I34 red box).
 assert.match(map,/if\(m&&\(m\.cs>1\|\|m\.rs>1\)\)\{const last=c\+m\.cs-1,parts=\[\]/);
});
