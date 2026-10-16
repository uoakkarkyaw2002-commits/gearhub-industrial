(() => {
  if(location.pathname==="/admin.html")return;
  const draftKey = "gh-update-draft:" + location.pathname;
  let registration,
    release,
    requested = false;
  function fields() {
    return [...document.querySelectorAll("input,textarea,select")].filter(
      (e) => (e.name || e.id) && e.type !== "password" && e.type !== "file",
    );
  }
  function saveDraft() {
    window.GearHubTenantAdmin?.saveCategories?.();
    const entries = fields().map((e) => ({
      form: e.form?.id || "",
      name: e.name,
      id: e.id,
      type: e.type,
      value: e.value,
      checked: e.checked,
    }));
    sessionStorage.setItem(draftKey, JSON.stringify(entries));
  }
  function restore() {
    if(window.GearHubTenantAdmin&&!window.GearHubTenantAdmin.draftReady)return;
    let entries;
    try {
      entries = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    } catch {
      return;
    }
    if (!entries) return;
    const remaining = [];
    for (const d of entries) {
      const form = d.form ? document.getElementById(d.form) : document;
      const e = [
        ...(form?.querySelectorAll("input,textarea,select") || []),
      ].find(
        (e) =>
          (d.name ? e.name === d.name : e.id === d.id) && e.type === d.type,
      );
      if (e) {
        e.value = d.value;
        if (e.type === "checkbox" || e.type === "radio") e.checked = d.checked;
      } else remaining.push(d);
    }
    if (remaining.length)
      sessionStorage.setItem(draftKey, JSON.stringify(remaining));
    else sessionStorage.removeItem(draftKey);
  }
  function blocked() {
    return (
      window.__gearhubCheckoutPending || window.__gearhubPlatformPending ||
      [...document.querySelectorAll("form button")].some(
        (e) => e.disabled && e.dataset.busy === "true",
      ) ||
      [...document.querySelectorAll("input[type=file]")].some(
        (e) => e.files?.length,
      )
    );
  }
  const shop=location.pathname.match(/^\/shops\/([^/]+)/);
  const scope=shop?'/shops/'+shop[1]+'/':location.pathname==='/platform.html'?'/platform.html':'/';
  const versionKey='gh-app-version:'+scope,notifiedKey='gh-update-notified:'+scope;
  const buildVersion=document.querySelector?.('meta[name="gearhub-build-version"]')?.content;
  let available=false,audio,toastTimer;
  const notificationsOn=()=>localStorage.getItem('gh-notifications')==='on';
  function feedback(text){const node=document.getElementById('app-update-feedback');if(node)node.textContent=text;}
  async function enableSound(){
    if(!notificationsOn())return false;
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;audio=audio||new Audio();if(audio.state==='suspended')await audio.resume();return audio.state==='running';}catch{return false;}
  }
  function sound(){
    if(!notificationsOn()||audio?.state!=='running')return;
    try{const tone=audio.createOscillator(),volume=audio.createGain();tone.type='sine';tone.frequency.value=640;volume.gain.setValueAtTime(.08,audio.currentTime);volume.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);tone.connect(volume);volume.connect(audio.destination);tone.start();tone.stop(audio.currentTime+.16);}catch{}
  }
  function review(){
    document.querySelector?.('[data-store-view="profile"]')?.click();
    const centre=document.getElementById('app-update-notification');if(centre)centre.hidden=false;
    document.getElementById('app-update-action')?.scrollIntoView?.({block:'center',behavior:'smooth'});
    document.getElementById('app-update-action')?.focus?.();
  }
  function renderUpdate(){
    document.getElementById('gearhub-update-banner')?.remove?.();
    const badge=document.getElementById('app-update-badge'),status=document.getElementById('app-update-status'),summary=document.getElementById('app-update-summary'),current=document.getElementById('app-current-version');
    if(badge){badge.hidden=!available;badge.textContent='Update available · '+release.version;}
    if(status)status.textContent=available?'Version '+release.version+' available / အသစ်ရပါပြီ':('Version '+(buildVersion||release.version)+' · Up to date / နောက်ဆုံးဗားရှင်း');
    if(current)current.textContent=buildVersion||release.version;
    if(summary)summary.textContent=available?'Version '+release.version+' · '+release.notes:'No update pending / Update မရှိသေးပါ။';
    const headerUpdate=document.querySelector?.('header #app-update-action');if(headerUpdate){headerUpdate.hidden=!available;headerUpdate.textContent='Update available · '+release.version;}
    const centre=document.getElementById('app-update-notification');if(centre&&!available)centre.hidden=true;
    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent||'');
    if(isIOS&&navigator.standalone===true){document.getElementById('home-screen-action')?.setAttribute('hidden','');}
  }
  function notifyOnce(){
    if(!available||!notificationsOn()||document.visibilityState==='hidden')return;
    let seen;try{seen=JSON.parse(localStorage.getItem(notifiedKey)||'[]');if(!Array.isArray(seen))seen=[];if(seen.includes(release.version))return;localStorage.setItem(notifiedKey,JSON.stringify([...seen,release.version]));}catch{return;}
    const toast=document.createElement('aside');toast.className='app-update-toast';toast.id='app-update-toast';toast.setAttribute('role','status');
    const text=document.createElement('p');text.textContent='Update available · '+release.version+' / App အသစ် ရပါပြီ။';
    const open=document.createElement('button');open.type='button';open.textContent='Settings / ဆက်တင်';open.addEventListener('click',()=>{review();toast.remove();});
    const close=document.createElement('button');close.type='button';close.textContent='Dismiss / ပိတ်ရန်';close.addEventListener('click',()=>toast.remove());
    toast.append(text,open,close);document.getElementById('app-update-toast')?.remove?.();document.body.append(toast);sound();clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.remove(),7000);
  }
  async function check() {
    try {
      const r=await fetch('/api/app-release',{cache:'no-store'});if(!r.ok)return;
      const next=await r.json();if(!/^\d+\.\d+\.\d+$/.test(next.version||''))return;release=next;
      if(release.platformEnabled&&!document.querySelector?.('[data-platform-link]')){const nav=document.querySelector?.('header nav');if(nav){const a=document.createElement('a');a.href='/platform.html';a.dataset.platformLink='true';a.textContent='My shop';nav.append(a);}}
      let seen=localStorage.getItem(versionKey)||buildVersion||localStorage.getItem('gh-app-version');
      if(!seen){seen=release.version;localStorage.setItem(versionKey,seen);}
      available=Boolean((buildVersion||seen)!==release.version||registration?.waiting);
      renderUpdate();notifyOnce();
    }catch{const status=document.getElementById('app-update-status');if(status)status.textContent='Cannot check updates. Reconnect and try again. / အင်တာနက် စစ်ပေးပါ။';}
  }
  async function apply() {
    if(blocked()){
      feedback('Finish the active action or selected file before updating. လုပ်ဆောင်နေမှု/ရွေးထားသောဖိုင်ကို အရင်ပြီးစီးပါ။');return false;
    }
    try {
      saveDraft();
      if (registration) {
        await registration.update();
        const installing = registration.installing;
        if (
          installing &&
          installing.state !== "installed" &&
          installing.state !== "activated"
        )
          await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(Error("Update timed out")),
              30000,
            );
            installing.addEventListener("statechange", () => {
              if (["installed", "activated"].includes(installing.state)) {
                clearTimeout(timer);
                resolve();
              } else if (installing.state === "redundant") {
                clearTimeout(timer);
                reject(Error("Update failed"));
              }
            });
          });
      }
      localStorage.setItem(versionKey, release?.version || buildVersion || "1.0.0");
      localStorage.setItem("gh-app-version", release?.version || buildVersion || "1.0.0");
      requested = true;
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "APPLY_UPDATE" });
        return true;
      }
      location.reload();
      return true;
    } catch {
      requested = false;
      feedback("Update failed. Check internet/storage and try again. / Update မရသေးပါ။");
      return false;
    }
  }
  window.GearHubUpdates = { apply, restore, blocked, saveDraft, check, enableSound, state:()=>({available,version:release?.version}) };
  document.getElementById('app-update-action')?.addEventListener('click',async()=>{await check();review();if(available)await apply();else feedback('You are up to date. / နောက်ဆုံးဗားရှင်း ဖြစ်ပါသည်။');});
  document.getElementById('app-update-review')?.addEventListener('click',()=>apply());
  document.addEventListener?.('pointerdown',()=>{if(notificationsOn())enableSound();},{passive:true});
  document.addEventListener?.('keydown',()=>{if(notificationsOn())enableSound();});
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState!=='hidden')check();});
  function reloadWhenSafe(){
    if(blocked()){setTimeout(reloadWhenSafe,1000);return;}
    saveDraft();
    location.reload();
  }
  navigator.serviceWorker?.addEventListener("controllerchange", reloadWhenSafe);
  window.addEventListener("load", async () => {
    restore();
    if ("serviceWorker" in navigator && isSecureContext) {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        registration.addEventListener("updatefound", () => {
          registration.installing?.addEventListener("statechange", () => {
            if (registration.waiting) check();
          });
        });
      } catch {}
    }
    await check();
    setInterval(check, 60000);
  });
})();
