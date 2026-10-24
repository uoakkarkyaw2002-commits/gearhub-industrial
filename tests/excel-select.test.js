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
 s.listeners.pointerdown({target:s.at(0,0),button:0,pointerType:'touch'});
 s.listeners.pointerdown({target:s.at(2,1),button:0,shiftKey:true,pointerType:'touch'});
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
 s.listeners.pointerdown({target:s.at(2,2),button:0,pointerType:'touch'});
 assert.ok(s.at(2,2).classList.has('xs-active'));
 assert.ok(!s.at(1,1).classList.has('xs-sel'));
 assert.ok(!s.at(2,1).classList.has('xs-sel'));
});

test('cells carry their sheet position; selection styles; script loaded and cached',()=>{
 const map=read('excel-map.js');
 assert.match(map,/html\+='<td data-r="'\+r\+'" data-c="'\+c\+'"'/);
 assert.match(map,/'<th data-c="'\+c\+'"'\+\(c<frozen\.c1\?' class="excel-frozen-col"':''\)\+'>'\+colName\(c\)\+'<\/th>'/);
 const css=read('style.css');assert.match(css,/#excel-grid td\.xs-active\{box-shadow:inset 0 0 0 2px #1a73e8/);assert.match(css,/#excel-grid tbody th\[data-r\]\{cursor:pointer/);
 assert.match(read('index.html'),/<script src="\/excel-select\.js\?v=20261024-speed-2"><\/script>/);
 assert.match(read('sw.js'),/"\/excel-select\.js\?v=20261024-speed-2"/);
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
 assert.match(sel,/new MutationObserver\(\(\)=>\{index=null;if\(anchor\)paint\(\)\}\)\.observe\(grid,\{childList:true,subtree:true\}\);/);
 assert.match(sel,/grid\.cellText\?grid\.cellText\(r,c\)/);
});
