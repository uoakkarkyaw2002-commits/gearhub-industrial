/* 1.1.215 owner: a search in a seller shop also shows the matching rows of the shop's Excel file under
   the products, from the "BC" sheet (the first sheet when there is no BC). Tapping a row, or "Open in
   Excel", opens the Excel viewer on that sheet with the same search. The workbook is read once per page
   (the offline copy from excel-library.js when there is no line). */
(()=>{
 const input=document.getElementById('search'),products=document.getElementById('products'),slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
 if(!input||!products||!slug)return;
 const SHEET='BC',LIMIT=30;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const box=document.createElement('section');box.className='excel-results';box.hidden=true;box.setAttribute('aria-live','polite');
 products.after(box);
 let loading=null,timer=0,turn=0;
 // The first Excel file that has a BC sheet (else the first file and its first sheet).
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
 // 1.1.217 owner: two views beside "Excel · BC" — only the matching rows, or the whole sheet like Excel
 // with the search: it jumps to the match (rows around it stay visible) and ˄ ˅ go to the other matches.
 const MODE_KEY='gh-excel-search-mode';let mode=(()=>{try{return localStorage.getItem(MODE_KEY)==='sheet'?'sheet':'rows'}catch{return 'rows'}})();
 let hits=[],at=0,win=null;
 async function show(){
  const q=input.value.trim(),mine=++turn;
  if(q.length<2){box.hidden=true;box.innerHTML='';full(false);return}
  const found=await workbook();if(mine!==turn)return;
  if(!found){box.hidden=true;full(false);return}
  const {file,sheet}=found,cols=[];for(let c=0;c<=sheet.maxC;c++)if(visible(sheet,c))cols.push(c);
  // Column names: the first row with two or more filled cells (like the import mapping).
  let head=0;for(let r=0;r<=sheet.maxR;r++){if(cols.filter(c=>text(sheet,r,c)).length>=2){head=r;break}}
  const needle=q.toLocaleLowerCase(),has=(r,c)=>text(sheet,r,c).toLocaleLowerCase().includes(needle),shown=[];hits=[];at=0;
  for(let r=head+1;r<=sheet.maxR;r++){if(sheet.heights?.[r]===0)continue;const hit=cols.some(c=>has(r,c));if(hit)hits.push(r);if(mode==='sheet'||hit&&shown.length<LIMIT)shown.push(r)}
  box.hidden=false;full(mode==='sheet');
  // Drawn like the Excel viewer: column letters, row numbers, the header row, the sheet's widths,
  // heights, fills and fonts; the grid scrolls both ways and the letters/header stay on top.
  const width=c=>Math.round(((sheet.widths?.[c]??sheet.defW??8.43)*7)+5),height=r=>Math.max(30,Math.round((sheet.heights?.[r]||sheet.defH||15)*4/3)),letter=i=>{let t='';i++;while(i>0){const m=(i-1)%26;t=String.fromCharCode(65+m)+t;i=Math.floor((i-1)/26)}return t};
  const css=cell=>{const st=cell?.style||{},f=st.font||{},out=[];if(st.fill)out.push('background-color:'+st.fill);if(f.color)out.push('color:'+f.color);if(f.b)out.push('font-weight:700');if(f.i)out.push('font-style:italic');if(f.sz)out.push('font-size:'+f.sz+'pt');if(f.name)out.push('font-family:"'+String(f.name).replace(/["<>]/g,'')+'",system-ui,sans-serif');
   const h=st.h&&st.h!=='general'?(st.h==='centerContinuous'?'center':st.h):cell?.numeric?'right':'left';out.push('text-align:'+h);if(st.wrap)out.push('white-space:pre-wrap');return out.join(';')};
  const td=(r,c)=>{const cell=sheet.cells.get(r+','+c);return '<td'+(r!==head&&has(r,c)?' class="excel-match"':'')+' style="'+esc(css(cell))+'">'+esc(text(sheet,r,c))+'</td>'};
  const line=(r,cls)=>'<tr'+(cls?' class="'+cls+'"':'')+' data-excel-row="'+r+'" style="height:'+height(r)+'px"><th>'+(r+1)+'</th>'+cols.map(c=>td(r,c)).join('')+'</tr>';
  const count=mode==='sheet'?(hits.length?'1 / '+hits.length:'No match'):(hits.length?Math.min(hits.length,LIMIT)+(hits.length>LIMIT?'+':'')+' rows':'No match');
  // 1.1.219 owner: the view choice lives in the Excel files panel (folder button); the page keeps only
  // the sheet, edge to edge, with the match count and ˄ ˅ on it in the Excel view.
  box.innerHTML=(mode==='sheet'?'<div class="excel-results-bar"><span class="excel-results-count">'+count+'</span>'+(hits.length>1?'<button type="button" data-excel-step="-1" aria-label="Previous match">˄</button><button type="button" data-excel-step="1" aria-label="Next match">˅</button>':'')+'</div>':'')
   +(mode==='rows'&&!hits.length?'<p class="excel-results-none">Excel · '+esc(sheet.name)+' — No match</p>':'')
   +(shown.length&&(mode==='sheet'||hits.length)?'<div class="excel-results-grid'+(mode==='sheet'?' excel-results-sheet':'')+'"><table><colgroup><col style="width:46px">'+cols.map(c=>'<col style="width:'+width(c)+'px">').join('')+'</colgroup>'
   +'<thead><tr class="excel-results-letters"><th></th>'+cols.map(c=>'<th>'+letter(c)+'</th>').join('')+'</tr>'+line(head,'excel-results-header')+'</thead>'
   +'<tbody>'+(mode==='sheet'?'':shown.map(r=>line(r)).join(''))+'</tbody></table></div>':'')
   +'<button type="button" class="excel-results-open" data-excel-open>📗 Excel မှာ ဖွင့်ကြည့်မယ် / Open in Excel</button>';
  box.dataset.url=file.url;box.dataset.name=file.name;box.dataset.sheet=sheet.name;
  // 1.1.220 owner (iPhone was slow): the sheet view draws only ~100 rows around the match and adds
  // more while scrolling up or down, instead of every row of the sheet at once.
  win=mode==='sheet'?{rows:shown,lo:0,hi:0,line,hit:new Set(hits)}:null;
  if(mode==='sheet'){fit();go(0);box.querySelector('.excel-results-grid')?.addEventListener('scroll',grow,{passive:true})}
 }
 // 1.1.218 owner: the Excel view hides the products and the sheet fills the screen under the search
 // bar, like the Excel viewer.
 function full(on){document.body.classList.toggle('excel-sheet-mode',on)}
 function fit(){
  const grid=box.querySelector('.excel-results-grid');if(!grid)return;
  const bar=document.querySelector('.mobile-search');window.scrollTo(0,bar?bar.getBoundingClientRect().top+window.scrollY-8:box.offsetTop);
  const nav=document.querySelector('.mobile-bottom-nav'),below=nav&&getComputedStyle(nav).display!=='none'?nav.offsetHeight:0,button=box.querySelector('.excel-results-open')?.offsetHeight||0;
  grid.style.maxHeight='none';grid.style.height=Math.max(320,window.innerHeight-grid.getBoundingClientRect().top-below-button-24)+'px';
 }
 const rowsHtml=(a,b)=>win.rows.slice(a,b).map(r=>win.line(r,win.hit.has(r)?'excel-hit':'')).join('');
 function draw(i){const body=box.querySelector('.excel-results-grid tbody');if(!body)return;win.lo=Math.max(0,i-40);win.hi=Math.min(win.rows.length,i+60);body.innerHTML=rowsHtml(win.lo,win.hi)}
 function grow(){
  const grid=box.querySelector('.excel-results-grid'),body=grid?.querySelector('tbody');if(!win||!body)return;
  if(grid.scrollTop<300&&win.lo>0){const lo=Math.max(0,win.lo-60),before=grid.scrollHeight;body.insertAdjacentHTML('afterbegin',rowsHtml(lo,win.lo));win.lo=lo;grid.scrollTop+=grid.scrollHeight-before}
  if(grid.scrollTop+grid.clientHeight>grid.scrollHeight-300&&win.hi<win.rows.length){const hi=Math.min(win.rows.length,win.hi+60);body.insertAdjacentHTML('beforeend',rowsHtml(win.hi,hi));win.hi=hi}
 }
 // Sheet view: mark the current match and bring its row a third of the way down, under the header.
 function go(step){
  const grid=box.querySelector('.excel-results-grid');if(!grid||!win)return;
  if(!hits.length){if(!win.hi)draw(0);return}
  at=(at+step+hits.length)%hits.length;
  const i=win.rows.indexOf(hits[at]);if(i<win.lo||i>=win.hi)draw(i);
  grid.querySelector('tr.excel-current')?.classList.remove('excel-current');
  const row=grid.querySelector('tbody tr[data-excel-row="'+hits[at]+'"]');if(!row)return;row.classList.add('excel-current');
  const top=grid.querySelector('thead').offsetHeight;grid.scrollTop=Math.max(0,row.offsetTop-top-(grid.clientHeight-top)/3);
  const cell=row.querySelector('.excel-match');if(cell){const x=cell.offsetLeft-46;if(x<grid.scrollLeft||cell.offsetLeft+cell.offsetWidth>grid.scrollLeft+grid.clientWidth)grid.scrollLeft=Math.max(0,x-8)}
  const count=box.querySelector('.excel-results-count');if(count)count.textContent=(at+1)+' / '+hits.length;
 }
 // The view choice, in the Excel files panel beside the search bar.
 const help=document.querySelector('.excel-library-help');
 if(help){const pick=document.createElement('div');pick.className='excel-search-setting';
  const paint=()=>{pick.innerHTML='<span>ရှာရင် Excel ပြပုံ / Search shows</span><div class="excel-results-modes" role="group" aria-label="Search view"><button type="button" data-excel-mode="rows" aria-pressed="'+(mode==='rows')+'">ရှာတာပဲ</button><button type="button" data-excel-mode="sheet" aria-pressed="'+(mode==='sheet')+'">Excel လို</button></div>'};
  paint();help.after(pick);
  pick.addEventListener('click',e=>{const m=e.target.closest('[data-excel-mode]');if(!m)return;mode=m.dataset.excelMode;try{localStorage.setItem(MODE_KEY,mode)}catch{}paint();if(input.value.trim())show()});
 }
 box.addEventListener('click',e=>{
  const st=e.target.closest('[data-excel-step]');if(st){go(+st.dataset.excelStep);return}
  // In the sheet view a tap only scrolls; the full viewer opens from the button.
  const b=e.target.closest(mode==='sheet'?'[data-excel-open]':'tbody [data-excel-row],[data-excel-open]');if(!b)return;window.GearHubExcelViewer?.open(box.dataset.url,box.dataset.name,box.dataset.sheet,input.value.trim(),b.dataset.excelRow===undefined?(mode==='sheet'?hits[at]:undefined):+b.dataset.excelRow)
 });
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(show,mode==='sheet'?450:250)});
 if(input.value.trim())show();
})();
