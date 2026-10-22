// Opening picture of a shop. It shows whenever the shop is opened (a new tab, a typed or shared
// link, a Home Screen start) and not on a reload or when moving between pages of the same site.
// During an app update it stays visible with a quiet "Updating…" message until the new page loads.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const shop=location.pathname.match(/^\/shops\/([^/]+)/);
 const updateKey='gh-update-splash:'+(shop?'/shops/'+shop[1]+'/':'/');
 let updating=false;try{updating=sessionStorage.getItem(updateKey)==='1';if(updating)sessionStorage.removeItem(updateKey)}catch{}
 const message=node=>node.querySelector('.sky-splash-message');
 const prepareUpdate=node=>{
  node.classList.add('is-updating');node.removeAttribute('data-sound');
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
 if(!updating&&((nav&&nav.type!=="navigate")||Date.now()-left<8000)){el.remove();return}
 const seconds=updating?0.8:Math.min(10,Math.max(0.5,Number(el.dataset.seconds)||3));
 let audio=null;
 if(updating)prepareUpdate(el);
 else if(el.dataset.sound){
  audio=new Audio(el.dataset.sound);audio.preload="auto";
  const gestures=["pointerdown","touchstart","keydown"];
  const start=()=>{if(!el.isConnected)return;audio.play().then(()=>gestures.forEach(g=>document.removeEventListener(g,start,true))).catch(()=>{})};
  // The sound starts by itself. Where the browser blocks that (an iPhone Home Screen start has no
  // touch yet) it starts silently on the first touch; no message is shown.
  audio.play().catch(()=>{if(!el.isConnected)return;gestures.forEach(g=>document.addEventListener(g,start,true))});
 }
 const leave=()=>{el.classList.add("is-leaving");if(audio)audio.pause();setTimeout(()=>el.remove(),550)};
 if(updating){
  const started=Date.now();
  addEventListener('load',()=>setTimeout(leave,Math.max(0,seconds*1000-(Date.now()-started))),{once:true});
 }else setTimeout(leave,seconds*1000);
})();
