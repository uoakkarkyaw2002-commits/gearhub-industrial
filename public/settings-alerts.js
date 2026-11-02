// 1.1.242 owner: in every shop's Settings — "Contact us" (09-766472432) and the order Notifications with an
// on/off switch (moved here from the shop admin). 1.1.243: every user sees it; only the shop's owner (or the
// GearHub owner) can turn it on. It uses the shop's own service worker and the shop push API.
(()=>{
 const slug=(location.pathname.match(/^\/shops\/([a-z0-9-]+)\//)||[])[1],share=document.getElementById("share-store-action");
 if(!slug||!share)return;
 const SW_URL="/shops/"+slug+"/sw.js",offKey="gh-alerts-off:true";
 const my=()=>document.documentElement.lang==="my";
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 const keyBytes=k=>{const raw=atob((k+"=".repeat((4-k.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 let shopId=0,csrf="";
 async function api(path,body){const r=await fetch("/api/platform/shops/"+shopId+"/push"+path,body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(body)}:{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Failed");return d}
 async function registration(){await navigator.serviceWorker.register(SW_URL,{updateViaCache:"none"}).catch(()=>{});return navigator.serviceWorker.ready}
 async function current(){return (await registration()).pushManager.getSubscription()}
 const row=document.createElement("div");row.className="settings-row settings-alerts-row";row.hidden=true;
 row.innerHTML='<span class="settings-icon" aria-hidden="true">🔔</span><div class="settings-copy"><strong>Notifications</strong><small id="settings-alerts-help"></small></div><label class="settings-switch"><input type="checkbox" role="switch" id="settings-alerts-switch" aria-label="Notifications"><span aria-hidden="true"></span></label>';
 share.after(row);
 const input=row.querySelector("input"),help=row.querySelector("#settings-alerts-help");
 const say=(en,mm)=>{help.textContent=my()?mm:en};
 function show(on,en,mm){input.checked=on;say(en||(on?"New orders alert this phone, even when locked":"Order alerts on this phone are off"),mm||(on?"ဖုန်း lock ထားလည်း အော်ဒါအသစ် သတိပေးပါမယ်":"အော်ဒါ သတိပေးချက် ပိတ်ထားပါတယ်"))}
 async function refresh(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!window.Notification||!window.isSecureContext||(isIOS&&!standalone())){input.disabled=true;return show(false,isIOS?"Open the app from your Home Screen to turn on":"This browser cannot show order alerts",isIOS?"Home Screen က app ကနေ ဖွင့်ပြီးမှ ဖွင့်လို့ရပါမယ်":"ဒီ browser မှာ သတိပေးချက် မရပါ")}
  if(Notification.permission==="denied"){input.disabled=true;return show(false,"Notifications are blocked in the phone settings","ဖုန်း Settings မှာ Notifications ပိတ်ထားပါတယ်")}
  try{const sub=await current(),s=await api(sub?"?endpoint="+encodeURIComponent(sub.endpoint):"");show(!!(sub&&s.subscribed))}catch{show(false)}
 }
 async function turnOn(){
  const p=await Notification.requestPermission();if(p!=="granted"){input.disabled=p==="denied";return show(false)}
  const {publicKey}=await api(""),reg=await registration(),key=keyBytes(publicKey);let sub=await reg.pushManager.getSubscription();
  if(sub&&sub.options?.applicationServerKey){const old=new Uint8Array(sub.options.applicationServerKey);if(old.length!==key.length||old.some((v,i)=>v!==key[i])){await sub.unsubscribe();sub=null}}
  sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await api("/subscribe",{subscription:sub.toJSON()});try{localStorage.removeItem(offKey)}catch{}show(true);
 }
 async function turnOff(){const sub=await current();try{localStorage.setItem(offKey,"1")}catch{}if(sub){await api("/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{})}show(false)}
 let mode="";
 input.addEventListener("change",async()=>{
  if(mode==="signin"){input.checked=false;input.disabled=true;say("Opening Google sign-in…","Google နဲ့ ဝင်ဖို့ ဖွင့်နေပါတယ်…");try{window.GearHubAppLogin?await GearHubAppLogin.start():location.assign("/platform.html")}catch(e){say(e.message,e.message);input.disabled=false}return}
  input.disabled=true;try{input.checked?await turnOn():await turnOff()}catch(e){show(false,"Could not change: "+(e.message||"failed"),"မပြောင်းနိုင်ပါ / "+(e.message||"failed"))}finally{input.disabled=false}});
 (async()=>{try{
  const [me,store]=await Promise.all([fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"}).then(r=>r.json()),fetch("/api/platform/store/"+slug,{cache:"no-store"}).then(r=>r.json())]);
  if(!store?.id)return;row.hidden=false;
  // 1.1.243 owner: every user's Settings shows the switch. Not signed in → the switch opens Google sign-in
  // (kept inside the installed app by app-login.js); signed in but not this shop's owner → shown, cannot turn on.
  if(!me?.user){mode="signin";return show(false,"Sign in with Google to get order alerts","အော်ဒါ သတိပေးချက်ရဖို့ Google နဲ့ ဝင်ပါ")}
  if(!(me.isOwner||Number(me.shop?.id)===Number(store.id))){input.disabled=true;return show(false,"Only this shop's owner gets its order alerts","ဒီဆိုင်ပိုင်ရှင် account နဲ့ ဝင်ထားမှ ရပါမယ်")}
  shopId=store.id;csrf=me.csrfToken||"";await refresh();
 }catch{}})();
})();
