// Opening picture of a shop. It shows whenever the shop is opened (a new tab, a typed or shared
// link, a Home Screen start). During an app update it shows a quiet "Updating…" picture (no sound).
// On a reload or a quick move between pages it is a plain cover in the page colour (no picture,
// no sound). In every case it stays until the shop is drawn with its own name, banner and
// products and the pictures at the top have loaded, so GearHub's template never flashes.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const shop=location.pathname.match(/^\/shops\/([^/]+)/);
 const updateKey='gh-update-splash:'+(shop?'/shops/'+shop[1]+'/':'/');
 let updating=false;try{updating=sessionStorage.getItem(updateKey)==='1';if(updating)sessionStorage.removeItem(updateKey)}catch{}
 const message=node=>node.querySelector('.sky-splash-message');
 const prepareUpdate=node=>{
  node.classList.remove('is-quiet','is-leaving');node.classList.add('is-updating','is-waiting');node.removeAttribute('data-sound');
  const label=message(node);if(label)label.textContent='Updating…';
 };
 const template=el.cloneNode(true);
 window.GearHubSplash={showUpdating:()=>{
  let screen=document.getElementById('sky-splash');
  if(!screen){screen=template.cloneNode(true);document.body.prepend(screen)}
  prepareUpdate(screen);return screen;
 }};
 const nav=performance.getEntriesByType?.("navigation")?.[0];
 // Moving between pages of the same site within seconds is not "opening the shop" (the referrer is
 // hidden by the site's referrer policy, so the page leaves a timestamp when it is closed).
 let left=0;try{left=Number(sessionStorage.getItem("sky-left"))||0}catch{}
 addEventListener("pagehide",()=>{try{sessionStorage.setItem("sky-left",String(Date.now()))}catch{}});
 const quiet=!updating&&((nav&&nav.type!=="navigate")||Date.now()-left<8000);
 const seconds=updating?1.2:quiet?0:Math.min(10,Math.max(0.5,Number(el.dataset.seconds)||3));
 let audio=null;
 if(updating)prepareUpdate(el);
 else if(quiet){el.classList.add('is-quiet');el.removeAttribute('data-sound')}
 else if(el.dataset.sound){
  audio=new Audio(el.dataset.sound);audio.preload="auto";
  const gestures=["pointerdown","touchstart","keydown"];
  const start=()=>{if(!el.isConnected)return;audio.play().then(()=>gestures.forEach(g=>document.removeEventListener(g,start,true))).catch(()=>{})};
  // The sound starts by itself. Where the browser blocks that (an iPhone Home Screen start has no
  // touch yet) it starts silently on the first touch; no message is shown.
  audio.play().catch(()=>{if(!el.isConnected)return;gestures.forEach(g=>document.addEventListener(g,start,true))});
 }
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const loaded=img=>new Promise(r=>{if(img.complete)return r();img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true})});
 // Pictures in the first screen (photos and CSS backgrounds such as the banner and logo).
 function picturesReady(){
  const waits=[document.fonts?.ready],urls=new Set(),bottom=innerHeight*1.2;
  for(const node of document.body.querySelectorAll('*')){
   if(node===el||el.contains(node))continue;
   const box=node.getBoundingClientRect();if(!box.width||box.bottom<0||box.top>bottom)continue;
   if(node.tagName==='IMG'&&node.loading!=='lazy')waits.push(loaded(node));
   for(const part of [null,'::before','::after'])for(const m of getComputedStyle(node,part).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(m[1]);
  }
  for(const url of urls){const img=new Image();img.src=url;waits.push(loaded(img))}
  return Promise.race([Promise.all(waits),wait(2500)]);
 }
 let gone=false;
 const leave=()=>{if(gone)return;gone=true;el.classList.add("is-leaving");if(audio)audio.pause();setTimeout(()=>el.remove(),quiet?250:550)};
 // store.js sends "gearhub:store-shown" once the shop's own data is on the page (or the offline
 // copy / an error message is). Never hold the page for more than 12 seconds.
 const shown=new Promise(r=>{addEventListener('gearhub:store-shown',r,{once:true});setTimeout(r,12000)});
 Promise.all([shown.then(picturesReady),wait(seconds*1000)]).then(leave);
 // Past the opening time the bar keeps moving instead of sitting full.
 if(!updating&&!quiet)setTimeout(()=>el.classList.add('is-waiting'),seconds*1000);
})();
