// Photo scan (owner's request): the button at the right of the search bar opens the camera at once and
// keeps looking, like the iPhone code scanner; a gallery button picks a saved photo instead. The product
// that looks most like it is highlighted in the list, like a match found by Excel search, and ˄ ˅ step
// to the next closest ones. A seconds count runs while it looks; a match says how long it took and
// why it matches; after 15 s without one it stops and says there is no match, and why.
// The comparing is done by the shop's server (lib/photo-search.js, DINOv2 image model) against every
// photo of every product; the phone only sends the part inside the frame.
(()=>{
 const pill=document.querySelector('.mobile-search .search-pill');if(!pill)return;
 const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];if(!slug)return;// seller shops only
 const API='/api/platform/store/'+encodeURIComponent(decodeURIComponent(slug))+'/photo-search';
 // A frame counts once the best photo scores this high and clearly ahead of the next product
 // (real matches scored ~0.9 on the shop's photos; blank or blurred frames ~0.35).
 const SURE=0.6,LEAD=0.03,LIMIT=15000;
 const isSure=(a,b)=>!!a&&a.score>=SURE&&(!b||a.score-b.score>=LEAD);
 const my=()=>document.documentElement.lang==='my',t=(en,mm)=>my()?mm:en;
 const shopProducts=()=>typeof products!=='undefined'&&Array.isArray(products)?products:[];
 const productOf=id=>shopProducts().find(x=>String(x.id)===String(id)),nameOf=id=>{const p=productOf(id);return (my()?p?.name_my:p?.name_en)||p?.name_en||''};
 const pct=score=>Math.round(score*100)+'%',secs=s=>s.toFixed(1)+t(' s',' စက္ကန့်');
 // Why a product matches: how alike the picture is to which of its photos (the server's image model
 // compares shape, colour and surface), and how far ahead of the next product it is.
 function why(m,next){
  const photo=m.photo?(my()?'ပုံ '+m.photo+'/'+m.photos+' နဲ့ ':' to its photo '+m.photo+' of '+m.photos):'',close=m.view?t(' (close-up of the middle)',' (အလယ်ကို အနီးကပ်)'):'';
  const lead=next?t('; next closest product '+pct(next.score),'။ ဒုတိယ အတူဆုံး '+pct(next.score)):'';
  return t('Why: '+pct(m.score)+' alike in shape, colour and surface'+photo+close+lead,'ဘာကြောင့်: '+photo+'ပုံသဏ္ဌာန်၊ အရောင်၊ မျက်နှာပြင် '+pct(m.score)+' တူ'+close+lead);
 }

 let token=null;
 async function csrf(){if(token)return token;const me=await (await fetch('/api/platform/me',{credentials:'same-origin'})).json();return token=me.csrfToken}
 // Sends a picture (JPEG) and returns {ready, matches:[{id,score}]} or {ready:false} while learning.
 async function ask(blob){
  const send=async()=>fetch(API,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'image/jpeg','X-CSRF-Token':await csrf()},body:blob});
  let r=await send();if(r.status===403){token=null;r=await send()}
  if(!r.ok)throw Error('photo search '+r.status);return r.json();
 }
 // Pictures are made smaller (longest side 640) before sending: faster on mobile data, same answer.
 function jpeg(source,sx,sy,sw,sh){const s=Math.min(1,640/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.round(sw*s);c.height=Math.round(sh*s);
  c.getContext('2d').drawImage(source,sx,sy,sw,sh,0,0,c.width,c.height);return new Promise(res=>c.toBlob(res,'image/jpeg',.85))}

 // ---- Search bar button and the result strip (Excel-search style) -----------------------------------
 const button=document.createElement('button');button.type='button';button.className='photo-scan-button';button.setAttribute('aria-label','Search by photo');button.title='Search by photo';
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 const gallery=document.createElement('input');gallery.type='file';gallery.accept='image/*';gallery.hidden=true;
 pill.append(button,gallery);
 const strip=document.createElement('div');strip.className='photo-scan-panel';strip.hidden=true;strip.setAttribute('role','status');
 strip.innerHTML='<img class="photo-scan-thumb" alt=""><div class="photo-scan-copy"><strong></strong><small></small></div><button type="button" class="photo-scan-step" data-step="-1" aria-label="Previous match">˄</button><button type="button" class="photo-scan-step" data-step="1" aria-label="Next match">˅</button><button type="button" class="photo-scan-clear" aria-label="Clear photo search">✕</button><span class="photo-scan-why"></span>';
 pill.closest('.mobile-search').after(strip);
 const say=(head,sub,reason)=>{strip.hidden=false;strip.querySelector('strong').textContent=head;strip.querySelector('small').textContent=sub||'';strip.querySelector('.photo-scan-why').textContent=reason||'';strip.querySelectorAll('.photo-scan-step').forEach(b=>b.hidden=matches.length<2)};
 let matches=[],at=0,took=0;
 const card=id=>document.querySelector('#products [data-product-id="'+id+'"]')?.closest('article');
 function highlight(){
  document.querySelectorAll('#products article.photo-match').forEach(a=>a.classList.remove('photo-match'));
  if(!matches.length)return;const m=matches[at],p=productOf(m.id);
  say(nameOf(m.id),(at===0?t('Best match','အတူဆုံး'):(at+1)+' / '+matches.length)+' · '+t('found in ','')+secs(took)+t('',' နဲ့ တွေ့')+(p?.sku?' · '+p.sku:''),why(m,at===0?matches[1]:null));
  let el=card(m.id);
  // The match may be hidden by a search word or category: show the whole list, like Excel keeps every row.
  if(!el&&typeof renderProducts==='function'){const q=document.getElementById('search'),c=document.getElementById('category');if(q)q.value='';if(c)c.value='';renderProducts();el=card(m.id)}
  if(el){el.classList.add('photo-match');el.scrollIntoView({behavior:'smooth',block:'center'})}
 }
 strip.addEventListener('click',e=>{const step=e.target.closest('[data-step]');if(step&&matches.length){at=(at+Number(step.dataset.step)+matches.length)%matches.length;highlight();return}
  if(e.target.closest('.photo-scan-clear')){matches=[];strip.hidden=true;document.querySelectorAll('#products article.photo-match').forEach(a=>a.classList.remove('photo-match'))}});
 // The shop redraws its list now and then (refresh, language): put the highlight back on the new card.
 const list=document.getElementById('products');if(list)new MutationObserver(()=>{if(!matches.length)return;const el=card(matches[at].id);if(el&&!el.classList.contains('photo-match'))el.classList.add('photo-match')}).observe(list,{childList:true});
 function found(list,thumb,seconds){matches=list;at=0;took=seconds;if(thumb)strip.querySelector('.photo-scan-thumb').src=thumb;highlight()}
 // Nothing sure: say so, how long it looked and why (the closest product was not alike enough, was
 // seen only for a moment, or two products looked the same).
 function none(thumb,seconds,best){
  matches=[];document.querySelectorAll('#products article.photo-match').forEach(a=>a.classList.remove('photo-match'));if(thumb)strip.querySelector('.photo-scan-thumb').src=thumb;
  const reason=!best?t('Why: nothing in the picture looked like a product photo','ဘာကြောင့်: ပုံထဲမှာ ပစ္စည်းပုံနဲ့ တူတာ မတွေ့ပါ')
   :best.score<SURE?t('Why: the closest, '+nameOf(best.id)+', is only '+pct(best.score)+' alike (needs '+pct(SURE)+')','ဘာကြောင့်: အနီးဆုံး '+nameOf(best.id)+' က '+pct(best.score)+' ပဲ တူတယ် ('+pct(SURE)+' လိုတယ်)')
   :best.score-best.next>=LEAD?t('Why: '+nameOf(best.id)+' looked '+pct(best.score)+' alike only for a moment; hold the camera still','ဘာကြောင့်: '+nameOf(best.id)+' က '+pct(best.score)+' တူပေမဲ့ ခဏပဲ မြင်ရတယ်။ ကင်မရာကို ငြိမ်ငြိမ် ကိုင်ပါ')
   :t('Why: two products look almost the same ('+pct(best.score)+' and '+pct(best.next)+'); hold the part closer','ဘာကြောင့်: ပစ္စည်း ၂ ခု အရမ်းတူနေတယ် ('+pct(best.score)+' နဲ့ '+pct(best.next)+')။ ပစ္စည်းကို ပိုနီးနီး ချိန်ပါ');
  say(t('No match found','တူတာ မရှိပါ'),t('Searched ','')+secs(seconds)+t('',' ရှာပြီး'),reason);
 }

 // ---- Live camera scanner ---------------------------------------------------------------------------
 const view=document.createElement('div');view.className='photo-scanner';view.hidden=true;
 view.innerHTML='<video playsinline muted autoplay></video><div class="photo-scanner-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+
  '<button type="button" class="photo-scanner-close" aria-label="Close">✕</button><p class="photo-scanner-hint"></p>'+
  '<div class="photo-scanner-bar"><button type="button" class="photo-scanner-gallery" aria-label="Choose from photos"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="m4 17 5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>'+
  '<button type="button" class="photo-scanner-torch" aria-label="Flashlight" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v3l-2 3v11a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9L8 6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><span></span></div>';
 document.body.append(view);
 const video=view.querySelector('video'),hint=view.querySelector('.photo-scanner-hint'),torch=view.querySelector('.photo-scanner-torch'),frame=view.querySelector('.photo-scanner-frame');
 let stream=null,loop=0,last=null,pageY=0,started=0,clock=0,bestSeen=null;
 const elapsed=()=>(performance.now()-started)/1000;
 const looking=()=>{hint.textContent=t('Looking… ','ရှာနေပါတယ်… ')+Math.floor(elapsed())+t(' s',' စက္ကန့်')};
 // Closing the scanner returns to where the page was (iPhone forgets it while the page is locked).
 function stop(){clearTimeout(loop);loop=0;clearInterval(clock);clock=0;stream?.getTracks().forEach(tr=>tr.stop());stream=null;video.srcObject=null;const wasOpen=!view.hidden;view.hidden=true;document.documentElement.classList.remove('photo-scanner-open');if(wasOpen)scrollTo(0,pageY)}
 async function open(){
  pageY=scrollY;view.hidden=false;document.documentElement.classList.add('photo-scanner-open');hint.textContent=t('Point the camera at the part','ကင်မရာကို ပစ္စည်းဆီ ချိန်ပါ');last=null;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
  catch(_){hint.textContent=t('Camera not allowed. Choose a photo instead.','ကင်မရာ ခွင့်မပြုထားပါ။ ပုံကို ရွေးပါ။');return}
  if(view.hidden){stream.getTracks().forEach(tr=>tr.stop());stream=null;return}
  video.srcObject=stream;try{await video.play()}catch(_){}
  const caps=stream.getVideoTracks()[0]?.getCapabilities?.();torch.hidden=!caps?.torch;
  started=performance.now();bestSeen=null;clearInterval(clock);clock=setInterval(()=>{if(started)looking()},1000);
  loop=setTimeout(tick,600);// let the camera settle and focus first
 }
 // The part inside the corner frame, as the video shows it (the video fills the screen, cropped).
 function frameRegion(){const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)return null;const vb=video.getBoundingClientRect(),fb=frame.getBoundingClientRect(),s=Math.max(vb.width/vw,vb.height/vh),ox=(vb.width-vw*s)/2,oy=(vb.height-vh*s)/2;
  const x=Math.max(0,(fb.left-vb.left-ox)/s),y=Math.max(0,(fb.top-vb.top-oy)/s);return[x,y,Math.min(vw-x,fb.width/s),Math.min(vh-y,fb.height/s)]}
 // Keeps looking (one frame at a time): the same product sure twice in a row is the answer.
 async function tick(){
  if(view.hidden)return;let wait=250;
  try{const region=frameRegion();
   if(region){const blob=await jpeg(video,...region),r=await ask(blob);if(view.hidden)return;
    // While the shop's photos are being learned the count waits (it starts again when ready).
    if(!r.ready){hint.textContent=t('Getting ready…','ပြင်ဆင်နေပါတယ်…');started=0;wait=1500}
    else{if(!started)started=performance.now();const [a,b]=r.matches,sure=isSure(a,b);
     if(a&&!(bestSeen?.score>=a.score))bestSeen={id:a.id,score:a.score,next:b?b.score:0};
     if(sure&&last===a.id){const seconds=elapsed(),thumb=URL.createObjectURL(blob);stop();found(r.matches,thumb,seconds);return}
     last=sure?a.id:null;
     if(elapsed()*1000>=LIMIT){const seconds=elapsed(),thumb=URL.createObjectURL(blob);stop();none(thumb,seconds,bestSeen);return}
     looking()}}
  }catch(_){if(navigator.onLine===false)hint.textContent=t('Photo search needs the internet.','ပုံနဲ့ရှာဖို့ Internet လိုပါတယ်။');else if(started)looking();wait=1500}
  loop=setTimeout(tick,wait);
 }
 view.querySelector('.photo-scanner-close').addEventListener('click',stop);
 view.querySelector('.photo-scanner-gallery').addEventListener('click',()=>gallery.click());
 torch.addEventListener('click',async()=>{const track=stream?.getVideoTracks()[0];if(!track)return;const on=!torch.classList.contains('on');try{await track.applyConstraints({advanced:[{torch:on}]});torch.classList.toggle('on',on)}catch(_){}});
 button.addEventListener('click',()=>{if(navigator.mediaDevices?.getUserMedia)open();else gallery.click()});

 // A saved photo: timed like the camera; when no product is a sure match it says so, and why.
 gallery.addEventListener('change',async()=>{
  const file=gallery.files?.[0];gallery.value='';if(!file)return;
  const thumb=URL.createObjectURL(file),begin=performance.now();stop();strip.querySelector('.photo-scan-thumb').src=thumb;say(t('Searching…','ရှာနေပါတယ်…'));
  try{const img=await createImageBitmap(file),blob=await jpeg(img,0,0,img.width,img.height);img.close?.();
   let r=await ask(blob);for(let i=0;i<40&&!r.ready;i++){say(t('Getting ready…','ပြင်ဆင်နေပါတယ်…'));await new Promise(q=>setTimeout(q,1500));r=await ask(blob)}
   const seconds=(performance.now()-begin)/1000,[a,b]=r.ready?r.matches:[];
   if(isSure(a,b))found(r.matches,thumb,seconds);else none(thumb,seconds,a?{id:a.id,score:a.score,next:b?b.score:0}:null);
  }catch(_){say(t('Photo search could not run','ပုံနဲ့ရှာတာ မရပါ'),navigator.onLine===false?t('It needs the internet.','Internet လိုပါတယ်။'):t('Try again.','ပြန်ကြိုးစားပါ။'))}
 });
})();
