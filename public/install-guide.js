/* 1.1.195 owner: a step-by-step helper in a seller shop admin that shows how to put the shop admin on the
   phone's Home Screen, one step at a time, for the browser in use (iPhone Safari, iPhone Chrome, other
   iPhone apps, Android, PC). Opens by itself after a new shop opens (?welcome=1) and on phones until the
   seller taps Done; never inside the installed app. Nothing is sent to the server. */
(()=>{
 const match=location.pathname.match(/^\/shops\/([^/]+)\/admin\/?$/);if(!match)return;
 const slug=decodeURIComponent(match[1]),doneKey='gh-install-guide-done:'+slug,laterKey='gh-install-guide-later:'+slug;
 const store={get:(s,k)=>{try{return s.getItem(k)}catch{return null}},set:(s,k,v)=>{try{s.setItem(k,v)}catch{}}};
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const iosChrome=ios&&/CriOS/.test(ua),iosOther=ios&&!iosChrome&&(/FxiOS|EdgiOS|GSA\/|FBAN|FBAV|Instagram|Line\/|Messenger|MicroMessenger/.test(ua)||!/Safari\//.test(ua));
 const android=/android/i.test(ua),phone=ios||android||matchMedia('(pointer:coarse)').matches;
 const appName=document.title.trim()||'Shop Admin';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 let prompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;if(sheet&&!sheet.hidden)show(at)});
 addEventListener('appinstalled',()=>{prompt=null;store.set(localStorage,doneKey,'1');if(sheet&&!sheet.hidden)finish()});
 const svg=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
 const art={
  share:svg('<path d="M12 15V3M8 7l4-4 4 4"/><path d="M7 10H5v11h14V10h-2"/>'),
  more:svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  menu:svg('<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>'),
  add:svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  toggle:svg('<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="17" cy="12" r="3.2" fill="currentColor"/>'),
  install:svg('<path d="M12 3v11M7 9l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
  safari:svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  phone:svg('<rect x="6" y="2" width="12" height="20" rx="3"/><rect x="9" y="6" width="6" height="6" rx="1.5"/><path d="M11 18h2"/>')
 };
 // Each step: picture, Myanmar text, English text, optional action button.
 function steps(){
  const last={art:'phone',my:'Home Screen မှာ <b>'+esc(appName)+'</b> icon ပေါ်လာပါပြီ။ နောက်ပိုင်း အဲဒီ icon ကနေ ဆိုင်ကို ဖွင့်ပါ။ ပထမဆုံးအကြိမ် Google နဲ့ တစ်ခါ ပြန်ဝင်ရနိုင်ပါတယ်။',en:'The <b>'+esc(appName)+'</b> icon is on your Home Screen. Open your shop from it from now on (sign in with Google once if it asks).'};
  if(ios&&iosOther)return [
   {art:'safari',my:'ဒီ app ထဲကနေ Home Screen မတင်နိုင်ပါ။ အောက်က ခလုတ်နဲ့ link ကို copy ကူးပြီး <b>Safari</b> မှာ ဖွင့်ပါ။',en:'This app cannot add to the Home Screen. Copy the link and open it in <b>Safari</b>.',action:'copy'},
   {art:'share',my:'Safari ရဲ့ <b>Share</b> ခလုတ် ⬆︎ ကို နှိပ်ပါ။ မမြင်ရရင် <b>⋯</b> ကို အရင် နှိပ်ပါ။',en:'In Safari tap <b>Share</b> ⬆︎ (tap <b>⋯</b> first if you cannot see it).'},
   {art:'add',my:'အောက်ကို ဆွဲပြီး <b>Add to Home Screen</b> ကို နှိပ်ပါ။',en:'Scroll down and tap <b>Add to Home Screen</b>.'},
   {art:'toggle',my:'<b>Open as Web App</b> ကို ဖွင့်ထားပြီး ညာဘက်အပေါ်က <b>Add</b> ကို နှိပ်ပါ။',en:'Keep <b>Open as Web App</b> on and tap <b>Add</b>.'},last];
  if(ios&&iosChrome)return [
   {art:'share',my:'Chrome ရဲ့ လိပ်စာဘားမှာရှိတဲ့ <b>Share</b> ခလုတ် ⬆︎ ကို နှိပ်ပါ။',en:'Tap <b>Share</b> ⬆︎ in Chrome\'s address bar.'},
   {art:'add',my:'<b>Add to Home Screen</b> ကို နှိပ်ပါ။ မတွေ့ရင် <b>More</b> ထဲမှာ ရှာပါ။',en:'Tap <b>Add to Home Screen</b> (look under <b>More</b> if needed).'},
   {art:'toggle',my:'ညာဘက်အပေါ်က <b>Add</b> ကို နှိပ်ပါ။',en:'Tap <b>Add</b>.'},last];
  if(ios)return [
   {art:'share',my:'Safari ရဲ့ <b>Share</b> ခလုတ် ⬆︎ ကို နှိပ်ပါ။ မမြင်ရရင် အောက်ခြေ (သို့) အပေါ်က <b>⋯</b> ကို အရင် နှိပ်ပါ။',en:'Tap Safari\'s <b>Share</b> button ⬆︎. If you cannot see it, tap <b>⋯</b> first.'},
   {art:'add',my:'အောက်ကို ဆွဲပြီး <b>Add to Home Screen</b> ကို နှိပ်ပါ။',en:'Scroll down and tap <b>Add to Home Screen</b>.'},
   {art:'toggle',my:'<b>Open as Web App</b> ကို ဖွင့်ထားပြီး ညာဘက်အပေါ်က <b>Add</b> ကို နှိပ်ပါ။',en:'Keep <b>Open as Web App</b> on and tap <b>Add</b> at the top right.'},last];
  if(prompt)return [
   {art:'install',my:'အောက်က <b>App တင်မယ်</b> ခလုတ်ကို နှိပ်ပါ။',en:'Tap <b>Install app</b> below.',action:'install'},
   {art:'add',my:'ပေါ်လာတဲ့ အကွက်မှာ <b>Install</b> ကို နှိပ်ပါ။',en:'Tap <b>Install</b> in the box that opens.'},last];
  if(android)return [
   {art:'menu',my:'Chrome ညာဘက်အပေါ်က <b>⋮</b> ကို နှိပ်ပါ။',en:'Tap <b>⋮</b> at the top right of Chrome.'},
   {art:'add',my:'<b>Add to Home screen</b> (သို့) <b>Install app</b> ကို နှိပ်ပါ။',en:'Tap <b>Add to Home screen</b> or <b>Install app</b>.'},
   {art:'install',my:'<b>Install</b> (သို့) <b>Add</b> ကို နှိပ်ပါ။',en:'Tap <b>Install</b> or <b>Add</b>.'},last];
  return [
   {art:'menu',my:'Chrome / Edge ညာဘက်အပေါ်က <b>⋮</b> (သို့) <b>⋯</b> menu ကို နှိပ်ပါ။',en:'Open the <b>⋮</b> / <b>⋯</b> menu of Chrome or Edge.'},
   {art:'install',my:'<b>Cast, save and share → Install page as app</b> (Edge: <b>Apps → Install this site as an app</b>) ကို နှိပ်ပါ။',en:'Choose <b>Cast, save and share → Install page as app</b> (Edge: <b>Apps → Install this site as an app</b>).'},
   {art:'add',my:'<b>Install</b> ကို နှိပ်ပါ။',en:'Click <b>Install</b>.'},
   {art:'phone',my:'Desktop နဲ့ Start menu မှာ <b>'+esc(appName)+'</b> app ပေါ်လာပါပြီ။',en:'<b>'+esc(appName)+'</b> is now on your desktop and Start menu.'}];
 }
 let sheet=null,at=0;
 function build(){
  sheet=document.createElement('div');sheet.className='install-guide';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','install-guide-title');
  sheet.innerHTML='<div class="install-guide-card"><header><img src="/images/product-ai-robot.png?v=1.1.193" alt="" width="54" height="43"><div><h2 id="install-guide-title">App တင်ပေးမယ့် အကူ</h2><p>Home Screen install helper</p></div><button type="button" class="install-guide-close" data-guide="later" aria-label="Close">×</button></header><div class="install-guide-body" aria-live="polite"></div><div class="install-guide-dots"></div><footer><button type="button" class="install-guide-back" data-guide="back">‹ နောက်သို့</button><button type="button" class="install-guide-next" data-guide="next">ရှေ့ဆက် ›</button></footer></div>';
  sheet.addEventListener('click',async e=>{
   const b=e.target.closest('[data-guide]');if(!b){if(e.target===sheet)later();return}
   const list=steps(),k=b.dataset.guide;
   if(k==='later')later();else if(k==='back')show(at-1);else if(k==='next')at>=list.length-1?finish():show(at+1);
   else if(k==='copy'){try{await navigator.clipboard.writeText(location.origin+location.pathname);b.textContent='✓ Copy ကူးပြီးပါပြီ / Copied'}catch{b.textContent=location.origin+location.pathname}}
   else if(k==='install'&&prompt){const p=prompt;prompt=null;try{await p.prompt();const c=await p.userChoice;if(c.outcome==='accepted'){store.set(localStorage,doneKey,'1');show(list.length-1)}else show(at)}catch{show(at)}}
  });
  document.body.append(sheet);
 }
 function show(i){
  const list=steps();at=Math.max(0,Math.min(i,list.length-1));const s=list[at];
  sheet.querySelector('.install-guide-body').innerHTML='<p class="install-guide-count">အဆင့် '+(at+1)+' / '+list.length+'</p><div class="install-guide-step"><span class="install-guide-art">'+art[s.art]+'</span><div class="install-guide-bubble"><p>'+s.my+'</p><small>'+s.en+'</small></div></div>'+(s.action==='copy'?'<button type="button" class="install-guide-action" data-guide="copy">🔗 Link ကို copy ကူးမယ် / Copy link</button>':'')+(s.action==='install'&&prompt?'<button type="button" class="install-guide-action" data-guide="install">⬇ App တင်မယ် / Install app</button>':'');
  sheet.querySelector('.install-guide-dots').innerHTML=list.map((_,n)=>'<span class="'+(n===at?'on':n<at?'done':'')+'"></span>').join('');
  sheet.querySelector('.install-guide-back').hidden=at===0;
  sheet.querySelector('.install-guide-next').textContent=at===list.length-1?'ပြီးပါပြီ ✓ / Done':'ရှေ့ဆက် › / Next';
 }
 function open(){if(standalone())return;if(!sheet)build();sheet.hidden=false;document.body.classList.add('install-guide-open');show(0);sheet.querySelector('.install-guide-next').focus({preventScroll:true})}
 function close(){if(sheet)sheet.hidden=true;document.body.classList.remove('install-guide-open')}
 function later(){store.set(sessionStorage,laterKey,'1');close()}
 function finish(){store.set(localStorage,doneKey,'1');close()}
 window.GearHubInstallGuide={open};
 const welcome=new URLSearchParams(location.search).has('welcome');
 if(welcome)history.replaceState(history.state,'',location.pathname+location.hash);
 const wanted=()=>!standalone()&&(welcome||(phone&&!store.get(localStorage,doneKey)&&!store.get(sessionStorage,laterKey)));
 // Open once the seller is signed in and the dashboard is on screen.
 const dash=document.getElementById('dashboard');if(!dash||!wanted())return;
 const ready=()=>!dash.classList.contains('hidden');
 const go=()=>setTimeout(()=>{if(ready()&&wanted()&&!(sheet&&!sheet.hidden))open()},700);
 if(ready())go();else{const o=new MutationObserver(()=>{if(ready()){o.disconnect();go()}});o.observe(dash,{attributes:true,attributeFilter:['class']})}
})();
