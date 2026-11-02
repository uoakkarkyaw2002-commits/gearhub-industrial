// 1.1.242 owner: in every shop's Settings — "Contact us" (09-766472432) and the order Notifications with an
// on/off switch (moved here from the shop admin). 1.1.244: only the shop's owner (or the GearHub
// owner) sees it. It uses the shop's own service worker and the shop push API.
(()=>{
 const slug=(location.pathname.match(/^\/shops\/([a-z0-9-]+)\//)||[])[1],share=document.getElementById("share-store-action");
 // 1.1.247: GearHub's own store (no /shops/<slug>/) shows the switch to the GearHub owner (scope "main").
 if(!share||(!slug&&location.pathname.startsWith("/shops/")))return;
 const SW_URL=slug?"/shops/"+slug+"/sw.js":"/sw.js",offKey="gh-alerts-off:"+(slug?"true":"main");
 const my=()=>document.documentElement.lang==="my";
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 const keyBytes=k=>{const raw=atob((k+"=".repeat((4-k.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 let shopId=0,csrf="";
 async function api(path,body){const r=await fetch((slug?"/api/platform/shops/"+shopId+"/push":"/api/platform/owner/push")+path,body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(body)}:{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Failed");return d}
 async function registration(){await navigator.serviceWorker.register(SW_URL,{updateViaCache:"none"}).catch(()=>{});return navigator.serviceWorker.ready}
 async function current(){return (await registration()).pushManager.getSubscription()}
 const row=document.createElement("div");row.className="settings-row settings-alerts-row";row.hidden=true;
 row.innerHTML='<span class="settings-icon" aria-hidden="true">🔔</span><div class="settings-copy"><strong>Notifications</strong><small id="settings-alerts-help"></small></div><label class="settings-toggle"><input type="checkbox" role="switch" id="settings-alerts-switch" aria-label="Notifications"><span aria-hidden="true"></span></label>';
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
 // 1.1.250 owner: like Facebook — tapping Notifications shows every alert that came in, with time and text.
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
 function ago(at){const t=new Date(at),s=Math.max(0,(Date.now()-t)/1000);
  if(s<60)return my()?"ခုနက":"just now";if(s<3600)return Math.floor(s/60)+(my()?" မိနစ်က":" min ago");if(s<86400)return Math.floor(s/3600)+(my()?" နာရီက":" h ago");
  return t.toLocaleDateString(my()?"my-MM":"en-GB",{day:"numeric",month:"short"})+" "+t.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
 const icon=k=>k==="signup"?"🆕":k==="test"?"🔔":"🛒";
 let sheet=null;
 async function openHistory(){
  if(!sheet){sheet=document.createElement("div");sheet.className="alerts-history";sheet.hidden=true;sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");
   sheet.innerHTML='<div class="alerts-history-card"><div class="alerts-history-head"><h2>Notifications</h2><button type="button" class="alerts-history-close" aria-label="Close"></button></div><div class="alerts-history-list"></div></div>';
   document.body.append(sheet);
   sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest(".alerts-history-close"))close();const a=e.target.closest("[data-url]");if(a){close();location.assign(a.dataset.url)}});}
  const list=sheet.querySelector(".alerts-history-list");list.innerHTML='<p class="alerts-history-empty">…</p>';sheet.hidden=false;document.body.classList.add("alerts-history-open");
  try{const r=await fetch(slug?"/api/platform/shops/"+shopId+"/push/history":"/api/platform/owner/push/history",{cache:"no-store",credentials:"same-origin"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Failed");
   const items=d.items||[];
   list.innerHTML=items.length?items.map(x=>'<button type="button" class="alerts-history-item"'+(x.url?' data-url="'+esc(x.url)+'"':'')+'><span class="alerts-history-icon" aria-hidden="true">'+icon(x.kind)+'</span><span class="alerts-history-text"><strong>'+esc(x.title)+'</strong>'+(x.body?'<small>'+esc(x.body)+'</small>':'')+'<time datetime="'+esc(x.at)+'">'+esc(ago(x.at))+'</time></span></button>').join(""):'<p class="alerts-history-empty">'+(my()?"သတိပေးချက် မရှိသေးပါ":"No notifications yet")+'</p>';
  }catch(e){list.innerHTML='<p class="alerts-history-empty">'+esc(e.message)+'</p>'}
 }
 function close(){if(sheet){sheet.hidden=true;document.body.classList.remove("alerts-history-open")}}
 row.classList.add("settings-row-button");row.tabIndex=0;row.setAttribute("aria-label","Notifications history");
 row.addEventListener("click",e=>{if(e.target.closest(".settings-toggle"))return;if(slug&&!shopId)return;openHistory()});
 row.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target===row){e.preventDefault();openHistory()}});
 addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 input.addEventListener("change",async()=>{
  if(mode==="signin"){input.checked=false;input.disabled=true;say("Opening Google sign-in…","Google နဲ့ ဝင်ဖို့ ဖွင့်နေပါတယ်…");try{window.GearHubAppLogin?await GearHubAppLogin.start():location.assign("/platform.html")}catch(e){say(e.message,e.message);input.disabled=false}return}
  input.disabled=true;try{input.checked?await turnOn():await turnOff()}catch(e){show(false,"Could not change: "+(e.message||"failed"),"မပြောင်းနိုင်ပါ / "+(e.message||"failed"))}finally{input.disabled=false}});
 (async()=>{try{
  if(!slug){const me=await fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"}).then(r=>r.json());if(!me?.user||!me.isOwner)return;csrf=me.csrfToken||"";row.hidden=false;return refresh()}
  const [me,store]=await Promise.all([fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"}).then(r=>r.json()),fetch("/api/platform/store/"+slug,{cache:"no-store"}).then(r=>r.json())]);
  // 1.1.244 owner: only the shop's owner (or the GearHub owner) sees the switch; visitors never see it.
  // (Owners sign in from the shop admin; app-login.js keeps that sign-in inside the installed app.)
  if(!store?.id||!me?.user||!(me.isOwner||Number(me.shop?.id)===Number(store.id)))return;
  shopId=store.id;csrf=me.csrfToken||"";row.hidden=false;await refresh();
 }catch{}})();
})();
