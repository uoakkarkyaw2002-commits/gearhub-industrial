/* 1.1.321 owner's PC picture (shop Home on a computer): the 🔔 💬 buttons sit at the right end of the top bar
   after a thin divider, Cart shows how many items are in it, Profile has a ⌄, the search has a magnifier,
   the hero has ‹ › and its dots on the picture, and the Promotion banner shows machines. Phones are unchanged
   (everything here only applies from 1024 px; the buttons go back into the banner on a narrow window). */
(()=>{
 const header=document.querySelector('header.home-navigation'),nav=header?.querySelector('.desktop-top-nav');if(!header||!nav)return;
 const wide=matchMedia('(min-width:1024px)');
 // 🔔 💬: moved into the top bar on PC, back into the shop banner on phones.
 let home=null;
 function place(){
  const box=document.querySelector('.nc-buttons');if(!box)return;
  if(!home&&box.parentElement!==header)home=box.parentElement;
  if(wide.matches){if(box.parentElement!==header)header.append(box)}else if(home&&box.parentElement!==home)home.append(box);
 }
 new MutationObserver(place).observe(document.body,{childList:true,subtree:true});wide.addEventListener('change',place);place();
 // Cart count badge (the same number as the cart drawer's own count).
 const cartItem=nav.querySelector('[data-store-action="open-cart"]');
 if(cartItem){
  const badge=document.createElement('b');badge.className='pc-cart-badge';badge.hidden=true;cartItem.append(badge);
  const count=document.getElementById('cart-count'),sync=()=>{const n=parseInt(count?.textContent||'0',10)||0;badge.textContent=n>99?'99+':String(n);badge.hidden=!n};
  if(count)new MutationObserver(sync).observe(count,{childList:true,characterData:true,subtree:true});sync();
 }
 // Profile ⌄
 const profile=nav.querySelector('[data-store-view="profile"]');
 if(profile&&!profile.querySelector('.pc-chevron'))profile.insertAdjacentHTML('beforeend','<svg class="pc-chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>');
 // Magnifier at the start of the search box.
 const pill=document.querySelector('.mobile-search .search-pill');
 if(pill&&!pill.querySelector('.pc-search-glass'))pill.insertAdjacentHTML('afterbegin','<svg class="pc-search-glass" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>');
 // ‹ › on the hero pictures (they press the dots, so the slide timer keeps working the same way).
 const hero=document.querySelector('.hero');
 function arrows(){
  if(!hero||hero.querySelector('.pc-hero-arrow'))return;
  const step=d=>{const dots=[...document.querySelectorAll('.hero-dots button')];if(dots.length<2)return;const at=dots.findIndex(b=>b.classList.contains('on'));dots[(at+d+dots.length)%dots.length].click()};
  for(const [d,label,path] of [[-1,'Previous picture','m14.5 6-6 6 6 6'],[1,'Next picture','m9.5 6 6 6-6 6']]){
   const b=document.createElement('button');b.type='button';b.className='pc-hero-arrow '+(d<0?'prev':'next');b.setAttribute('aria-label',label);
   b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';
   b.addEventListener('click',e=>{e.stopPropagation();step(d)});hero.append(b);
  }
 }
 arrows();
 // Machines picture on the Promotion banner.
 const promoArt=()=>{const promo=document.querySelector('.home-promo');if(promo&&!promo.querySelector('.pc-promo-machines'))promo.insertAdjacentHTML('beforeend','<i class="pc-promo-machines" aria-hidden="true"></i>')};
 promoArt();new MutationObserver(promoArt).observe(document.body,{childList:true,subtree:true});
})();
