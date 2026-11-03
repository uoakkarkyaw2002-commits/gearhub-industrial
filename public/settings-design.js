/* 1.1.262 owner: Settings in the owner's new design (picture reference). Colour icons for every row,
   the shop logo in a white tile with an "Admin Dashboard" pill (shop owner / GearHub owner only), and
   the Notifications count on the bell. Styles are in settings-design.css. The bottom navigation is not changed. */
(()=>{
 const view=document.getElementById('profile-view');if(!view)return;
 const g=(id,a,b)=>'<linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient>';
 const svg=(defs,body)=>'<svg viewBox="0 0 48 48" aria-hidden="true"><defs>'+defs+'</defs>'+body+'</svg>';
 const icons={
  theme:svg(g('sdp','#ffffff','#e3e9f2'),'<path d="M24 6C13 6 5 13.6 5 23c0 8.6 6.6 14 13 14 3 0 4-1.7 4-3.6 0-2.3-1.8-3-1.8-5 0-1.8 1.4-3 3.4-3H29c7.6 0 14-4.4 14-11C43 9.8 35 6 24 6z" fill="url(#sdp)" stroke="#c8d2e0" stroke-width="1.2"/><circle cx="14" cy="21" r="3.6" fill="#3b82f6"/><circle cx="19" cy="13.5" r="3.6" fill="#22c55e"/><circle cx="28" cy="12" r="3.6" fill="#facc15"/><circle cx="35.5" cy="17" r="3.6" fill="#ef4444"/><circle cx="13.5" cy="29" r="3.4" fill="#a855f7"/><path d="M45 4.5 29.5 26l-3.4-2.4L41 2.6c1.6-1.4 4.6.2 4 1.9z" fill="#f59e0b"/><path d="M26.1 23.6 29.5 26c-.8 3.5-3.6 5.3-7.4 5.2 2.3-1.6 1.7-5.6 4-7.6z" fill="#7c4a1d"/>'),
  language:svg(g('sdl1','#3b82f6','#1d4ed8')+g('sdl2','#34d399','#059669'),'<rect x="3" y="4" width="26" height="24" rx="6" fill="url(#sdl1)"/><path d="M8 32l5-5h-5z" fill="#1d4ed8"/><path d="M10.5 22.5 16 9h2l5.5 13.5h-3l-1.2-3.2h-4.6l-1.2 3.2zm5.1-5.6h2.8L17 13z" fill="#fff"/><rect x="19" y="18" width="26" height="24" rx="6" fill="url(#sdl2)"/><path d="M40 46l-5-5h5z" fill="#059669"/><path d="M25 24.5h14M32 22v2.5M28 29h8.5c-.8 4.5-4 8-8.5 9.5M30.5 31c1.5 3.3 4.4 5.8 8 7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
  share:svg(g('sds','#4ade80','#16a34a'),'<path d="M14 24 34 12M14 24l20 12" stroke="#16a34a" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="24" r="7.5" fill="url(#sds)"/><circle cx="36" cy="11" r="7.5" fill="url(#sds)"/><circle cx="36" cy="37" r="7.5" fill="url(#sds)"/>'),
  bell:svg(g('sdb','#fde047','#f59e0b'),'<path d="M24 5c-8 0-13 6-13 14v8.5L6.5 35h35L37 27.5V19c0-8-5-14-13-14z" fill="url(#sdb)"/><path d="M6.5 35h35" stroke="#d97706" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="40.5" r="4.5" fill="#d97706"/><rect x="21.5" y="2" width="5" height="5" rx="2.5" fill="#f59e0b"/><path d="M16 13c1.5-3 4-4.5 7-4.8" stroke="#fff8" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
  phone:svg(g('sdph','#60a5fa','#2563eb'),'<rect x="12" y="3" width="24" height="42" rx="6" fill="url(#sdph)"/><rect x="15.5" y="8" width="17" height="29" rx="2.5" fill="#eff6ff"/><circle cx="24" cy="41" r="1.8" fill="#dbeafe"/><path d="M24 14v13m-5-5 5 5 5-5" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  storage:svg(g('sdsv','#475569','#1e293b'),'<rect x="5" y="5" width="38" height="11" rx="3" fill="url(#sdsv)"/><rect x="5" y="18.5" width="38" height="11" rx="3" fill="url(#sdsv)"/><rect x="5" y="32" width="38" height="11" rx="3" fill="url(#sdsv)"/><g fill="#38bdf8"><rect x="9" y="9.5" width="12" height="2" rx="1"/><rect x="9" y="23" width="12" height="2" rx="1"/><rect x="9" y="36.5" width="12" height="2" rx="1"/></g><g fill="#facc15"><circle cx="31" cy="10.5" r="1.6"/><circle cx="31" cy="24" r="1.6"/><circle cx="31" cy="37.5" r="1.6"/></g><g fill="#22c55e"><circle cx="36" cy="10.5" r="1.6"/><circle cx="36" cy="24" r="1.6"/><circle cx="36" cy="37.5" r="1.6"/></g>'),
  calendar:svg(g('sdc','#4ade80','#16a34a'),'<rect x="5" y="8" width="38" height="36" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><path d="M5 14a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v5H5z" fill="url(#sdc)"/><rect x="13" y="3" width="4" height="10" rx="2" fill="#15803d"/><rect x="31" y="3" width="4" height="10" rx="2" fill="#15803d"/><g fill="#94a3b8"><rect x="10" y="24" width="6" height="5" rx="1.2"/><rect x="18" y="24" width="6" height="5" rx="1.2"/><rect x="26" y="24" width="6" height="5" rx="1.2"/><rect x="34" y="24" width="4.5" height="5" rx="1.2"/><rect x="10" y="32" width="6" height="5" rx="1.2"/><rect x="18" y="32" width="6" height="5" rx="1.2"/><rect x="26" y="32" width="6" height="5" rx="1.2"/></g>'),
  refresh:svg(g('sdr1','#4ade80','#16a34a')+g('sdr2','#60a5fa','#2563eb'),'<path d="M38.5 19A15.5 15.5 0 0 0 9.8 15.6" stroke="url(#sdr1)" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M42 9.5 40.8 22l-11.7-4.6z" fill="#16a34a"/><path d="M9.5 29a15.5 15.5 0 0 0 28.7 3.4" stroke="url(#sdr2)" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M6 38.5 7.2 26l11.7 4.6z" fill="#2563eb"/>'),
  contact:svg(g('sdh','#4ade80','#15803d'),'<path d="M8 27v-4a16 16 0 0 1 32 0v4" stroke="url(#sdh)" stroke-width="4.5" fill="none"/><rect x="4" y="24" width="10" height="15" rx="4.5" fill="url(#sdh)"/><rect x="34" y="24" width="10" height="15" rx="4.5" fill="url(#sdh)"/><path d="M39 39c0 4-4 6-10 6" stroke="#15803d" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="24" y="42" width="8" height="5" rx="2.5" fill="#15803d"/>'),
  newshop:svg(g('sdn','#4ade80','#16a34a'),'<path d="M6 18 9 7h30l3 11z" fill="url(#sdn)"/><path d="M6 18c0 3 2.4 5 5.4 5s5.4-2 5.4-5c0 3 2.4 5 5.4 5s5.4-2 5.4-5c0 3 2.4 5 5.4 5s5.4-2 5.4-5" fill="#bbf7d0" stroke="#16a34a" stroke-width="1.5"/><path d="M9 24v18h20V24" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/><rect x="14" y="30" width="9" height="12" rx="1.5" fill="#60a5fa"/><circle cx="37" cy="37" r="9" fill="#16a34a" stroke="#fff" stroke-width="2"/><path d="M37 32.5v9M32.5 37h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
  myshops:svg(g('sdm','#60a5fa','#2563eb'),'<path d="M5 17 8.5 6h31L43 17z" fill="url(#sdm)"/><path d="M5 17h38v3.5c0 2.5-2 4.5-4.7 4.5s-4.8-2-4.8-4.5c0 2.5-2.1 4.5-4.8 4.5s-4.7-2-4.7-4.5c0 2.5-2.1 4.5-4.8 4.5s-4.7-2-4.7-4.5c0 2.5-2.1 4.5-4.8 4.5S5 23 5 20.5z" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2"/><path d="M8 25v18h32V25" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/><rect x="13" y="30" width="9" height="13" rx="1.5" fill="#60a5fa"/><rect x="26" y="30" width="10" height="7" rx="1.5" fill="#bfdbfe"/>'),
  about:svg(g('sdi','#4ade80','#15803d'),'<circle cx="24" cy="24" r="20" fill="url(#sdi)"/><circle cx="24" cy="24" r="20" fill="none" stroke="#fff6" stroke-width="2"/><circle cx="24" cy="14" r="3.2" fill="#fff"/><path d="M19.5 21h6.5v14h3.5M19.5 35h10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
 };
 const crown='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#facc15" stroke="#ca8a04" stroke-width="1.2" stroke-linejoin="round"/><rect x="5" y="19" width="14" height="2.4" rx="1" fill="#eab308"/></svg>';
 const kind=row=>{
  if(row.querySelector('[data-theme-choice]'))return 'theme';if(row.querySelector('[data-language-choice]'))return 'language';
  if(row.id==='share-store-action')return 'share';if(row.querySelector('#settings-alerts-switch'))return 'bell';
  if(row.id==='home-screen-action'||row.id==='create-own-app-action')return 'phone';if(row.querySelector('#storage-usage'))return 'storage';
  if(row.querySelector('#service-expiry'))return 'calendar';if(row.id==='app-refresh-action')return 'refresh';
  if(row.classList.contains('settings-contact'))return 'contact';if(row.id==='about-app-toggle')return 'about';
  if(row.id==='create-shop-action')return 'newshop';if(row.id==='my-shops-action')return 'myshops';return '';
 };
 const oldSub=/payment (details|information)|ငွေပေးချေမှု/i;
 function paint(){
  view.classList.add('settings-new');
  // A shop's saved texts can still hold the old subtitle.
  const sub=view.querySelector('.settings-header p');
  if(sub&&oldSub.test(sub.textContent)){const my=/[\u1000-\u109f]/.test(sub.textContent);sub.textContent=my?'App နှင့် စနစ်ဆိုင်ရာ ပြင်ဆင်ချက်များ':'Manage app preferences and system details.'}
  view.querySelectorAll('.settings-card>.settings-row').forEach(row=>{
   const k=kind(row),icon=row.querySelector(':scope>.settings-icon');
   if(k==='storage'){const t=row.querySelector('strong');if(t&&t.textContent!=='Server Storage'&&/^(server )?storage$/i.test(t.textContent.trim()))t.textContent='Server Storage'}
   if(!k||!icon||icon.dataset.drawn===k)return;
   icon.dataset.drawn=k;icon.classList.add('sd-icon');icon.innerHTML=icons[k];
   if(k==='bell'){const count=row.querySelector('.alerts-count');if(count)icon.append(count)}
  });
 }
 // Owner: logo tile + divider + "Admin Dashboard" pill in the picture at the top.
 async function owner(){
  const hero=document.getElementById('settings-profile-hero');if(!hero||hero.querySelector('.sd-admin'))return;
  try{
   const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
   const me=await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null);
   if(!me?.user)return;
   let mine=!!me.isOwner;
   if(!mine&&slug){const store=await fetch('/api/platform/store/'+slug,{cache:'no-store'}).then(r=>r.ok?r.json():null);mine=!!store?.id&&Number(me.shop?.id)===Number(store.id)}
   if(!mine)return;
   const pill=document.createElement('span');pill.className='sd-admin';pill.innerHTML='<i class="sd-divider" aria-hidden="true"></i><span class="sd-admin-pill">'+crown+'<span>Admin Dashboard</span></span>';
   hero.append(pill);hero.classList.add('sd-owner');hero.setAttribute('aria-label','Admin Dashboard');
   hero.href=slug?'/shops/'+slug+'/admin':'/admin.html';
  }catch{}
 }
 const start=()=>{paint();owner();new MutationObserver(paint).observe(view,{childList:true,subtree:true})};
 document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
