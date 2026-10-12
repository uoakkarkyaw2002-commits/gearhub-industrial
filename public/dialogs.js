/* Shared keyboard behavior for the existing cart, checkout and gallery. */
(() => {
 const definitions=[['drawer','cart-close'],['checkout-modal','checkout-close'],['gallery-modal','gallery-close']];
 const dialogs=definitions.map(([id,close])=>({node:document.getElementById(id),close,open:false,opener:null})).filter(entry=>entry.node);
 const visible=node=>Boolean(node?.isConnected&&node.getClientRects().length);
 const focusable=node=>Array.from(node.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')).filter(el=>!el.disabled&&el.tabIndex>=0&&visible(el));
 function sync(entry){
  const open=entry.node.classList.contains('open');entry.node.inert=!open;entry.node.setAttribute('aria-hidden',String(!open));
  if(open===entry.open)return;entry.open=open;
  if(open){entry.opener=document.activeElement;requestAnimationFrame(()=>{if(entry.open)(focusable(entry.node)[0]||entry.node).focus();});}
  else{const fallback=document.getElementById('cart-open')||document.querySelector('.bottom-nav-item');const target=visible(entry.opener)?entry.opener:visible(fallback)?fallback:null;target?.focus();}
 }
 for(const entry of dialogs){
  entry.node.setAttribute('role','dialog');entry.node.setAttribute('aria-modal','true');entry.node.tabIndex=-1;
  const title=entry.node.querySelector('h2');if(title){if(!title.id)title.id=entry.node.id+'-heading';entry.node.setAttribute('aria-labelledby',title.id);}
  sync(entry);new MutationObserver(()=>sync(entry)).observe(entry.node,{attributes:true,attributeFilter:['class']});
 }
 document.addEventListener('keydown',event=>{
  const entry=dialogs.filter(item=>item.open).at(-1);if(!entry)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();document.getElementById(entry.close)?.click();return;}
  if(event.key!=='Tab')return;const items=focusable(entry.node),first=items[0],last=items.at(-1);
  if(!first){event.preventDefault();entry.node.focus();return;}
  if(!entry.node.contains(document.activeElement)||(event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
 },true);
})();
