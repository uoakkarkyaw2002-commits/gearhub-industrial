/* 1.1.331 owner: "the app feels slow".
   1. Ready in the background: a few seconds after the shop opens (when the phone is idle and not on Data
      saver / 2G), Discover, the Profile and the first product photos are downloaded quietly, so they open
      at once when the user taps them. Photos use the same addresses as the page (kept for a year).
   2. Settings → App speed: a list of the fastest each part can be next to how fast it is right now. */
(()=>{
 const share=document.getElementById('share-store-action');if(!share)return;
 const my=()=>document.documentElement.lang==='my';
 const T={en:{title:'App speed',help:'Fastest possible vs right now',item:'',best:'Fastest',now:'Now',again:'Check again',checking:'Checking…',
   net:'Internet speed',server:'Server reply',open:'App opening',catalog:'Products list',photo:'Photo download',discover:'Discover',profile:'Profile',ready:'Background ready',
   readyNote:'Discover, Profile and the first photos are downloaded in the background, so they open at once.',saver:'Data saver is on: nothing is downloaded in the background.',
   good:'Fast',ok:'OK',slow:'Slow',wait:'Not measured yet',preloaded:'Ready',notReady:'Not yet',photos:'photos',close:'Close',offline:'Offline'},
  my:{title:'App speed',help:'အမြန်ဆုံးနဲ့ အခုလက်ရှိ နှိုင်းယှဉ်ချက်',item:'',best:'အမြန်ဆုံး',now:'အခု',again:'ပြန်စစ်မယ်',checking:'စစ်နေပါတယ်…',
   net:'Internet speed',server:'Server တုံ့ပြန်ချိန်',open:'App ပွင့်ချိန်',catalog:'ပစ္စည်းစာရင်း',photo:'ပုံ download',discover:'Discover',profile:'Profile',ready:'ကြိုပြင်ထားမှု',
   readyNote:'Discover၊ Profile နဲ့ ပထမ ပုံတွေကို နောက်ကွယ်မှာ ကြို download ထားလို့ နှိပ်တာနဲ့ ချက်ချင်း ပွင့်ပါတယ်။',saver:'Data saver ဖွင့်ထားလို့ နောက်ကွယ်မှာ ဘာမှ ကြို download မလုပ်ပါ။',
   good:'မြန်',ok:'အသင့်အတင့်',slow:'နှေး',wait:'မတိုင်းရသေးပါ',preloaded:'အသင့်',notReady:'မပြီးသေး',photos:'ပုံ',close:'ပိတ်မယ်',offline:'Offline'}};
 const t=k=>T[my()?'my':'en'][k];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const saver=()=>Boolean(navigator.connection?.saveData)||/(^|-)2g$/.test(navigator.connection?.effectiveType||'');
 const warm={discover:null,profile:null,photos:{done:0,total:0},readyAt:0};
 let dataReadyAt=0;

 // --- 1. Ready in the background ---------------------------------------------------------------------
 const idle=fn=>('requestIdleCallback' in window?requestIdleCallback(fn,{timeout:4000}):setTimeout(fn,600));
 function preload(urls){
  // Three at a time, low priority, so the page the user is looking at always goes first.
  const list=[...new Set(urls.filter(u=>typeof u==='string'&&/^\/(?!\/)/.test(u)))];warm.photos.total+=list.length;
  let next=0;const one=()=>{if(next>=list.length)return Promise.resolve();const url=list[next++];
   return new Promise(done=>{const img=new Image();img.decoding='async';try{img.fetchPriority='low'}catch{}img.onload=img.onerror=()=>{warm.photos.done++;done()};img.src=url}).then(one)};
  return Promise.all([one(),one(),one()]);
 }
 let started=false;
 async function warmUp(){
  if(started||saver()||navigator.onLine===false)return;started=true;
  const firstPhotos=()=>{try{return (typeof products!=='undefined'&&Array.isArray(products)?products:[]).slice(0,30).map(p=>(p.imageUrls||[])[0])}catch{return []}};
  // The shop's own photos first (Home and Category), then Discover and the Profile with their photos.
  await preload(firstPhotos());
  try{const items=await window.GearHubShops?.warm?.();warm.discover=window.GearHubShops?.warmedMs?.()||0;
   await preload((items||[]).slice(0,10).flatMap(i=>[...(i.images||[]).slice(0,1),i.shop?.logo]))}catch{}
  try{const posts=await window.GearHubProfileWarm?.();warm.profile=1;await preload((posts||[]).slice(0,6).flatMap(p=>(p.images||[]).slice(0,4)))}catch{}
  warm.readyAt=Date.now();if(sheet.open)draw();
 }
 addEventListener('gearhub:data-ready',()=>{dataReadyAt=dataReadyAt||performance.now();setTimeout(()=>idle(warmUp),4000)});
 // If the shop's data was already on the page before this ran, start a little later anyway.
 addEventListener('load',()=>setTimeout(()=>idle(warmUp),9000),{once:true});
 if(document.readyState==='complete')setTimeout(()=>idle(warmUp),9000);

 // --- 2. Settings → App speed -------------------------------------------------------------------------
 const row=document.createElement('button');row.type='button';row.className='settings-row settings-row-button';row.id='app-speed-action';
 row.innerHTML='<span class="settings-icon" aria-hidden="true">⚡</span><span class="settings-copy"><strong></strong><small></small></span><span class="settings-chevron" aria-hidden="true">›</span>';
 share.after(row);
 const paintRow=()=>{row.querySelector('strong').textContent=t('title');row.querySelector('small').textContent=t('help')};paintRow();
 new MutationObserver(()=>{paintRow();if(sheet.open)draw()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const sheet=document.createElement('dialog');sheet.className='speed-sheet';document.body.append(sheet);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close()});
 const live={server:null,net:null};let checking=false;
 const ms=v=>v>=1000?(v/1000).toFixed(1)+' s':Math.round(v)+' ms';
 const timing=match=>{try{const list=performance.getEntriesByType('resource').filter(e=>match.test(e.name)&&e.duration>0);return list.length?list:null}catch{return null}};
 function rows(){
  const nav=(()=>{try{return performance.getEntriesByType('navigation')[0]}catch{return null}})();
  const opened=dataReadyAt||(nav&&nav.loadEventEnd)||0;
  const cat=timing(/\/api\/(products(\?|$)|platform\/store\/[^/?]+(\?|$))/);
  const pics=timing(/\/api\/platform\/images\/|\/uploads\//);
  const avgPhoto=pics?pics.reduce((n,e)=>n+e.duration,0)/pics.length:null;
  const netLast=live.net||window.GearHubNetSpeed?.last||null;
  const mbps=b=>(b/1024/1024).toFixed(b>=10*1048576?0:2)+' MB/s';
  // [label, fastest text, now text, level] — level: good / ok / slow / wait.
  const level=(v,good,ok,higher)=>v==null?'wait':higher?(v>=good?'good':v>=ok?'ok':'slow'):(v<=good?'good':v<=ok?'ok':'slow');
  return [
   [t('net'),'≥ 1 MB/s',navigator.onLine===false?t('offline'):netLast?mbps(netLast.bps):'–',navigator.onLine===false?'slow':netLast?level(netLast.bps,1048576,204800,true):'wait'],
   [t('server'),'≤ 300 ms',live.server!=null?ms(live.server):'–',level(live.server,300,800)],
   [t('open'),'≤ 2 s',opened?ms(opened):'–',level(opened||null,2000,4000)],
   [t('catalog'),'≤ 1 s',cat?ms(cat[0].duration):'–',level(cat?cat[0].duration:null,1000,2500)],
   [t('photo'),'≤ 300 ms',avgPhoto!=null?ms(avgPhoto)+' · '+pics.length+' '+t('photos'):'–',level(avgPhoto,300,900)],
   [t('discover'),'0 s ('+t('preloaded')+')',warm.discover!=null?t('preloaded')+' · '+ms(warm.discover):saver()?'–':t('notReady'),warm.discover!=null?'good':saver()?'wait':'ok'],
   [t('profile'),'0 s ('+t('preloaded')+')',warm.profile?t('preloaded'):saver()?'–':t('notReady'),warm.profile?'good':saver()?'wait':'ok'],
   [t('ready'),warm.photos.total?warm.photos.total+' '+t('photos'):'–',warm.photos.total?warm.photos.done+' / '+warm.photos.total+' '+t('photos'):saver()?'–':t('notReady'),warm.readyAt?'good':saver()?'wait':'ok']
  ];
 }
 function draw(){
  const word={good:t('good'),ok:t('ok'),slow:t('slow'),wait:t('wait')};
  sheet.innerHTML='<header><span aria-hidden="true">⚡</span><h2>'+t('title')+'</h2><button type="button" class="speed-x" aria-label="'+t('close')+'">×</button></header>'+
   '<div class="speed-table" role="table"><div class="speed-head" role="row"><span role="columnheader"></span><span role="columnheader">'+t('best')+'</span><span role="columnheader">'+t('now')+'</span></div>'+
   rows().map(([name,best,now,lv])=>'<div class="speed-line" role="row" data-level="'+lv+'"><span role="cell"><b>'+esc(name)+'</b></span><span role="cell">'+esc(best)+'</span><span role="cell"><em>'+esc(now)+'</em><small>'+esc(word[lv])+'</small></span></div>').join('')+'</div>'+
   '<p class="speed-note">'+esc(saver()?t('saver'):t('readyNote'))+'</p><button type="button" class="speed-again"'+(checking?' disabled':'')+'>'+(checking?t('checking'):t('again'))+'</button>';
  sheet.querySelector('.speed-x').onclick=()=>sheet.close();
  sheet.querySelector('.speed-again').onclick=check;
 }
 async function check(){
  if(checking)return;checking=true;draw();
  try{
   // Server reply: the quickest of three tiny requests (the first can include waking the connection).
   let best=null;for(let i=0;i<3;i++){const t0=performance.now();try{const r=await fetch('/api/app-release?speed='+Date.now()+i,{cache:'no-store',credentials:'omit'});await r.text();const d=performance.now()-t0;best=best==null?d:Math.min(best,d)}catch{}}
   live.server=best;
   if(!saver()&&navigator.onLine!==false){
    if(window.GearHubNetSpeed?.test)live.net=await window.GearHubNetSpeed.test().catch(()=>null);
    else{const t0=performance.now();try{const r=await fetch('/speed-test.bin?speed='+Date.now(),{cache:'no-store',credentials:'omit'});const b=await r.arrayBuffer();live.net={bps:b.byteLength/Math.max(.05,(performance.now()-t0)/1000)}}catch{}}
   }
  }finally{checking=false;if(sheet.open)draw()}
 }
 row.addEventListener('click',()=>{draw();sheet.showModal();check()});
 window.GearHubSpeed={warm,rows};
})();
