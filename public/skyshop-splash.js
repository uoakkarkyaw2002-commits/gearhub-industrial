// Opening picture of a shop. It shows whenever the shop is opened (a new tab, a typed or shared
// link, a Home Screen start) and not on a reload or when moving between pages of the same site.
// Its length (data-seconds) and sound (data-sound) are set by the platform owner.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const nav=performance.getEntriesByType?.("navigation")?.[0];
 // Moving between pages of the same site within seconds is not "opening the shop" (the referrer is
 // hidden by the site's referrer policy, so the page leaves a timestamp when it is closed).
 let left=0;try{left=Number(sessionStorage.getItem("sky-left"))||0}catch{}
 addEventListener("pagehide",()=>{try{sessionStorage.setItem("sky-left",String(Date.now()))}catch{}});
 if((nav&&nav.type!=="navigate")||Date.now()-left<8000){el.remove();return}
 const seconds=Math.min(10,Math.max(0.5,Number(el.dataset.seconds)||3));
 let audio=null;
 if(el.dataset.sound){
  audio=new Audio(el.dataset.sound);audio.preload="auto";
  const gestures=["pointerdown","touchstart","keydown"];
  const start=()=>{if(!el.isConnected)return;audio.play().then(()=>gestures.forEach(g=>document.removeEventListener(g,start,true))).catch(()=>{})};
  // The sound starts by itself. Where the browser blocks that (an iPhone Home Screen start has no
  // touch yet) it starts silently on the first touch; no message is shown.
  audio.play().catch(()=>{if(!el.isConnected)return;gestures.forEach(g=>document.addEventListener(g,start,true))});
 }
 setTimeout(()=>{el.classList.add("is-leaving");if(audio)audio.pause();setTimeout(()=>el.remove(),550)},seconds*1000);
})();
