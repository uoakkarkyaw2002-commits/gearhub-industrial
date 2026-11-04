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
 const label=homeName?'Back to '+homeName:'Back';
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>';
 for(const [navSel,cls] of [['.mobile-bottom-nav','bottom-nav-item'],['.desktop-top-nav','desktop-nav-item']]){
  const nav=document.querySelector(navSel);if(!nav)continue;
  nav.querySelectorAll('[data-store-view="shops"],[data-store-view="profile"]').forEach(el=>{el.hidden=true;});
  const exit=document.createElement('a');exit.href=home;exit.className=cls+' visit-exit';exit.setAttribute('aria-label',label);
  const logo=/^\/(?!\/)/.test(homeLogo)?'<img class="visit-exit-logo" src="'+homeLogo.replace(/"/g,'&quot;')+'" alt="">':'',name=(homeName||'ပြန်ထွက်').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  if(logo)exit.classList.add('has-logo');
  exit.innerHTML=cls==='bottom-nav-item'?'<span aria-hidden="true">'+(logo||icon)+'</span><small>'+(logo?name:'ပြန်ထွက်')+'</small>':(logo||icon)+'<span>'+(logo?name:'ပြန်ထွက်')+'</span>';
  nav.append(exit);
 }
})();
