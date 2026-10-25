// Photo scan (owner's request): the button at the right of the search bar takes a photo or picks one
// from the gallery, and the shop's products whose photos look most like it are listed first.
// Runs on the phone: TensorFlow.js + MobileNet v2 (public/vendor, uint8 weights ~2 MB) turn every
// picture into a "look" vector; the shop's photos are turned once and kept in IndexedDB.
(()=>{
 const pill=document.querySelector('.mobile-search .search-pill');if(!pill)return;
 const MODEL='/vendor/mobilenet/model.json?v=mnv2-050-1',TF='/vendor/tf.min.js?v=4.22.0',FEATURES='module_apply_default/MobilenetV2/Logits/AvgPool',KEY='mnv2-050-2:';
 const my=()=>document.documentElement.lang==='my';
 const t=(en,mm)=>my()?mm:en;
 const button=document.createElement('button');button.type='button';button.className='photo-scan-button';button.setAttribute('aria-label','Search by photo');button.title='Search by photo';
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;
 pill.append(button,input);
 const panel=document.createElement('div');panel.className='photo-scan-panel';panel.hidden=true;panel.setAttribute('role','status');
 panel.innerHTML='<img class="photo-scan-thumb" alt=""><div class="photo-scan-copy"><strong></strong><small></small><span class="photo-scan-bar"><i></i></span></div><button type="button" class="photo-scan-clear" aria-label="Clear photo search">✕</button>';
 pill.closest('.mobile-search').after(panel);
 const title=panel.querySelector('strong'),note=panel.querySelector('small'),bar=panel.querySelector('.photo-scan-bar i');
 function show(head,sub,progress){panel.hidden=false;title.textContent=head;note.textContent=sub||'';bar.parentElement.hidden=progress==null;bar.style.width=Math.round((progress||0)*100)+'%'}
 function clear(){window.photoScanIds=null;panel.hidden=true;input.value='';if(typeof renderProducts==='function')renderProducts()}
 panel.querySelector('.photo-scan-clear').addEventListener('click',clear);
 button.addEventListener('click',()=>input.click());

 // Loads the library once (same site only: the shop's security rules allow no outside scripts).
 let ready=null;
 function load(){return ready||(ready=new Promise((resolve,reject)=>{if(window.tf?.loadGraphModel)return resolve();
  // TF.js sets regeneratorRuntime, falling back to Function() (blocked by the shop's CSP) when the
  // global does not exist yet; creating it first keeps it on the plain assignment.
  if(!('regeneratorRuntime' in window))window.regeneratorRuntime=undefined;
  const s=document.createElement('script');s.src=TF;s.onload=resolve;s.onerror=()=>reject(Error('library'));document.head.append(s)}).then(async()=>{
  // Model files are kept with the Cache API, so photo search also works offline after the first use.
  const fetchFunc=async(url,init)=>{try{const c=await caches.open('gearhub-photo-scan-v1'),hit=await c.match(url);if(hit)return hit;const r=await fetch(url,init);if(r.ok)c.put(url,r.clone());return r}catch(_){return fetch(url,init)}};
  return tf.loadGraphModel(MODEL,{fetchFunc});
 }).catch(error=>{ready=null;throw error}))}

 // A picture → its "look" (1280 numbers): fitted on white like the shop's product photos, 224×224.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=224;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 function draw(img,crop){const w=img.width,h=img.height,cw=w*crop,ch=h*crop,s=Math.min(224/cw,224/ch),dw=cw*s,dh=ch*s;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,224,224);ctx.drawImage(img,(w-cw)/2,(h-ch)/2,cw,ch,(224-dw)/2,(224-dh)/2,dw,dh)}
 function look(model,img,crop=1){draw(img,crop);return tf.tidy(()=>model.execute(tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0),FEATURES).reshape([-1]).dataSync().slice())}
 // Compared after taking away what all the shop's photos share (white background, studio light), so the
 // part itself decides: on the shop's own photos this raised the right product to first place more often.
 const centred=(v,mean)=>{const out=new Float32Array(v.length);let n=0;for(let i=0;i<v.length;i++){out[i]=v[i]-mean[i];n+=out[i]*out[i]}n=Math.sqrt(n)+1e-6;for(let i=0;i<v.length;i++)out[i]/=n;return out};
 async function bitmap(blob){if(window.createImageBitmap){try{return await createImageBitmap(blob)}catch(_){}}
  return new Promise((resolve,reject)=>{const img=new Image(),u=URL.createObjectURL(blob);img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('image'))};img.src=u})}

 // Looks of the shop's photos, stored on the phone (photo addresses never change their picture).
 const db=new Promise(resolve=>{try{const r=indexedDB.open('gearhub-photo-scan',1);r.onupgradeneeded=()=>r.result.createObjectStore('looks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch(_){resolve(null)}});
 const idb=async(mode,fn)=>{const d=await db;if(!d)return null;return new Promise(resolve=>{const tx=d.transaction('looks',mode),req=fn(tx.objectStore('looks'));tx.oncomplete=()=>resolve(req?.result??null);tx.onerror=()=>resolve(null)})};
 async function shopLooks(model){
  const list=(typeof products!=='undefined'?products:[]).flatMap(p=>(Array.isArray(p.imageUrls)?p.imageUrls:[]).map(url=>({id:p.id,url})));
  const out=[];let done=0;
  for(const item of list){
   let v=await idb('readonly',s=>s.get(KEY+item.url));
   if(!v){try{const r=await fetch(item.url);if(r.ok){const img=await bitmap(await r.blob());v=look(model,img);img.close?.();await idb('readwrite',s=>s.put(v,KEY+item.url))}}catch(_){}}
   if(v)out.push({id:item.id,v});done++;
   if(done%6===0||done===list.length){show(t('Learning the shop\'s photos…','ဆိုင်ရဲ့ ပစ္စည်းပုံတွေကို မှတ်နေပါတယ်…'),done+' / '+list.length+t(' (first time only)',' (ပထမအကြိမ်သာ)'),done/Math.max(1,list.length));await new Promise(r=>setTimeout(r))}
  }
  return out;
 }
 const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};

 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  panel.querySelector('.photo-scan-thumb').src=URL.createObjectURL(file);
  show(t('Reading the photo…','ပုံကို ဖတ်နေပါတယ်…'),'',0);button.disabled=true;
  try{
   const model=await load(),img=await bitmap(file);
   // The whole photo and two closer views of its middle (the part is usually in the centre, with the
   // table or hands around it).
   const raw=[1,.7,.55].map(crop=>look(model,img,crop));img.close?.();
   const looks=await shopLooks(model),best=new Map();if(!looks.length){show(t('No product photos to compare','တိုက်စရာ ပစ္စည်းပုံ မရှိပါ'),'');return}
   const mean=new Float32Array(looks[0].v.length);for(const {v} of looks)for(let i=0;i<v.length;i++)mean[i]+=v[i]/looks.length;
   const queries=raw.map(q=>centred(q,mean));
   for(const {id,v} of looks){const c=centred(v,mean),s=Math.max(...queries.map(q=>dot(q,c)));if(!(best.get(id)>=s))best.set(id,s)}
   const ranked=[...best].sort((a,b)=>b[1]-a[1]).slice(0,12);
   if(!ranked.length){show(t('No product photos to compare','တိုက်စရာ ပစ္စည်းပုံ မရှိပါ'),'');return}
   window.photoScanIds=ranked.map(r=>r[0]);
   const name=(typeof products!=='undefined'?products:[]).find(p=>p.id===ranked[0][0]);
   show(t('Closest match: ','အတူဆုံး: ')+((my()?name?.name_my:name?.name_en)||name?.name_en||''),t('Most similar first · ✕ to show all','အတူဆုံးကို ရှေ့ဆုံးပြထားပါတယ် · ✕ နှိပ်ရင် အကုန်ပြန်ပြ'));
   if(typeof renderProducts==='function')renderProducts();
   document.getElementById('products')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){show(t('Photo search could not start','ပုံနဲ့ရှာတာ မစနိုင်ပါ'),t('Connect to the internet once, then try again.','Internet တစ်ခါ ချိတ်ပြီး ပြန်ကြိုးစားပါ။'))}
  finally{button.disabled=false}
 });
})();
