// Storefront Excel viewer: opens an uploaded workbook inside the app the way Excel shows it
// (sheet tabs, column letters, row numbers, fills, fonts, borders, merged cells, dates and
// number formats). Shop owners (and the GearHub owner) can then link columns and import.
(()=>{
 const box=document.getElementById('excel-library-list'),card=document.querySelector('.excel-library-card');
 if(!box||!card)return;
 const section=document.createElement('section');section.className='excel-preview';section.hidden=true;
 section.innerHTML='<button class="excel-fs-back" id="excel-fs-back" type="button" aria-label="Back">←</button><div class="drawer-head"><h3 id="excel-sheet-title">Spreadsheet</h3><button class="icon-btn" id="excel-sheet-back" type="button" aria-label="Back to files">←</button></div><p id="excel-sheet-status" class="excel-library-status"></p><label class="excel-sheet-search"><span class="sr-only">Search this Excel file</span><input id="excel-sheet-search" type="search" placeholder="Search this Excel file" autocomplete="off"></label><div id="excel-grid" class="excel-grid excel-sheet"></div><div id="excel-tabs" class="excel-tabs" role="tablist"></div><div id="excel-map-panel" class="excel-map-panel" hidden><strong>Connect data to Product Inventory</strong><p class="excel-library-help">Choose each column yourself. Same SKU updates an existing product.</p><div id="excel-map-fields" class="excel-map-fields"></div><button class="primary" id="excel-import" type="button">Import products</button><p id="excel-import-status" class="excel-library-status"></p></div>';
 card.append(section);
 const grid=section.querySelector('#excel-grid'),tabs=section.querySelector('#excel-tabs'),map=section.querySelector('#excel-map-fields'),panel=section.querySelector('#excel-map-panel'),msg=section.querySelector('#excel-sheet-status'),out=section.querySelector('#excel-import-status'),title=section.querySelector('#excel-sheet-title'),search=section.querySelector('#excel-sheet-search');
 const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
 const MAX_ROWS=1500,MAX_COLS=60;
 let book=null,data=null,owner=null,active=0,searchText='',searchTimer=0;
 const modal=document.getElementById('excel-library-modal');
 // Full screen like Google Sheets: only the sheet, its tabs and one back arrow.
 function fullScreen(on){modal?.classList.toggle('excel-fullscreen',on);document.documentElement.classList.toggle('excel-fullscreen-open',on)}

 async function access(){try{const x=await (await fetch('/api/platform/me')).json();if(x.shop?.slug===slug)return{id:x.shop.id,csrf:x.csrfToken};if(x.isOwner){const o=await (await fetch('/api/platform/owner')).json();const s=(o.shops||[]).find(i=>i.slug===slug&&!i.legacy);if(s)return{id:s.id,csrf:x.csrfToken}}return null}catch{return null}}

 // ---- ZIP (xlsx/xlsm are ZIP files) ----
 function unzip(buffer){
  const b=new Uint8Array(buffer),v=new DataView(buffer),files=new Map();let end=-1;
  for(let i=b.length-22;i>=0&&i>b.length-66000;i--)if(v.getUint32(i,true)===0x06054b50){end=i;break}
  if(end<0)throw Error('Cannot read this workbook.');
  let p=v.getUint32(end+16,true);const count=v.getUint16(end+10,true);
  for(let n=0;n<count;n++){
   if(v.getUint32(p,true)!==0x02014b50)break;
   const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),nameLen=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
   const name=new TextDecoder().decode(b.slice(p+46,p+46+nameLen));p+=46+nameLen+extra+comment;
   files.set(name,{method,size,offset});
  }
  return async name=>{
   const f=files.get(name.replace(/^\//,''));if(!f)return null;
   const start=f.offset+30+v.getUint16(f.offset+26,true)+v.getUint16(f.offset+28,true),raw=b.slice(start,start+f.size);
   if(f.method===0)return new TextDecoder().decode(raw);
   if(f.method===8){if(!window.DecompressionStream)throw Error('This browser cannot open this workbook.');return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()}
   throw Error('Unsupported workbook compression.');
  };
 }
 const xml=t=>new DOMParser().parseFromString(t||'<x/>','text/xml');
 const all=(node,tag)=>node?[...node.getElementsByTagNameNS('*',tag)]:[];
 const one=(node,tag)=>all(node,tag)[0]||null;
 const kids=(node,tag)=>node?[...node.children].filter(c=>c.localName===tag):[];

 // ---- Colours ----
 const INDEXED=['000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','800000','008000','000080','808000','800080','008080','C0C0C0','808080','9999FF','993366','FFFFCC','CCFFFF','660066','FF8080','0066CC','CCCCFF','000080','FF00FF','FFFF00','00FFFF','800080','800000','008080','0000FF','00CCFF','CCFFFF','CCFFCC','FFFF99','99CCFF','FF99CC','CC99FF','FFCC99','3366FF','33CCCC','99CC00','FFCC00','FF9900','FF6600','666699','969696','003366','339966','003300','333300','993300','993366','333399','333333'];
 function tint(hex,t){if(!t)return hex;return hex.match(/../g).map(h=>{let c=parseInt(h,16);c=t<0?c*(1+t):c+(255-c)*t;return Math.round(Math.max(0,Math.min(255,c))).toString(16).padStart(2,'0')}).join('')}
 function color(el,theme){
  if(!el)return '';let hex='';
  if(el.getAttribute('rgb'))hex=el.getAttribute('rgb').slice(-6);
  else if(el.getAttribute('theme')!=null)hex=theme[+el.getAttribute('theme')]||'';
  else if(el.getAttribute('indexed')!=null){const i=+el.getAttribute('indexed');if(i===64||i===65)return '';hex=INDEXED[i]||''}
  if(!hex)return '';return '#'+tint(hex,+(el.getAttribute('tint')||0));
 }

 // ---- Number formats ----
 const BUILTIN={0:'General',1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%',14:'d/m/yyyy',15:'d-mmm-yy',16:'d-mmm',17:'mmm-yy',18:'h:mm AM/PM',19:'h:mm:ss AM/PM',20:'h:mm',21:'h:mm:ss',22:'d/m/yyyy h:mm',37:'#,##0 ;(#,##0)',38:'#,##0 ;[Red](#,##0)',39:'#,##0.00;(#,##0.00)',40:'#,##0.00;[Red](#,##0.00)',49:'@'};
 const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const isDate=code=>{const c=code.replace(/"[^"]*"|\[[^\]]*\]|\\./g,'');return /[dmy]/i.test(c)&&!/[#0]/.test(c)};
 function formatDate(serial,code){
  const d=new Date(Date.UTC(1899,11,30)+Math.round(serial*86400000));
  const c=code.split(';')[0].replace(/\[[^\]]*\]/g,'').replace(/"([^"]*)"/g,'$1').replace(/\\(.)/g,'$1');
  const D=d.getUTCDate(),M=d.getUTCMonth(),Y=d.getUTCFullYear(),h=d.getUTCHours(),mi=d.getUTCMinutes();
  return c.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss/gi,(t,i,s)=>{const l=t.toLowerCase();
   if(l==='yyyy')return Y;if(l==='yy')return String(Y).slice(-2);if(l==='mmmm')return MONTHS[M];if(l==='mmm')return MONTHS[M].slice(0,3);
   if(l==='mm'||l==='m'){const minute=/h/i.test(s.slice(0,i))||/^:?s/i.test(s.slice(i+t.length).replace(/^\W*/,''));const val=minute?mi:M+1;return l==='mm'?String(val).padStart(2,'0'):val}
   if(l==='dddd')return d.toLocaleDateString('en',{weekday:'long',timeZone:'UTC'});if(l==='ddd')return d.toLocaleDateString('en',{weekday:'short',timeZone:'UTC'});
   if(l==='dd')return String(D).padStart(2,'0');if(l==='d')return D;if(l==='hh')return String(h).padStart(2,'0');if(l==='h')return h;if(l==='ss')return String(d.getUTCSeconds()).padStart(2,'0');return t});
 }
 function formatNumber(n,code){
  if(!code||code==='General'||code==='@'){if(!Number.isFinite(n))return String(n);return String(Math.abs(n)>=1e15?n:parseFloat(n.toPrecision(11)))}
  const sections=code.split(';');let part=sections[0];if(n<0&&sections[1]){part=sections[1];n=Math.abs(n)}else if(n===0&&sections[2])part=sections[2];
  if(isDate(part))return formatDate(n,part);
  const clean=part.replace(/\[[^\]]*\]/g,'').replace(/_./g,' ').replace(/\*./g,'');
  const percent=clean.includes('%');if(percent)n*=100;
  const body=(clean.match(/[#0,.]+/)||[''])[0],decimals=(body.split('.')[1]||'').replace(/[^0#]/g,'').length,group=body.includes(',');
  const num=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:(body.split('.')[1]||'').replace(/[^0]/g,'').length,maximumFractionDigits:decimals,useGrouping:group});
  const idx=clean.indexOf(body),pre=clean.slice(0,idx).replace(/"/g,'').replace(/\\/g,''),post=clean.slice(idx+body.length).replace(/"/g,'').replace(/\\/g,'');
  return (n<0&&!sections[1]?'-':'')+pre+(body?num:'')+post;
 }

 // ---- Workbook ----
 async function readBook(buffer){
  const read=unzip(buffer),wb=xml(await read('xl/workbook.xml')),rels=xml(await read('xl/_rels/workbook.xml.rels'));
  const target={};all(rels,'Relationship').forEach(r=>{let t=r.getAttribute('Target')||'';t=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');target[r.getAttribute('Id')]=t});
  const themeHex=[];const scheme=one(xml(await read('xl/theme/theme1.xml').catch(()=>null)),'clrScheme');
  if(scheme){const named={};[...scheme.children].forEach(c=>{const s=one(c,'srgbClr'),y=one(c,'sysClr');named[c.localName]=s?s.getAttribute('val'):y?y.getAttribute('lastClr'):''});['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'].forEach(k=>themeHex.push(named[k]||''))}
  const shared=all(xml(await read('xl/sharedStrings.xml').catch(()=>null)),'si').map(si=>all(si,'t').filter(t=>t.parentNode.localName!=='rPh').map(t=>t.textContent).join(''));
  const st=xml(await read('xl/styles.xml').catch(()=>null)),fmts={...BUILTIN};
  all(st,'numFmt').forEach(f=>fmts[f.getAttribute('numFmtId')]=f.getAttribute('formatCode'));
  const fonts=kids(one(st,'fonts'),'font').map(f=>({b:!!one(f,'b')&&one(f,'b').getAttribute('val')!=='0',i:!!one(f,'i')&&one(f,'i').getAttribute('val')!=='0',u:!!one(f,'u'),sz:+(one(f,'sz')?.getAttribute('val')||11),color:color(one(f,'color'),themeHex),name:one(f,'name')?.getAttribute('val')||''}));
  const fills=kids(one(st,'fills'),'fill').map(f=>{const p=one(f,'patternFill');return p&&p.getAttribute('patternType')&&p.getAttribute('patternType')!=='none'?color(one(p,'fgColor'),themeHex)||color(one(p,'bgColor'),themeHex):''});
  const WIDTH={thin:1,hair:1,dotted:1,dashed:1,medium:2,mediumDashed:2,thick:3,double:3};
  const borders=kids(one(st,'borders'),'border').map(b=>Object.fromEntries(['left','right','top','bottom'].map(side=>{const e=kids(b,side)[0],style=e?.getAttribute('style');return [side,style?`${WIDTH[style]||1}px ${style==='double'?'double':/dash|dot/.test(style)?'dashed':'solid'} ${color(one(e,'color'),themeHex)||'#000'}`:'']})));
  const xfs=kids(one(st,'cellXfs'),'xf').map(x=>{const a=one(x,'alignment');return{fmt:fmts[x.getAttribute('numFmtId')||0]||'General',font:fonts[+x.getAttribute('fontId')||0]||{},fill:fills[+x.getAttribute('fillId')||0]||'',border:borders[+x.getAttribute('borderId')||0]||{},h:a?.getAttribute('horizontal')||'',v:a?.getAttribute('vertical')||'',wrap:a?.getAttribute('wrapText')==='1'}});
  const sheets=all(wb,'sheet').filter(s=>!s.getAttribute('state')||s.getAttribute('state')==='visible').map(s=>({name:s.getAttribute('name'),path:target[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id')]}));
  return{read,sheets,xfs,shared};
 }
 const colIndex=ref=>{let n=0;for(const ch of ref.replace(/[0-9]/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
 const colName=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
 async function readSheet(sheet){
  if(sheet.cells)return sheet;
  const doc=xml(await book.read(sheet.path)),cells=new Map();let maxR=0,maxC=0;
  const fmt=one(doc,'sheetFormatPr'),defW=+(fmt?.getAttribute('defaultColWidth')||((+(fmt?.getAttribute('baseColWidth')||8))+0.71)),defH=+(fmt?.getAttribute('defaultRowHeight')||15);
  const widths={};all(doc,'col').forEach(c=>{for(let i=+c.getAttribute('min');i<=+c.getAttribute('max')&&i<=MAX_COLS;i++)widths[i-1]=c.getAttribute('hidden')==='1'?0:+c.getAttribute('width')});
  const heights={};
  for(const row of all(doc,'row')){
   const r=+row.getAttribute('r')-1;if(r>=MAX_ROWS){sheet.truncated=true;break}
   if(row.getAttribute('ht'))heights[r]=row.getAttribute('hidden')==='1'?0:+row.getAttribute('ht');
   for(const c of kids(row,'c')){
    const ci=colIndex(c.getAttribute('r')||'A1');if(ci>=MAX_COLS)continue;
    const type=c.getAttribute('t'),raw=one(c,'v')?.textContent??'',style=book.xfs[+(c.getAttribute('s')||0)]||{fmt:'General',font:{},border:{}};
    let text='';
    if(type==='s')text=book.shared[+raw]??'';else if(type==='inlineStr')text=all(c,'t').map(t=>t.textContent).join('');else if(type==='str'||type==='e')text=raw;else if(type==='b')text=raw==='1'?'TRUE':'FALSE';else if(raw!=='')text=formatNumber(+raw,style.fmt);
    const numeric=!type||type==='n';
    if(text===''&&!style.fill&&!Object.values(style.border||{}).some(Boolean))continue;
    cells.set(r+','+ci,{text,style,numeric:numeric&&raw!==''});
    if(text!==''||style.fill){maxR=Math.max(maxR,r);maxC=Math.max(maxC,ci)}
   }
  }
  const merges=new Map(),covered=new Set();
  all(doc,'mergeCell').forEach(m=>{const [a,b]=(m.getAttribute('ref')||'').split(':');if(!b)return;const r1=+a.replace(/\D/g,'')-1,c1=colIndex(a),r2=Math.min(+b.replace(/\D/g,'')-1,MAX_ROWS-1),c2=Math.min(colIndex(b),MAX_COLS-1);merges.set(r1+','+c1,{rs:r2-r1+1,cs:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(r+','+c)});
  const tab=one(one(doc,'sheetPr'),'tabColor');
  Object.assign(sheet,{cells,merges,covered,widths,heights,defW,defH,maxR,maxC,tab:tab?color(tab,[]):''});
  return sheet;
 }
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function cellStyle(cell){
  const s=cell.style,f=s.font||{},b=s.border||{},css=[];
  if(s.fill)css.push('background:'+s.fill);if(f.color)css.push('color:'+f.color);if(f.b)css.push('font-weight:700');if(f.i)css.push('font-style:italic');if(f.u)css.push('text-decoration:underline');
  if(f.sz)css.push('font-size:'+f.sz+'pt');if(f.name)css.push('font-family:"'+f.name.replace(/"/g,'')+'",system-ui,sans-serif');
  const h=s.h&&s.h!=='general'?(s.h==='centerContinuous'?'center':s.h):cell.numeric?'right':'left';css.push('text-align:'+h);
  css.push('vertical-align:'+(s.v==='center'?'middle':s.v==='top'?'top':'bottom'));if(s.wrap)css.push('white-space:pre-wrap');
  // Like Excel/Sheets: a filled cell hides the light gridlines unless it has its own border.
  for(const side of ['left','right','top','bottom'])if(b[side])css.push('border-'+side+':'+b[side]);else if(s.fill)css.push('border-'+side+'-color:'+s.fill);
  return css.join(';');
 }
 function renderSheet(sheet){
  const cols=sheet.maxC+1,rows=sheet.maxR+1,px=w=>Math.round((w??sheet.defW)*7+5),query=searchText.trim().toLocaleLowerCase();
  const matching=r=>!query||Array.from({length:cols},(_,c)=>sheet.cells.get(r+','+c)?.text||'').some(value=>String(value).toLocaleLowerCase().includes(query));
  const visibleRows=Array.from({length:rows},(_,r)=>r).filter(r=>sheet.heights[r]!==0&&matching(r));
  // Exact table width = row-number column + every column, so the browser never stretches column A.
  const widths=Array.from({length:cols},(_,c)=>px(sheet.widths[c])),total=46+widths.reduce((a,b)=>a+b,0);
  let html='<table style="width:'+total+'px"><colgroup><col class="excel-rownum-col" style="width:46px">'+widths.map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr><th class="excel-corner"></th>'+Array.from({length:cols},(_,c)=>'<th data-c="'+c+'">'+colName(c)+'</th>').join('')+'</tr></thead><tbody>';
  for(const r of visibleRows){
   const ht=sheet.heights[r];
   html+='<tr style="height:'+Math.round((ht??sheet.defH)*4/3)+'px"><th data-r="'+r+'">'+(r+1)+'</th>';
   for(let c=0;c<cols;c++){const key=r+','+c;if(sheet.covered.has(key))continue;const m=sheet.merges.get(key),cell=sheet.cells.get(key);
    html+='<td data-r="'+r+'" data-c="'+c+'"'+(m?(m.rs>1?' data-r2="'+(r+m.rs-1)+'"':'')+(m.cs>1?' data-c2="'+(c+m.cs-1)+'"':''):'')+(m?(m.rs>1?' rowspan="'+m.rs+'"':'')+(m.cs>1?' colspan="'+m.cs+'"':''):'')+(cell?' style="'+esc(cellStyle(cell))+'"':'')+'>'+(cell?esc(cell.text):'')+'</td>'}
   html+='</tr>';
  }
  grid.innerHTML=html+'</tbody></table>';grid.scrollTop=0;grid.scrollLeft=0;
  msg.textContent=(query?visibleRows.length+' of ':'')+rows+' rows'+(sheet.truncated?' (first '+MAX_ROWS+' shown)':'');
 }
 // Header row for linking = first row with at least two values (row 1 is often a title).
 function tableData(sheet){
  const rowValues=r=>Array.from({length:sheet.maxC+1},(_,c)=>sheet.cells.get(r+','+c)?.text??'');
  let head=0;for(let r=0;r<=sheet.maxR;r++){if(rowValues(r).filter(v=>String(v).trim()).length>=2){head=r;break}}
  const rows=[];for(let r=head+1;r<=sheet.maxR;r++){const v=rowValues(r);if(v.some(x=>String(x).trim()))rows.push(v)}
  return{head:rowValues(head).map((v,i)=>String(v).trim()||'Column '+colName(i)),rows};
 }
 function renderTabs(){
  tabs.innerHTML=book.sheets.map((s,i)=>'<button type="button" role="tab" class="excel-tab'+(i===active?' active':'')+'" data-sheet="'+i+'" aria-selected="'+(i===active)+'"'+(s.tab?' style="--tab-color:'+esc(s.tab)+'"':'')+'>'+esc(s.name)+'</button>').join('');
 }
 async function showSheet(i){
  active=i;searchText='';search.value='';renderTabs();msg.textContent='Loading…';
  try{const sheet=await readSheet(book.sheets[i]);renderSheet(sheet);data=tableData(sheet);renderMap()}catch(x){msg.textContent=x.message}
 }
 function renderMap(){
  if(!owner||!data){panel.hidden=true;return}panel.hidden=false;
  const fields=[['sku','SKU'],['name','Product name'],['category','Category'],['price','Price'],['stock','Stock'],['description','Description']];
  map.innerHTML=fields.map(([k,l])=>'<label>'+l+'<select data-k="'+k+'"><option value="">Not linked</option>'+data.head.map((h,i)=>'<option value="'+i+'" '+(h.toLowerCase().includes(k)||h.toLowerCase().includes(l.toLowerCase())?'selected':'')+'>'+esc(h)+'</option>').join('')+'</select></label>').join('');
 }
 function csvBook(text){
  const rows=text.replace(/^﻿/,'').split(/\r?\n/).filter(Boolean).map(r=>r.split(','));const cells=new Map();let maxC=0;
  rows.forEach((row,r)=>row.forEach((v,c)=>{maxC=Math.max(maxC,c);cells.set(r+','+c,{text:v,style:{font:{},border:{}},numeric:v!==''&&!isNaN(+v.replace(/,/g,''))})}));
  return{sheets:[{name:'Sheet1',cells,merges:new Map(),covered:new Set(),widths:{},heights:{},defW:12,defH:15,maxR:rows.length-1,maxC,tab:''}]};
 }
 function setForm(hide){const form=document.getElementById('excel-upload-form');if(!form)return;if(hide){if(!form.dataset.wasHidden)form.dataset.wasHidden=String(form.hidden);form.hidden=true}else if(form.dataset.wasHidden){form.hidden=form.dataset.wasHidden==='true';delete form.dataset.wasHidden}}
 box.addEventListener('click',async e=>{
  const b=e.target.closest('[data-excel-preview]');if(!b)return;
  section.hidden=false;box.hidden=true;setForm(true);card.classList.add('excel-sheet-open');fullScreen(true);title.textContent=b.dataset.excelName||'Spreadsheet';grid.innerHTML='';tabs.innerHTML='';panel.hidden=true;msg.textContent='Loading…';out.textContent='';
  try{
   const blob=await (await fetch(b.dataset.excelPreview)).blob(),name=b.dataset.excelName||'';
   if(/\.csv$/i.test(name))book=csvBook(await blob.text());else if(/\.xls[xm]$/i.test(name))book=await readBook(await blob.arrayBuffer());else throw Error('Preview supports .xlsx, .xlsm and .csv. Old .xls files can only be downloaded.');
   if(!book.sheets.length)throw Error('This workbook has no visible sheets.');
   owner=await access();await showSheet(0);
  }catch(x){msg.textContent=x.message}
 });
 tabs.addEventListener('click',e=>{const t=e.target.closest('[data-sheet]');if(t)showSheet(+t.dataset.sheet)});
 search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchText=search.value;const sheet=book?.sheets[active];if(sheet?.cells)renderSheet(sheet)},80)});
 const leave=()=>{section.hidden=true;box.hidden=false;setForm(false);card.classList.remove('excel-sheet-open');fullScreen(false)};
 section.querySelector('#excel-sheet-back').onclick=leave;section.querySelector('#excel-fs-back').onclick=leave;
 // Closing the whole Excel panel (Escape, outside tap) also leaves full screen.
 if(modal)new MutationObserver(()=>{if(modal.hidden&&modal.classList.contains('excel-fullscreen'))leave()}).observe(modal,{attributes:true,attributeFilter:['hidden']});
 section.querySelector('#excel-import').onclick=async()=>{
  const m=Object.fromEntries([...map.querySelectorAll('select')].map(s=>[s.dataset.k,s.value]));
  if(m.sku===''||m.name===''){out.textContent='Select SKU and Product name.';return}
  const rows=data.rows.map(r=>Object.fromEntries(Object.entries(m).filter(([,i])=>i!=='').map(([k,i])=>[k,r[+i]])));
  out.textContent='Importing…';
  try{const r=await fetch('/api/platform/shops/'+owner.id+'/spreadsheets/import',{method:'POST',headers:{'content-type':'application/json','X-CSRF-Token':owner.csrf},body:JSON.stringify({rows})}),x=await r.json();if(!r.ok)throw Error(x.error);out.textContent=x.created+' added, '+x.updated+' updated.'}catch(x){out.textContent=x.message}
 };
})();
