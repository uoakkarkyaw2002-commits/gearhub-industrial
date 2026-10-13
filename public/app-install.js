(() => {
  const card = document.getElementById('app-install-card');
  const button = document.getElementById('app-install-button');
  const instructions = document.getElementById('app-install-instructions');
  const action = document.getElementById('home-screen-action');
  const title = document.getElementById('home-screen-title');
  const help = document.getElementById('home-screen-help');
  let installPrompt = null;
  let registrationPromise;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function refresh() {
    if (title) title.textContent = standalone() ? 'Update app' : 'Add to Home Screen';
    const icon=document.getElementById('home-screen-icon');if(icon)icon.textContent=standalone()?'🔄':'📲';
    if (help) help.textContent = standalone() ? 'နောက်ဆုံး app update ကို စစ်ရန်' : 'GearHub ကို ဖုန်း app အဖြစ် တင်ရန်';
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
    return navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'});
  }
  window.addEventListener('load', () => { registrationPromise = register(); registrationPromise.catch(() => {}); }, {once:true});
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (button) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; if(button) button.hidden = true; message('GearHub app တင်ပြီးပါပြီ။ Home Screen မှာ ဖွင့်နိုင်ပါပြီ။'); refresh(); });
  async function activate() {
    if (standalone()) {
      if(window.GearHubUpdates){await window.GearHubUpdates.apply();return;}
      if (!navigator.onLine) { message('Update စစ်ဖို့ internet ချိတ်ပေးပါ။'); return; }
      if(action) action.disabled = true;
      message('App update ကို စစ်နေပါတယ်…');
      try {
        const registration = await (registrationPromise || (registrationPromise = register()));
        if (!registration) throw new Error('unavailable');
        await registration.update();
        const worker = registration.installing || registration.waiting;
        if (worker && worker.state !== 'activated') {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 30000);
            worker.addEventListener('statechange', () => {
              if(worker.state === 'activated') {clearTimeout(timeout); resolve();}
              if(worker.state === 'redundant') {clearTimeout(timeout); reject(new Error('failed'));}
            });
          });
        }
        // Refresh HTML and settings even when no new service worker is needed.
        localStorage.setItem("gh-lang","en");
        window.location.reload();
      } catch (_) { message('Update မလုပ်နိုင်သေးပါ။ Internet ချိတ်ထားပြီး ပြန်နိပ်ပေးပါ။'); }
      finally { if(action) action.disabled = false; }
      return;
    }
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try { await prompt.prompt(); const choice = await prompt.userChoice; message(choice.outcome === 'accepted' ? 'App တင်နေပါတယ်။ Home Screen မှာ ဖွင့်နိုင်ပါမယ်။' : 'App မတင်ရသေးပါ။ နောက်တစ်ကြိမ် ပြန်တင်နိုင်ပါတယ်။'); }
      catch (_) { message('Browser menu မှ Add to Home Screen / Install app ကို ရွေးပေးပါ။'); }
      if(button) button.hidden = true;
    } else {
      message(isIOS ? 'Safari မှာ ဒီ website ကို ဖွင့်ပါ။ Share ခလုတ် → Add to Home Screen → Open as Web App ကို ဖွင့်ပြီး Add နိပ်ပေးပါ။ တင်ပြီးသားဆို Home Screen က GearHub ကို ဖွင့်ပြီး ဒီခလုတ်နဲ့ update စစ်နိုင်ပါတယ်။' : 'Browser menu မှ Install app / Add to Home Screen ကို ရွေးပေးပါ။ တင်ပြီးသားဆို Home Screen က GearHub ကို ဖွင့်ပြီး update စစ်နိုင်ပါတယ်။');
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
