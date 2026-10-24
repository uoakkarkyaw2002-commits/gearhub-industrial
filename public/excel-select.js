// Excel viewer: click or tap any cell (or its row number) to select the complete row.
// Drag with the mouse or Shift+click still selects a range; row numbers and column letters light up.
// Ctrl/Cmd+C copies the selection as rows and columns (pastes into Excel or Sheets); Esc clears it.
(()=>{
 const grid=document.getElementById('excel-grid');if(!grid)return;
 let anchor=null,focus=null,dragging=false,marked=[];
 const pos=cell=>({r:Number(cell.dataset.r),c:Number(cell.dataset.c),r2:Number(cell.dataset.r2??cell.dataset.r),c2:Number(cell.dataset.c2??cell.dataset.c)});
 function area(){if(!anchor||!focus)return null;return{top:Math.min(anchor.r,focus.r),left:Math.min(anchor.c,focus.c),bottom:Math.max(anchor.r2,focus.r2),right:Math.max(anchor.c2,focus.c2)}}
 function clear(){for(const node of marked)node.classList.remove('xs-sel','xs-active','xs-head');marked=[]}
 function paint(){
  clear();const box=area();if(!box)return;
  for(const cell of grid.querySelectorAll('td[data-r]')){const p=pos(cell);if(p.r2<box.top||p.r>box.bottom||p.c2<box.left||p.c>box.right)continue;cell.classList.add('xs-sel');marked.push(cell)}
  const active=grid.querySelector('td[data-r="'+anchor.r+'"][data-c="'+anchor.c+'"]');if(active){active.classList.add('xs-active');marked.push(active)}
  for(const head of grid.querySelectorAll('thead th[data-c],tbody th[data-r]')){const c=head.dataset.c,r=head.dataset.r;if((c!==undefined&&c>=box.left&&c<=box.right)||(r!==undefined&&r>=box.top&&r<=box.bottom)){head.classList.add('xs-head');marked.push(head)}}
 }
 function selectRow(r){
  const cells=[...grid.querySelectorAll('td[data-r]')].filter(cell=>{const p=pos(cell);return p.r<=r&&p.r2>=r});
  if(!cells.length)return false;
  const left=Math.min(...cells.map(cell=>pos(cell).c)),right=Math.max(...cells.map(cell=>pos(cell).c2));
  anchor={r,c:left,r2:r,c2:left};focus={r,c:right,r2:r,c2:right};dragging=false;paint();return true;
 }
 grid.addEventListener('pointerdown',event=>{
  const rowHead=event.target.closest('tbody th[data-r]');
  if(rowHead?.tagName==='TH'&&!event.button&&selectRow(Number(rowHead.dataset.r))){event.preventDefault?.();return}
  const cell=event.target.closest('td[data-r]');if(!cell||event.button)return;
  const p=pos(cell);
  if(!event.shiftKey&&selectRow(p.r)){dragging=event.pointerType==='mouse';event.preventDefault?.();return}
  if(anchor)focus=p;else{anchor=p;focus=p}
  dragging=event.pointerType==='mouse';paint();
 });
 grid.addEventListener('pointerover',event=>{
  if(!dragging||!(event.buttons&1))return;const cell=event.target.closest('td[data-r]');if(!cell)return;
  focus=pos(cell);paint();
 });
 addEventListener('pointerup',()=>{dragging=false});
 // A new sheet or search result replaces the table: the old selection goes with it.
 new MutationObserver(()=>{marked=[];anchor=focus=null}).observe(grid,{childList:true});
 document.addEventListener('keydown',event=>{
  if(!anchor||!grid.offsetParent)return;
  if(event.key==='Escape'){clear();anchor=focus=null;return}
  if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='c'||String(getSelection?.()||'').trim())return;
  const box=area(),rows=[];
  for(let r=box.top;r<=box.bottom;r++){const line=[];for(let c=box.left;c<=box.right;c++)line.push(grid.querySelector('td[data-r="'+r+'"][data-c="'+c+'"]')?.textContent||'');rows.push(line.join('\t'))}
  navigator.clipboard?.writeText(rows.join('\n')).catch(()=>{});event.preventDefault();
 });
})();
