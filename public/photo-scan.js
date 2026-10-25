// Photo scan (owner's request): the button at the right of the search bar opens the camera at once and
// keeps looking, like the iPhone code scanner; a gallery button picks a saved photo instead. The product
// that looks most like it is highlighted in the list, like a match found by Excel search, and ˄ ˅ step
// to the next closest ones.
// Runs on the phone: TensorFlow.js + MobileNet v2 (public/vendor, uint8 weights ~2 MB) turn every picture
// into a "look" (1280 numbers). The shop's photos are learned quietly in the background after the shop
// opens and kept in IndexedDB, so a scan answers at once.
(()=>{
 const pill=document.querySelector('.mobile-search .search-pill');if(!pill)return;
 const MODEL='/vendor/mobilenet/model.json?v=mnv2-050-1',TF='/vendor/tf.min.js?v=4.22.0',FEATURES='module_apply_default/MobilenetV2/Logits/AvgPool',KEY='mnv2-050-2:';
 const my=()=>document.documentElement.lang==='my',t=(en,mm)=>my()?mm:en;
 const shopProducts=()=>typeof products!=='undefined'&&Array.isArray(products)?products:[];

 // ---- Model and looks -------------------------------------------------------------------------------
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
 const canvas=document.createElement('canvas');canvas.width=canvas.height=224;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 // Fitted on white like the shop's product photos; `crop` keeps the middle part of the picture or region.
 function draw(img,crop,region){const w=region?region[2]:img.videoWidth||img.width,h=region?region[3]:img.videoHeight||img.height,x0=region?region[0]:0,y0=region?region[1]:0,cw=w*crop,ch=h*crop,s=Math.min(224/cw,224/ch),dw=cw*s,dh=ch*s;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,224,224);ctx.drawImage(img,x0+(w-cw)/2,y0+(h-ch)/2,cw,ch,(224-dw)/2,(224-dh)/2,dw,dh)}
 function look(model,img,crop=1,region){draw(img,crop,region);return tf.tidy(()=>model.execute(tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0),FEATURES).reshape([-1]).dataSync().slice())}
 // Compared after taking away what all the shop's photos share (white background, studio light), so the
 // part itself decides: on the shop's own photos this put the right product first more often.
 const centred=(v,mean)=>{const out=new Float32Array(v.length);let n=0;for(let i=0;i<v.length;i++){out[i]=v[i]-mean[i];n+=out[i]*out[i]}n=Math.sqrt(n)+1e-6;for(let i=0;i<v.length;i++)out[i]/=n;return out};
 const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
 async function bitmap(blob){if(window.createImageBitmap){try{return await createImageBitmap(blob)}catch(_){}}
  return new Promise((resolve,reject)=>{const img=new Image(),u=URL.createObjectURL(blob);img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('image'))};img.src=u})}
 const db=new Promise(resolve=>{try{const r=indexedDB.open('gearhub-photo-scan',1);r.onupgradeneeded=()=>r.result.createObjectStore('looks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch(_){resolve(null)}});
 const idb=async(mode,fn)=>{const d=await db;if(!d)return null;return new Promise(resolve=>{const tx=d.transaction('looks',mode),req=fn(tx.objectStore('looks'));tx.oncomplete=()=>resolve(req?.result??null);tx.onerror=()=>resolve(null)})};

 // Every photo of every product (several angles per product), learned once in the background.
 const shop=new Map();let learning=null,hurry=false,index=null;
 function learn(){return learning||(learning=(async()=>{
  const model=await load(),items=shopProducts().flatMap(p=>(Array.isArray(p.imageUrls)?p.imageUrls:[]).map(url=>({id:p.id,url})));
  for(const item of items){
   if(shop.has(item.url))continue;
   let v=await idb('readonly',s=>s.get(KEY+item.url));
   if(!v){try{const r=await fetch(item.url);if(r.ok){const img=await bitmap(await r.blob());v=look(model,img);img.close?.();await idb('readwrite',s=>s.put(v,KEY+item.url))}}catch(_){}
    // Unhurried while nobody is scanning, so the shop stays smooth.
    if(!hurry)await new Promise(r=>setTimeout(r,120))}
   if(v){shop.set(item.url,{id:item.id,v});index=null}
  }
 })().finally(()=>{learning=null}))}
 function shopIndex(){if(index)return index;const list=[...shop.values()];if(!list.length)return null;
  const mean=new Float32Array(list[0].v.length);for(const {v} of list)for(let i=0;i<v.length;i++)mean[i]+=v[i]/list.length;
  return index={mean,list:list.map(({id,v})=>({id,v:centred(v,mean)}))}}
 function rank(raws){const ix=shopIndex();if(!ix)return[];const qs=raws.map(r=>centred(r,ix.mean)),best=new Map();
  for(const {id,v} of ix.list){const s=Math.max(...qs.map(q=>dot(q,v)));if(!(best.get(id)>=s))best.set(id,s)}
  return[...best].sort((a,b)=>b[1]-a[1])}
 // Start learning a few seconds after the shop opens (and again when products change).
 let lastCount=-1;
 setInterval(()=>{const n=shopProducts().length;if(!n||n===lastCount||learning)return;lastCount=n;(window.requestIdleCallback||setTimeout)(()=>learn().catch(()=>{}),{timeout:4000})},5000);

 // ---- Search bar button and the result strip (Excel-search style) -----------------------------------
 const button=document.createElement('button');button.type='button';button.className='photo-scan-button';button.setAttribute('aria-label','Search by photo');button.title='Search by photo';
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 const gallery=document.createElement('input');gallery.type='file';gallery.accept='image/*';gallery.hidden=true;
 pill.append(button,gallery);
 const strip=document.createElement('div');strip.className='photo-scan-panel';strip.hidden=true;strip.setAttribute('role','status');
 strip.innerHTML='<img class="photo-scan-thumb" alt=""><div class="photo-scan-copy"><strong></strong><small></small></div><button type="button" class="photo-scan-step" data-step="-1" aria-label="Previous match">˄</button><button type="button" class="photo-scan-step" data-step="1" aria-label="Next match">˅</button><button type="button" class="photo-scan-clear" aria-label="Clear photo search">✕</button>';
 pill.closest('.mobile-search').after(strip);
 let matches=[],at=0;
 const card=id=>document.querySelector('#products [data-product-id="'+id+'"]')?.closest('article');
 function highlight(){
  document.querySelectorAll('#products article.photo-match').forEach(a=>a.classList.remove('photo-match'));
  if(!matches.length)return;const id=matches[at][0],p=shopProducts().find(x=>x.id===id);
  strip.hidden=false;strip.querySelector('strong').textContent=(at===0?t('Best match: ','အတူဆုံး: '):(at+1)+'. ')+((my()?p?.name_my:p?.name_en)||p?.name_en||'');
  strip.querySelector('small').textContent=(at+1)+' / '+matches.length+(p?.sku?' · '+p.sku:'');
  let el=card(id);
  // The match may be hidden by a search word or category: show the whole list, like Excel keeps every row.
  if(!el&&typeof renderProducts==='function'){const q=document.getElementById('search'),c=document.getElementById('category');if(q)q.value='';if(c)c.value='';renderProducts();el=card(id)}
  if(el){el.classList.add('photo-match');el.scrollIntoView({behavior:'smooth',block:'center'})}
 }
 strip.addEventListener('click',e=>{const step=e.target.closest('[data-step]');if(step&&matches.length){at=(at+Number(step.dataset.step)+matches.length)%matches.length;highlight();return}
  if(e.target.closest('.photo-scan-clear')){matches=[];strip.hidden=true;document.querySelectorAll('#products article.photo-match').forEach(a=>a.classList.remove('photo-match'))}});
 // The shop redraws its list now and then (refresh, language): put the highlight back on the new card.
 const list=document.getElementById('products');if(list)new MutationObserver(()=>{if(!matches.length)return;const el=card(matches[at][0]);if(el&&!el.classList.contains('photo-match'))el.classList.add('photo-match')}).observe(list,{childList:true});
 function found(list,thumb){matches=list.slice(0,5);at=0;if(thumb)strip.querySelector('.photo-scan-thumb').src=thumb;highlight()}

 // ---- Live camera scanner ---------------------------------------------------------------------------
 const view=document.createElement('div');view.className='photo-scanner';view.hidden=true;
 view.innerHTML='<video playsinline muted autoplay></video><div class="photo-scanner-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+
  '<button type="button" class="photo-scanner-close" aria-label="Close">✕</button><p class="photo-scanner-hint"></p>'+
  '<div class="photo-scanner-bar"><button type="button" class="photo-scanner-gallery" aria-label="Choose from photos"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="m4 17 5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>'+
  '<button type="button" class="photo-scanner-torch" aria-label="Flashlight" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v3l-2 3v11a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9L8 6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><span></span></div>';
 document.body.append(view);
 const video=view.querySelector('video'),hint=view.querySelector('.photo-scanner-hint'),torch=view.querySelector('.photo-scanner-torch'),frame=view.querySelector('.photo-scanner-frame');
 let stream=null,loop=0,votes=[];
 function stop(){clearTimeout(loop);loop=0;hurry=false;stream?.getTracks().forEach(tr=>tr.stop());stream=null;video.srcObject=null;view.hidden=true;document.documentElement.classList.remove('photo-scanner-open')}
 async function open(){
  view.hidden=false;document.documentElement.classList.add('photo-scanner-open');hint.textContent=t('Point the camera at the part','ကင်မရာကို ပစ္စည်းဆီ ချိန်ပါ');votes=[];hurry=true;
  load().then(()=>learn()).catch(()=>{});
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
  catch(_){hint.textContent=t('Camera not allowed. Choose a photo instead.','ကင်မရာ ခွင့်မပြုထားပါ။ ပုံကို ရွေးပါ။');return}
  if(view.hidden){stream.getTracks().forEach(tr=>tr.stop());stream=null;return}
  video.srcObject=stream;try{await video.play()}catch(_){}
  const caps=stream.getVideoTracks()[0]?.getCapabilities?.();torch.hidden=!caps?.torch;
  tick();
 }
 // The part inside the corner frame, as the video shows it (the video fills the screen, cropped).
 function frameRegion(){const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)return null;const vb=video.getBoundingClientRect(),fb=frame.getBoundingClientRect(),s=Math.max(vb.width/vw,vb.height/vh),ox=(vb.width-vw*s)/2,oy=(vb.height-vh*s)/2;
  return[Math.max(0,(fb.left-vb.left-ox)/s),Math.max(0,(fb.top-vb.top-oy)/s),Math.min(vw,fb.width/s),Math.min(vh,fb.height/s)]}
 // Keeps looking; a product that stays first for 3 looks in a row, clearly ahead of the next, is the answer.
 async function tick(){
  if(view.hidden)return;
  try{const model=await load(),region=frameRegion();
   // Only once every photo is learned, so a half-learned shop cannot give a wrong answer.
   if(region&&shopIndex()&&!learning){const r=rank([look(model,video,1,region),look(model,video,.7,region)]);
    if(r.length>1){const [id,score]=r[0],lead=score-r[1][1];votes.push(lead>0.02?id:null);votes=votes.slice(-3);
     hint.textContent=t('Looking…','ရှာနေပါတယ်…');
     if(votes.length===3&&votes.every(v=>v===id)){const thumb=snapshot(region);stop();found(r,thumb);return}}}
   else hint.textContent=t('Getting ready…','ပြင်ဆင်နေပါတယ်…');
  }catch(_){}
  loop=setTimeout(tick,350);
 }
 function snapshot(region){const c=document.createElement('canvas');c.width=c.height=120;const s=Math.min(120/region[2],120/region[3]);c.getContext('2d').drawImage(video,region[0],region[1],region[2],region[3],(120-region[2]*s)/2,(120-region[3]*s)/2,region[2]*s,region[3]*s);try{return c.toDataURL('image/jpeg',.7)}catch(_){return''}}
 view.querySelector('.photo-scanner-close').addEventListener('click',stop);
 view.querySelector('.photo-scanner-gallery').addEventListener('click',()=>gallery.click());
 torch.addEventListener('click',async()=>{const track=stream?.getVideoTracks()[0];if(!track)return;const on=!torch.classList.contains('on');try{await track.applyConstraints({advanced:[{torch:on}]});torch.classList.toggle('on',on)}catch(_){}});
 button.addEventListener('click',()=>{if(navigator.mediaDevices?.getUserMedia)open();else gallery.click()});

 // A saved photo: the whole picture and two closer views of its middle.
 gallery.addEventListener('change',async()=>{
  const file=gallery.files?.[0];gallery.value='';if(!file)return;
  hurry=true;if(!view.hidden)hint.textContent=t('Reading the photo…','ပုံကို ဖတ်နေပါတယ်…');
  else{strip.hidden=false;strip.querySelector('.photo-scan-thumb').src=URL.createObjectURL(file);strip.querySelector('strong').textContent=t('Searching…','ရှာနေပါတယ်…');strip.querySelector('small').textContent=''}
  try{const model=await load(),img=await bitmap(file),raws=[1,.7,.55].map(crop=>look(model,img,crop));img.close?.();
   if(!shopIndex()||learning)await learn();
   const r=rank(raws);stop();if(r.length)found(r,URL.createObjectURL(file));
  }catch(_){hint.textContent=t('Photo search could not start. Connect to the internet once.','ပုံနဲ့ရှာတာ မစနိုင်ပါ။ Internet တစ်ခါ ချိတ်ပါ။')}
  finally{hurry=!view.hidden}
 });
})();
