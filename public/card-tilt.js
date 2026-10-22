// PC only (owner's video): moving the mouse over a product card tilts it towards the pointer in 3D,
// the photo lifts forward and a soft light follows the pointer. Phones and touch screens get nothing.
(()=>{
 const pc=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 851px)'),calm=matchMedia('(prefers-reduced-motion: reduce)');
 let card=null;
 function rest(item){if(!item)return;item.classList.remove('is-tilting');['--tilt-x','--tilt-y','--glare-x','--glare-y','--shift-x','--shift-y'].forEach(name=>item.style.removeProperty(name))}
 document.addEventListener('pointermove',event=>{
  if(!pc.matches||calm.matches||event.pointerType!=='mouse')return;
  const item=event.target.closest?.('.products .product');
  if(card&&card!==item)rest(card);
  card=item;if(!item)return;
  const box=item.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;
  item.classList.add('is-tilting');
  item.style.setProperty('--tilt-x',(-y*12).toFixed(2)+'deg');
  item.style.setProperty('--tilt-y',(x*14).toFixed(2)+'deg');
  item.style.setProperty('--shift-x',(x*10).toFixed(1)+'px');
  item.style.setProperty('--shift-y',(y*10).toFixed(1)+'px');
  item.style.setProperty('--glare-x',((x+.5)*100).toFixed(1)+'%');
  item.style.setProperty('--glare-y',((y+.5)*100).toFixed(1)+'%');
 },{passive:true});
 document.addEventListener('pointerout',event=>{if(card&&!card.contains(event.relatedTarget)){rest(card);card=null}});
 addEventListener('blur',()=>{rest(card);card=null});
})();
