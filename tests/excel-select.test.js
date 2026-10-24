// Excel viewer: cells can be selected like a spreadsheet (click, drag, Shift+click) and copied.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function sheet(){
 const listeners={},docKeys={},globalEvents={};let timer=null,hit=null;
 const mk=(attrs,tag)=>{const cls=new Set();return{tag,tagName:tag.toUpperCase(),dataset:attrs,textContent:attrs.text||'',classList:{add:(...c)=>c.forEach(x=>cls.add(x)),remove:(...c)=>c.forEach(x=>cls.delete(x)),has:c=>cls.has(c)},closest(selector){return (tag==='td'?selector.startsWith('td'):selector==='tbody th[data-r]'&&attrs.r!==undefined)?this:null}}};
 const cells=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)cells.push(mk({r:String(r),c:String(c),text:'R'+r+'C'+c},'td'));
 const heads=[0,1,2].map(c=>mk({c:String(c)},'th')).concat([0,1,2].map(r=>mk({r:String(r)},'th')));
 let copied=null;
 const grid={contains:cell=>cells.includes(cell),offsetParent:{},addEventListener:(n,f)=>listeners[n]=f,querySelectorAll:s=>s.startsWith('td')?cells:heads,querySelector:s=>{const m=s.match(/data-r="(\d+)"\]\[data-c="(\d+)"/);return cells.find(x=>x.dataset.r===m[1]&&x.dataset.c===m[2])}};
 const ctx={setTimeout:f=>{timer=f;return 1},clearTimeout:()=>{timer=null},document:{elementFromPoint:()=>hit,getElementById:()=>grid,addEventListener:(n,f)=>docKeys[n]=f},addEventListener:(n,f)=>globalEvents[n]=f,MutationObserver:class{observe(){}},getSelection:()=>'',navigator:{clipboard:{writeText:async t=>{copied=t}}}};
 vm.runInNewContext(read('excel-select.js'),ctx);
 const at=(r,c)=>cells.find(x=>x.dataset.r===String(r)&&x.dataset.c===String(c));
 return{grid,listeners,docKeys,globalEvents,at,heads,hold:()=>timer?.(),hit:cell=>{hit=cell},copied:()=>copied};
}

test('click selects a cell; dragging selects a range; Ctrl/Cmd+C copies it as rows and columns',async()=>{
 const s=sheet();
 s.listeners.pointerdown({target:s.at(0,0),button:0,pointerType:'mouse'});
 assert.ok(s.at(0,0).classList.has('xs-active'));
 s.listeners.pointerover({target:s.at(1,1),buttons:1});
 for(const [r,c] of [[0,0],[0,1],[1,0],[1,1]])assert.ok(s.at(r,c).classList.has('xs-sel'),'R'+r+'C'+c);
 assert.ok(!s.at(2,2).classList.has('xs-sel'));
 assert.ok(s.heads[0].classList.has('xs-head')&&s.heads[1].classList.has('xs-head')&&!s.heads[2].classList.has('xs-head'),'column letters light up');
 let stopped=false;s.docKeys.keydown({key:'c',metaKey:true,preventDefault(){stopped=true}});await new Promise(r=>setImmediate(r));
 assert.ok(stopped);assert.equal(s.copied(),'R0C0\tR0C1\nR1C0\tR1C1');
});

test('Shift+click extends; Esc clears',()=>{
 const s=sheet();
 s.listeners.pointerdown({target:s.at(0,0),button:0,pointerType:'mouse'});
 s.listeners.pointerdown({target:s.at(2,1),button:0,shiftKey:true,pointerType:'mouse'});
 assert.ok(s.at(2,1).classList.has('xs-sel'));assert.ok(s.at(1,0).classList.has('xs-sel'));
 s.docKeys.keydown({key:'Escape'});assert.ok(!s.at(1,0).classList.has('xs-sel'));
});

test('only row numbers select full rows; cells select individually on mouse and touch',()=>{
 const s=sheet();
 s.listeners.pointerdown({target:s.at(1,1),button:0,pointerType:'mouse'});
 assert.ok(s.at(1,1).classList.has('xs-sel'));
 for(const c of [0,2])assert.ok(!s.at(1,c).classList.has('xs-sel'));
 assert.ok(!s.at(0,0).classList.has('xs-sel'));
 s.docKeys.keydown({key:'Escape'});
 const rowHead=s.heads.find(head=>head.dataset.r==='1');
 s.listeners.pointerdown({target:rowHead,button:0,pointerType:'mouse'});
 for(const c of [0,1,2])assert.ok(s.at(1,c).classList.has('xs-sel'),'row number selects R1C'+c);
 s.listeners.pointerdown({target:s.at(1,2),button:0,pointerType:'mouse'});
 assert.ok(s.at(1,2).classList.has('xs-active'));
 for(const c of [0,1])assert.ok(!s.at(1,c).classList.has('xs-sel'),'cell click clears the full-row selection');
 s.listeners.pointerdown({target:s.at(2,2),button:0,pointerType:'touch'});s.listeners.click({target:s.at(2,2),pointerType:'touch'});
 assert.ok(s.at(2,2).classList.has('xs-active'));
 assert.ok(!s.at(1,1).classList.has('xs-sel'));
 assert.ok(!s.at(2,1).classList.has('xs-sel'));
});

test('cells carry their sheet position; selection styles; script loaded and cached',()=>{
 const map=read('excel-map.js');
 assert.match(map,/html\+='<td data-r="'\+r\+'" data-c="'\+c\+'"'/);
 assert.match(map,/'<th data-c="'\+c\+'"'\+\(c<frozen\.c1\?' class="excel-frozen-col"':''\)\+'>'\+colName\(c\)\+'<\/th>'/);
 const css=read('style.css');assert.match(css,/#excel-grid td\.xs-active\{box-shadow:inset 0 0 0 2px #1a73e8/);assert.match(css,/#excel-grid tbody th\[data-r\]\{cursor:pointer/);
 assert.match(read('index.html'),/<script src="\/excel-select\.js\?v=20261025-tap-1"><\/script>/);
 assert.match(read('sw.js'),/"\/excel-select\.js\?v=20261025-tap-1"/);
});

 test('touch hold-and-drag selects cells; quick swipes and two fingers remain scrolling/zoom gestures',()=>{
  const s=sheet(),finger=(x,y)=>({clientX:x,clientY:y});let prevented=false;
  const start=()=>s.listeners.touchstart({target:s.at(1,1),touches:[finger(10,10)]});
  start();s.hold();s.hit(s.at(2,2));
  s.listeners.touchmove({touches:[finger(50,50)],preventDefault(){prevented=true}});
  assert.ok(prevented);assert.ok(s.at(1,1).classList.has('xs-sel'));assert.ok(s.at(2,2).classList.has('xs-sel'));assert.ok(!s.at(1,0).classList.has('xs-sel'));
  s.listeners.touchend();s.docKeys.keydown({key:'Escape'});prevented=false;
  start();s.listeners.touchmove({touches:[finger(30,30)],preventDefault(){prevented=true}});s.hold();
  assert.equal(prevented,false);assert.ok(!s.at(2,2).classList.has('xs-sel'));
  start();s.hold();s.listeners.touchstart({touches:[finger(10,10),finger(50,50)]});
  s.listeners.touchmove({touches:[finger(10,10),finger(70,70)],preventDefault(){prevented=true}});
  assert.equal(prevented,false);assert.ok(!s.at(2,2).classList.has('xs-sel'));
 });

test('dragging does not rescan the whole sheet on every move (big sheets stuttered on phones)',()=>{
 const s=sheet();let scans=0;
 const grid=s.grid,orig=grid.querySelectorAll;grid.querySelectorAll=sel=>{scans++;return orig(sel)};
 s.listeners.pointerdown({target:s.at(0,0),button:0,pointerType:'mouse'});
 const afterDown=scans;
 for(const [r,c] of [[0,1],[1,1],[2,2],[1,2]])s.listeners.pointerover({target:s.at(r,c),buttons:1});
 assert.equal(scans,afterDown,'moves reuse the cell index');
 for(const [r,c] of [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]])assert.ok(s.at(r,c).classList.has('xs-sel'),'R'+r+'C'+c);
 assert.ok(!s.at(2,0).classList.has('xs-sel'));
});
test('a big sheet draws only the rows near the screen; copy reads the sheet itself',()=>{
 const map=read('excel-map.js'),css=read('style.css'),sel=read('excel-select.js');
 assert.match(map,/main\.innerHTML=view\.frozenHtml\+\(start\?view\.spacer\(view\.tops\[start\]\):''\)\+view\.body\.slice\(start,end\)\.map\(view\.rowHtml\)\.join\(''\);/,'no spacer above the first rows (it would shift them a pixel)');
 assert.match(map,/const off=view\.base\+view\.tops\[start\]-placeOf\(drawn\[0\]\);/,'the first drawn row is pinned to its exact place');
 assert.match(read('style.css'),/\.excel-sheet\{overflow-anchor:none\}/,'browser scroll anchoring would move the sheet when rows are swapped');
 assert.match(map,/while\(start>0&&view\.origin\[start\]<start\)start=view\.origin\[start\];/,'a merged cell starts its drawn part at its first row');
 assert.match(map,/<tbody class="excel-after">/,'cut merges end at the drawn part, not in the bottom spacer');
 assert.match(map,/grid\.addEventListener\('scroll',\(\)=>drawRows\(false\),\{passive:true\}\);/);
 assert.match(map,/grid\.cellText=\(r,c\)=>renderedSheet\?\.cells\.get\(r\+','\+c\)\?\.text\?\?'';/);
 assert.match(css,/\.excel-sheet tr\.excel-spacer>td\{padding:0;border:0;background:transparent;line-height:0;font-size:0\}/);
 assert.match(sel,/new MutationObserver\(records=>\{if\(records\.every\(r=>\[\.\.\.r\.addedNodes,\.\.\.r\.removedNodes\]\.every\(n=>n\.classList\?\.contains\('xs-handle'\)\)\)\)return;index=null;if\(anchor\)paint\(\)\}\)\.observe\(grid,\{childList:true,subtree:true\}\);/,'moving the corner handles must not repaint in a loop');
 assert.match(sel,/grid\.cellText\?grid\.cellText\(r,c\)/);
});
test('search works like Google Sheets: rows stay, the match is selected and the arrows move between matches',()=>{
 const map=read('excel-map.js'),sel=read('excel-select.js'),css=read('style.css');
 assert.doesNotMatch(map,/matching\(r\)/,'search no longer hides rows (the header row disappeared)');
 assert.match(map,/id="excel-find-prev" aria-label="Previous match"/);
 assert.match(map,/id="excel-find-next" aria-label="Next match"/);
 assert.match(map,/search\.addEventListener\('keydown',e=>\{if\(e\.key==='Enter'\)\{e\.preventDefault\(\);find\(e\.shiftKey\?-1:1\)\}\}\);/);
 assert.match(map,/foundAt=\(foundAt\+step\+found\.length\)%found\.length/,'next/previous wrap around');
 assert.match(map,/grid\.dispatchEvent\(new CustomEvent\('excel-find',\{detail:\{r,c\}\}\)\);/);
 assert.match(sel,/grid\.addEventListener\('excel-find',event=>\{index=null;/);
 assert.match(css,/\.excel-find-step\{flex:none;width:40px;height:40px;/);
});
test('the found cell gets the spreadsheet selection (blue box, lit headers)',()=>{
 const listeners={};const cls=new Set();const cell={dataset:{r:'5',c:'2'},classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),has:c=>cls.has(c)},closest:()=>null};
 const head=(k,v)=>{const s=new Set();return{dataset:{[k]:v},classList:{add:c=>s.add(c),remove:c=>s.delete(c),has:c=>s.has(c)}}};
 const ch=head('c','2'),rh=head('r','5');
 const grid={addEventListener:(n,f)=>listeners[n]=f,querySelectorAll:s=>s.startsWith('td')?[cell]:[ch,rh],querySelector:()=>null,contains:()=>true,offsetParent:{}};
 vm.runInNewContext(read('excel-select.js'),{document:{getElementById:()=>grid,addEventListener(){}},addEventListener(){},setTimeout,clearTimeout,MutationObserver:class{observe(){}},navigator:{}});
 listeners['excel-find']({detail:{r:5,c:2}});
 assert.ok(cls.has('xs-active')&&cls.has('xs-sel'));assert.ok(ch.classList.has('xs-head')&&rh.classList.has('xs-head'));
});

test('phones: touching a cell to scroll selects nothing; a tap selects; tapping the selection copies it (owner video)',async()=>{
 const s=sheet();
 s.listeners.pointerdown({target:s.at(1,1),button:0,pointerType:'touch'});
 assert.ok(!s.at(1,1).classList.has('xs-sel'),'swipe start selects nothing');
 s.listeners.click({target:s.at(1,1),pointerType:'touch'});
 assert.ok(s.at(1,1).classList.has('xs-active'),'tap selects');
 s.listeners.click({target:s.at(1,1),pointerType:'touch'});await new Promise(r=>setImmediate(r));
 assert.equal(s.copied(),'R1C1','second tap copies');
});
test('mouse: clicking the selected cell again copies it; dragging from it starts a new selection',async()=>{
 const s=sheet();
 s.listeners.pointerdown({target:s.at(1,0),button:0,pointerType:'mouse'});s.globalEvents.pointerup();
 s.listeners.pointerdown({target:s.at(1,0),button:0,pointerType:'mouse'});s.globalEvents.pointerup();await new Promise(r=>setImmediate(r));
 assert.equal(s.copied(),'R1C0');assert.ok(s.at(1,0).classList.has('xs-active'),'selection kept');
 s.listeners.pointerdown({target:s.at(1,0),button:0,pointerType:'mouse'});s.listeners.pointerover({target:s.at(2,2),buttons:1});s.globalEvents.pointerup();
 assert.ok(s.at(2,2).classList.has('xs-sel')&&s.at(1,1).classList.has('xs-sel'),'drag from it selects a range');
});
