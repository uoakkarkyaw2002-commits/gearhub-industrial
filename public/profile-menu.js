/* 1.1.302 owner (Facebook picture): the bottom bar's Settings place is a person (Profile). Profile shows only the
   shop's profile photo and name for now; the ☰ Menu at the top opens the old Settings page. */
(()=>{
 const view=document.getElementById('profile-view');if(!view)return;
 const my=()=>document.documentElement.lang==='my';
 const home=document.createElement('div');home.className='profile-home';home.id='profile-home';
 home.innerHTML='<button type="button" class="profile-menu-open" id="profile-menu-open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><div class="profile-home-photo"><img alt="" hidden><span aria-hidden="true">⚙</span></div><h2 class="profile-home-name"></h2>';
 const bar=document.createElement('div');bar.className='profile-menu-bar';bar.id='profile-menu';
 bar.innerHTML='<button type="button" id="profile-menu-close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><b></b>';
 view.prepend(home,bar);
 const img=home.querySelector('img'),fallback=home.querySelector('span'),name=home.querySelector('h2');
 // The same photo and name as the Settings profile card (the shop's own logo and name).
 function paint(){
  const src=document.getElementById('settings-profile-avatar'),shown=src&&!src.hidden&&src.getAttribute('src');
  if(shown&&img.getAttribute('src')!==shown)img.src=shown;img.hidden=!shown;fallback.hidden=Boolean(shown);
  fallback.textContent=document.getElementById('settings-profile-fallback')?.textContent||'⚙';
  name.textContent=document.querySelector('#settings-profile-hero [data-site-brand-name]')?.textContent?.trim()||'';
  home.querySelector('#profile-menu-open').setAttribute('aria-label',my()?'မီနူး':'Menu');
  bar.querySelector('b').textContent=my()?'မီနူး':'Menu';
  bar.querySelector('button').setAttribute('aria-label',my()?'ပရိုဖိုင်သို့ ပြန်ရန်':'Back to profile');
 }
 function show(menu){
  view.classList.toggle('pm-menu',menu);view.classList.toggle('pm-home',!menu);bar.classList.toggle('open',menu);
  if(!menu)paint();scrollTo(0,0);window.GearHubBackNav?.record();
 }
 view.classList.add('pm-home');paint();
 home.querySelector('#profile-menu-open').addEventListener('click',()=>show(true));
 bar.querySelector('button').addEventListener('click',()=>show(false));
 // The Profile button always opens the profile itself.
 document.addEventListener('click',e=>{if(e.target.closest('[data-store-view="profile"]')&&!view.classList.contains('pm-home')){view.classList.add('pm-home');view.classList.remove('pm-menu');bar.classList.remove('open');paint()}},true);
 addEventListener('gearhub:data-ready',paint);
 const avatar=document.getElementById('settings-profile-avatar');if(avatar)new MutationObserver(paint).observe(avatar,{attributes:true,attributeFilter:['src','hidden']});
 new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.GearHubProfileMenu={open:()=>{if(!view.classList.contains('pm-menu'))show(true)}};
})();
