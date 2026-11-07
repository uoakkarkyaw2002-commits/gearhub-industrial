/* 1.1.294 owner: inside an installed shop app, another shop (e.g. POLESTAR opened from the Kaizen Beauty app) shows
   only Home, Category, Promotion and Cart, so it is clear you are visiting; the Settings place becomes an exit
   button back to the app's own shop. The app's own shop is the first shop page of this app session (its own key:
   app-switch.js keeps the shop's slug in gh-app-home, 1.1.295). */
(()=>{
 const standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
 if(!standalone)return;
 const here=(location.pathname.match(/^\/shops\/[^/]+\//)||['/'])[0];
 let home='',homeName='',homeLogo='';
 try{home=sessionStorage.getItem('gh-app-home-path')||'';homeName=sessionStorage.getItem('gh-app-home-name')||'';homeLogo=sessionStorage.getItem('gh-app-home-logo')||'';if(!home){home=here;sessionStorage.setItem('gh-app-home-path',home);}}catch{return;}
 if(here===home){
  // Remember the app's own shop name and logo for the exit button (1.1.298 owner: the logo, not a red sign).
  const save=()=>{const n=document.querySelector('[data-site-brand-name]')?.textContent?.trim(),l=[...document.querySelectorAll('img[data-site-logo]')].map(i=>{try{const u=new URL(i.getAttribute('src')||'',location.href);return i.getAttribute('src')&&u.origin===location.origin?u.pathname+u.search:''}catch{return ''}}).find(Boolean);try{if(n)sessionStorage.setItem('gh-app-home-name',n);if(l)sessionStorage.setItem('gh-app-home-logo',l)}catch{}};
  addEventListener('gearhub:data-ready',save);setTimeout(save,3000);return;
 }
 document.body.classList.add('visiting-shop');
 // Owner's picture: the promotion pill on product cards starts with a lightning sign.
 const bolt=()=>document.querySelectorAll('.promo-badge').forEach(b=>{if(b.firstChild?.nodeType===3&&/^\s*🏷️/.test(b.firstChild.nodeValue))b.firstChild.nodeValue=b.firstChild.nodeValue.replace(/^\s*🏷️\s*/,'⚡ ')});
 if(typeof MutationObserver==='function'){const list=document.getElementById?.('products');if(list)new MutationObserver(bolt).observe(list,{childList:true,subtree:true})}
 const label=homeName?'Back to '+homeName:'Back';
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>';
 // 1.1.327 owner: on the phone the right button is the visited shop's own Profile (its logo); one Back press
 // takes you home (below). The PC bar keeps its exit link.
 const phoneNav=document.querySelector('.mobile-bottom-nav');
 if(phoneNav){
  phoneNav.querySelectorAll('[data-store-view="shops"],[data-store-view="category"]').forEach(el=>{el.hidden=true;});
  const prof=phoneNav.querySelector('[data-store-view="profile"]'),avatar=document.querySelector('#home-profile-avatar');
  if(prof&&avatar&&prof.classList){
   prof.classList.add('visit-profile');
   phoneNav.prepend(prof); // 1.1.380 owner: the visited shop's Profile is the first button on the left, then Home.
   const paint=()=>{const src=avatar.getAttribute('src');if(!src)return;const icon=prof.querySelector('span');if(!icon)return;let img=icon.querySelector('img');if(!img){icon.innerHTML='';img=document.createElement('img');img.alt='';img.className='visit-profile-logo';icon.append(img)}if(img.getAttribute('src')!==src)img.src=src};
   paint();new MutationObserver(paint).observe(avatar,{attributes:true,attributeFilter:['src']});
   // 1.1.380 owner: a visit starts on the shop's Profile, not Home.
   let touched=false;addEventListener('pointerdown',()=>{touched=true},{once:true,capture:true});
   const start=()=>{if(!touched&&!document.body.classList.contains('non-home-view'))prof.click()};
   addEventListener('gearhub:data-ready',()=>{setTimeout(start,400);setTimeout(start,1500)},{once:true});setTimeout(start,3000);
  }
 }
 for(const [navSel,cls] of [['.desktop-top-nav','desktop-nav-item']]){
  const nav=document.querySelector(navSel);if(!nav)continue;
  nav.querySelectorAll('[data-store-view="shops"],[data-store-view="profile"]').forEach(el=>{el.hidden=true;});
  const exit=document.createElement('a');exit.href=home;exit.className=cls+' visit-exit';exit.setAttribute('aria-label',label);
  const logo=/^\/(?!\/)/.test(homeLogo)?'<img class="visit-exit-logo" src="'+homeLogo.replace(/"/g,'&quot;')+'" alt="">':'',name=(homeName||'ပြန်ထွက်').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  if(logo)exit.classList.add('has-logo');
  exit.innerHTML=cls==='bottom-nav-item'?'<span aria-hidden="true">'+(logo||icon)+'</span><small>'+(logo?name:'ပြန်ထွက်')+'</small>':(logo||icon)+'<span>'+(logo?name:'ပြန်ထွက်')+'</span>';
  nav.append(exit);
 }
 // 1.1.327 owner's picture: the visited shop's header shows its Followers / Following / Posts and caption on the
 // green Profile background, and Cart becomes a round delivery button (with the count) above the bottom bar.
 const slug=(here.match(/^\/shops\/([^/]+)\//)||[])[1],copy=document.querySelector('.home-profile-banner .settings-profile-copy');
 const svg=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const people=svg('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.8-3.4 3.2-5.2 6.2-5.2s5.4 1.8 6.2 5.2"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.4c2.4.2 4 1.8 4.7 4.6"/>'),photos=svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18"/>');
 const quote=svg('<path d="M4 17V12c0-3.5 1.6-5.6 4.8-6.4l.7 1.6C7.7 8 7 9.3 7 11h3v6zM14 17V12c0-3.5 1.6-5.6 4.8-6.4l.7 1.6C17.7 8 17 9.3 17 11h3v6z"/>');
 const count=n=>n>=1e6?(Math.round(n/1e5)/10)+'M':n>=1e3?(Math.round(n/100)/10)+'K':String(n||0);
 // Seller shops drop the GearHub ✓, so the visit header adds the Profile's green badge after the name.
 // (its own class: the seller-shop cleanup removes every .settings-verified).
 const nameRow=document.querySelector('.home-profile-banner .settings-profile-copy>strong');
 const badge=document.createElement('span');badge.className='visit-verified';badge.setAttribute('aria-label','Verified');nameRow?.append(badge);
 badge.innerHTML=svg('<path d="m12 1.8 2.5 1.9 3.1-.2.9 3 2.6 1.8-1 2.9 1 2.9-2.6 1.8-.9 3-3.1-.2L12 22.2l-2.5-1.9-3.1.2-.9-3-2.6-1.8 1-2.9-1-2.9 2.6-1.8.9-3 3.1.2z"/><path class="visit-tick" d="m7.8 12.2 2.8 2.8 5.6-5.8"/>');
 if(copy&&slug){
  const stats=document.createElement('span'),cap=document.createElement('span');stats.className='visit-stats';cap.className='visit-caption';stats.hidden=cap.hidden=true;copy.append(stats,cap);
  fetch('/api/platform/profile/'+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
   if(!d)return;
   stats.innerHTML='<span>'+people+'<b>'+count(d.followers)+'</b> Followers</span><span>'+people+'<b>'+count(d.following)+'</b> Following</span><span>'+photos+'<b>'+count(d.posts)+'</b> Posts</span>';stats.hidden=false;
   const c=d.about?.caption||'';if(c){cap.innerHTML=quote+'<span>'+esc(c)+'</span>';cap.hidden=false}
  }).catch(()=>{});
 }
 // Back at the start of the visited shop leaves at once (no "press again to exit"): to the page before it,
 // or straight to the app's own shop when there is none. Runs before back-nav.js's own handler.
 addEventListener('popstate',event=>{
  if(Number(event.state?.ghStep)!==0)return;
  event.stopImmediatePropagation();
  history.back();setTimeout(()=>{if(location.pathname.startsWith(here))location.replace(home)},500);
 });
 const navCart=document.querySelector('.mobile-bottom-nav [data-store-action="open-cart"]'),navCount=document.querySelector('#bottom-cart-count');
 if(navCart){
  const fab=document.createElement('button');fab.type='button';fab.className='visit-cart';fab.setAttribute('aria-label',navCart.getAttribute('aria-label')||'Cart');
  fab.innerHTML='<img src="/images/cart-scooter.png?v=1.1.327" alt=""><b class="visit-cart-count" hidden></b>';
  fab.addEventListener('click',()=>navCart.click());document.body.append(fab);
  const show=()=>{const b=fab.querySelector('b'),n=navCount&&!navCount.hidden?navCount.textContent.trim():'';b.textContent=n;b.hidden=!n||n==='0'};
  show();if(navCount)new MutationObserver(show).observe(navCount,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 }
})();
