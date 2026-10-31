/* 1.1.195 owner: a step-by-step helper in a seller shop admin that shows how to put the shop admin on the
   phone's Home Screen, for the browser in use (iPhone Safari, iPhone Chrome, other iPhone apps, Android, PC).
   1.1.198 owner: it talks like a chat (the robot types each step, the seller's "Done" reply, then the next
   step) and every step has a short looping video of the phone screen with a finger showing where to tap.
   Opens by itself after a new shop opens (?welcome=1) and on phones until the seller finishes; never inside
   the installed app. Nothing is sent to the server.
   1.1.213 owner: the app is put on the Home Screen from the shop's Home page, not from the admin. In the
   admin the robot sends the seller to the Home page (?install=1), where the steps open; customers who
   simply visit the Home page never see it. */
(()=>{
 const match=location.pathname.match(/^\/shops\/([^/]+)\/(admin\/?)?$/);if(!match)return;
 const inAdmin=!!match[2],slug=decodeURIComponent(match[1]),homeUrl='/shops/'+encodeURIComponent(slug)+'/',doneKey='gh-install-guide-done:'+slug,laterKey='gh-install-guide-later:'+slug;
 const store={get:(s,k)=>{try{return s.getItem(k)}catch{return null}},set:(s,k,v)=>{try{s.setItem(k,v)}catch{}}};
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const iosChrome=ios&&/CriOS/.test(ua),iosOther=ios&&!iosChrome&&(/FxiOS|EdgiOS|GSA\/|FBAN|FBAV|Instagram|Line\/|Messenger|MicroMessenger/.test(ua)||!/Safari\//.test(ua));
 const android=/android/i.test(ua),phone=ios||android||matchMedia('(pointer:coarse)').matches;
 const appName=(inAdmin?document.title.trim().replace(/\s*Admin$/,''):document.title.trim())||'Shop';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 let prompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;if(sheet&&!sheet.hidden)show(at,false)});
 addEventListener('appinstalled',()=>{prompt=null;store.set(localStorage,doneKey,'1');if(sheet&&!sheet.hidden)finish()});
 const svg=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
 const icon={
  share:svg('<path d="M12 15V3M8 7l4-4 4 4"/><path d="M7 10H5v11h14V10h-2"/>'),
  menu:svg('<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>'),
  add:svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  install:svg('<path d="M12 3v11M7 9l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
  safari:svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  phone:svg('<rect x="6" y="2" width="12" height="20" rx="3"/><rect x="9" y="6" width="6" height="6" rx="1.5"/><path d="M11 18h2"/>')
 };
 // Short looping "videos": a drawn phone screen whose parts move with CSS animations (install-guide.css).
 const short=esc(appName.replace(/\s*Admin$/,'')).slice(0,14),finger='<i class="ig-finger"></i>';
 const page='<div class="ig-page"><b></b><span></span><span></span><span></span></div>';
 const scenes={
  'ios-share':page+'<div class="ig-pop"><p class="ig-hit">'+icon.share+'Share</p><p>Add to Bookmarks</p><p>Find on Page</p></div><div class="ig-bar"><span class="ig-round">‹</span><span class="ig-pill"><em class="ig-key">≡</em>skyshopmm.com</span><span class="ig-round">⧉</span></div>'+finger,
  'ios-add':page+'<div class="ig-sheet"><div class="ig-list"><p>Copy</p><p>Add to Reading List</p><p>Add Bookmark</p><p>Find on Page</p><p class="ig-hit">'+icon.add+'Add to Home Screen</p><p>Markup</p></div></div>'+finger,
  'ios-confirm':'<div class="ig-form"><div class="ig-head"><span>Cancel</span><b>Add to Home Screen</b><span class="ig-key">Add</span></div><div class="ig-app"><i class="ig-appicon"></i><span>'+short+'</span></div><p class="ig-switch">Open as Web App<i></i></p></div>'+finger,
  'and-menu':'<div class="ig-top"><span class="ig-pill">skyshopmm.com</span><em class="ig-key">⋮</em></div>'+page+'<div class="ig-drop"><p>New tab</p><p>Bookmarks</p><p class="ig-hit">'+icon.add+'Add to Home screen</p><p>Settings</p></div>'+finger,
  'and-install':page+'<div class="ig-dialog"><b>Install app?</b><div class="ig-app"><i class="ig-appicon"></i><span>'+short+'</span></div><p><span>Cancel</span><span class="ig-key">Install</span></p></div>'+finger,
  'home':'<div class="ig-home">'+'<i></i>'.repeat(7)+'<span class="ig-new"><i class="ig-appicon"></i>'+short+'</span></div>'+finger
 };
 // Each step: video (or icon), Myanmar text, English text, optional action button.
 function steps(){
  if(inAdmin)return [{icon:'phone',my:'App ကို ဆိုင်ရဲ့ <b>Home page</b> ကနေ တင်ပါမယ်။ အောက်က <b>Home page သွားမယ်</b> ကို နှိပ်ပါ။',en:'The app is added from your shop\'s <b>Home page</b>. Tap <b>Go to Home page</b> below.'}];
  const last={scene:'home',icon:'phone',my:'Home Screen မှာ <b>'+esc(appName)+'</b> icon ပေါ်လာပါပြီ။ နောက်ပိုင်း အဲဒီ icon ကနေ ဆိုင်ကို ဖွင့်ပါ။ ပထမဆုံးအကြိမ် Google နဲ့ တစ်ခါ ပြန်ဝင်ရနိုင်ပါတယ်။',en:'The <b>'+esc(appName)+'</b> icon is on your Home Screen. Open your shop from it from now on (sign in with Google once if it asks).'};
  const safari=[
   {scene:'ios-share',icon:'share',my:'Safari အောက်ခြေ လိပ်စာဘားထဲက <b>≡</b> ကို နှိပ်ပြီး <b>Share</b> ကို ရွေးပါ။ (Share ⬆︎ ခလုတ် တန်းမြင်ရရင် အဲဒါကို နှိပ်ပါ။)',en:'Tap <b>≡</b> in Safari\'s address bar, then <b>Share</b> (or tap <b>Share</b> ⬆︎ if you see it).'},
   {scene:'ios-add',icon:'add',my:'အောက်ကို ဆွဲပြီး <b>Add to Home Screen</b> ကို နှိပ်ပါ။',en:'Scroll down and tap <b>Add to Home Screen</b>.'},
   {scene:'ios-confirm',icon:'add',my:'<b>Open as Web App</b> ကို ဖွင့်ထားပြီး ညာဘက်အပေါ်က <b>Add</b> ကို နှိပ်ပါ။',en:'Keep <b>Open as Web App</b> on and tap <b>Add</b> at the top right.'}];
  if(ios&&iosOther)return [
   {icon:'safari',my:'ဒီ app ထဲကနေ Home Screen မတင်နိုင်ပါ။ အောက်က ခလုတ်နဲ့ link ကို copy ကူးပြီး <b>Safari</b> မှာ ဖွင့်ပါ။',en:'This app cannot add to the Home Screen. Copy the link and open it in <b>Safari</b>.',action:'copy'},...safari,last];
  if(ios&&iosChrome)return [
   {icon:'share',my:'Chrome ရဲ့ လိပ်စာဘားမှာရှိတဲ့ <b>Share</b> ခလုတ် ⬆︎ ကို နှိပ်ပါ။',en:'Tap <b>Share</b> ⬆︎ in Chrome\'s address bar.'},
   {scene:'ios-add',icon:'add',my:'<b>Add to Home Screen</b> ကို နှိပ်ပါ။ မတွေ့ရင် <b>More</b> ထဲမှာ ရှာပါ။',en:'Tap <b>Add to Home Screen</b> (look under <b>More</b> if needed).'},
   {scene:'ios-confirm',icon:'add',my:'ညာဘက်အပေါ်က <b>Add</b> ကို နှိပ်ပါ။',en:'Tap <b>Add</b>.'},last];
  if(ios)return [...safari,last];
  if(prompt)return [
   {icon:'install',my:'အောက်က <b>App တင်မယ်</b> ခလုတ်ကို နှိပ်ပါ။',en:'Tap <b>Install app</b> below.',action:'install'},
   {scene:'and-install',icon:'add',my:'ပေါ်လာတဲ့ အကွက်မှာ <b>Install</b> ကို နှိပ်ပါ။',en:'Tap <b>Install</b> in the box that opens.'},last];
  if(android)return [
   {scene:'and-menu',icon:'menu',my:'Chrome ညာဘက်အပေါ်က <b>⋮</b> ကို နှိပ်ပြီး <b>Add to Home screen</b> (သို့) <b>Install app</b> ကို နှိပ်ပါ။',en:'Tap <b>⋮</b> at the top right of Chrome, then <b>Add to Home screen</b> or <b>Install app</b>.'},
   {scene:'and-install',icon:'install',my:'<b>Install</b> (သို့) <b>Add</b> ကို နှိပ်ပါ။',en:'Tap <b>Install</b> or <b>Add</b>.'},last];
  return [
   {icon:'menu',my:'Chrome / Edge ညာဘက်အပေါ်က <b>⋮</b> (သို့) <b>⋯</b> menu ကို နှိပ်ပါ။',en:'Open the <b>⋮</b> / <b>⋯</b> menu of Chrome or Edge.'},
   {icon:'install',my:'<b>Cast, save and share → Install page as app</b> (Edge: <b>Apps → Install this site as an app</b>) ကို နှိပ်ပါ။',en:'Choose <b>Cast, save and share → Install page as app</b> (Edge: <b>Apps → Install this site as an app</b>).'},
   {icon:'add',my:'<b>Install</b> ကို နှိပ်ပါ။',en:'Click <b>Install</b>.'},
   {icon:'phone',my:'Desktop နဲ့ Start menu မှာ <b>'+esc(appName)+'</b> app ပေါ်လာပါပြီ။',en:'<b>'+esc(appName)+'</b> is now on your desktop and Start menu.'}];
 }
 const robot='<img class="ig-avatar" src="/images/product-ai-robot.png?v=1.1.193" alt="" width="34" height="27">';
 function bubble(s,n,total,live){
  const media=s.scene?'<div class="ig-video ig-'+s.scene+(live?' ig-play':'')+'" role="img" aria-label="Video">'+scenes[s.scene]+'</div>':'<span class="install-guide-art">'+icon[s.icon]+'</span>';
  const action=live&&s.action==='copy'?'<button type="button" class="install-guide-action" data-guide="copy">🔗 Link ကို copy ကူးမယ် / Copy link</button>':live&&s.action==='install'&&prompt?'<button type="button" class="install-guide-action" data-guide="install">⬇ App တင်မယ် / Install app</button>':'';
  return '<div class="ig-msg ig-bot'+(live?' ig-live':' ig-old')+'">'+robot+'<div class="install-guide-bubble"><p class="install-guide-count">အဆင့် '+n+' / '+total+'</p><p>'+s.my+'</p><small>'+s.en+'</small>'+(live?media+action:'')+'</div></div>';
 }
 const reply='<div class="ig-msg ig-me"><p>ပြီးပြီ ✓ / Done</p></div>';
 let sheet=null,at=0,typing=0;
 function build(){
  sheet=document.createElement('div');sheet.className='install-guide';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','install-guide-title');
  sheet.innerHTML='<div class="install-guide-card"><div class="install-guide-top"><img src="/images/product-ai-robot.png?v=1.1.193" alt="" width="54" height="43"><div><h2 id="install-guide-title">App တင်ပေးမယ့် အကူ</h2><p>Home Screen install helper</p></div><button type="button" class="install-guide-close" data-guide="later" aria-label="Close">×</button></div><div class="install-guide-body" aria-live="polite"></div><div class="install-guide-dots"></div><div class="install-guide-foot"><button type="button" class="install-guide-back" data-guide="back">‹ နောက်သို့</button><button type="button" class="install-guide-next" data-guide="next">ပြီးပြီ ✓ / Done</button></div></div>';
  sheet.addEventListener('click',async e=>{
   const b=e.target.closest('[data-guide]');if(!b){if(e.target===sheet)later();return}
   const list=steps(),k=b.dataset.guide;
   if(k==='later')later();else if(k==='back')show(at-1,false);else if(k==='next'&&inAdmin)location.href=homeUrl+'?install=1';else if(k==='next')at>=list.length-1?finish():show(at+1,true);
   else if(k==='copy'){try{await navigator.clipboard.writeText(location.origin+homeUrl);b.textContent='✓ Copy ကူးပြီးပါပြီ / Copied'}catch{b.textContent=location.origin+homeUrl}}
   else if(k==='install'&&prompt){const p=prompt;prompt=null;try{await p.prompt();const c=await p.userChoice;if(c.outcome==='accepted'){store.set(localStorage,doneKey,'1');show(list.length-1,true)}else show(at,false)}catch{show(at,false)}}
  });
  document.body.append(sheet);
 }
 // The chat: earlier steps stay above as short bubbles with the seller's "Done" reply; the robot "types"
 // the next step and replies on its own.
 function show(i,type){
  const list=steps();at=Math.max(0,Math.min(i,list.length-1));
  const body=sheet.querySelector('.install-guide-body'),next=sheet.querySelector('.install-guide-next'),mine=++typing;
  let html='';for(let n=0;n<at;n++)html+=bubble(list[n],n+1,list.length,false)+reply;
  sheet.querySelector('.install-guide-dots').innerHTML=list.map((_,n)=>'<span class="'+(n===at?'on':n<at?'done':'')+'"></span>').join('');
  sheet.querySelector('.install-guide-back').hidden=at===0;
  next.textContent=inAdmin?'Home page သွားမယ် → / Go to Home page':at===list.length-1?'ပြီးပါပြီ ✓ / Finish':'ပြီးပြီ ✓ / Done';
  const end=()=>{body.innerHTML=html+bubble(list[at],at+1,list.length,true);next.disabled=false;body.scrollTop=body.scrollHeight};
  if(!type||matchMedia('(prefers-reduced-motion: reduce)').matches){end();return}
  body.innerHTML=html+'<div class="ig-msg ig-bot">'+robot+'<div class="install-guide-bubble ig-typing" aria-label="typing"><i></i><i></i><i></i></div></div>';next.disabled=true;body.scrollTop=body.scrollHeight;
  setTimeout(()=>{if(mine===typing)end()},900);
 }
 function open(){if(standalone())return;if(!sheet)build();sheet.hidden=false;document.body.classList.add('install-guide-open');show(0,true);sheet.querySelector('.install-guide-close').focus({preventScroll:true})}
 function close(){if(sheet)sheet.hidden=true;document.body.classList.remove('install-guide-open')}
 function later(){store.set(sessionStorage,laterKey,'1');close()}
 function finish(){store.set(localStorage,doneKey,'1');close()}
 window.GearHubInstallGuide={open};
 // 1.1.231 owner (Android): the shop never asked to install its app — this page takes Chrome's install
 // offer (beforeinstallprompt) for its own helper, so Chrome shows nothing by itself. On an Android phone
 // the shop's Home page now shows a small "Install app" bar when Chrome offers it; Install opens
 // Chrome's own install box. × hides it for 7 days on this phone.
 function banner(){
  if(!android||standalone())return;
  const offKey='gh-install-banner-off:'+slug,off=+store.get(localStorage,offKey)||0;if(Date.now()-off<7*864e5)return;
  let bar=null;
  const show=()=>{
   if(bar||!prompt||standalone())return;
   const icon=document.querySelector('link[rel="apple-touch-icon"]')?.href||'';
   bar=document.createElement('div');bar.className='install-bar';bar.setAttribute('role','dialog');bar.setAttribute('aria-label','Install app');
   bar.innerHTML=(icon?'<img src="'+esc(icon)+'" alt="" width="44" height="44">':'')+'<div><b>'+esc(appName)+' app</b><small>ဖုန်းထဲ app အဖြစ် တင်ပါ / Install the app</small></div><button type="button" class="install-bar-go">Install</button><button type="button" class="install-bar-x" aria-label="Not now">×</button>';
   document.body.append(bar);requestAnimationFrame(()=>bar.classList.add('on'));
   bar.querySelector('.install-bar-x').onclick=()=>{store.set(localStorage,offKey,String(Date.now()));hide()};
   bar.querySelector('.install-bar-go').onclick=async()=>{const p=prompt;if(!p)return hide();prompt=null;hide();try{await p.prompt();const c=await p.userChoice;if(c.outcome==='accepted')store.set(localStorage,doneKey,'1')}catch{}};
  };
  const hide=()=>{bar?.remove();bar=null};
  addEventListener('beforeinstallprompt',()=>setTimeout(show,2500));
  addEventListener('appinstalled',hide);
  if(prompt)setTimeout(show,2500);
 }
 const query=new URLSearchParams(location.search),welcome=query.has('welcome'),asked=!inAdmin&&query.has('install');
 if(welcome||asked)history.replaceState(history.state,'',location.pathname+location.hash);
 // Home page: only when the seller came from the admin's "Go to Home page".
 if(!inAdmin){if(asked&&!standalone()){const go=()=>setTimeout(open,700);document.readyState==='complete'?go():addEventListener('load',go,{once:true})}else banner();return}
 const wanted=()=>!standalone()&&(welcome||(phone&&!store.get(localStorage,doneKey)&&!store.get(sessionStorage,laterKey)));
 // Open once the seller is signed in and the dashboard is on screen.
 const dash=document.getElementById('dashboard');if(!dash||!wanted())return;
 const ready=()=>!dash.classList.contains('hidden');
 const go=()=>setTimeout(()=>{if(ready()&&wanted()&&!(sheet&&!sheet.hidden))open()},700);
 if(ready())go();else{const o=new MutationObserver(()=>{if(ready()){o.disconnect();go()}});o.observe(dash,{attributes:true,attributeFilter:['class']})}
})();
