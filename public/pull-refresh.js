/* 1.1.304 owner: like Facebook, pulling the page down from the very top reloads it, with a short sound.
   Discover reloads its posts; every other tab reloads the shop's products. Phones / touch screens only.
   The round sign shows only while pulling and refreshing, then goes away (never left over the content). */
(()=>{
 if(!('ontouchstart' in window))return;
 const sign=document.createElement('div');sign.className='pull-refresh';sign.setAttribute('aria-hidden','true');
 sign.innerHTML='<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
 document.body.append(sign);
 const PULL=70,MAX=96;
 let startY=0,startX=0,pull=0,tracking=false,busy=false,ctx=null;
 // Nothing pulls while a sheet, photo, cart, menu or the Excel sheet is open, or inside something that scrolls itself.
 function scrolledInside(target){for(let n=target;n&&n!==document.body&&n.nodeType===1;n=n.parentElement)if(n.scrollTop>0&&n.scrollHeight>n.clientHeight)return true;return false}
 const blocked=target=>Boolean(document.querySelector('dialog[open],.modal.open,#drawer.open,.alerts-history:not([hidden])'))||document.body.classList.contains('excel-sheet-mode')||scrolledInside(target);
 function draw(){const d=Math.min(MAX,pull);sign.style.transform='translate(-50%,'+(d-56)+'px) rotate('+(d/PULL*270)+'deg)';sign.style.opacity=String(Math.min(1,d/40));sign.classList.toggle('ready',d>=PULL)}
 function reset(){pull=0;sign.classList.remove('ready','spinning');sign.style.transition='transform .25s ease,opacity .25s ease';sign.style.transform='translate(-50%,-56px)';sign.style.opacity='0';setTimeout(()=>{sign.style.transition=''},260)}
 // A short two-note "pop" made in the browser (no sound file).
 function sound(){
  try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();ctx.resume?.();const now=ctx.currentTime;
   for(const [f,at] of [[880,0],[1320,.07]]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,now+at);g.gain.linearRampToValueAtTime(.18,now+at+.01);g.gain.exponentialRampToValueAtTime(.001,now+at+.12);o.connect(g).connect(ctx.destination);o.start(now+at);o.stop(now+at+.14)}}catch{}
 }
 async function refresh(){
  busy=true;sign.classList.add('spinning');sign.style.transform='translate(-50%,'+(PULL-56)+'px)';sign.style.opacity='1';sound();
  const discover=document.getElementById('shops-view'),started=Date.now();
  try{if(discover&&!discover.classList.contains('store-view-hidden')&&window.GearHubShops?.refresh)await window.GearHubShops.refresh();else if(window.GearHubStore?.retry)await window.GearHubStore.retry();else location.reload()}catch{}
  await new Promise(r=>setTimeout(r,Math.max(0,600-(Date.now()-started))));
  busy=false;reset();
 }
 addEventListener('touchstart',e=>{if(busy||e.touches.length!==1||window.scrollY>0||blocked(e.target)){tracking=false;return}tracking=true;startY=e.touches[0].clientY;startX=e.touches[0].clientX;pull=0},{passive:true});
 addEventListener('touchmove',e=>{if(!tracking)return;const dy=e.touches[0].clientY-startY,dx=Math.abs(e.touches[0].clientX-startX);if(window.scrollY>0||dy<=0||dx>dy){if(pull)reset();return}pull=dy*.5;draw()},{passive:true});
 addEventListener('touchend',()=>{if(!tracking)return;tracking=false;if(pull>=PULL)refresh();else if(pull)reset()},{passive:true});
 addEventListener('touchcancel',()=>{tracking=false;if(!busy)reset()},{passive:true});
 // 1.1.309 owner: like Facebook, tapping Home (or Discover) again while it is open goes back to the top and reloads.
 document.addEventListener('click',e=>{
  const tab=e.target.closest('.mobile-bottom-nav [data-store-view="home"],.mobile-bottom-nav [data-store-view="shops"]');
  if(!tab||busy||!tab.classList.contains('active'))return;
  const view=document.getElementById(tab.dataset.storeView==='home'?'catalog':'shops-view');
  if(view&&view.classList.contains('store-view-hidden'))return;
  if(window.scrollY>0)window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(refresh,window.scrollY>0?350:0);
 },true);
 window.GearHubPullRefresh={refresh};
})();
