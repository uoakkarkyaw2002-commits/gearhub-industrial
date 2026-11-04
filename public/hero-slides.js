/* 1.1.310 owner's picture: the Home banner shows up to 5 hero pictures, one after another by themselves, with dots
   under it; a green Promotion banner under it opens the Promotion page (Promotion left the bottom bar). */
(()=>{
 const hero=document.querySelector('.hero');if(!hero)return;
 const EVERY=4500;
 let pictures=[],at=0,timer=0,layer=null,dots=null;
 function stop(){clearInterval(timer);timer=0}
 function show(i){
  if(!layer)return;at=(i+pictures.length)%pictures.length;
  layer.querySelectorAll('i').forEach((pic,k)=>pic.classList.toggle('on',k===at));
  dots.querySelectorAll('button').forEach((dot,k)=>{dot.classList.toggle('on',k===at);dot.setAttribute('aria-current',String(k===at))});
 }
 function start(){stop();if(pictures.length>1&&!document.hidden)timer=setInterval(()=>show(at+1),EVERY)}
 function build(list){
  const same=list.join('|')===pictures.join('|');pictures=list;
  if(list.length<2){layer?.remove();dots?.remove();layer=dots=null;hero.classList.remove('hero-slides-on');stop();return}
  if(same&&layer)return start();
  layer?.remove();dots?.remove();
  layer=document.createElement('div');layer.className='hero-slides';layer.setAttribute('aria-hidden','true');
  layer.innerHTML=list.map(url=>'<i style="background-image:url('+JSON.stringify(url).replace(/"/g,'&quot;')+')"></i>').join('');
  hero.prepend(layer);hero.classList.add('hero-slides-on');
  dots=document.createElement('div');dots.className='hero-dots';dots.setAttribute('data-home-content','');
  dots.innerHTML=list.map((_,k)=>'<button type="button" aria-label="Picture '+(k+1)+'"></button>').join('');
  hero.after(dots);
  dots.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;show([...dots.children].indexOf(b));start()});
  at=0;show(0);start();
 }
 addEventListener('gearhub:hero',e=>build(Array.isArray(e.detail)?e.detail.filter(u=>typeof u==='string'&&u).slice(0,5):[]));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
 // A sideways swipe on the banner goes to the next or previous picture.
 let x0=null;
 hero.addEventListener('touchstart',e=>{x0=layer?e.touches[0].clientX:null},{passive:true});
 hero.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){show(at+(dx<0?1:-1));start()}},{passive:true});
 // Promotion banner (only while the shop has promotions; body.no-promotions hides it like the old tab).
 const my=()=>document.documentElement.lang==='my';
 const promo=document.createElement('button');promo.type='button';promo.className='home-promo';promo.dataset.storeView='promotion';promo.setAttribute('data-home-content','');
 const paint=()=>{promo.innerHTML='<span class="home-promo-tag" aria-hidden="true">%</span><span class="home-promo-copy"><b>Promotion</b><small>'+(my()?'အထူးလျှော့ဈေးများ':'Special deals & limited offers')+'</small></span><span class="home-promo-go">'+(my()?'ကြည့်မယ်':'Shop Now')+' →</span><span class="home-promo-gift" aria-hidden="true">🎁</span>'};
 paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 hero.after(promo);
})();
