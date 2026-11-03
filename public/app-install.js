(() => {
  const card = document.getElementById('app-install-card');
  const button = document.getElementById('app-install-button');
  const instructions = document.getElementById('app-install-instructions');
  const action = document.getElementById('home-screen-action');
  const title = document.getElementById('home-screen-title');
  const help = document.getElementById('home-screen-help');
  const shopName=document.querySelector('meta[name="gearhub-shop-name"]')?.content;
  const appName=shopName||'GearHub';
  if(shopName){
    for(const lang of ['en','my'])Object.assign(window.GEARHUB_DEFAULT_TRANSLATIONS?.[lang]||{},{settingsEyebrow:shopName+' APP',installAppTitle:'Install '+shopName,installAppIos:'Share → Add to Home Screen → Add',aboutAppDetails:shopName+' · Shop app',notificationDenied:'Allow notifications for this app in device settings.'});
    for(const key of ['settingsEyebrow','installAppTitle','installAppIos','aboutAppDetails'])document.querySelectorAll('[data-i18n="'+key+'"]').forEach(el=>el.textContent=window.GEARHUB_DEFAULT_TRANSLATIONS.en[key]);
  }
  let installPrompt = null;
  let registrationPromise;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function refresh() {
    // 1.1.262 owner: the row shows inside an installed app too (copies the link and shows the steps).
    if (title) title.textContent = 'Add to Home Screen';
    if (help) help.textContent = appName+' ကို ဖုန်း app အဖြစ် တင်ရန်';
  }
  function message(text) {
    if (!card || !instructions) return;
    card.hidden = false;
    instructions.removeAttribute('data-i18n');
    instructions.textContent = text;
    card.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  async function register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
    return navigator.serviceWorker.register((location.pathname.match(/^\/shops\/[a-z0-9-]+\//)||["/"])[0]+"sw.js", {updateViaCache: 'none'});
  }
  window.addEventListener('load', () => { registrationPromise = register(); registrationPromise.catch(() => {}); }, {once:true});
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (button) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; if(button) button.hidden = true; message(appName+' app တင်ပြီးပါပြီ။ Home Screen မှာ ဖွင့်နိုင်ပါပြီ။'); refresh(); });
  async function activate() {
    if (standalone()) {
      // Inside an installed app the browser menu is not there: copy this store's link and say where to paste it.
      const link=location.origin+((location.pathname.match(/^\/shops\/[^/]+\//)||['/index.html'])[0]);
      try{await navigator.clipboard.writeText(link)}catch(_){}
      message('Link ကို copy ကူးပြီးပါပြီ။ '+(isIOS?'Safari':'Chrome')+' ကို ဖွင့်ပြီး လိပ်စာဘားမှာ paste လုပ်ပါ → '+(isIOS?'Share ⬆︎ → Add to Home Screen → Add':'⋮ → Add to Home screen / Install app')+' ကို နှိပ်ပါ။ / Link copied: open '+(isIOS?'Safari':'Chrome')+', paste it, then Add to Home Screen.');
      return;
    }
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try { await prompt.prompt(); const choice = await prompt.userChoice; message(choice.outcome === 'accepted' ? 'App တင်နေပါတယ်။ Home Screen မှာ ဖွင့်နိုင်ပါမယ်။' : 'App မတင်ရသေးပါ။ နောက်တစ်ကြိမ် ပြန်တင်နိုင်ပါတယ်။'); }
      catch (_) { message('Browser menu မှ Add to Home Screen / Install app ကို ရွေးပေးပါ။'); }
      if(button) button.hidden = true;
    } else {
      message((isIOS ? 'Safari မှာ ဒီ website ကို ဖွင့်ပါ။ Share ခလုတ် → Add to Home Screen → Open as Web App ကို ဖွင့်ပြီး Add နိပ်ပေးပါ။ တင်ပြီးသားဆို Home Screen က GearHub ကို ဖွင့်ပြီး ဒီခလုတ်နဲ့ update စစ်နိုင်ပါတယ်။' : 'Browser menu မှ Install app / Add to Home Screen ကို ရွေးပေးပါ။ တင်ပြီးသားဆို Home Screen က GearHub ကို ဖွင့်ပြီး update စစ်နိုင်ပါတယ်။').replaceAll('GearHub',()=>appName));
    }
  }
  action?.addEventListener('click', activate);
  button?.addEventListener('click', activate);
  refresh();
})();

// iOS may still double-tap zoom non-interactive card content.
// Cancel only a second stationary single-finger tap; leave pinch and scroll intact.
(() => {
 let start=null,last=null;
 const editable=target=>target instanceof Element&&target.closest('textarea,select,[contenteditable="true"],input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])');
 document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){start=null;last=null;return;}
  const touch=event.touches[0];
  start={x:touch.clientX,y:touch.clientY,time:Date.now(),target:event.target};
 },{passive:true});
 document.addEventListener('touchend',event=>{
  if(!start||event.touches.length||event.changedTouches.length!==1){start=null;return;}
  const touch=event.changedTouches[0],now=Date.now(),tap=start;start=null;
  if(editable(event.target)||now-tap.time>400||Math.hypot(touch.clientX-tap.x,touch.clientY-tap.y)>12){last=null;return;}
  if(last&&now-last.time<350&&Math.hypot(touch.clientX-last.x,touch.clientY-last.y)<24){
   if(event.cancelable)event.preventDefault();last=null;
  }else last={time:now,x:touch.clientX,y:touch.clientY};
 },{passive:false,capture:true});
 document.addEventListener('dblclick',event=>{if(!editable(event.target)&&event.cancelable)event.preventDefault();},{capture:true});
 document.addEventListener('touchcancel',()=>{start=null;last=null;},{passive:true});
})();

// Match Cart and checkout to the actual bottom navigation height.
(() => {
 const nav=document.querySelector(".mobile-bottom-nav");if(!nav)return;
 const measure=()=>document.documentElement.style.setProperty("--bottom-nav-height",`${Math.ceil(nav.getBoundingClientRect().height)}px`);
 measure();if("ResizeObserver" in window)new ResizeObserver(measure).observe(nav);
 window.addEventListener("resize",measure);
})();
