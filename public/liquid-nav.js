// Phone bottom navigation, "liquid" style (owner's video): the open tab's icon rises into a
// round bubble that sits in a curved notch of the bar; tapping another tab slides the bubble
// and the notch to it. store.js keeps setting `.active`; this file only follows it.
(()=>{
 const nav=document.querySelector('.mobile-bottom-nav');if(!nav)return;
 nav.classList.add('liquid','liquid-instant');
 const bubble=document.createElement('span');bubble.className='liquid-nav-bubble';bubble.setAttribute('aria-hidden','true');nav.prepend(bubble);
 const items=[...nav.querySelectorAll('.bottom-nav-item')];
 function place(){
  const active=items.find(item=>item.classList.contains('active')&&!item.hidden&&item.offsetWidth);
  nav.classList.toggle('liquid-none',!active);
  if(!active)return;
  nav.style.setProperty('--liquid-x',(active.offsetLeft+active.offsetWidth/2)+'px');
  // Lift the icon so its centre meets the bubble's centre (offsets ignore the running transforms).
  const icon=active.querySelector(':scope>span');
  if(icon?.offsetHeight&&bubble.offsetHeight)nav.style.setProperty('--liquid-lift',Math.round(bubble.offsetTop+bubble.offsetHeight/2-(active.offsetTop+icon.offsetTop+icon.offsetHeight/2))+'px');
  // The first placement (and after a resize) jumps; later ones slide.
  if(nav.classList.contains('liquid-instant'))setTimeout(()=>nav.classList.remove('liquid-instant'),60);
 }
 const watch=new MutationObserver(place);
 items.forEach(item=>watch.observe(item,{attributes:true,attributeFilter:['class','hidden']}));
 addEventListener('resize',()=>{nav.classList.add('liquid-instant');place()});
 addEventListener('load',place);
 document.fonts?.ready?.then(place);
 place();
})();
