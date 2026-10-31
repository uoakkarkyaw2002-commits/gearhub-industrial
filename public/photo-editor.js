/* 1.1.227 owner: "Edit photo" beside "Choose photos" in the product form. Pick one of the product's
   photos, then turn it 90°, straighten a tilted photo, take the background away (on our own server,
   lib/bg-remove.js) and give it a new background colour. Save puts the edited photo back in its place
   (admin.js GearHubProductPhotos); it is uploaded when the product is saved. */
(()=>{
 const form=document.getElementById('product-form'),zone=form?.querySelector('.product-upload-zone');if(!form||!zone)return;
 const open=document.createElement('button');open.type='button';open.className='photo-edit-open';
 open.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg><span>Edit photo</span>';
 zone.after(open);
 const MAX=1600,COLORS=[['white','#ffffff','White'],['light','#f1f3f2','Light gray'],['black','#111111','Black'],['clear','','Clear']];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const sheet=document.createElement('div');sheet.className='pe-modal';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Edit photo');
 document.body.append(sheet);
 let state=null,canvas=null;
 const close=()=>{sheet.hidden=true;sheet.innerHTML='';state=null;document.documentElement.classList.remove('pe-open')};
 sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)close()});
 open.addEventListener('click',()=>{
  const photos=window.GearHubProductPhotos?.list()||[];
  sheet.hidden=false;document.documentElement.classList.add('pe-open');
  sheet.innerHTML='<div class="pe-card"><div class="pe-head"><h3>Edit photo</h3><button type="button" class="pe-x" aria-label="Close">×</button></div>'
   +(photos.length?'<p class="pe-help">ပြင်ချင်တဲ့ ပုံကို ရွေးပါ / Choose a photo</p><div class="pe-pick">'+photos.map((p,i)=>p.url?'<button type="button" data-pick="'+i+'"><img src="'+esc(p.url)+'" alt="Photo '+(i+1)+'"><span>Photo '+(i+1)+'</span></button>':'').join('')+'</div>':'<p class="pe-help">Add photos first (Choose photos).</p>')+'</div>';
  sheet.querySelector('.pe-x').onclick=close;
  sheet.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>edit(+b.dataset.pick,photos[+b.dataset.pick])));
 });
 const loadImage=src=>new Promise((done,fail)=>{const img=new Image();img.onload=()=>done(img);img.onerror=()=>fail(Error('Could not open this photo.'));img.src=src});
 async function edit(index,photo){
  let img;try{img=await loadImage(photo.url)}catch(error){alert(error.message);return}
  state={index,name:(photo.label||'photo').replace(/\.[a-z0-9]+$/i,''),original:img,cut:null,quarter:0,tilt:0,bg:'original'};
  sheet.innerHTML='<div class="pe-card pe-edit"><div class="pe-head"><button type="button" class="pe-back" aria-label="Back">←</button><h3>Photo '+(index+1)+'</h3><button type="button" class="pe-x" aria-label="Close">×</button></div>'
   +'<div class="pe-stage"><canvas></canvas><div class="pe-busy" hidden><i></i><span>Removing background…</span></div></div>'
   +'<div class="pe-tools">'
   +'<div class="pe-row"><button type="button" data-act="left">⟲ 90°</button><button type="button" data-act="right">⟳ 90°</button><button type="button" data-act="cut" class="pe-cut">✂︎ Remove background</button></div>'
   +'<label class="pe-tilt"><span>Straighten / တည့်အောင် <b>0°</b></span><input type="range" min="-45" max="45" step="0.5" value="0"></label>'
   +'<div class="pe-row pe-colors"><span>Background</span><button type="button" data-bg="original" aria-pressed="true">Original</button>'+COLORS.map(([k,c,l])=>'<button type="button" data-bg="'+k+'" aria-label="'+l+'" title="'+l+'" class="pe-swatch'+(c?'':' pe-clear')+'"'+(c?' style="--c:'+c+'"':'')+'></button>').join('')+'<label class="pe-swatch pe-custom" title="Any colour"><input type="color" value="#dff3e6"></label></div>'
   +'<p class="pe-msg" role="status"></p>'
   +'<div class="pe-row pe-actions"><button type="button" data-act="reset" class="secondary">Reset</button><button type="button" data-act="save" class="primary">Save photo</button></div></div></div>';
  canvas=sheet.querySelector('canvas');
  sheet.querySelector('.pe-x').onclick=close;sheet.querySelector('.pe-back').onclick=()=>open.click();
  const tilt=sheet.querySelector('.pe-tilt input'),tiltLabel=sheet.querySelector('.pe-tilt b'),msg=sheet.querySelector('.pe-msg');
  tilt.addEventListener('input',()=>{state.tilt=+tilt.value;tiltLabel.textContent=state.tilt+'°';draw()});
  const pressBg=k=>{state.bg=k;sheet.querySelectorAll('[data-bg]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bg===k)));sheet.querySelector('.pe-custom').classList.toggle('on',k.startsWith('#'));draw()};
  sheet.querySelectorAll('[data-bg]').forEach(b=>b.addEventListener('click',()=>{if(!state.cut&&b.dataset.bg!=='original'){msg.textContent='First tap "Remove background", then choose a colour.';return}pressBg(b.dataset.bg)}));
  sheet.querySelector('.pe-custom input').addEventListener('input',e=>{if(!state.cut){msg.textContent='First tap "Remove background", then choose a colour.';return}pressBg(e.target.value)});
  sheet.querySelector('.pe-tools').addEventListener('click',async e=>{
   const act=e.target.closest('[data-act]')?.dataset.act;if(!act)return;msg.textContent='';
   if(act==='left')state.quarter=(state.quarter+3)%4;else if(act==='right')state.quarter=(state.quarter+1)%4;
   else if(act==='reset'){state.quarter=0;state.tilt=0;tilt.value=0;tiltLabel.textContent='0°';state.cut=null;pressBg('original');return}
   else if(act==='cut'){await removeBackground(msg);if(state?.cut)pressBg('white');return}
   else if(act==='save'){await save(msg);return}
   draw();
  });
  draw();
 }
 // The source photo (with its background taken away when asked), turned and straightened. A tilted
 // photo is enlarged just enough that no empty corners show.
 function render(target,limit){
  const src=state.cut&&state.bg!=='original'?state.cut:state.original,w0=src.naturalWidth||src.width,h0=src.naturalHeight||src.height;
  const k=Math.min(1,limit/Math.max(w0,h0)),w=Math.round(w0*k),h=Math.round(h0*k),turned=state.quarter%2===1,W=turned?h:w,H=turned?w:h;
  const a=Math.abs(state.tilt)*Math.PI/180,zoom=a?Math.max((W*Math.cos(a)+H*Math.sin(a))/W,(W*Math.sin(a)+H*Math.cos(a))/H):1;
  target.width=W;target.height=H;const ctx=target.getContext('2d');ctx.clearRect(0,0,W,H);
  const fill=state.bg==='original'?'':state.bg.startsWith('#')?state.bg:(COLORS.find(c=>c[0]===state.bg)||[])[1];
  if(fill){ctx.fillStyle=fill;ctx.fillRect(0,0,W,H)}
  ctx.save();ctx.translate(W/2,H/2);ctx.rotate(state.quarter*Math.PI/2+state.tilt*Math.PI/180);ctx.scale(zoom,zoom);ctx.imageSmoothingQuality='high';ctx.drawImage(src,-w/2,-h/2,w,h);ctx.restore();
  return !fill&&state.cut&&state.bg!=='original';
 }
 function draw(){if(state&&canvas)render(canvas,900)}
 let token='';
 async function csrf(){if(token)return token;for(const url of ['/api/platform/me','/api/admin/csrf']){try{const r=await fetch(url,{cache:'no-store'});const x=await r.json();if(x.csrfToken){token=x.csrfToken;return token}}catch{}}return ''}
 async function removeBackground(msg){
  if(state.cut)return;const busy=sheet.querySelector('.pe-busy'),button=sheet.querySelector('.pe-cut');busy.hidden=false;button.disabled=true;
  try{
   const c=document.createElement('canvas'),src=state.original,k=Math.min(1,MAX/Math.max(src.naturalWidth,src.naturalHeight));c.width=Math.round(src.naturalWidth*k);c.height=Math.round(src.naturalHeight*k);
   const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0,c.width,c.height);
   const body=await new Promise(done=>c.toBlob(done,'image/jpeg',.92));
   const r=await fetch('/api/tools/remove-background',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'image/jpeg','X-CSRF-Token':await csrf()},body});
   if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Could not remove the background.');
   const url=URL.createObjectURL(await r.blob());if(!state)return;state.cut=await loadImage(url);
  }catch(error){msg.textContent=error.message||'Could not remove the background. Check the line and try again.'}
  finally{busy.hidden=true;button.disabled=false}
 }
 async function save(msg){
  const out=document.createElement('canvas'),clear=render(out,MAX),type=clear?'image/png':'image/jpeg';
  const blob=await new Promise(done=>out.toBlob(done,type,.9));if(!blob){msg.textContent='Could not save this photo.';return}
  if(blob.size>5*1024*1024){msg.textContent='The photo is larger than 5 MB.';return}
  const file=new File([blob],state.name+'-edited.'+(clear?'png':'jpg'),{type});
  window.GearHubProductPhotos.replace(state.index,file);close();
 }
})();
