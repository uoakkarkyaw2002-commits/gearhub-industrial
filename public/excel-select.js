// Excel viewer: cells select individually; row numbers select the complete row.
// Mouse drag, Shift+click, touch hold-and-drag or the blue corner handles select a range. On phones a
// swipe only scrolls; a tap selects (like Google Sheets). Tapping / clicking the selection again copies it.
// Ctrl/Cmd+C copies the selection as rows and columns (pastes into Excel or Sheets); Esc clears it.
(()=>{
 const grid=document.getElementById('excel-grid');if(!grid)return;
 let anchor=null,focus=null,dragging=false,marked=[],ownTable=null,pending=null,held=false,lastPointer='';
 const pos=cell=>({r:Number(cell.dataset.r),c:Number(cell.dataset.c),r2:Number(cell.dataset.r2??cell.dataset.r),c2:Number(cell.dataset.c2??cell.dataset.c)});
 function area(){if(!anchor||!focus)return null;return{top:Math.min(anchor.r,focus.r),left:Math.min(anchor.c,focus.c),bottom:Math.max(anchor.r2,focus.r2),right:Math.max(anchor.c2,focus.c2)}}
 function clear(){for(const node of marked)node.classList.remove('xs-sel','xs-active','xs-head');marked=[];handles.forEach(h=>h.remove());outline?.remove()}
 const inArea=p=>{const box=area();return!!box&&p.r>=box.top&&p.r2<=box.bottom&&p.c>=box.left&&p.c2<=box.right};
 // Blue dots at the selection's corners (touch screens): drag one to grow or shrink the selection.
 const handles=['start','end'].map(side=>{const dot=globalThis.document.createElement?.('i');if(dot){dot.className='xs-mark xs-handle xs-handle-'+side;dot.dataset.side=side;dot.setAttribute('aria-hidden','true')}return dot}).filter(Boolean);
 // One blue outline around the whole selection, drawn over the cell lines (Google Sheets). A box inside
 // every selected cell doubled up with the sheet's own black borders.
 const outline=globalThis.document.createElement?.('i');if(outline){outline.className='xs-mark xs-range';outline.setAttribute('aria-hidden','true')}
 const coarse=()=>!!globalThis.matchMedia?.('(pointer:coarse)').matches;
 function placeHandles(box,ix){
  if(!outline||!grid.getBoundingClientRect)return;
  if(getComputedStyle(grid).position==='static')grid.style.position='relative';
  const g=grid.getBoundingClientRect(),at=(r,c)=>ix.cells.get(r+','+c)||ix.merged.find(([,p])=>p.r<=r&&r<=p.r2&&p.c<=c&&c<=p.c2)?.[0];
  const x=v=>v-g.left+grid.scrollLeft-grid.clientLeft,y=v=>v-g.top+grid.scrollTop-grid.clientTop;
  const first=at(box.top,box.left),last=at(box.bottom,box.right);
  if(first&&last){const a=first.getBoundingClientRect(),b=last.getBoundingClientRect();Object.assign(outline.style,{left:x(a.left)-1+'px',top:y(a.top)-1+'px',width:b.right-a.left+1+'px',height:b.bottom-a.top+1+'px'});grid.append(outline)}
  if(!coarse())return;
  for(const dot of handles){const end=dot.dataset.side==='end',cell=at(end?box.bottom:box.top,end?box.right:box.left);if(!cell)continue;const b=cell.getBoundingClientRect();
   dot.style.left=(end?b.right:b.left)-g.left+grid.scrollLeft-grid.clientLeft+'px';dot.style.top=(end?b.bottom:b.top)-g.top+grid.scrollTop-grid.clientTop+'px';grid.append(dot)}
 }
 // "Copied" shown above the full-screen sheet (the shop's own toast sits behind it).
 let note=null,noteTimer=0;
 function copiedNote(){
  const doc=globalThis.document;if(!doc?.createElement||!doc.body)return;
  if(!note){note=doc.createElement('div');note.className='xs-copied-note';note.setAttribute('role','status');doc.body.append(note)}
  note.textContent='Copied';note.classList.add('show');clearTimeout(noteTimer);noteTimer=setTimeout(()=>note.classList.remove('show'),1400);
 }
 function copySelection(){
  const box=area();if(!box)return;const ix=lookup(),rows=[];
  for(let r=box.top;r<=box.bottom;r++){const line=[];for(let c=box.left;c<=box.right;c++)line.push((grid.cellText?grid.cellText(r,c):ix.cells.get(r+','+c)?.textContent)||'');rows.push(line.join('\t'))}
  navigator.clipboard?.writeText(rows.join('\n')).then(()=>{copiedNote();grid.classList?.add('xs-copied');setTimeout(()=>grid.classList?.remove('xs-copied'),900)}).catch(()=>{});
 }
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
  clear();const box=area();if(!box)return;const ix=lookup();ownTable=grid.firstElementChild;
  const mark=(node,cls)=>{node.classList.add(cls);marked.push(node)};
  const rows=within(ix.rowList,box.top,box.bottom),cols=within(ix.colList,box.left,box.right);
  for(const r of rows)for(const c of cols){const cell=ix.cells.get(r+','+c);if(cell)mark(cell,'xs-sel')}
  for(const [cell,p] of ix.merged)if(!(p.r2<box.top||p.r>box.bottom||p.c2<box.left||p.c>box.right))mark(cell,'xs-sel');
  const active=ix.cells.get(anchor.r+','+anchor.c);if(active)mark(active,'xs-active');
  for(const c of cols){const head=ix.cols.get(c);if(head)mark(head,'xs-head')}
  for(const r of rows){const head=ix.rows.get(r);if(head)mark(head,'xs-head')}
  placeHandles(box,ix);
 }
 function selectRow(r){
  const ix=lookup(),cells=ix.colList.map(c=>ix.cells.get(r+','+c)).filter(Boolean);
  for(const [cell,p] of ix.merged)if(p.r<r&&p.r2>=r)cells.push(cell);
  if(!cells.length)return false;
  const left=Math.min(...cells.map(cell=>pos(cell).c)),right=Math.max(...cells.map(cell=>pos(cell).c2));
  anchor={r,c:left,r2:r,c2:left};focus={r,c:right,r2:r,c2:right};dragging=false;paint();return true;
 }
 grid.addEventListener('pointerdown',event=>{
  lastPointer=event.pointerType||'';const cell=event.target.closest('td[data-r]');
  if(cell){
   // Touch: nothing is selected on touch-down, so a swipe only scrolls; a tap selects (click below).
   if(event.button||event.pointerType!=='mouse'||event.target.closest('.xs-handle'))return;
   const p=pos(cell);event.preventDefault?.();dragging=true;
   if(event.shiftKey&&anchor)focus=p;
   // Clicking the selected cell again copies it (a drag from it starts a new selection). Clicking a cell
   // inside a bigger selection selects just that cell, as in Google Sheets on a PC.
   else if(anchor&&focus&&anchor.r===focus.r&&anchor.c===focus.c&&p.r===anchor.r&&p.c===anchor.c){pending=p;return}
   else{anchor=p;focus=p}
   paint();return;
  }
  const rowHead=event.target.closest('tbody th[data-r]');
  if(rowHead?.tagName==='TH'&&!event.button)selectRow(Number(rowHead.dataset.r));
 });
 // Search (excel-map.js) selects the cell it found, like Google Sheets.
 grid.addEventListener('excel-find',event=>{index=null;const cell=lookup().cells.get(event.detail.r+','+event.detail.c);anchor=focus=cell?pos(cell):{r:event.detail.r,c:event.detail.c,r2:event.detail.r,c2:event.detail.c};dragging=false;paint()});
 grid.addEventListener('pointerover',event=>{
  if(!dragging||!(event.buttons&1))return;const cell=event.target.closest('td[data-r]');if(!cell)return;
  const p=pos(cell);if(pending){if(p.r===pending.r&&p.c===pending.c)return;anchor=pending;pending=null}
  focus=p;paint();
 });
 addEventListener('pointerup',()=>{dragging=false;if(pending){pending=null;copySelection()}});
 // A tap (not a swipe) selects a cell; tapping inside the selection copies it.
 function tap(p,shift){if(!shift&&linkMenu(p))return;if(anchor&&inArea(p)){copySelection();return}if(shift&&anchor)focus=p;else{anchor=p;focus=p}paint()}
 // 1.1.226 owner: a cell holding a web link (e.g. the PHOTO column's Google Drive links) is selected and
 // offers Copy / Go; Go opens the link.
 const linkOf=p=>{const t=String((grid.cellText?grid.cellText(p.r,p.c):'')||'').trim();return /^https?:\/\/\S+$/i.test(t)?t:''};
 let menu=null;
 function closeMenu(){menu?.remove();menu=null}
 function linkMenu(p){
  const url=linkOf(p);if(!url)return false;
  anchor=p;focus=p;paint();closeMenu();
  const cell=grid.querySelector('td[data-r="'+p.r+'"][data-c="'+p.c+'"]'),box=(cell||grid).getBoundingClientRect();
  menu=document.createElement('div');menu.className='xs-link-menu';menu.setAttribute('role','menu');
  menu.innerHTML='<button type="button" data-link="copy">Copy</button><button type="button" data-link="go">Go ↗</button>';
  document.body.append(menu);
  const w=menu.offsetWidth,h=menu.offsetHeight;let x=box.left+box.width/2-w/2,y=box.top-h-8;if(y<8)y=box.bottom+8;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';menu.style.top=y+'px';
  menu.addEventListener('click',async e=>{const b=e.target.closest('[data-link]');if(!b)return;e.stopPropagation();
   if(b.dataset.link==='go'){closeMenu();window.open(url,'_blank','noopener')}
   else{try{await navigator.clipboard.writeText(url)}catch{const t=document.createElement('textarea');t.value=url;document.body.append(t);t.select();document.execCommand('copy');t.remove()}b.textContent='Copied ✓';setTimeout(closeMenu,700)}});
  return true;
 }
 addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target))closeMenu()},true);
 grid.addEventListener('scroll',closeMenu,{passive:true});
 // Touch taps are read from touchend below (iPhone Safari did not deliver these clicks); this click
 // covers pens and other pointers, and skips the click that follows a touch tap.
 let tapped=0;
 grid.addEventListener('click',event=>{
  if(held){held=false;return}
  const cell=event.target.closest?.('td[data-r]');if(cell&&lastPointer==='mouse'&&!event.shiftKey&&linkOf(pos(cell))){linkMenu(pos(cell));return}
  if(!cell||lastPointer==='mouse'||Date.now()-tapped<800)return;
  tap(pos(cell),event.shiftKey);
 });
 addEventListener('pointercancel',()=>{dragging=false});
 // A quick swipe scrolls; hold a cell briefly before dragging to select on phones.
 let touch=null,holdTimer=null;
 function endTouch(){clearTimeout(holdTimer);holdTimer=null;touch=null}
 grid.addEventListener('touchstart',event=>{
  endTouch();held=false;if(event.touches.length!==1)return;
  const dot=event.target.closest('.xs-handle');if(dot&&anchor){touch={handle:dot.dataset.side,selecting:true};return}
  const cell=event.target.closest('td[data-r]');if(!cell)return;
  const finger=event.touches[0],p=pos(cell);touch={x:finger.clientX,y:finger.clientY,p,selecting:false,at:Date.now(),inSel:!!anchor&&inArea(p)};
  // Holding still on the selection must not shrink it to one cell (a drag there grows it instead).
  if(!touch.inSel)holdTimer=setTimeout(()=>{if(!touch)return;touch.selecting=true;held=true;anchor=touch.p;focus=touch.p;paint()},350);
 },{passive:true});
 grid.addEventListener('touchmove',event=>{
  if(!touch)return;if(event.touches.length!==1){endTouch();return}
  const finger=event.touches[0];
  // A drag that starts on the selection grows the whole selection towards the finger, like dragging its
  // corner in Google Sheets (3 cells dragged sideways stay 3 rows tall); a still touch there copies it
  // instead. Anywhere else a drag scrolls. Its first move is held back so the page does not scroll.
  if(!touch.selecting&&touch.inSel){event.preventDefault();if(Math.hypot(finger.clientX-touch.x,finger.clientY-touch.y)<=8)return;clearTimeout(holdTimer);touch.selecting=true;held=true;touch.base=area()}
  if(!touch.selecting){if(Math.hypot(finger.clientX-touch.x,finger.clientY-touch.y)>8)endTouch();return}
  event.preventDefault();
  // Near an edge of the sheet the selection keeps going: the sheet scrolls under the finger (Google Sheets).
  if(grid.getBoundingClientRect){const b=grid.getBoundingClientRect(),edge=36,step=14;
   if(finger.clientX>b.right-edge)grid.scrollLeft+=step;else if(finger.clientX<b.left+edge+46)grid.scrollLeft-=step;
   if(finger.clientY>b.bottom-edge)grid.scrollTop+=step;else if(finger.clientY<b.top+edge+30)grid.scrollTop-=step}
  const cell=document.elementFromPoint(finger.clientX,finger.clientY)?.closest('td[data-r]');
  if(cell&&grid.contains(cell)){const p=pos(cell);
   if(touch.base){const b=touch.base,top=Math.min(b.top,p.r),left=Math.min(b.left,p.c),bottom=Math.max(b.bottom,p.r2),right=Math.max(b.right,p.c2);anchor={r:top,c:left,r2:top,c2:left};focus={r:bottom,c:right,r2:bottom,c2:right}}
   else if(touch.handle==='start')anchor=p;else focus=p;paint()}
 },{passive:false});
 // A short touch that did not move is a tap.
 grid.addEventListener('touchend',()=>{const t=touch;endTouch();if(!t||t.handle||t.selecting||!t.p||Date.now()-t.at>500)return;tapped=Date.now();tap(t.p,false)});
 grid.addEventListener('touchcancel',endTouch);
 grid.addEventListener('contextmenu',event=>{if(touch)event.preventDefault()});
 // A new sheet or search result replaces the table: the old selection goes with it.
 // (A selection made on the new table, e.g. a search match kept after zoom, stays.)
 new MutationObserver(()=>{if(ownTable&&grid.firstElementChild===ownTable)return;endTouch();dragging=false;marked=[];anchor=focus=null}).observe(grid,{childList:true});
 // A scrolled big sheet draws other rows: rebuild the index and show the selection on them.
 new MutationObserver(records=>{if(records.every(r=>[...r.addedNodes,...r.removedNodes].every(n=>n.classList?.contains('xs-mark'))))return;index=null;if(anchor)paint()}).observe(grid,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{
  if(!anchor||!grid.offsetParent)return;
  if(event.key==='Escape'){clear();anchor=focus=null;return}
  if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='c'||String(getSelection?.()||'').trim())return;
  copySelection();event.preventDefault();
 });
})();
