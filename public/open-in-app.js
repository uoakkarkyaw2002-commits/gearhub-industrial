/* 1.1.200 owner: when a shop app (store or admin) is already on the Home Screen but the page is open in the
   browser, a bouncing "Open in app" pill says so. Android Chrome and PC Chrome/Edge can tell (the page's
   manifest names itself in related_applications); iPhone Safari cannot, so nothing shows there.
   Tapping tries to hand the page to the installed app (Android); if the browser stays, it shows where the
   browser's own "Open in app" is. Nothing is sent to the server. */
(()=>{
 const standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
 if(standalone||typeof navigator.getInstalledRelatedApps!=='function'||!document.querySelector('link[rel="manifest"]'))return;
 const key='gh-open-in-app-hidden:'+location.pathname;
 try{if(sessionStorage.getItem(key))return}catch{}
 const android=/android/i.test(navigator.userAgent);
 navigator.getInstalledRelatedApps().then(apps=>{if(!apps||!apps.length)return;show()}).catch(()=>{});
 function show(){
  const style=document.createElement('style');
  style.textContent='.open-in-app{position:fixed;left:50%;bottom:calc(var(--bottom-nav-height,0px) + 16px + env(safe-area-inset-bottom));z-index:150;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 24px);padding:6px 6px 6px 8px;border-radius:999px;background:#0f8a37;color:#fff;box-shadow:0 8px 24px rgba(8,60,30,.35);transform:translateX(-50%);animation:open-in-app-bounce 1.6s ease-in-out infinite;font:600 14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Myanmar",sans-serif}'
   +'.open-in-app[hidden]{display:none}.open-in-app button{border:0;font:inherit;cursor:pointer}'
   +'.open-in-app-go{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border-radius:999px;background:transparent;color:#fff;text-align:left;white-space:nowrap}'
   +'.open-in-app-go svg{flex:none;width:20px;height:20px}'
   +'.open-in-app-x{flex:none;width:32px;height:32px;border-radius:50%;background:#ffffff2e;color:#fff;font-size:20px;line-height:1}'
   +'.open-in-app-help{position:fixed;left:12px;right:12px;bottom:calc(var(--bottom-nav-height,0px) + 76px + env(safe-area-inset-bottom));z-index:150;margin:0 auto;max-width:420px;padding:12px 14px;border-radius:14px;background:#fff;color:#102b27;box-shadow:0 10px 30px rgba(8,40,25,.25);font:14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Myanmar",sans-serif}'
   +'.open-in-app-help[hidden]{display:none}'
   +'@keyframes open-in-app-bounce{0%,100%{transform:translateX(-50%) translateY(0)}12%{transform:translateX(-50%) translateY(-10px)}24%{transform:translateX(-50%) translateY(0)}34%{transform:translateX(-50%) translateY(-5px)}44%{transform:translateX(-50%) translateY(0)}}'
   +'@media(prefers-reduced-motion:reduce){.open-in-app{animation:none}}';
  document.head.append(style);
  const pill=document.createElement('div');pill.className='open-in-app';pill.setAttribute('role','status');
  pill.innerHTML='<button type="button" class="open-in-app-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 9l3 3-3 3"/></svg><span>App တင်ထားပြီး — App မှာ ဖွင့်ပါ<br><b>Open in app</b></span></button><button type="button" class="open-in-app-x" aria-label="Close">×</button>';
  const help=document.createElement('p');help.className='open-in-app-help';help.hidden=true;
  help.innerHTML=android?'Browser ညာဘက်အပေါ်က <b>⋮</b> ကို နှိပ်ပြီး <b>Open in app</b> (App မှာ ဖွင့်ရန်) ကို နှိပ်ပါ။ (သို့) Home Screen က app icon ကနေ ဖွင့်ပါ။':'Address bar ညာဘက်က <b>Open in app</b> icon ကို နှိပ်ပါ။ (သို့) Desktop / Start menu က app ကနေ ဖွင့်ပါ။';
  document.body.append(help,pill);
  // The help sits just above the pill (the pill's height depends on the phone's font).
  const place=()=>{help.style.bottom=Math.round(innerHeight-pill.getBoundingClientRect().top+10)+'px'};
  // Chrome kept the page (no app took it): it came back here with #open-in-app, so show the menu way.
  if(location.hash==='#open-in-app'){place();help.hidden=false;history.replaceState(history.state,'',location.pathname+location.search)}
  pill.querySelector('.open-in-app-x').addEventListener('click',()=>{pill.hidden=true;help.hidden=true;try{sessionStorage.setItem(key,'1')}catch{}});
  pill.querySelector('.open-in-app-go').addEventListener('click',()=>{
   if(android){
    // Android hands a https link to the installed app that owns it; if Chrome keeps the page, show the menu way.
    location.href='intent://'+location.host+location.pathname+location.search+'#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url='+encodeURIComponent(location.href.split('#')[0]+'#open-in-app')+';end';
    setTimeout(()=>{if(document.visibilityState==='visible'){place();help.hidden=false}},1500);
   }else{place();help.hidden=!help.hidden}
  });
 }
})();
