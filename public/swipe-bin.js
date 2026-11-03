/* 1.1.258 owner: swipe a product or an order to the left to move it to the Recycle Bin, and show it.
   Pressing a card gives it a red border and a ← arrow (only while pressed); dragging it left opens a
   bin at the left corner; letting go past the line asks once, then the card drops into the bin.
   Products → POST /api/admin/products/<id>/trash, orders → DELETE /api/admin/orders/<id> (both can be
   restored from the Recycle Bin). Touch only; PC keeps its buttons. */
(()=>{
 const kinds=[
  {sel:'[data-mobile-product-id]',id:c=>Number(c.dataset.mobileProductId),ask:'ဒီ product ကို အမှိုက်ပုံးထဲ ရွှေ့မလား? ပြန်ယူလို့ ရပါတယ်။\nMove this product to the Recycle Bin?',
   go:id=>api('/api/admin/products/'+id+'/trash',{method:'POST',body:'{}'}),done:'Product moved to Recycle Bin'},
  {sel:'#orders-table [data-order-open]',id:c=>Number(c.dataset.orderOpen),ask:'ဒီ Order ကို အမှိုက်ပုံးထဲ ရွှေ့မလား? ပြန်ယူလို့ ရပါတယ်။\nMove this order to the Recycle Bin?',
   go:id=>api('/api/admin/orders/'+id,{method:'DELETE',body:'{}'}),done:'Order moved to Recycle Bin'}
 ];
 const style=document.createElement('style');
 style.textContent='[data-mobile-product-id],#orders-table [data-order-open]{touch-action:pan-y;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}'
  +'.swipe-armed{outline:2.5px solid #e5484d!important;outline-offset:-2.5px;box-shadow:0 0 0 4px #e5484d22!important;position:relative}'
  +'.swipe-moving{transition:none!important}.swipe-back{transition:transform .25s ease!important}'
  +'.swipe-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:3;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#e5484d;color:#fff;font:700 13px/1 system-ui,sans-serif;pointer-events:none;animation:swipe-nudge 1s ease-in-out infinite}'
  +'.swipe-arrow svg{width:22px;height:22px}@keyframes swipe-nudge{0%,100%{transform:translate(0,-50%)}50%{transform:translate(-10px,-50%)}}'
  +'.swipe-bin{position:fixed;z-index:2147483000;width:56px;height:64px;margin:-32px 0 0;pointer-events:none;opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s}'
  +'.swipe-bin.on{opacity:1;transform:scale(1)}.swipe-bin.ready{transform:scale(1.15)}'
  +'.swipe-bin svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 8px #0003)}'
  +'.swipe-bin .lid{transform-origin:12px 13px;transition:transform .12s}'
  +'.swipe-drop{transition:transform .35s ease-in,opacity .35s ease-in!important}';
 document.head.append(style);
 const binSvg='<svg viewBox="0 0 56 64" aria-hidden="true"><g class="lid"><rect x="8" y="10" width="40" height="7" rx="3" fill="#e5484d"/><rect x="22" y="5" width="12" height="6" rx="2" fill="#e5484d"/></g><path d="M12 20h32l-3 38a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill="#e5484d"/><path d="M22 28v26M28 28v26M34 28v26" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>';
 const arrowSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
 let s=null,bin=null,skipClick=false;
 const find=t=>{for(const k of kinds){const c=t.closest?.(k.sel);if(c)return {k,c}}return null};
 const ensureBin=()=>{if(!bin){bin=document.createElement('div');bin.className='swipe-bin';bin.innerHTML=binSvg;document.body.append(bin)}return bin};
 const lid=open=>{const l=bin?.querySelector('.lid');if(l)l.style.transform='rotate('+(-75*open)+'deg)'};
 function arm(){
  if(!s||s.armed)return;s.armed=true;const c=s.c;c.classList.add('swipe-armed');
  const a=document.createElement('span');a.className='swipe-arrow';a.innerHTML=arrowSvg+'<span>Bin</span>';c.append(a);s.arrow=a;
  const r=c.getBoundingClientRect(),b=ensureBin();b.style.left=Math.max(6,r.left+6)+'px';b.style.top=(r.top+r.height/2)+'px';b.classList.add('on');lid(0);
 }
 function reset(drop){
  if(!s)return;const {c,arrow}=s;clearTimeout(s.hold);arrow?.remove();c.classList.remove('swipe-armed','swipe-moving');
  if(!drop){c.classList.add('swipe-back');c.style.transform='';setTimeout(()=>c.classList.remove('swipe-back'),260)}
  bin?.classList.remove('on','ready');lid(0);s=null;
 }
 document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){reset();return}const hit=find(e.target);if(!hit)return;
  const t=e.touches[0];s={...hit,x:t.clientX,y:t.clientY,dx:0,dir:'',armed:false};
  s.hold=setTimeout(arm,250);
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!s)return;const t=e.touches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;
  if(!s.dir){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;s.dir=Math.abs(dx)>Math.abs(dy)&&dx<0?'x':'y';if(s.dir==='y'){reset();return}arm()}
  e.preventDefault();s.dx=Math.min(0,dx);const c=s.c,w=c.getBoundingClientRect().width,limit=Math.max(72,w*.3);
  c.classList.add('swipe-moving');c.style.transform='translateX('+s.dx+'px)';
  const p=Math.min(1,-s.dx/limit);lid(p);bin?.classList.toggle('ready',p>=1);s.limit=limit;
 },{passive:false});
 document.addEventListener('touchcancel',()=>reset(),{passive:true});
 document.addEventListener('touchend',async e=>{
  if(!s)return;const cur=s;clearTimeout(cur.hold);
  if(!cur.armed||!cur.limit||-cur.dx<cur.limit){reset();return}
  e.preventDefault();skipClick=true;setTimeout(()=>{skipClick=false},600);
  if(!confirm(cur.k.ask)){reset();return}
  // The card shrinks into the bin, the lid closes, then the server is told.
  const c=cur.c,r=c.getBoundingClientRect(),br=bin.getBoundingClientRect();
  const tx=br.left+br.width/2-(r.left+r.width/2)+cur.dx,ty=br.top+br.height/2-(r.top+r.height/2);
  cur.arrow?.remove();c.classList.remove('swipe-moving');c.classList.add('swipe-drop');
  requestAnimationFrame(()=>{c.style.transform='translate('+tx+'px,'+ty+'px) scale(.08)';c.style.opacity='0'});
  setTimeout(()=>lid(0),330);
  try{await cur.k.go(cur.k.id(c));toast(cur.k.done)}catch(err){toast(err.message)}
  setTimeout(()=>{bin?.classList.remove('on','ready');c.classList.remove('swipe-drop','swipe-armed');c.style.transform='';c.style.opacity=''},450);
  s=null;await refreshAll();
 },{passive:false});
 // A swipe must not also open the order.
 document.addEventListener('click',e=>{if(skipClick&&find(e.target)){e.preventDefault();e.stopImmediatePropagation();skipClick=false}},true);
})();
