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
 async function show(){
  const q=input.value.trim(),mine=++turn;
  if(q.length<2){box.hidden=true;box.innerHTML='';return}
  const found=await workbook();if(mine!==turn)return;
  if(!found){box.hidden=true;return}
  const {file,sheet}=found,cols=[];for(let c=0;c<=sheet.maxC;c++)if(visible(sheet,c))cols.push(c);
  // Column names: the first row with two or more filled cells (like the import mapping).
  let head=0;for(let r=0;r<=sheet.maxR;r++){if(cols.filter(c=>text(sheet,r,c)).length>=2){head=r;break}}
  const needle=q.toLocaleLowerCase(),rows=[];
  for(let r=head+1;r<=sheet.maxR&&rows.length<=LIMIT;r++){if(sheet.heights?.[r]===0)continue;if(cols.some(c=>text(sheet,r,c).toLocaleLowerCase().includes(needle)))rows.push(r)}
  const more=rows.length>LIMIT;if(more)rows.length=LIMIT;
  box.hidden=false;
  box.innerHTML='<div class="excel-results-head"><h3>Excel · '+esc(sheet.name)+'</h3><span>'+(rows.length?rows.length+(more?'+':'')+' rows':'No match')+'</span></div>'
   +rows.map(r=>'<button type="button" class="excel-result" data-excel-row="'+r+'"><span class="excel-result-row">'+(r+1)+'</span><span class="excel-result-cells">'
    +cols.filter(c=>text(sheet,r,c)).map(c=>'<span><small>'+esc(text(sheet,head,c)||'')+'</small>'+esc(text(sheet,r,c))+'</span>').join('')+'</span></button>').join('')
   +'<button type="button" class="excel-results-open" data-excel-open>📗 Excel မှာ ဖွင့်ကြည့်မယ် / Open in Excel</button>';
  box.dataset.url=file.url;box.dataset.name=file.name;box.dataset.sheet=sheet.name;
 }
 box.addEventListener('click',e=>{const b=e.target.closest('[data-excel-row],[data-excel-open]');if(!b)return;window.GearHubExcelViewer?.open(box.dataset.url,box.dataset.name,box.dataset.sheet,input.value.trim(),b.dataset.excelRow===undefined?undefined:+b.dataset.excelRow)});
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(show,250)});
 if(input.value.trim())show();
})();
