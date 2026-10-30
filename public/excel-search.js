/* 1.1.215 owner: a search in a seller shop also shows the matching rows of the shop's Excel file under
   the products, from the "BC" sheet (the first sheet when there is no BC). Tapping a row, or "Open in
   Excel", opens the Excel viewer on that sheet with the same search. The workbook is read once per page
   (the offline copy from excel-library.js when there is no line). */
(()=>{
 const input=document.getElementById('search'),products=document.getElementById('products'),slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
 if(!input)return;
 // 1.1.221 owner: while something is typed the bar runs full width (scan and folder hide) and ends with
 // the number found, ˄ ˅ (Excel view) and a bin that clears the search.
 const pill=input.closest('.search-pill'),tools=document.createElement('span');tools.className='search-tools';
 tools.innerHTML='<span class="search-count" aria-live="polite"></span><button type="button" class="search-step" data-excel-step="-1" aria-label="Previous match"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button><button type="button" class="search-step" data-excel-step="1" aria-label="Next match"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><button type="button" class="search-clear" aria-label="Clear search"><svg viewBox="0 0 24 24" aria-hidden="true"><rect class="bin-fill" x="7.6" y="8" width="8.8" height="12.4" rx="1"/><g class="bin-lid"><path d="M4 7h16M9 7V4.8h6V7"/></g><path d="M6.5 7l.9 12.2c.1 1 .9 1.8 1.9 1.8h5.4c1 0 1.8-.8 1.9-1.8L17.5 7M10 11v6M14 11v6"/></svg></button>';
 pill?.append(tools);
 const counter=tools.querySelector('.search-count'),steps=[...tools.querySelectorAll('.search-step')];
 const setCount=(text,nav)=>{counter.textContent=text||'';steps.forEach(b=>b.hidden=!nav)};setCount('',false);
 const clearNow=()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));setCount('',false)};
 tools.querySelector('.search-clear').addEventListener('click',e=>eat(e.currentTarget));
 // 1.1.223 owner's video: the bin opens its lid, the typed letters jump into it one by one (first letter
 // first), the bin fills, the lid closes and a ring runs once around it; then the search is empty.
 // Same pace as the video (about 3 s).
 let eating=false;
 async function eat(bin){
  if(eating)return;const text=input.value;
  if(!text||matchMedia('(prefers-reduced-motion: reduce)').matches||!Element.prototype.animate){clearNow();input.focus();return}
  eating=true;input.readOnly=true;input.blur();
  const st=getComputedStyle(input),box=input.getBoundingClientRect(),layer=document.createElement('div');
  layer.className='bin-letters';layer.style.cssText='left:'+(box.left+parseFloat(st.paddingLeft)-input.scrollLeft)+'px;top:'+box.top+'px;height:'+box.height+'px;line-height:'+box.height+'px;font:'+st.font+';letter-spacing:'+st.letterSpacing+';color:'+st.color;
  layer.innerHTML=[...text].map(ch=>'<span>'+ch.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c])+'</span>').join('');
  document.body.append(layer);input.classList.add('bin-hiding');
  const lid=bin.querySelector('.bin-lid'),fill=bin.querySelector('.bin-fill'),b=bin.getBoundingClientRect(),tx=b.left+b.width/2,ty=b.top+b.height*.42;
  const wait=ms=>new Promise(done=>setTimeout(done,ms));
  lid.animate([{transform:'rotate(0)'},{transform:'rotate(-38deg)'}],{duration:260,easing:'ease-out',fill:'forwards'});
  await wait(320);
  const spans=[...layer.children],gap=Math.min(120,1300/spans.length),fly=560;
  spans.forEach((span,i)=>{const r=span.getBoundingClientRect(),dx=tx-(r.left+r.width/2),dy=ty-(r.top+r.height/2);
   span.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+dx*.55+'px,'+(dy-24)+'px) rotate(-18deg)',opacity:1,offset:.55},{transform:'translate('+dx+'px,'+dy+'px) scale(.25)',opacity:0}],{duration:fly,delay:i*gap,easing:'cubic-bezier(.3,.1,.6,1)',fill:'forwards'})});
  fill.animate([{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration:Math.max(300,(spans.length-1)*gap+fly),delay:fly*.6,easing:'linear',fill:'forwards'});
  await wait((spans.length-1)*gap+fly+120);
  layer.remove();
  lid.animate([{transform:'rotate(-38deg)'},{transform:'rotate(0)'}],{duration:300,easing:'ease-in',fill:'forwards'});
  await wait(320);
  const ring=document.createElement('span');ring.className='bin-ring';ring.innerHTML='<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/></svg>';bin.append(ring);
  ring.querySelector('circle').animate([{strokeDashoffset:126},{strokeDashoffset:0}],{duration:760,easing:'ease-in-out',fill:'forwards'});
  await wait(820);
  ring.animate([{opacity:1},{opacity:0}],{duration:260,fill:'forwards'});fill.animate([{transform:'scaleY(1)'},{transform:'scaleY(0)'}],{duration:260,fill:'forwards'});
  await wait(280);
  ring.remove();lid.getAnimations().forEach(a=>a.cancel());fill.getAnimations().forEach(a=>a.cancel());
  input.classList.remove('bin-hiding');input.readOnly=false;eating=false;clearNow();
 }

 tools.addEventListener('click',e=>{const st=e.target.closest('[data-excel-step]');if(st)go(+st.dataset.excelStep)});
 if(!products||!slug)return;
 const SHEET='BC',LIMIT=30;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const box=document.createElement('section');box.className='excel-results';box.hidden=true;box.setAttribute('aria-live','polite');
 box.innerHTML='<div class="excel-results-rows"></div><div class="excel-results-host" hidden></div>';
 const rowsArea=box.firstChild,host=box.lastChild;
 products.after(box);
 let loading=null,timer=0,turn=0;
 // The first Excel file that has a BC sheet (else the first file and its first sheet). The workbook is
 // read once and shared with the Excel viewer (1.1.224).
 function workbook(){
  return loading||(loading=(async()=>{
   const viewer=window.GearHubExcelViewer;if(!viewer)return null;
   const list=await (await fetch('/api/platform/store/'+encodeURIComponent(slug)+'/spreadsheets')).json();
   const files=(list.files||[]).filter(f=>/\.xls[xm]$/i.test(f.name));let first=null;
   for(const file of files){const sheet=await viewer.sheet(file.url,SHEET);if(!sheet)continue;const found={file,sheet};if(sheet.name.trim().toLowerCase()===SHEET.toLowerCase())return found;first=first||found}
   return first;
  })().catch(()=>{loading=null;return null}));
 }
 const visible=(sheet,c)=>sheet.widths?.[c]!==0;
 const text=(sheet,r,c)=>String(sheet.cells.get(r+','+c)?.text??'').trim();
 // 1.1.217: two views — only the matching rows ("ရှာတာပဲ"), or the sheet like Excel ("Excel လို").
 // 1.1.224 owner: the Excel view is the shop's real Excel viewer under the search bar — original column
 // and row sizes, drag-select, copy, row select — moved to the bar's ˄ ˅ and count.
 const MODE_KEY='gh-excel-search-mode';let mode=(()=>{try{return localStorage.getItem(MODE_KEY)==='sheet'?'sheet':'rows'}catch{return 'rows'}})();
 function hideAll(){box.hidden=true;rowsArea.innerHTML='';host.hidden=true;full(false);setCount('',false);window.GearHubExcelViewer?.release()}
 const countSheet=s=>setCount(s.total?(s.at+1)+'/'+s.total:'0',s.total>1);
 async function show(){
  const q=input.value.trim(),mine=++turn;
  if(q.length<2){hideAll();return}
  const found=await workbook();if(mine!==turn)return;
  if(!found){hideAll();return}
  const {file,sheet}=found,viewer=window.GearHubExcelViewer;
  box.hidden=false;full(mode==='sheet');
  if(mode==='sheet'){
   rowsArea.innerHTML='';host.hidden=false;fit();
   if(!await viewer.embed(host,file.url,file.name,sheet.name)||mine!==turn)return;
   countSheet(viewer.search(q));return;
  }
  viewer.release();host.hidden=true;
  const cols=[];for(let c=0;c<=sheet.maxC;c++)if(visible(sheet,c))cols.push(c);
  // Column names: the first row with two or more filled cells (like the import mapping).
  let head=0;for(let r=0;r<=sheet.maxR;r++){if(cols.filter(c=>text(sheet,r,c)).length>=2){head=r;break}}
  const needle=q.toLocaleLowerCase(),has=(r,c)=>text(sheet,r,c).toLocaleLowerCase().includes(needle),hits=[];
  for(let r=head+1;r<=sheet.maxR&&hits.length<=LIMIT;r++){if(sheet.heights?.[r]===0)continue;if(cols.some(c=>has(r,c)))hits.push(r)}
  const more=hits.length>LIMIT;if(more)hits.length=LIMIT;
  // Drawn like the Excel viewer: column letters, row numbers, the header row, the sheet's own widths
  // (the table is exactly their sum, so no column grows past its Excel size), heights, fills and fonts.
  const width=c=>Math.round(((sheet.widths?.[c]??sheet.defW??8.43)*7)+5),height=r=>Math.max(24,Math.round((sheet.heights?.[r]||sheet.defH||15)*4/3)),letter=i=>{let t='';i++;while(i>0){const m=(i-1)%26;t=String.fromCharCode(65+m)+t;i=Math.floor((i-1)/26)}return t};
  const css=cell=>{const st=cell?.style||{},f=st.font||{},out=[];if(st.fill)out.push('background-color:'+st.fill);if(f.color)out.push('color:'+f.color);if(f.b)out.push('font-weight:700');if(f.i)out.push('font-style:italic');if(f.sz)out.push('font-size:'+f.sz+'pt');if(f.name)out.push('font-family:"'+String(f.name).replace(/["<>]/g,'')+'",system-ui,sans-serif');
   const h=st.h&&st.h!=='general'?(st.h==='centerContinuous'?'center':st.h):cell?.numeric?'right':'left';out.push('text-align:'+h);if(st.wrap)out.push('white-space:pre-wrap');return out.join(';')};
  const td=(r,c)=>{const cell=sheet.cells.get(r+','+c);return '<td'+(r!==head&&has(r,c)?' class="excel-match"':'')+' style="'+esc(css(cell))+'">'+esc(text(sheet,r,c))+'</td>'};
  const line=(r,cls)=>'<tr'+(cls?' class="'+cls+'"':'')+' data-excel-row="'+r+'" style="height:'+height(r)+'px"><th>'+(r+1)+'</th>'+cols.map(c=>td(r,c)).join('')+'</tr>';
  const total=46+cols.reduce((a,c)=>a+width(c),0);
  rowsArea.innerHTML=hits.length?'<div class="excel-results-grid"><table style="width:'+total+'px"><colgroup><col style="width:46px">'+cols.map(c=>'<col style="width:'+width(c)+'px">').join('')+'</colgroup>'
   +'<thead><tr class="excel-results-letters"><th></th>'+cols.map(c=>'<th>'+letter(c)+'</th>').join('')+'</tr>'+line(head,'excel-results-header')+'</thead>'
   +'<tbody>'+hits.map(r=>line(r)).join('')+'</tbody></table></div>':'<p class="excel-results-none">Excel · '+esc(sheet.name)+' — No match</p>';
  setCount(hits.length+(more?'+':''),false);
  box.dataset.url=file.url;box.dataset.name=file.name;box.dataset.sheet=sheet.name;
 }
 // The Excel view hides the products and fills the screen under the search bar.
 function full(on){document.body.classList.toggle('excel-sheet-mode',on)}
 function fit(){
  const bar=document.querySelector('.mobile-search');window.scrollTo(0,bar&&getComputedStyle(bar).position!=='sticky'?bar.getBoundingClientRect().top+window.scrollY-8:0);
  const nav=document.querySelector('.mobile-bottom-nav'),below=nav&&getComputedStyle(nav).display!=='none'?nav.offsetHeight:0;
  host.style.height=Math.max(320,window.innerHeight-host.getBoundingClientRect().top-below)+'px';
 }
 addEventListener('resize',()=>{if(mode==='sheet'&&!box.hidden)fit()});
 function go(step){if(mode!=='sheet'||box.hidden)return;const v=window.GearHubExcelViewer;if(v)countSheet(v.step(step))}
 // The view choice, in the Excel files panel beside the search bar.
 const help=document.querySelector('.excel-library-help');
 if(help){const pick=document.createElement('div');pick.className='excel-search-setting';
  const paint=()=>{pick.innerHTML='<span>ရှာရင် Excel ပြပုံ / Search shows</span><div class="excel-results-modes" role="group" aria-label="Search view"><button type="button" data-excel-mode="rows" aria-pressed="'+(mode==='rows')+'">ရှာတာပဲ</button><button type="button" data-excel-mode="sheet" aria-pressed="'+(mode==='sheet')+'">Excel လို</button></div>'};
  paint();help.after(pick);
  pick.addEventListener('click',e=>{const m=e.target.closest('[data-excel-mode]');if(!m)return;mode=m.dataset.excelMode;try{localStorage.setItem(MODE_KEY,mode)}catch{}paint();if(input.value.trim())show()});
 }
 // "ရှာတာပဲ": a tapped row opens the Excel view at that row.
 rowsArea.addEventListener('click',e=>{const b=e.target.closest('tbody [data-excel-row]');if(b)window.GearHubExcelViewer?.open(box.dataset.url,box.dataset.name,box.dataset.sheet,input.value.trim(),+b.dataset.excelRow)});
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(show,300)});
 // The keyboard's Search key: next match in the Excel view, then the keyboard closes so the sheet shows.
 input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(mode==='sheet'&&!box.hidden)go(1);input.blur()});
 // Speed (1.1.224): the shop's workbook is read in the background once the page is idle, so the first
 // search answers at once. Skipped when the phone asks to save data.
 if(!navigator.connection?.saveData)(window.requestIdleCallback||(f=>setTimeout(f,2500)))(()=>workbook(),{timeout:6000});
 if(input.value.trim())show();
})();
