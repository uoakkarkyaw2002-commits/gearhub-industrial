// Storefront Excel viewer: opens an uploaded workbook inside the app the way Excel shows it
// (sheet tabs, column letters, row numbers, fills, fonts, borders, merged cells, dates and
// number formats). Shop owners (and the GearHub owner) can then link columns and import.
(()=>{
 const box=document.getElementById('excel-library-list'),card=document.querySelector('.excel-library-card');
 if(!box||!card)return;
 const section=document.createElement('section');section.className='excel-preview';section.hidden=true;
 section.innerHTML='<button class="excel-fs-back" id="excel-fs-back" type="button" aria-label="Back">←</button><div class="drawer-head"><h3 id="excel-sheet-title">Spreadsheet</h3><button class="icon-btn" id="excel-sheet-back" type="button" aria-label="Back to files">←</button></div><p id="excel-sheet-status" class="excel-library-status"></p><div class="excel-sheet-search"><label><span class="sr-only">Search this Excel file</span><input id="excel-sheet-search" type="search" placeholder="Search this Excel file" autocomplete="off" enterkeyhint="search"></label><button type="button" class="excel-find-step" id="excel-find-prev" aria-label="Previous match"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button><button type="button" class="excel-find-step" id="excel-find-next" aria-label="Next match"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><div id="excel-grid" class="excel-grid excel-sheet"></div><div id="excel-tabs" class="excel-tabs" role="tablist"></div><div id="excel-map-panel" class="excel-map-panel" hidden><strong>Connect data to Product Inventory</strong><p class="excel-library-help">Choose each column yourself. Same SKU updates an existing product.</p><div id="excel-map-fields" class="excel-map-fields"></div><button class="primary" id="excel-import" type="button">Import products</button><p id="excel-import-status" class="excel-library-status"></p></div>';
 card.append(section);
 const grid=section.querySelector('#excel-grid'),tabs=section.querySelector('#excel-tabs'),map=section.querySelector('#excel-map-fields'),panel=section.querySelector('#excel-map-panel'),msg=section.querySelector('#excel-sheet-status'),out=section.querySelector('#excel-import-status'),title=section.querySelector('#excel-sheet-title'),search=section.querySelector('#excel-sheet-search');
 const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
 // Excel's own sheet size: every row and column is shown (only rows near the screen are drawn).
 const MAX_ROWS=1048576,MAX_COLS=16384;
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
  return async (name,binary)=>{
   const f=files.get(name.replace(/^\//,''));if(!f)return null;
   const start=f.offset+30+v.getUint16(f.offset+26,true)+v.getUint16(f.offset+28,true),raw=b.slice(start,start+f.size);
   if(f.method===0)return binary?new Blob([raw]):new TextDecoder().decode(raw);
   if(f.method===8){if(!window.DecompressionStream)throw Error('This browser cannot open this workbook.');const out=new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')));return binary?out.blob():out.text()}
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
  const idx=clean.indexOf(body),pre=clean.slice(0,idx).replace(/"/g,'').replace(/\\/g,'').replace(/\?/g,' '),post=clean.slice(idx+body.length).replace(/"/g,'').replace(/\\/g,'').replace(/\?/g,' ');
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
  const xfs=kids(one(st,'cellXfs'),'xf').map(x=>{const a=one(x,'alignment');return{fmt:fmts[x.getAttribute('numFmtId')||0]||'General',font:fonts[+x.getAttribute('fontId')||0]||{},fill:fills[+x.getAttribute('fillId')||0]||'',border:borders[+x.getAttribute('borderId')||0]||{},h:a?.getAttribute('horizontal')||'',v:a?.getAttribute('vertical')||'',wrap:a?.getAttribute('wrapText')==='1',rot:+(a?.getAttribute('textRotation')||0)}});
  // Conditional-format styles (dxf): only what a rule changes (font colour/bold/italic, fill, border).
  // "Automatic" colour in a rule means black text.
  const dxfColor=el=>el?.getAttribute('auto')==='1'?'#000000':color(el,themeHex);
  const dxfs=kids(one(st,'dxfs'),'dxf').map(d=>{const f=one(d,'font'),p=one(d,'patternFill'),b=one(d,'border'),out={};
   if(f){out.font={};const c=dxfColor(one(f,'color'));if(c)out.font.color=c;if(one(f,'b'))out.font.b=one(f,'b').getAttribute('val')!=='0';if(one(f,'i'))out.font.i=one(f,'i').getAttribute('val')!=='0';if(one(f,'u'))out.font.u=true}
   if(p){const c=color(one(p,'bgColor'),themeHex)||color(one(p,'fgColor'),themeHex);if(c)out.fill=c}
   if(b){out.border={};for(const side of ['left','right','top','bottom']){const e=kids(b,side)[0],style=e?.getAttribute('style');if(style)out.border[side]=`${WIDTH[style]||1}px ${style==='double'?'double':/dash|dot/.test(style)?'dashed':'solid'} ${dxfColor(one(e,'color'))||'#000'}`}}
   return out});
  const sheets=all(wb,'sheet').filter(s=>!s.getAttribute('state')||s.getAttribute('state')==='visible').map(s=>({name:s.getAttribute('name'),path:target[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id')]}));
  return{read,sheets,xfs,shared,dxfs,themeHex};
 }
 const colIndex=ref=>{let n=0;for(const ch of ref.replace(/[0-9]/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
 const colName=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
 async function readSheet(sheet){
  if(sheet.cells)return sheet;
  const doc=xml(await book.read(sheet.path)),cells=new Map();let maxR=0,maxC=0;
  const fmt=one(doc,'sheetFormatPr'),defW=+(fmt?.getAttribute('defaultColWidth')||((+(fmt?.getAttribute('baseColWidth')||8))+0.71)),defH=+(fmt?.getAttribute('defaultRowHeight')||15);
  const widths={};all(doc,'col').forEach(c=>{for(let i=+c.getAttribute('min');i<=+c.getAttribute('max')&&i<=Math.min(MAX_COLS,+c.getAttribute('min')+1000);i++)widths[i-1]=c.getAttribute('hidden')==='1'?0:+c.getAttribute('width')});
  const heights={};
  for(const row of all(doc,'row')){
   const r=+row.getAttribute('r')-1;if(r>=MAX_ROWS){sheet.truncated=true;break}
   if(row.getAttribute('hidden')==='1')heights[r]=0;else if(row.getAttribute('ht'))heights[r]=+row.getAttribute('ht');
   for(const c of kids(row,'c')){
    const ci=colIndex(c.getAttribute('r')||'A1');if(ci>=MAX_COLS)continue;
    const type=c.getAttribute('t'),raw=one(c,'v')?.textContent??'',style=book.xfs[+(c.getAttribute('s')||0)]||{fmt:'General',font:{},border:{}};
    let text='';
    if(type==='s')text=book.shared[+raw]??'';else if(type==='inlineStr')text=all(c,'t').map(t=>t.textContent).join('');else if(type==='str'||type==='e')text=raw;else if(type==='b')text=raw==='1'?'TRUE':'FALSE';else if(raw!=='')text=formatNumber(+raw,style.fmt);
    const numeric=!type||type==='n';
    if(text===''&&!style.fill&&!Object.values(style.border||{}).some(Boolean))continue;
    cells.set(r+','+ci,{text,style,numeric:numeric&&raw!=='',value:numeric&&raw!==''?+raw:type==='b'?raw==='1':text});
    if(text!==''||style.fill){maxR=Math.max(maxR,r);maxC=Math.max(maxC,ci)}
   }
  }
  const merges=new Map(),covered=new Set();
  all(doc,'mergeCell').forEach(m=>{const [a,b]=(m.getAttribute('ref')||'').split(':');if(!b)return;const r1=+a.replace(/\D/g,'')-1,c1=colIndex(a),r2=Math.min(+b.replace(/\D/g,'')-1,MAX_ROWS-1),c2=Math.min(colIndex(b),MAX_COLS-1);merges.set(r1+','+c1,{rs:r2-r1+1,cs:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(r+','+c)});
  const tab=one(one(doc,'sheetPr'),'tabColor');
  // Frozen rows/columns, as saved in Excel (View > Freeze Panes).
  // Excel freezes the rows/columns that were at the top-left when Freeze Panes was used (the sheet
  // view's topLeftCell). The rows above and the columns to the left of that cell cannot be seen.
  const view0=one(doc,'sheetView'),pane=one(doc,'pane'),frozen={r0:0,r1:0,c0:0,c1:0};
  if(pane&&/frozen/.test(pane.getAttribute('state')||'')){
   const tl=/^([A-Z]+)(\d+)$/.exec(view0?.getAttribute('topLeftCell')||'A1')||['','A','1'],ys=+(pane.getAttribute('ySplit')||0),xs=+(pane.getAttribute('xSplit')||0);
   if(ys){frozen.r0=+tl[2]-1;frozen.r1=frozen.r0+ys}if(xs){frozen.c0=colIndex(tl[1]);frozen.c1=frozen.c0+xs}
  }
  // View > Gridlines turned off in the file (the invoice sheets): no light cell lines.
  const grid=view0?.getAttribute('showGridLines')!=='0';
  Object.assign(sheet,{cells,merges,covered,widths,heights,defW,defH,maxR,maxC,frozen,grid,tab:tab?color(tab,[]):''});
  try{applyConditionalFormats(sheet,doc)}catch{}
  try{sheet.shapes=await readDrawing(sheet.path,doc)}catch{sheet.shapes=[]}
  for(const sh of sheet.shapes)sheet.maxC=Math.min(MAX_COLS-1,Math.max(sheet.maxC,sh.to.c??sh.from.c));
  return sheet;
 }

 // ---- Shapes and pictures (Insert > Shapes / Pictures) ----
 // Boxes such as the coloured totals on the invoice are shapes, often linked to a cell (=ERCK!AS206).
 // Excel saves the linked value inside the shape, so the saved text is shown as it is.
 const relPath=(base,target)=>{if(target.startsWith('/'))return target.slice(1);const parts=base.split('/');parts.pop();for(const piece of target.split('/')){if(piece==='..')parts.pop();else if(piece!=='.')parts.push(piece)}return parts.join('/')};
 const relsOf=async path=>{const map={};const i=path.lastIndexOf('/');all(xml(await book.read(path.slice(0,i)+'/_rels/'+path.slice(i+1)+'.rels')),'Relationship').forEach(r=>{map[r.getAttribute('Id')]=relPath(path,r.getAttribute('Target')||'')});return map};
 const SCHEME={bg1:0,tx1:1,bg2:2,tx2:3,lt1:0,dk1:1,lt2:2,dk2:3,accent1:4,accent2:5,accent3:6,accent4:7,accent5:8,accent6:9,hlink:10,folHlink:11};
 function drawColor(fill){
  const c=fill&&[...fill.children].find(e=>/Clr$/.test(e.localName));if(!c)return '';
  let hex=c.localName==='srgbClr'?c.getAttribute('val'):c.localName==='schemeClr'?book.themeHex[SCHEME[c.getAttribute('val')]]:c.localName==='sysClr'?c.getAttribute('lastClr'):c.localName==='prstClr'?({black:'000000',white:'FFFFFF',red:'FF0000',green:'008000',blue:'0000FF',yellow:'FFFF00'})[c.getAttribute('val')]:'';
  if(!hex)return '';let [r,g,b]=hex.match(/../g).map(h=>parseInt(h,16)/255),alpha=1;
  // lumMod/lumOff work in HSL, like Office's "Lighter 40%" / "Darker 25%".
  const mod=n=>{const e=[...c.children].find(x=>x.localName===n);return e?+e.getAttribute('val')/100000:null};
  const lm=mod('lumMod'),lo=mod('lumOff'),sh=mod('shade'),ti=mod('tint'),al=mod('alpha');
  if(lm!=null||lo!=null){const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s2=0,l=(max+min)/2;
   if(max!==min){const d=max-min;s2=l>0.5?d/(2-max-min):d/(max+min);h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;h/=6}
   l=Math.min(1,Math.max(0,l*(lm??1)+(lo??0)));
   const q=l<0.5?l*(1+s2):l+s2-l*s2,p2=2*l-q,f=t=>{t=(t+1)%1;return t<1/6?p2+(q-p2)*6*t:t<1/2?q:t<2/3?p2+(q-p2)*(2/3-t)*6:p2};
   [r,g,b]=s2?[f(h+1/3),f(h),f(h-1/3)]:[l,l,l]}
  if(sh!=null)[r,g,b]=[r,g,b].map(x=>x*sh);if(ti!=null)[r,g,b]=[r,g,b].map(x=>x+(1-x)*(1-ti));if(al!=null)alpha=al;
  return 'rgba('+[r,g,b].map(x=>Math.round(x*255)).join(',')+','+alpha+')';
 }
 async function readDrawing(path,doc){
  const ref=one(doc,'drawing');if(!ref)return [];
  const sheetRels=await relsOf(path),drawPath=sheetRels[ref.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||ref.getAttribute('r:id')];if(!drawPath)return [];
  const draw=xml(await book.read(drawPath)),drawRels=await relsOf(drawPath),shapes=[],EMU=9525;
  const point=el=>el&&{c:+one(el,'col').textContent,cOff:+one(el,'colOff').textContent/EMU,r:+one(el,'row').textContent,rOff:+one(el,'rowOff').textContent/EMU};
  for(const anchor of [...draw.documentElement.children]){
   const from=point(kids(anchor,'from')[0]);if(!from)continue;
   const ext=kids(anchor,'ext')[0],to=point(kids(anchor,'to')[0])||{w:+(ext?.getAttribute('cx')||0)/EMU,h:+(ext?.getAttribute('cy')||0)/EMU};
   for(const node of [...anchor.children].filter(n=>n.localName==='sp'||n.localName==='pic')){
    const nv=one(node,'cNvPr');if(nv?.getAttribute('hidden')==='1')continue;
    const sp=kids(node,'spPr')[0],style=kids(node,'style')[0],shape={from,to,kind:node.localName};
    // Outer shadow as saved (blur, distance, direction, colour): Excel's picture and shape styles.
    const sh=one(sp,'outerShdw');if(sh){const d=+(sh.getAttribute('dist')||0)/EMU,a=+(sh.getAttribute('dir')||0)/60000*Math.PI/180;
     shape.shadowCss={x:Math.round(Math.cos(a)*d*10)/10,y:Math.round(Math.sin(a)*d*10)/10,blur:Math.round(+(sh.getAttribute('blurRad')||0)/EMU*10)/10,color:drawColor(sh)||'rgba(0,0,0,.35)'}}
    if(node.localName==='pic'){const id=one(node,'blip')?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');const media=drawRels[id];if(!media)continue;
     try{shape.src=URL.createObjectURL(await book.read(media,true))}catch{continue}
     // A picture frame (Picture Styles): a line around it, drawn on its edge, half inside and half outside.
     const ln=kids(sp,'ln')[0];if(ln&&!kids(ln,'noFill').length&&kids(ln,'solidFill')[0])shape.frame={color:drawColor(kids(ln,'solidFill')[0]),w:+(ln.getAttribute('w')||9525)/EMU}}
    else{
     const fill=kids(sp,'solidFill')[0],noFill=kids(sp,'noFill')[0];shape.fill=noFill?'':fill?drawColor(fill):style?drawColor(one(style,'fillRef')):'';
     const ln=kids(sp,'ln')[0];shape.line=ln&&!kids(ln,'noFill').length?(drawColor(kids(ln,'solidFill')[0])||'')&&{color:drawColor(kids(ln,'solidFill')[0]),w:Math.max(1,Math.round(+(ln.getAttribute('w')||9525)/EMU))}:(!ln&&style?{color:drawColor(one(style,'lnRef')),w:1}:null);
     shape.round=/roundRect/.test(one(sp,'prstGeom')?.getAttribute('prst')||'');shape.ellipse=one(sp,'prstGeom')?.getAttribute('prst')==='ellipse';
     shape.shadow=!!one(sp,'outerShdw');
     const body=one(node,'txBody'),bodyPr=one(body,'bodyPr');shape.vAlign=bodyPr?.getAttribute('anchor')||'t';
     shape.paras=all(body,'p').map(p=>{const runs=[...p.children].filter(e=>e.localName==='r'||e.localName==='fld');
      return{align:one(p,'pPr')?.getAttribute('algn')||'l',runs:runs.map(r=>{const pr=one(r,'rPr')||one(p,'endParaRPr');return{text:one(r,'t')?.textContent||'',size:pr?.getAttribute('sz')?+pr.getAttribute('sz')/100:11,b:pr?.getAttribute('b')==='1',i:pr?.getAttribute('i')==='1',color:pr?drawColor(kids(pr,'solidFill')[0]):'',font:one(pr,'latin')?.getAttribute('typeface')||''}})}});
     if(style&&!shape.paras.some(p=>p.runs.some(r=>r.color))){const fc=drawColor(one(style,'fontRef'));shape.paras.forEach(p=>p.runs.forEach(r=>{r.color=fc}))}
    }
    shapes.push(shape);
   }
  }
  return shapes;
 }

 // ---- Conditional formatting (view only) ----
 // Supports the rules these workbooks use: formulas ("$P36<>\"\"", OR/AND/NOT/ISBLANK, comparisons, &,
 // + - * /), duplicate/unique values, blanks/non-blanks, "cell value is" and "text contains".
 // A rule changes only font colour/bold/italic, fill and border, like Excel; the first (highest
 // priority) matching rule wins for each property. Formulas use the values Excel saved in the file.
 function parseRange(ref){const m=/^\$?([A-Z]+)?\$?(\d+)?(?::\$?([A-Z]+)?\$?(\d+)?)?$/.exec(ref);if(!m)return null;
  const c1=m[1]?colIndex(m[1]):0,r1=m[2]?+m[2]-1:0,c2=m[3]?colIndex(m[3]):m[4]&&!m[3]?c1:m[1]&&!m[2]&&!m[3]?c1:16383,r2=m[4]?+m[4]-1:m[2]&&!m[3]&&!m[4]?r1:1048575;
  return{r1,c1,r2:Math.max(r1,r2),c2:Math.max(c1,c2)}}
 function compileFormula(text,anchor){
  const tokens=[];const re=/\s*(?:("(?:[^"]|"")*")|(\$?[A-Z]{1,3}\$?\d+)(?![\w(])|(\d+(?:\.\d+)?)|(<>|<=|>=|[=<>&+\-*/(),])|([A-Z][A-Z0-9.]*)(?=\()|(TRUE|FALSE)\b)/iy;
  let pos=0;while(pos<text.length){re.lastIndex=pos;const m=re.exec(text);if(!m||m[0]==='')throw Error('formula');pos=re.lastIndex;
   if(m[1]!=null)tokens.push({t:'s',v:m[1].slice(1,-1).replace(/""/g,'"')});else if(m[2]){const r=/(\$?)([A-Z]+)(\$?)(\d+)/i.exec(m[2]);tokens.push({t:'ref',ac:!!r[1],c:colIndex(r[2].toUpperCase()),ar:!!r[3],r:+r[4]-1})}
   else if(m[3]!=null)tokens.push({t:'n',v:+m[3]});else if(m[4])tokens.push({t:'op',v:m[4]});else if(m[5])tokens.push({t:'fn',v:m[5].toUpperCase()});else if(m[6])tokens.push({t:'b',v:m[6].toUpperCase()==='TRUE'})}
  let i=0;const peek=()=>tokens[i],take=v=>{const k=tokens[i];if(v&&!(k&&k.t==='op'&&k.v===v))throw Error('formula');i++;return k};
  function primary(){const k=take();if(!k)throw Error('formula');
   if(k.t==='n'||k.t==='s'||k.t==='b'){const v=k.v;return()=>v}
   if(k.t==='ref')return(ctx)=>ctx.get(k.ar?k.r:k.r-anchor.r+ctx.r,k.ac?k.c:k.c-anchor.c+ctx.c);
   if(k.t==='op'&&k.v==='('){const e=compare();take(')');return e}
   if(k.t==='op'&&k.v==='-'){const e=primary();return ctx=>-num(e(ctx))}
   if(k.t==='fn'){take('(');const args=[];if(!(peek()?.t==='op'&&peek().v===')')){args.push(compare());while(peek()?.t==='op'&&peek().v===','){take(',');args.push(compare())}}take(')');
    const f={OR:v=>v.some(truthy),AND:v=>v.every(truthy),NOT:v=>!truthy(v[0]),ISBLANK:v=>v[0]==='',LEN:v=>String(v[0]).length,TRIM:v=>String(v[0]).trim().replace(/\s+/g,' '),UPPER:v=>String(v[0]).toUpperCase(),LOWER:v=>String(v[0]).toLowerCase(),ABS:v=>Math.abs(num(v[0])),ISNUMBER:v=>typeof v[0]==='number',IF:v=>truthy(v[0])?v[1]:v[2]??false}[k.v];
    if(!f)throw Error('formula');return ctx=>f(args.map(a=>a(ctx)))}
   throw Error('formula')}
  function binary(next,ops,apply){return()=>{let left=next();while(peek()?.t==='op'&&ops.includes(peek().v)){const op=take().v,right=next(),l=left;left=ctx=>apply(op,l(ctx),right(ctx))}return left}}
  const mul=binary(primary,['*','/'],(op,a,b)=>op==='*'?num(a)*num(b):num(a)/num(b));
  const add=binary(mul,['+','-'],(op,a,b)=>op==='+'?num(a)+num(b):num(a)-num(b));
  const cat=binary(add,['&'],(op,a,b)=>String(a)+String(b));
  const compare=binary(cat,['=','<>','<','>','<=','>='],(op,a,b)=>{const c=cmp(a,b);return{'=':c===0,'<>':c!==0,'<':c<0,'>':c>0,'<=':c<=0,'>=':c>=0}[op]});
  const fn=compare();if(i!==tokens.length)throw Error('formula');return fn;
 }
 const num=v=>typeof v==='number'?v:typeof v==='boolean'?+v:v===''?0:+v||0;
 const truthy=v=>typeof v==='string'?v!==''&&v.toUpperCase()!=='FALSE':!!v;
 function cmp(a,b){if(a==='')a=typeof b==='number'?0:'';if(b==='')b=typeof a==='number'?0:'';
  if(typeof a==='number'&&typeof b==='number')return a-b;if(typeof a==='number')return -1;if(typeof b==='number')return 1;
  const x=String(a).toLowerCase(),y=String(b).toLowerCase();return x<y?-1:x>y?1:0}
 function applyConditionalFormats(sheet,doc){
  const rules=[];
  for(const block of all(doc,'conditionalFormatting')){
   const ranges=(block.getAttribute('sqref')||'').split(/\s+/).map(parseRange).filter(Boolean);if(!ranges.length)continue;
   for(const rule of kids(block,'cfRule')){const dxf=book.dxfs[+rule.getAttribute('dxfId')];if(!dxf||rule.getAttribute('dxfId')==null)continue;
    rules.push({ranges,anchor:{r:ranges[0].r1,c:ranges[0].c1},type:rule.getAttribute('type'),op:rule.getAttribute('operator'),text:rule.getAttribute('text')||'',priority:+(rule.getAttribute('priority')||0),stop:rule.getAttribute('stopIfTrue')==='1',formulas:kids(rule,'formula').map(f=>f.textContent),dxf})}}
  if(!rules.length)return;rules.sort((a,b)=>a.priority-b.priority);
  const value=(r,c)=>{const cell=sheet.cells.get(r+','+c);return cell?cell.value??cell.text:''};
  const stopped=new Set();
  for(const rule of rules){
   let test;
   try{
    if(rule.type==='expression'){const f=compileFormula(rule.formulas[0]||'',rule.anchor);test=(r,c)=>truthy(f({r,c,get:value}))}
    else if(rule.type==='cellIs'){const fs=rule.formulas.map(x=>compileFormula(x,rule.anchor));test=(r,c)=>{const v=value(r,c),ctx={r,c,get:value},a=fs[0]?.(ctx),b=fs[1]?.(ctx);
     return{equal:()=>cmp(v,a)===0,notEqual:()=>cmp(v,a)!==0,greaterThan:()=>cmp(v,a)>0,lessThan:()=>cmp(v,a)<0,greaterThanOrEqual:()=>cmp(v,a)>=0,lessThanOrEqual:()=>cmp(v,a)<=0,between:()=>cmp(v,a)>=0&&cmp(v,b)<=0,notBetween:()=>cmp(v,a)<0||cmp(v,b)>0}[rule.op]?.()??false}}
    else if(rule.type==='containsBlanks')test=(r,c)=>String(value(r,c)).trim()==='';
    else if(rule.type==='notContainsBlanks')test=(r,c)=>String(value(r,c)).trim()!=='';
    else if(rule.type==='containsText')test=(r,c)=>String(value(r,c)).toLowerCase().includes(rule.text.toLowerCase());
    else if(rule.type==='duplicateValues'||rule.type==='uniqueValues'){const counts=new Map();
     for(const g of rule.ranges)for(let r=g.r1;r<=Math.min(g.r2,sheet.maxR);r++)for(let c=g.c1;c<=Math.min(g.c2,sheet.maxC);c++){const v=String(value(r,c)).toLowerCase();if(v!=='')counts.set(v,(counts.get(v)||0)+1)}
     test=(r,c)=>{const v=String(value(r,c)).toLowerCase();return v!==''&&(rule.type==='duplicateValues'?counts.get(v)>1:counts.get(v)===1)}}
    else continue;
   }catch{continue}
   for(const g of rule.ranges)for(let r=g.r1;r<=Math.min(g.r2,sheet.maxR);r++)for(let c=g.c1;c<=Math.min(g.c2,sheet.maxC);c++){
    const key=r+','+c;if(stopped.has(key))continue;let hit=false;try{hit=test(r,c)}catch{}if(!hit)continue;
    let cell=sheet.cells.get(key);if(!cell){if(!rule.dxf.fill&&!rule.dxf.border)continue;cell={text:'',style:book.xfs[0]||{fmt:'General',font:{},border:{}},numeric:false,value:''};sheet.cells.set(key,cell)}
    const cf=cell.cf||(cell.cf={font:{},border:{}}),d=rule.dxf;
    for(const k in d.font||{})if(!(k in cf.font))cf.font[k]=d.font[k];if(d.fill&&!cf.fill)cf.fill=d.fill;for(const k in d.border||{})if(!(k in cf.border))cf.border[k]=d.border[k];
    if(rule.stop)stopped.add(key);
   }
  }
 }
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const bordersOf=cell=>!cell?{}:cell.cf?{...(cell.style.border||{}),...cell.cf.border}:cell.style.border||{};
 // Each cell draws its right and bottom edge (the sheet uses separate borders). Excel shows an edge if
 // either cell beside it has a border there, and files often set only left/top, so edge holds the left
 // border of the cell to the right and the top border of the cell below. Only the first shown column and
 // row draw their own left/top.
 // A merged cell's edge can differ along its length (each column/row under it has its own border, as in
 // Excel): edge.right/bottom is then '' and edge.rightParts/bottomParts list [offset px, length px, border].
 // Each line is drawn inside the cell that owns it, as Excel shows it: on an edge between two cells the
 // right / lower cell's own line wins (INV: SR's black left line over D36:F36's thick white right one),
 // otherwise the left / upper cell's. The cell that gives way hides its light gridline there. A merged
 // cell's side can differ along its length: edge.<side>Parts list [offset px, length px, line].
 function edgeCss(b,edge){edge=edge||{};const css=[],pick=(k,own)=>k+'All' in edge?edge[k+'All']:k in edge?edge[k]:own;
  const right=pick('right',b.right),bottom=pick('bottom',b.bottom),left=pick('left',b.left),top=pick('top',b.top);
  if(right)css.push('border-right:'+right);else if(edge.rightOff||edge.rightParts)css.push('border-right-color:transparent');
  if(bottom)css.push('border-bottom:'+bottom);else if(edge.bottomOff||edge.bottomParts)css.push('border-bottom-color:transparent');
  if(left)css.push('border-left:'+left);if(top)css.push('border-top:'+top);
  const layers=[],seg=(parts,size,pos)=>{for(const [at,len,v] of parts||[]){if(!v)continue;const [w,,col]=v.split(' ');layers.push(['linear-gradient('+col+','+col+')',size(len,w),pos(at)])}};
  seg(edge.bottomParts,(len,w)=>len+'px '+w,at=>at+'px 100%');seg(edge.topParts,(len,w)=>len+'px '+w,at=>at+'px 0');
  seg(edge.rightParts,(len,w)=>w+' '+len+'px',at=>'100% '+at+'px');seg(edge.leftParts,(len,w)=>w+' '+len+'px',at=>'0 '+at+'px');
  // Parts are placed from the cell's outer edge (not inside its own borders), so they line up with the cells beside.
  if(layers.length)css.push('background-image:'+layers.map(l=>l[0]).join(','),'background-size:'+layers.map(l=>l[1]).join(','),'background-position:'+layers.map(l=>l[2]).join(','),'background-repeat:no-repeat','background-origin:border-box');
  return css}
 function cellStyle(cell,edge){
  const cf=cell.cf,s=cf?{...cell.style,fill:cf.fill||cell.style.fill}:cell.style,f=cf?{...(s.font||{}),...cf.font}:s.font||{},b=bordersOf(cell),css=[];
  if(s.fill)css.push('background-color:'+s.fill);if(f.color)css.push('color:'+f.color);if(f.b)css.push('font-weight:700');if(f.i)css.push('font-style:italic');if(f.u)css.push('text-decoration:underline');
  if(f.sz)css.push('font-size:'+Math.round(f.sz*zoom*10)/10+'pt');if(f.name)css.push('font-family:"'+f.name.replace(/"/g,'')+'",system-ui,sans-serif');
  const h=s.h&&s.h!=='general'?(s.h==='centerContinuous'?'center':s.h):cell.numeric?'right':'left';css.push('text-align:'+h);
  css.push('vertical-align:'+(s.v==='center'?'middle':s.v==='top'?'top':'bottom'));if(s.wrap)css.push('white-space:pre-wrap');
  // Keep the sheet's light gridlines visible on filled cells too; explicit workbook borders win.
  css.push(...edgeCss(b,edge));
  return css.join(';');
 }
 // Sheet zoom (pinch on phones, Ctrl + wheel / trackpad pinch on PC). Excel's own zoom range.
 let zoom=1;const ZMIN=0.3,ZMAX=3;
 function renderSheet(sheet,keepScroll){
  const cols=sheet.maxC+1,rows=sheet.maxR+1,px=w=>Math.round(((w??sheet.defW)*7+5)*zoom);
  const frozen=sheet.frozen||{r0:0,r1:0,c0:0,c1:0};
  const visibleRows=Array.from({length:rows},(_,r)=>r).filter(r=>r>=frozen.r0&&sheet.heights[r]!==0),rowShown=new Set(visibleRows);
  // Hidden columns (width 0 or hidden in Excel) are left out completely, like Excel.
  const visibleCols=Array.from({length:cols},(_,c)=>c).filter(c=>c>=frozen.c0&&sheet.widths[c]!==0),colShown=new Set(visibleCols);
  const widths=visibleCols.map(c=>px(sheet.widths[c])),total=46+widths.reduce((a,b)=>a+b,0);
  // Merges are cut at the freeze lines (Excel splits them there too). Above/left of the frozen
  // area the cells cannot be seen, so a merge starting there shows its value in the visible part.
  const merges=new Map(sheet.merges),covered=new Set(sheet.covered),split=new Set();
  const cut=(axis,at,carry)=>{if(!at)return;for(const [key,m] of [...merges]){const [r,c]=key.split(',').map(Number),start=axis?c:r,size=axis?m.cs:m.rs;if(start<at&&start+size>at){
   merges.set(key,axis?{rs:m.rs,cs:at-c}:{rs:at-r,cs:m.cs});const k=axis?r+','+at:at+','+c;merges.set(k,axis?{rs:m.rs,cs:c+m.cs-at}:{rs:r+m.rs-at,cs:m.cs});covered.delete(k);if(!carry)split.add(k);else if(!sheet.cells.has(k)&&sheet.cells.has(key))sheet.cells.set(k,sheet.cells.get(key))}}};
  cut(0,frozen.r0,true);cut(1,frozen.c0,true);cut(0,frozen.r1,false);cut(1,frozen.c1,false);
  let html='<table'+(sheet.grid===false?' class="excel-nogrid"':'')+' style="width:'+total+'px;font-size:'+Math.round(11*zoom*10)/10+'pt;--excel-zoom:'+zoom+'"><colgroup><col class="excel-rownum-col" style="width:46px">'+widths.map(w=>'<col style="width:'+w+'px">').join('')+'</colgroup><thead><tr><th class="excel-corner"></th>'+visibleCols.map(c=>'<th data-c="'+c+'"'+(c<frozen.c1?' class="excel-frozen-col"':'')+'>'+colName(c)+'</th>').join('')+'</tr></thead><tbody>';
  // Next shown column / row after a given one (hidden ones are skipped), for shared cell edges.
  const after=(list,size)=>{const next=new Array(size+1).fill(undefined);let k=list.length-1;for(let i=size;i>=0;i--){while(k>=0&&list[k]>i)k--;next[i]=list[k+1]}return next};
  const colAfter=after(visibleCols,cols),rowAfter=after(visibleRows,rows);
  // A cell inside a merged range takes the border of the range's first cell when it has none itself.
  const coverOf=new Map();for(const [key,mm] of merges){const [r0,c0]=key.split(',').map(Number);for(let i=0;i<mm.rs;i++)for(let j=0;j<mm.cs;j++)if(i||j)coverOf.set((r0+i)+','+(c0+j),key)}
  const sideAt=(key,side)=>bordersOf(sheet.cells.get(key))[side]||(coverOf.has(key)?bordersOf(sheet.cells.get(coverOf.get(key)))[side]:'')||'';
  // A neighbour inside a merged range shows the range's outer edge (Excel hides the inner lines), e.g.
  // E53:G53 with G hidden: H's left edge is G53's right, not F53's inner one.
  const outer=(r,c,side)=>{const k=r+','+c,o=coverOf.get(k)||(merges.has(k)?k:null);if(!o)return sideAt(k,side);const [r0,c0]=o.split(',').map(Number),mm=merges.get(o);
   return sideAt((side==='bottom'?r0+mm.rs-1:side==='top'?r0:r)+','+(side==='right'?c0+mm.cs-1:side==='left'?c0:c),side)};
  const rowH=i=>Math.round((sheet.heights[i]??sheet.defH)*4/3*zoom);
  // Uneven edge of a merged cell: one part per row/column; otherwise one border for the whole side.
  const sideParts=(list,size,valueAt,edge,key)=>{const parts=[];let at=0;for(const i of list){const len=size(i);parts.push([at,len,valueAt(i)]);at+=len}
   if(new Set(parts.map(p=>p[2])).size>1){edge[key+'All']='';edge[key+'Parts']=parts}else edge[key+'All']=parts[0]?.[2]||''};
  const edgeAt=(r,c,m)=>{const cs=m?m.cs:1,rs=m?m.rs:1,nc=colAfter[c+cs-1],nr=rowAfter[r+rs-1],edge={};
   const cols=[];for(let j=c;j<c+cs;j++)if(colShown.has(j))cols.push(j);const rowsIn=[];for(let i=r;i<r+rs;i++)if(rowShown.has(i))rowsIn.push(i);
   const nextL=i=>nc===undefined?'':outer(i,nc,'left'),nextT=j=>nr===undefined?'':outer(nr,j,'top');
   if(rowsIn.some(i=>nextL(i)))edge.rightOff=true;if(cols.some(j=>nextT(j)))edge.bottomOff=true;
   sideParts(rowsIn,rowH,i=>nextL(i)?'':sideAt(i+','+(c+cs-1),'right'),edge,'right');
   sideParts(cols,j=>widthOf.get(j)||0,j=>nextT(j)?'':sideAt((r+rs-1)+','+j,'bottom'),edge,'bottom');
   sideParts(rowsIn,rowH,i=>sideAt(i+','+c,'left'),edge,'left');
   sideParts(cols,j=>widthOf.get(j)||0,j=>sideAt(r+','+j,'top'),edge,'top');
   return edge};
  // Cell text. Long text spills into empty cells beside it, as in Excel (left/general text to the right,
  // right-aligned to the left, centred both ways); it stops at the next cell with text or a merge.
  const widthOf=new Map(visibleCols.map((c,i)=>[c,widths[i]])),colBefore=new Map(visibleCols.map((c,i)=>[c,visibleCols[i-1]])),rowBefore=new Map(visibleRows.map((r,i)=>[r,visibleRows[i-1]]));
  const blocked=(r,c)=>{const k=r+','+c;return covered.has(k)||merges.has(k)||(sheet.cells.get(k)?.text??'')!==''};
  const spill=(r,c,dir)=>{let w=0,cc=c;for(let n=0;n<40;n++){cc=dir>0?colAfter[cc]:colBefore.get(cc);if(cc===undefined||blocked(r,cc)||(cc<frozen.c1)!==(c<frozen.c1))break;w+=widthOf.get(cc)}return w};
  const content=(cell,r,c,m)=>{
   const t=esc(cell.text),s=cell.style;if(!t)return '';
   // Text rotation: 1–90 counter-clockwise, 91–180 clockwise, 255 stacked letters.
   if(s.rot)return '<span class="excel-rot" style="'+(s.rot===255?'writing-mode:vertical-rl;text-orientation:upright':s.rot===90?'writing-mode:vertical-rl;transform:rotate(180deg)':s.rot===180?'writing-mode:vertical-rl':'transform:rotate('+(s.rot<=90?-s.rot:s.rot-90)+'deg)')+'">'+t+'</span>';
   // Excel wraps only at spaces: a Myanmar word stays whole and moves to the next line (browsers would
   // split it between syllables). It still breaks if it is wider than the cell.
   if(s.wrap)return t.replace(/[\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]+/g,w=>'<span class="excel-word">'+w+'</span>');
   if(m||cell.numeric)return t;
   const own=widthOf.get(c)||0,size=((s.font?.sz||11)*4/3)*zoom;if(cell.text.length*size*0.62<own-5)return t;
   const h=s.h&&s.h!=='general'?s.h:'left',R=h==='right'?0:spill(r,c,1),L=h==='left'||h==='fill'||h==='justify'?0:spill(r,c,-1);
   if(!R&&!L)return t;const E=h==='center'||h==='centerContinuous'?Math.min(L,R):0,left=h==='right'?L:E,right=h==='right'?0:h==='left'||h==='fill'||h==='justify'?R:E;
   return '<div class="excel-spill" style="width:'+(own+left+right-5)+'px'+(left?';margin-left:-'+left+'px':'')+'">'+t+'</div>';
  };
  const rowHtml=r=>{
   const ht=sheet.heights[r];
   let html='<tr'+(r<frozen.r1?' class="excel-frozen-row"':'')+' style="height:'+Math.round((ht??sheet.defH)*4/3*zoom)+'px"><th data-r="'+r+'">'+(r+1)+'</th>';
   for(const c of visibleCols){const key=r+','+c;if(covered.has(key))continue;const m=merges.get(key),cell=split.has(key)?null:sheet.cells.get(key);
    let rs=1,cs=1;if(m){for(let i=1;i<m.rs;i++)if(rowShown.has(r+i))rs++;for(let i=1;i<m.cs;i++)if(colShown.has(c+i))cs++}
    const inner=cell?content(cell,r,c,m):'',cls=(c<frozen.c1?'excel-frozen-col ':'')+(inner.startsWith('<div class="excel-spill"')?'excel-spill-host':'');
    html+='<td data-r="'+r+'" data-c="'+c+'"'+(cls.trim()?' class="'+cls.trim()+'"':'')+(m?(m.rs>1?' data-r2="'+(r+m.rs-1)+'"':'')+(m.cs>1?' data-c2="'+(c+m.cs-1)+'"':''):'')+(rs>1?' rowspan="'+rs+'"':'')+(cs>1?' colspan="'+cs+'"':'')+(cell?' style="'+esc(cellStyle(cell,edgeAt(r,c,m)))+'"':(e=>e.length?' style="'+esc(e.join(';'))+'"':'')(edgeCss({},edgeAt(r,c,m))))+'>'+inner+'</td>'}
   return html+'</tr>';
  };
  const keep=keepScroll&&[grid.scrollTop/(grid.scrollHeight||1),grid.scrollLeft/(grid.scrollWidth||1)];
  // Only the rows near the screen are drawn (frozen rows always); empty spacer rows stand in for the
  // rest. A big sheet has tens of thousands of cells, and drawing them all made opening, zooming and
  // scrolling stutter on phones. Merged cells start their drawn part at the merge's first row.
  const body=visibleRows.filter(r=>r>=frozen.r1),index=new Map(body.map((r,i)=>[r,i]));
  const hts=Float64Array.from(body,r=>Math.round((sheet.heights[r]??sheet.defH)*4/3*zoom));
  const origin=Int32Array.from(body,(_,i)=>i);
  for(const [key,m] of merges){if(m.rs<2)continue;const r=+key.split(',')[0],i=index.get(r);if(i===undefined)continue;for(let k=1;k<m.rs;k++){const j=index.get(r+k);if(j!==undefined&&origin[j]>i)origin[j]=i}}
  const spacer=h=>'<tr class="excel-spacer" style="height:'+h+'px"><td colspan="'+(visibleCols.length+1)+'"></td></tr>';
  const frozenRows=visibleRows.filter(r=>r<frozen.r1);
  grid.innerHTML=html+'</tbody><tbody class="excel-after">'+spacer(0)+'</tbody></table>';renderedSheet=sheet;
  view={sheet,body,index,hts,origin,rowHtml,spacer,frozenHtml:frozenRows.map(rowHtml).join(''),frozenCount:frozenRows.length,frozenR1:frozen.r1,tops:null,start:0,end:0,base:0,rows:visibleRows,cols:visibleCols,widths,covered,frozenCols:visibleCols.filter(c=>c<frozen.c1).length};
  sumTops();
  // Drawn from the top first: that measures where the body rows begin.
  grid.scrollTop=0;drawRows(true,0);
  grid.scrollLeft=keep?keep[1]*grid.scrollWidth:0;
  if(keep)drawRows(true,keep[0]*(view.base+view.tops[body.length]));
  msg.textContent=rows+' rows'+(sheet.truncated?' (first '+MAX_ROWS+' shown)':'');
  if(searchText.trim())find(0,keepScroll);
 }
 let view=null;
 const sumTops=()=>{const t=new Float64Array(view.hts.length+1);for(let i=0;i<view.hts.length;i++)t[i+1]=t[i]+view.hts[i];view.tops=t};
 // Row index at a height inside the body rows.
 const rowAtY=y=>{const t=view.tops;let lo=0,hi=view.body.length;while(lo<hi){const mid=(lo+hi)>>1;if(t[mid+1]<=y)lo=mid+1;else hi=mid}return Math.min(lo,Math.max(0,view.body.length-1))};
 // Position of a drawn row inside the scrolled sheet.
 const placeOf=el=>el.getBoundingClientRect().top-grid.getBoundingClientRect().top+grid.scrollTop;
 const MARGIN=1200;
 function drawRows(force,target){
  if(!view||!grid.isConnected)return;const n=view.body.length,top=view.base,y=Math.max(0,(target??grid.scrollTop)-top),h=grid.clientHeight||800;
  if(!force&&(view.start===0||y-MARGIN/2>=view.tops[view.start])&&(view.end>=n||y+h+MARGIN/2<=view.tops[view.end]))return;
  let start=rowAtY(Math.max(0,y-MARGIN));while(start>0&&view.origin[start]<start)start=view.origin[start];
  const end=n?Math.min(n,rowAtY(y+h+MARGIN)+1):0,anchor=rowAtY(y),offset=y-view.tops[anchor];
  const [main,after]=grid.querySelectorAll('tbody');
  // No spacer above the first rows: even an empty row takes a pixel between table borders.
  main.innerHTML=view.frozenHtml+(start?view.spacer(view.tops[start]):'')+view.body.slice(start,end).map(view.rowHtml).join('');
  after.innerHTML=view.spacer(view.tops[n]-view.tops[end]);
  view.start=start;view.end=end;
  // Rows can be taller than Excel's height (wrapped text): measure the drawn ones so the spacers
  // and the scroll position stay exact.
  const drawn=[...main.rows].slice(view.frozenCount+(start?1:0));let changed=false;
  drawn.forEach((tr,k)=>{const real=tr.getBoundingClientRect().height;if(real&&Math.abs(real-view.hts[start+k])>0.01){view.hts[start+k]=real;changed=true}});
  if(changed){sumTops();after.firstChild.style.height=view.tops[n]-view.tops[end]+'px'}
  // The first drawn row sits exactly where it would with every row drawn.
  if(!start&&drawn[0])view.base=placeOf(drawn[0]);
  else if(drawn[0]){const gap=main.querySelector('tr.excel-spacer');gap.style.height=view.tops[start]+'px';const off=view.base+view.tops[start]-placeOf(drawn[0]);if(Math.abs(off)>0.01)gap.style.height=view.tops[start]+off+'px'}
  if(force||changed)grid.scrollTop=y>0&&n?view.base+view.tops[anchor]+offset:(target??grid.scrollTop);
  freeze();
 }
 // Scroll events already come once per frame; most return at once (rows still cover the screen).
 grid.addEventListener('scroll',()=>drawRows(false),{passive:true});
 // Copy (excel-select.js) reads from the sheet itself, since rows away from the screen are not drawn.
 grid.cellText=(r,c)=>renderedSheet?.cells.get(r+','+c)?.text??'';
 let found=[],foundAt=-1;
 // step 0: a new search (first match, or the same one again after a redraw); 1 / -1: next / previous.
 function find(step,stay){
  if(!view)return;const query=searchText.trim().toLocaleLowerCase(),sheet=view.sheet;
  if(step===0){
   const keep=stay&&found[foundAt];found=[];foundAt=-1;
   if(query)for(const r of view.rows)for(const c of view.cols){const key=r+','+c;if(!view.covered.has(key)&&String(sheet.cells.get(key)?.text??'').toLocaleLowerCase().includes(query))found.push([r,c])}
   msg.textContent=query?(found.length?found.length+' found':'No match'):view.rows.length+' rows';
   if(!found.length)return;foundAt=keep?Math.max(0,found.findIndex(([r,c])=>r===keep[0]&&c===keep[1])):0;
   if(stay)return grid.dispatchEvent(new CustomEvent('excel-find',{detail:{r:found[foundAt][0],c:found[foundAt][1]}}));
  }else{if(!found.length)return find(0);foundAt=(foundAt+step+found.length)%found.length}
  const [r,c]=found[foundAt],i=view.index.get(r);
  // Bring the row just under the column letters and frozen rows, and the column beside the frozen ones.
  if(i!==undefined){const room=grid.clientHeight-view.base,y=view.tops[i];if(y<grid.scrollTop||y+view.hts[i]>grid.scrollTop+room)grid.scrollTop=Math.max(0,y-room/3)}
  // Frozen columns only stay put when they fit (on phones they usually scroll with the sheet).
  const k=view.cols.indexOf(c),fc=grid.querySelector('table.excel-cols-frozen')?view.frozenCols:0;if(k>=fc){const x=view.widths.slice(0,k).reduce((a,b)=>a+b,0),fixed=46+view.widths.slice(0,fc).reduce((a,b)=>a+b,0),left=x-view.widths.slice(0,fc).reduce((a,b)=>a+b,0);
   if(46+x<grid.scrollLeft+fixed||46+x+view.widths[k]>grid.scrollLeft+grid.clientWidth)grid.scrollLeft=Math.max(0,left-8)}
  drawRows(false);
  grid.dispatchEvent(new CustomEvent('excel-find',{detail:{r,c}}));
 }
 // Freeze panes saved in the file: the frozen rows stay under the column letters and the frozen
 // columns stay beside the row numbers while scrolling. Columns are frozen only when some room is
 // left to scroll the rest (on a phone they usually scroll with the sheet).
 let renderedSheet=null;
 function freeze(){
  const table=grid.querySelector('table');if(!table||!grid.clientWidth)return;
  // Offsets are measured with sticky positions off, so they are right even after scrolling.
  const rowCells=[...table.querySelectorAll('tr.excel-frozen-row>*')],colCells=[...table.querySelectorAll('.excel-frozen-col')];
  rowCells.forEach(cell=>{cell.style.top=''});colCells.forEach(cell=>{cell.style.left=''});
  const head=[...table.querySelectorAll('thead th.excel-frozen-col')],last=head[head.length-1];
  const fits=!!last&&last.offsetLeft+last.offsetWidth+120<=grid.clientWidth;
  const tops=rowCells.map(cell=>cell.parentNode.offsetTop),lefts=fits?colCells.map(cell=>cell.offsetLeft):[];
  rowCells.forEach((cell,i)=>{cell.style.top=tops[i]+'px'});
  table.classList.toggle('excel-cols-frozen',fits);
  colCells.forEach((cell,i)=>{if(fits)cell.style.left=lefts[i]+'px'});
  placeShapes(table);
 }
 // Each shape goes inside the cell under its top-left corner, so it scrolls (and stays frozen) with
 // that cell, like Excel. Positions come from the drawn table, so hidden rows/columns are skipped.
 function placeShapes(table){
  table.querySelectorAll('.excel-shape').forEach(e=>e.remove());table.querySelectorAll('.excel-shape-host').forEach(e=>e.classList.remove('excel-shape-host'));
  const sheet=renderedSheet;if(!sheet?.shapes?.length)return;
  const cols=[...table.querySelectorAll('thead th[data-c]')],rows=[...table.querySelectorAll('tbody th[data-r]')];if(!cols.length||!rows.length)return;
  // Measured with the sheet scrolled to the top-left, so frozen (sticky) cells sit where they belong.
  const keep=[grid.scrollTop,grid.scrollLeft];grid.scrollTop=0;grid.scrollLeft=0;
  const box=el=>el.getBoundingClientRect(),cx=cols.map(th=>{const b=box(th);return{x:b.left,w:b.width}}),ry=rows.map(th=>{const b=box(th);return{y:b.top,h:b.height}});
  const colAt=c=>{let i=cols.findIndex(th=>+th.dataset.c>=c);return i<0?{x:cx[cx.length-1].x+cx[cx.length-1].w,w:0,exact:false}:{...cx[i],exact:+cols[i].dataset.c===c}};
  // Rows below the drawn part: their height comes from the row list (they are not drawn).
  const below=r=>{const last=+rows[rows.length-1].dataset.r,i=view?view.index?.get(last):undefined;if(!view||i===undefined)return 0;const j=view.body.findIndex(x=>x>=r);return(j<0?view.tops[view.body.length]:view.tops[j])-view.tops[i+1]};
  const rowAt=r=>{let i=rows.findIndex(th=>+th.dataset.r>=r);return i<0?{y:ry[ry.length-1].y+ry[ry.length-1].h+below(r),h:0,exact:false}:{...ry[i],exact:+rows[i].dataset.r===r}};
  // Only shapes whose corner is in a drawn row are placed; the rest are placed when scrolled near.
  const frozenEnd=view?.frozenR1??0,firstBody=view?view.body[view.start]:0,lastDrawn=+rows[rows.length-1].dataset.r;
  const placed=[];
  for(const s of sheet.shapes){
   if(s.from.r>lastDrawn||(s.from.r>=frozenEnd&&s.from.r<firstBody))continue;
   const a=colAt(s.from.c),b=rowAt(s.from.r),x=a.x+(a.exact?Math.min(s.from.cOff,a.w):0),y=b.y+(b.exact?Math.min(s.from.rOff,b.h):0);
   let w,h;if(s.to.w!=null){w=s.to.w;h=s.to.h}else{const c2=colAt(s.to.c),r2=rowAt(s.to.r);w=c2.x+(c2.exact?Math.min(s.to.cOff,c2.w):0)-x;h=r2.y+(r2.exact?Math.min(s.to.rOff,r2.h):0)-y}
   if(w<=1||h<=1)continue;
   // The cell that holds it: the drawn td covering the first visible row/column at the corner.
   const R=+rows.find(th=>+th.dataset.r>=s.from.r)?.dataset.r,C=+cols.find(th=>+th.dataset.c>=s.from.c)?.dataset.c;
   const host=[...table.querySelectorAll('tbody td')].find(td=>{const r1=+td.dataset.r,c1=+td.dataset.c;return r1<=R&&R<=+(td.dataset.r2||r1)&&c1<=C&&C<=+(td.dataset.c2||c1)});
   if(!host)continue;
   const el=document.createElement('div');el.className='excel-shape';el.setAttribute('aria-hidden','true');
   const hb=box(host);el.style.cssText='left:'+Math.round(x-hb.left)+'px;top:'+Math.round(y-hb.top)+'px;width:'+Math.round(w)+'px;height:'+Math.round(h)+'px';
   const shadow=s.shadowCss?s.shadowCss.x+'px '+s.shadowCss.y+'px '+s.shadowCss.blur+'px '+(s.frame?Math.round(s.frame.w/2*10)/10+'px ':'')+s.shadowCss.color:'';
   if(s.kind==='pic'){const img=document.createElement('img');img.src=s.src;img.alt='';el.append(img);el.style.padding='0';
    if(s.frame){const half=Math.round(s.frame.w/2*10)/10;el.style.border=half+'px solid '+s.frame.color;el.style.boxShadow='0 0 0 '+half+'px '+s.frame.color+(shadow?','+shadow:'')}else if(shadow)el.style.boxShadow=shadow}
   else{
    if(s.fill)el.style.background=s.fill;if(s.line)el.style.border=s.line.w+'px solid '+s.line.color;if(s.round)el.style.borderRadius=Math.round(Math.min(w,h)/6)+'px';if(s.ellipse)el.style.borderRadius='50%';if(shadow)el.style.boxShadow=shadow;else if(s.shadow)el.style.boxShadow='2px 2px 4px rgba(0,0,0,.35)';
    el.style.justifyContent=s.vAlign==='ctr'?'center':s.vAlign==='b'?'flex-end':'flex-start';
    for(const p of s.paras){const line=document.createElement('div');line.style.textAlign=p.align==='ctr'?'center':p.align==='r'?'right':'left';
     for(const r of p.runs){const span=document.createElement('span');span.textContent=r.text;span.style.fontSize=Math.round(r.size*zoom*10)/10+'pt';if(r.b)span.style.fontWeight='700';if(r.i)span.style.fontStyle='italic';if(r.color)span.style.color=r.color;if(r.font&&!/^\+/.test(r.font))span.style.fontFamily='"'+r.font.replace(/"/g,'')+'",system-ui,sans-serif';line.append(span)}
     if(!p.runs.length)line.innerHTML='&nbsp;';el.append(line)}
   }
   if(getComputedStyle(host).position==='static')host.style.position='relative';
   host.style.overflow='visible';host.classList.add('excel-shape-host');placed.push([host,el]);
  }
  placed.forEach(([host,el])=>host.append(el));
  // Frozen cells keep their own layer (that keeps them pinned), so a box spilling right/down from one
  // would be covered by the next frozen cell holding a box. Earlier (upper/left) ones go on top.
  const layers=new Map();for(const [host] of placed){const tr=host.parentNode,row=tr.classList.contains('excel-frozen-row'),col=table.classList.contains('excel-cols-frozen')&&host.classList.contains('excel-frozen-col');if(!row&&!col){host.style.zIndex='';continue}
   const base=row&&col?31:row?21:11;if(!layers.has(base))layers.set(base,[]);if(!layers.get(base).includes(host))layers.get(base).push(host)}
  for(const [base,hosts] of layers)hosts.forEach((host,i)=>{host.style.zIndex=String(base+Math.max(0,Math.min(8,hosts.length-1-i)))});
  grid.scrollTop=keep[0];grid.scrollLeft=keep[1];
 }
 if(window.ResizeObserver)new ResizeObserver(()=>{drawRows(false);freeze()}).observe(grid);
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
 // Two fingers pinch the sheet bigger or smaller (the page itself would only zoom in). The table is
 // scaled live while pinching and drawn again at the new size when the fingers lift.
 function setZoom(next,keepScroll=true){next=Math.min(ZMAX,Math.max(ZMIN,Math.round(next*100)/100));if(next===zoom)return;zoom=next;if(renderedSheet)renderSheet(renderedSheet,keepScroll)}
 let pinch=null;const gap=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 grid.addEventListener('touchstart',e=>{if(e.touches.length!==2)return;const table=grid.querySelector('table');if(!table)return;const g=grid.getBoundingClientRect(),t=table.getBoundingClientRect();
  pinch={start:gap(e.touches),scale:1,table,ox:(e.touches[0].clientX+e.touches[1].clientX)/2-t.left,oy:(e.touches[0].clientY+e.touches[1].clientY)/2-t.top};table.style.transformOrigin=pinch.ox+'px '+pinch.oy+'px'},{passive:true});
 grid.addEventListener('touchmove',e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();
  pinch.scale=Math.min(ZMAX/zoom,Math.max(ZMIN/zoom,gap(e.touches)/pinch.start));pinch.table.style.transform='scale('+pinch.scale+')'},{passive:false});
 const endPinch=e=>{if(!pinch||e.touches.length>=2)return;const {scale,table}=pinch;pinch=null;table.style.transform='';table.style.transformOrigin='';setZoom(zoom*scale)};
 grid.addEventListener('touchend',endPinch);grid.addEventListener('touchcancel',endPinch);
 // iOS Safari: stop its own page zoom inside the sheet; the sheet zooms itself.
 grid.addEventListener('gesturestart',e=>e.preventDefault());
 let wheelZoom=1,wheelTimer=0;
 grid.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();wheelZoom*=Math.exp(-e.deltaY/200);clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{const z=wheelZoom;wheelZoom=1;setZoom(zoom*z)},120)},{passive:false});
 // Search like Google Sheets: every row stays; the matching cell is selected and scrolled into view,
 // and the arrows (or Enter / Shift+Enter) go to the next or previous match.
 search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchText=search.value;find(0)},150)});
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();find(e.shiftKey?-1:1)}});
 section.querySelector('#excel-find-prev').addEventListener('click',()=>find(-1));
 section.querySelector('#excel-find-next').addEventListener('click',()=>find(1));
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
