// Phone bottom navigation, "liquid" style (owner's video): the open tab's icon rises into a
// round bubble that sits in a curved notch of the bar; tapping another tab slides the bubble
// and the notch to it. store.js keeps setting `.active`; this file only follows it.
(()=>{
 const nav=document.querySelector('.mobile-bottom-nav');if(!nav)return;
 nav.classList.add('liquid','liquid-instant');
 const bubble=document.createElement('span');bubble.className='liquid-nav-bubble';bubble.setAttribute('aria-hidden','true');nav.prepend(bubble);
 const items=[...nav.querySelectorAll('.bottom-nav-item')];
 let drag=null,swallowClick=false,ourClick=false;
 function place(){
  if(drag?.moved)return;
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

 // Press and drag (owner's recording): the bubble follows the finger along the bar, the tab under
 // it rises, and letting go opens that tab. A plain tap still works as before.
 const visible=()=>items.filter(item=>!item.hidden&&item.offsetWidth);
 const centre=item=>item.offsetLeft+item.offsetWidth/2;
 const nearest=x=>visible().reduce((best,item)=>Math.abs(centre(item)-x)<Math.abs(centre(best)-x)?item:best);
 function hover(item){items.forEach(i=>i.classList.toggle('liquid-hover',i===item))}
 function endDrag(open){
  if(!drag)return;
  const {moved,target}=drag;drag=null;
  nav.classList.remove('liquid-dragging');hover(null);
  if(!moved)return;
  swallowClick=true;setTimeout(()=>{swallowClick=false},400);
  if(open&&target&&!target.classList.contains('active')){ourClick=true;target.click();ourClick=false}
  place();
 }
 nav.addEventListener('pointerdown',e=>{
  if(e.button)return;
  drag={id:e.pointerId,startX:e.clientX,left:nav.getBoundingClientRect().left,moved:false,target:null};
 });
 nav.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.moved){if(Math.abs(e.clientX-drag.startX)<8)return;drag.moved=true;nav.classList.add('liquid-dragging');try{nav.setPointerCapture(e.pointerId)}catch{}}
  const tabs=visible();if(!tabs.length)return;
  const x=Math.min(centre(tabs[tabs.length-1]),Math.max(centre(tabs[0]),e.clientX-drag.left));
  nav.style.setProperty('--liquid-x',x+'px');
  drag.target=nearest(x);hover(drag.target);
 });
 nav.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id)endDrag(true)});
 nav.addEventListener('pointercancel',()=>endDrag(false));
 // The tap that ends a drag must not also open the tab where the finger first went down.
 nav.addEventListener('click',e=>{if(swallowClick&&!ourClick){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
