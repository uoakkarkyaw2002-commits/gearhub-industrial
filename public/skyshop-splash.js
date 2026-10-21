// Opening picture of a seller shop, shown once per app launch (a new tab or a Home Screen
// start). Its length (data-seconds) and sound (data-sound) are set by the platform owner.
// A reload or coming back to the app later does not show it again.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const key="sky-splash:"+(location.pathname.split("/")[2]||"");
 let seen=false;try{seen=sessionStorage.getItem(key)==="1"}catch{}
 if(seen){el.remove();return}
 try{sessionStorage.setItem(key,"1")}catch{}
 const seconds=Math.min(10,Math.max(0.5,Number(el.dataset.seconds)||3));
 let audio=null;
 if(el.dataset.sound){
  audio=new Audio(el.dataset.sound);audio.preload="auto";
  const gestures=["pointerdown","touchstart","keydown"];
  const start=()=>{if(!el.isConnected)return;audio.play().then(()=>{gestures.forEach(g=>document.removeEventListener(g,start,true));hint.remove()}).catch(()=>{})};
  const hint=document.createElement("div");hint.className="sky-splash-tap";hint.textContent="🔊 အသံကြားချင်ရင် Screen ကို တစ်ချက်ထိပါ / Tap for sound";
  // Browsers (the iPhone above all) only start sound after a touch: try now, then on the first touch.
  audio.play().catch(()=>{if(!el.isConnected)return;el.append(hint);gestures.forEach(g=>document.addEventListener(g,start,true))});
 }
 setTimeout(()=>{el.classList.add("is-leaving");if(audio)audio.pause();setTimeout(()=>el.remove(),550)},seconds*1000);
})();
