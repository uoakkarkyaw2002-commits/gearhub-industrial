// Excel viewer: cells can be selected like a spreadsheet (click, drag, Shift+click) and copied.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function sheet(){
 const listeners={},docKeys={};
 const mk=(attrs,tag)=>{const cls=new Set();return{tag,tagName:tag.toUpperCase(),dataset:attrs,textContent:attrs.text||'',classList:{add:(...c)=>c.forEach(x=>cls.add(x)),remove:(...c)=>c.forEach(x=>cls.delete(x)),has:c=>cls.has(c)},closest(){return this}}};
 const cells=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)cells.push(mk({r:String(r),c:String(c),text:'R'+r+'C'+c},'td'));
 const heads=[0,1,2].map(c=>mk({c:String(c)},'th')).concat([0,1,2].map(r=>mk({r:String(r)},'th')));
 let copied=null;
 const grid={offsetParent:{},addEventListener:(n,f)=>listeners[n]=f,querySelectorAll:s=>s.startsWith('td')?cells:heads,querySelector:s=>{const m=s.match(/data-r="(\d+)"\]\[data-c="(\d+)"/);return cells.find(x=>x.dataset.r===m[1]&&x.dataset.c===m[2])}};
 const ctx={document:{getElementById:()=>grid,addEventListener:(n,f)=>docKeys[n]=f},addEventListener(){},MutationObserver:class{observe(){}},getSelection:()=>'',navigator:{clipboard:{writeText:async t=>{copied=t}}}};
 vm.runInNewContext(read('excel-select.js'),ctx);
 const at=(r,c)=>cells.find(x=>x.dataset.r===String(r)&&x.dataset.c===String(c));
 return{listeners,docKeys,at,heads,copied:()=>copied};
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

test('clicking a row number selects every cell across that row',()=>{
 const s=sheet(),rowHead=s.heads.find(head=>head.dataset.r==='1');
 s.listeners.pointerdown({target:rowHead,button:0,pointerType:'mouse'});
 for(const c of [0,1,2])assert.ok(s.at(1,c).classList.has('xs-sel'),'R1C'+c+' selected');
 assert.ok(!s.at(0,0).classList.has('xs-sel'));
});

test('cells carry their sheet position; selection styles; script loaded and cached',()=>{
 const map=read('excel-map.js');
 assert.match(map,/html\+='<td data-r="'\+r\+'" data-c="'\+c\+'"'/);
 assert.match(map,/'<th data-c="'\+c\+'"'\+\(c<frozen\.cols\?' class="excel-frozen-col"':''\)\+'>'\+colName\(c\)\+'<\/th>'/);
 const css=read('style.css');assert.match(css,/#excel-grid td\.xs-active\{box-shadow:inset 0 0 0 2px #1a73e8/);assert.match(css,/#excel-grid tbody th\[data-r\]\{cursor:pointer/);
 assert.match(read('index.html'),/<script src="\/excel-select\.js\?v=20261023-row-select-1"><\/script>/);
 assert.match(read('sw.js'),/"\/excel-select\.js\?v=20261023-row-select-1"/);
});
