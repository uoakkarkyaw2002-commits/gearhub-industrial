// Excel viewer: cells select individually; row numbers select the complete row.
// Mouse drag, Shift+click or touch hold-and-drag selects a range.
// Ctrl/Cmd+C copies the selection as rows and columns (pastes into Excel or Sheets); Esc clears it.
(()=>{
 const grid=document.getElementById('excel-grid');if(!grid)return;
 let anchor=null,focus=null,dragging=false,marked=[];
 const pos=cell=>({r:Number(cell.dataset.r),c:Number(cell.dataset.c),r2:Number(cell.dataset.r2??cell.dataset.r),c2:Number(cell.dataset.c2??cell.dataset.c)});
 function area(){if(!anchor||!focus)return null;return{top:Math.min(anchor.r,focus.r),left:Math.min(anchor.c,focus.c),bottom:Math.max(anchor.r2,focus.r2),right:Math.max(anchor.c2,focus.c2)}}
 function clear(){for(const node of marked)node.classList.remove('xs-sel','xs-active','xs-head');marked=[]}
 // Cells and headers by position, built once per table: a big sheet has tens of thousands of cells,
 // and scanning them all on every drag move made selecting stutter on phones.
 let index=null;
 function lookup(){
  if(index)return index;
  const cells=new Map(),merged=[],cols=new Map(),rows=new Map();
  for(const cell of grid.querySelectorAll('td[data-r]')){const p=pos(cell);cells.set(p.r+','+p.c,cell);if(p.r2!==p.r||p.c2!==p.c)merged.push([cell,p])}
  for(const head of grid.querySelectorAll('thead th[data-c],tbody th[data-r]')){if(head.dataset.c!==undefined)cols.set(Number(head.dataset.c),head);else if(head.dataset.r!==undefined)rows.set(Number(head.dataset.r),head)}
  const sorted=keys=>[...new Set([...keys])].sort((a,b)=>a-b);
  return index={cells,merged,cols,rows,colList:sorted([...cols.keys(),...[...cells.values()].map(cell=>pos(cell).c)]),rowList:sorted([...rows.keys(),...[...cells.values()].map(cell=>pos(cell).r)])};
 }
 const within=(list,lo,hi)=>list.filter(n=>n>=lo&&n<=hi);
 function paint(){
  clear();const box=area();if(!box)return;const ix=lookup();
  const mark=(node,cls)=>{node.classList.add(cls);marked.push(node)};
  const rows=within(ix.rowList,box.top,box.bottom),cols=within(ix.colList,box.left,box.right);
  for(const r of rows)for(const c of cols){const cell=ix.cells.get(r+','+c);if(cell)mark(cell,'xs-sel')}
  for(const [cell,p] of ix.merged)if(!(p.r2<box.top||p.r>box.bottom||p.c2<box.left||p.c>box.right))mark(cell,'xs-sel');
  const active=ix.cells.get(anchor.r+','+anchor.c);if(active)mark(active,'xs-active');
  for(const c of cols){const head=ix.cols.get(c);if(head)mark(head,'xs-head')}
  for(const r of rows){const head=ix.rows.get(r);if(head)mark(head,'xs-head')}
 }
 function selectRow(r){
  const ix=lookup(),cells=ix.colList.map(c=>ix.cells.get(r+','+c)).filter(Boolean);
  for(const [cell,p] of ix.merged)if(p.r<r&&p.r2>=r)cells.push(cell);
  if(!cells.length)return false;
  const left=Math.min(...cells.map(cell=>pos(cell).c)),right=Math.max(...cells.map(cell=>pos(cell).c2));
  anchor={r,c:left,r2:r,c2:left};focus={r,c:right,r2:r,c2:right};dragging=false;paint();return true;
 }
 grid.addEventListener('pointerdown',event=>{
  const cell=event.target.closest('td[data-r]');
  if(cell){
   if(event.button)return;
   const p=pos(cell);
   if(event.shiftKey&&anchor)focus=p;else{anchor=p;focus=p}
   if(event.pointerType==='mouse')event.preventDefault?.();
   dragging=event.pointerType==='mouse';paint();return;
  }
  const rowHead=event.target.closest('tbody th[data-r]');
  if(rowHead?.tagName==='TH'&&!event.button)selectRow(Number(rowHead.dataset.r));
 });
 grid.addEventListener('pointerover',event=>{
  if(!dragging||!(event.buttons&1))return;const cell=event.target.closest('td[data-r]');if(!cell)return;
  focus=pos(cell);paint();
 });
 addEventListener('pointerup',()=>{dragging=false});
 addEventListener('pointercancel',()=>{dragging=false});
 // A quick swipe scrolls; hold a cell briefly before dragging to select on phones.
 let touch=null,holdTimer=null;
 function endTouch(){clearTimeout(holdTimer);holdTimer=null;touch=null}
 grid.addEventListener('touchstart',event=>{
  endTouch();if(event.touches.length!==1)return;
  const cell=event.target.closest('td[data-r]');if(!cell)return;
  const finger=event.touches[0];touch={x:finger.clientX,y:finger.clientY,p:pos(cell),selecting:false};
  holdTimer=setTimeout(()=>{if(!touch)return;touch.selecting=true;anchor=touch.p;focus=touch.p;paint()},350);
 },{passive:true});
 grid.addEventListener('touchmove',event=>{
  if(!touch)return;if(event.touches.length!==1){endTouch();return}
  const finger=event.touches[0];
  if(!touch.selecting){if(Math.hypot(finger.clientX-touch.x,finger.clientY-touch.y)>8)endTouch();return}
  event.preventDefault();
  const cell=document.elementFromPoint(finger.clientX,finger.clientY)?.closest('td[data-r]');
  if(cell&&grid.contains(cell)){focus=pos(cell);paint()}
 },{passive:false});
 grid.addEventListener('touchend',endTouch);grid.addEventListener('touchcancel',endTouch);
 grid.addEventListener('contextmenu',event=>{if(touch)event.preventDefault()});
 // A new sheet or search result replaces the table: the old selection goes with it.
 new MutationObserver(()=>{endTouch();dragging=false;marked=[];anchor=focus=null}).observe(grid,{childList:true});
 // A scrolled big sheet draws other rows: rebuild the index and show the selection on them.
 new MutationObserver(()=>{index=null;if(anchor)paint()}).observe(grid,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{
  if(!anchor||!grid.offsetParent)return;
  if(event.key==='Escape'){clear();anchor=focus=null;return}
  if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='c'||String(getSelection?.()||'').trim())return;
  const box=area(),rows=[];
  const ix=lookup();for(let r=box.top;r<=box.bottom;r++){const line=[];for(let c=box.left;c<=box.right;c++)line.push((grid.cellText?grid.cellText(r,c):ix.cells.get(r+','+c)?.textContent)||'');rows.push(line.join('\t'))}
  navigator.clipboard?.writeText(rows.join('\n')).catch(()=>{});event.preventDefault();
 });
})();
