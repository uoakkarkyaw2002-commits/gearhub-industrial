// 1.1.242 owner: in every shop's Settings — "Contact us" (09-766472432) and the order Notifications with an
// on/off switch (moved here from the shop admin). 1.1.244: only the shop's owner (or the GearHub
// owner) sees it. It uses the shop's own service worker and the shop push API.
(()=>{
 const slug=(location.pathname.match(/^\/shops\/([a-z0-9-]+)\//)||[])[1],share=document.getElementById("share-store-action");
 // 1.1.247: GearHub's own store (no /shops/<slug>/) shows the switch to the GearHub owner (scope "main").
 if(!share||(!slug&&location.pathname.startsWith("/shops/")))return;
 const SW_URL=slug?"/shops/"+slug+"/sw.js":"/sw.js",offKey="gh-alerts-off:"+(slug?"true":"main"),onKey="gh-alerts-on:"+(slug||"main");
 const my=()=>document.documentElement.lang==="my";
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 const keyBytes=k=>{const raw=atob((k+"=".repeat((4-k.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 let shopId=0,csrf="";
 async function api(path,body){const r=await fetch((slug?"/api/platform/shops/"+shopId+"/push":"/api/platform/owner/push")+path,body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(body)}:{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Failed");return d}
 async function registration(){await navigator.serviceWorker.register(SW_URL,{updateViaCache:"none"}).catch(()=>{});return navigator.serviceWorker.ready}
 async function current(){return (await registration()).pushManager.getSubscription()}
 const row=document.createElement("div");row.className="settings-row settings-alerts-row";row.hidden=true;
 row.innerHTML='<span class="settings-icon" aria-hidden="true">🔔</span><div class="settings-copy"><strong>Notifications <span class="alerts-count" hidden></span></strong><small id="settings-alerts-help"></small></div><label class="settings-toggle"><input type="checkbox" role="switch" id="settings-alerts-switch" aria-label="Notifications"><span aria-hidden="true"></span></label>';
 share.after(row);
 const input=row.querySelector("input"),help=row.querySelector("#settings-alerts-help");
 const say=(en,mm)=>{help.textContent=my()?mm:en};
 // 1.1.349 owner (Android): the switch kept turning itself off and the cause cannot be seen from outside. A small status line
 // under the switch shows what this phone and the server each know, and "Send test" sends one alert to this phone.
 const diag=document.createElement("small");diag.className="alerts-diag";diag.style.cssText="display:block;margin-top:6px;font-size:11px;line-height:1.5;opacity:.8;white-space:normal;overflow-wrap:anywhere";row.querySelector(".settings-copy").append(diag);
 let note="";
 diag.addEventListener("click",e=>e.stopPropagation());
 async function report(){
  try{
   const perm=window.Notification?Notification.permission:"n/a";let sub=null,s=null,err="";
   try{sub=await current()}catch(x){err=x.message}
   try{s=await api(sub?"?endpoint="+encodeURIComponent(sub.endpoint):"")}catch(x){err=x.message}
   const last=s&&s.last;let regs="";try{regs=(await navigator.serviceWorker.getRegistrations()).map(r=>new URL(r.scope).pathname+(r.active?"":"(not active)")).join(",")}catch{}
   diag.textContent=["permission: "+perm,"phone address: "+(sub?"yes":"no"),"server knows it: "+(s?(s.subscribed?"yes":"no"):"?"),"phones on server: "+(s?s.count:"?"),last?"last alert: "+last.sent+" sent, "+last.failed+" failed"+(last.error?" ("+last.error+")":""):"no alert sent yet","worker: "+(regs||"none"),note||err].filter(Boolean).join(" · ")+" ";
   const b=document.createElement("button");b.type="button";b.textContent="Send test";b.style.cssText="margin:0;padding:2px 10px;border:1px solid currentColor;border-radius:999px;background:none;font:inherit;color:inherit";
   b.addEventListener("click",async e=>{e.stopPropagation();b.disabled=true;try{await api("/test",{});note="test sent "+new Date().toLocaleTimeString()}catch(x){note="test failed: "+x.message}setTimeout(report,1200)});
   const here=b.cloneNode();here.textContent="Show here";here.style.marginLeft="6px";
   // A notification made by this phone itself (no internet push): if it shows, the phone can display alerts and only the push delivery is the problem.
   here.addEventListener("click",async e=>{e.stopPropagation();here.disabled=true;try{const reg=await registration();await reg.showNotification("Local test · "+document.title,{body:"If you can see this, the phone can show notifications",icon:"/app-icon.png",tag:"local-test-"+Date.now(),vibrate:[200,100,200]});note="local test shown "+new Date().toLocaleTimeString()}catch(x){note="local test failed: "+(x.message||x)}setTimeout(report,800)});
   diag.append(b,here);
  }catch{}
 }
 function show(on,en,mm){input.checked=on;say(en||(on?"New orders alert this phone, even when locked":"Order alerts on this phone are off"),mm||(on?"ဖုန်း lock ထားလည်း အော်ဒါအသစ် သတိပေးပါမယ်":"အော်ဒါ သတိပေးချက် ပိတ်ထားပါတယ်"))}
 async function refresh(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!window.Notification||!window.isSecureContext||(isIOS&&!standalone())){input.disabled=true;note="serviceWorker:"+("serviceWorker" in navigator)+" push:"+("PushManager" in window)+" notification:"+Boolean(window.Notification)+" secure:"+window.isSecureContext;report();return show(false,isIOS?"Open the app from your Home Screen to turn on":"This browser cannot show order alerts",isIOS?"Home Screen က app ကနေ ဖွင့်ပြီးမှ ဖွင့်လို့ရပါမယ်":"ဒီ browser မှာ သတိပေးချက် မရပါ")}
  if(Notification.permission==="denied"){input.disabled=true;report();return show(false,"Notifications are blocked in the phone settings","ဖုန်း Settings မှာ Notifications ပိတ်ထားပါတယ်")}
  try{
   const sub=await current(),s=await api(sub?"?endpoint="+encodeURIComponent(sub.endpoint):"");
   if(sub&&s.subscribed){show(true);return report()}
   // 1.1.348 owner (Android): the switch was on, but after closing and reopening the app it showed off — the phone's
   // alert address was gone or no longer on the server list. If this phone turned alerts on and never off, quietly
   // make a fresh one (permission is already granted, so no question is asked) instead of showing off.
   let wanted=false;try{wanted=localStorage.getItem(onKey)==="1"&&!localStorage.getItem(offKey)}catch{}
   if(wanted&&Notification.permission==="granted"){try{await turnOn(true);note="reconnected this phone"}catch(x){note="reconnect failed: "+(x.message||x);show(false)}return report()}
   note=wanted?"permission is "+Notification.permission:"this phone did not remember alerts were on";
   show(false);
  }catch(e){note="check failed: "+(e.message||"failed");show(false,"Order alerts are off ("+(e.message||"failed")+")","အော်ဒါ သတိပေးချက် ပိတ်နေပါတယ် ("+(e.message||"failed")+")")}
  report()
 }
 async function turnOn(fresh){
  const p=fresh?Notification.permission:await Notification.requestPermission();if(p!=="granted"){input.disabled=p==="denied";return show(false)}
  const {publicKey}=await api(""),reg=await registration(),key=keyBytes(publicKey);let sub=await reg.pushManager.getSubscription();
  if(sub&&(fresh||!sub.options?.applicationServerKey)){await sub.unsubscribe().catch(()=>{});sub=null}
  if(sub&&sub.options?.applicationServerKey){const old=new Uint8Array(sub.options.applicationServerKey);if(old.length!==key.length||old.some((v,i)=>v!==key[i])){await sub.unsubscribe();sub=null}}
  sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await api("/subscribe",{subscription:sub.toJSON()});try{localStorage.removeItem(offKey);localStorage.setItem(onKey,"1")}catch{}note="";show(true);
 }
 async function turnOff(){const sub=await current();try{localStorage.setItem(offKey,"1");localStorage.removeItem(onKey)}catch{}if(sub){await api("/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{})}show(false)}
 let mode="";
 // 1.1.250 owner: like Facebook — tapping Notifications shows every alert that came in, with time and text.
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
 function ago(at){const t=new Date(at),s=Math.max(0,(Date.now()-t)/1000);
  if(s<60)return my()?"ခုနက":"just now";if(s<3600)return Math.floor(s/60)+(my()?" မိနစ်က":" min ago");if(s<86400)return Math.floor(s/3600)+(my()?" နာရီက":" h ago");
  return t.toLocaleDateString(my()?"my-MM":"en-GB",{day:"numeric",month:"short"})+" "+t.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
 const icon=k=>k==="signup"?"🆕":k==="test"?"🔔":"🛒";
 let sheet=null;
 // 1.1.251 owner: the Notifications row shows how many alerts came in since the list was last opened.
 const seenKey="gh-alerts-seen:"+(slug||"main"),historyUrl=()=>slug?"/api/platform/shops/"+shopId+"/push/history":"/api/platform/owner/push/history";
 const seenAt=()=>{try{return localStorage.getItem(seenKey)||""}catch{return ""}};
 function showCount(items){return;const n=items.filter(x=>String(x.at)>seenAt()).length,el=row.querySelector(".alerts-count");el.textContent=n>99?"99+":String(n);el.hidden=!n;row.setAttribute("aria-label","Notifications history"+(n?", "+n+" new":""))}
 async function loadCount(){try{const r=await fetch(historyUrl(),{cache:"no-store",credentials:"same-origin"});if(r.ok)showCount((await r.json()).items||[])}catch{}}
 async function openHistory(){
  if(!sheet){sheet=document.createElement("div");sheet.className="alerts-history";sheet.hidden=true;sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");
   sheet.innerHTML='<div class="alerts-history-card"><div class="alerts-history-head"><h2>Notifications</h2><button type="button" class="alerts-history-close" aria-label="Close"></button></div><div class="alerts-history-list"></div></div>';
   document.body.append(sheet);
   sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest(".alerts-history-close"))close();const a=e.target.closest("[data-url]");if(a){close();location.assign(a.dataset.url)}});}
  const list=sheet.querySelector(".alerts-history-list");list.innerHTML='<p class="alerts-history-empty">…</p>';sheet.hidden=false;document.body.classList.add("alerts-history-open");
  try{const r=await fetch(historyUrl(),{cache:"no-store",credentials:"same-origin"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Failed");
   const items=d.items||[],before=seenAt();
   try{localStorage.setItem(seenKey,items[0]?.at||new Date().toISOString())}catch{}showCount(items);
   list.innerHTML=items.length?items.map(x=>'<button type="button" class="alerts-history-item'+(String(x.at)>before?' is-new':'')+'"'+(x.url?' data-url="'+esc(x.url)+'"':'')+'><span class="alerts-history-icon" aria-hidden="true">'+icon(x.kind)+'</span><span class="alerts-history-text"><strong>'+esc(x.title)+'</strong>'+(x.body?'<small>'+esc(x.body)+'</small>':'')+'<time datetime="'+esc(x.at)+'">'+esc(ago(x.at))+'</time></span></button>').join(""):'<p class="alerts-history-empty">'+(my()?"သတိပေးချက် မရှိသေးပါ":"No notifications yet")+'</p>';
  }catch(e){list.innerHTML='<p class="alerts-history-empty">'+esc(e.message)+'</p>'}
 }
 function close(){if(sheet){sheet.hidden=true;document.body.classList.remove("alerts-history-open")}}
 row.classList.add("settings-row-button");row.tabIndex=0;row.setAttribute("aria-label","Notifications history");
 // 1.1.314 owner: this row is only the on/off switch; the 🔔 at the top of the shop shows everything.
 row.addEventListener("click",e=>{if(e.target.closest(".settings-toggle"))return;const sw=row.querySelector("#settings-alerts-switch");if(sw&&!sw.disabled&&e.target!==sw)sw.click()});
 
 addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&!row.hidden&&(!slug||shopId))loadCount()});
 input.addEventListener("change",async()=>{
  if(mode==="signin"){input.checked=false;input.disabled=true;say("Opening Google sign-in…","Google နဲ့ ဝင်ဖို့ ဖွင့်နေပါတယ်…");try{window.GearHubAppLogin?await GearHubAppLogin.start():location.assign("/platform.html")}catch(e){say(e.message,e.message);input.disabled=false}return}
  input.disabled=true;try{input.checked?await turnOn():await turnOff()}catch(e){show(false,"Could not change: "+(e.message||"failed"),"မပြောင်းနိုင်ပါ / "+(e.message||"failed"))}finally{input.disabled=false;report()}});
 (async()=>{try{
  if(!slug){const me=await fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"}).then(r=>r.json());if(!me?.user||!me.isOwner)return;csrf=me.csrfToken||"";row.hidden=false;refresh();return loadCount()}
  const [me,store]=await Promise.all([fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"}).then(r=>r.json()),fetch("/api/platform/store/"+slug,{cache:"no-store"}).then(r=>r.json())]);
  // 1.1.244 owner: only the shop's owner (or the GearHub owner) sees the switch; visitors never see it.
  // (Owners sign in from the shop admin; app-login.js keeps that sign-in inside the installed app.)
  if(!store?.id||!me?.user||!(me.isOwner||Number(me.shop?.id)===Number(store.id)))return;
  shopId=store.id;csrf=me.csrfToken||"";row.hidden=false;refresh();await loadCount();
 }catch{}})();
})();
