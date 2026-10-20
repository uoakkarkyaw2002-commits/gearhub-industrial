/* Admin extras shared by GearHub and every seller shop: PC summary cards, the new-order
   bell (badge + sound), the offline notice and offline page caching. */
(()=>{
 const $=id=>document.getElementById(id);
 // Each seller shop has its own service worker (/shops/<slug>/sw.js), so Android shows
 // its alerts as that shop's app (name + icon), not as Chrome or GearHub.
 const SW_URL=(location.pathname.match(/^\/shops\/[a-z0-9-]+\//)||["/"])[0]+"sw.js",SHOP_SCOPE=SW_URL!=="/sw.js";
 const scope="gh-admin-bell:"+location.pathname;
 const money=n=>new Intl.NumberFormat("en-US").format(Math.round(Number(n)||0))+" Ks";
 const monthOf=v=>String(v||"").slice(0,7);
 const now=new Date(),thisMonth=now.toISOString().slice(0,7),lastMonth=new Date(now.getFullYear(),now.getMonth()-1,15).toISOString().slice(0,7);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

 function trend(current,previous){
  if(!previous&&!current)return '<span class="kpi-trend flat">— vs last month</span>';
  if(!previous)return '<span class="kpi-trend up">+'+current+' this month</span>';
  const pct=Math.round((current-previous)/previous*100);
  return '<span class="kpi-trend '+(pct>=0?"up":"down")+'">'+(pct>=0?"↑ ":"↓ ")+Math.abs(pct)+'% <small>vs last month</small></span>';
 }
 function card(cls,icon,label,value,sub){return '<div class="kpi-card '+cls+'"><span class="kpi-icon" aria-hidden="true">'+icon+'</span><div><span class="kpi-label">'+label+'</span><strong class="kpi-value">'+value+'</strong>'+sub+'</div><span class="kpi-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>';}
 function renderKpis(summary,orders,products){
  const box=$("admin-kpis");if(!box)return;
  const live=(products||[]).filter(p=>!p.trashed_at),active=(orders||[]).filter(o=>o.status!=="cancelled");
  const paid=active.filter(o=>o.payment_status==="paid");
  const inMonth=(list,m)=>list.filter(o=>monthOf(o.created_at)===m);
  const sum=list=>list.reduce((a,o)=>a+(Number(o.total)||0),0);
  const who=o=>String(o.phone||o.customer_name||"").replace(/\D/g,"")||String(o.customer_name||"").trim().toLowerCase();
  const firstSeen=new Map();for(const o of [...active].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))){const k=who(o);if(k&&!firstSeen.has(k))firstSeen.set(k,monthOf(o.created_at));}
  const newCustomers=m=>[...firstSeen.values()].filter(v=>v===m).length;
  const low=live.filter(p=>Number(p.stock)<5).length;
  box.innerHTML=
   card("kpi-products",'<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',"Total Product",esc(live.length.toLocaleString("en-US")),'<span class="kpi-trend flat">'+esc(low)+' low stock</span>')+
   card("kpi-orders",'<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7H6"/></svg>',"Total Order",esc(Number(summary?.orders??active.length).toLocaleString("en-US")),trend(inMonth(active,thisMonth).length,inMonth(active,lastMonth).length))+
   card("kpi-sales",'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/></svg>',"Total Sales",esc(money(summary?.sales??sum(paid))),trend(sum(inMonth(paid,thisMonth)),sum(inMonth(paid,lastMonth))))+
   card("kpi-customers",'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c3 .2 5.5 2.3 5.5 5.3"/></svg>',"Total Customers",esc(firstSeen.size.toLocaleString("en-US")),trend(newCustomers(thisMonth),newCustomers(lastMonth)));
 }

 // ---- New-order bell: badge = orders waiting (pending); a chime plays when a new order arrives.
 let audio,known=null,bellSound,soundReady=false;
 // iPhone mutes Web Audio when the ringer switch is on silent, so the chime is a short
 // sound file played by an <audio> element (media plays even on silent). It must be
 // "unlocked" once by a tap; Web Audio stays as a fallback.
 function chimeWav(){
  const rate=22050,notes=[[880,0],[1175,.18],[1568,.36]],length=Math.round(rate*.9),data=new Int16Array(length);
  for(const [f,d] of notes){const from=Math.round(d*rate),to=Math.min(length,from+Math.round(.5*rate));for(let i=from;i<to;i++){const t=(i-from)/rate,env=Math.min(1,t/.02)*Math.exp(-t*7);data[i]=Math.max(-32767,Math.min(32767,data[i]+Math.sin(2*Math.PI*f*t)*env*12000));}}
  const buffer=new ArrayBuffer(44+length*2),v=new DataView(buffer),text=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  text(0,"RIFF");v.setUint32(4,36+length*2,true);text(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,"data");v.setUint32(40,length*2,true);
  new Int16Array(buffer,44).set(data);return URL.createObjectURL(new Blob([buffer],{type:"audio/wav"}));
 }
 function unlockAudio(){
  try{if(navigator.audioSession)navigator.audioSession.type="playback";}catch{}
  try{if(!bellSound){bellSound=new Audio(chimeWav());bellSound.preload="auto";}
   if(!soundReady){bellSound.muted=true;const p=bellSound.play();if(p&&p.then)p.then(()=>{bellSound.pause();bellSound.currentTime=0;bellSound.muted=false;soundReady=true;}).catch(()=>{bellSound.muted=false;});}}catch{}
  try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio=audio||new A();if(audio.state!=="running")audio.resume();}catch{}
 }
 function webAudioChime(){try{if(!audio)return;const t=audio.currentTime;[[880,0],[1175,.18],[1568,.36]].forEach(([f,d])=>{const o=audio.createOscillator(),g=audio.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.35,t+d+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d+.45);o.connect(g).connect(audio.destination);o.start(t+d);o.stop(t+d+.5);});}catch{}}
 function chime(){
  unlockAudio();
  try{if(bellSound&&soundReady){bellSound.muted=false;bellSound.currentTime=0;const p=bellSound.play();if(p&&p.catch)p.catch(webAudioChime);}else webAudioChime();}catch{webAudioChime();}
  try{navigator.vibrate?.([120,60,120])}catch{}
 }
 for(const type of ["pointerdown","touchend","click"])document.addEventListener(type,unlockAudio,{passive:true});
 document.addEventListener("keydown",unlockAudio);
 // Coming back to the app: iPhone suspends Web Audio in the background; wake it again.
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)try{if(audio&&audio.state!=="running")audio.resume();}catch{}});
 const announced=new Set();
 function chimeTimes(n){if(n>0)chime();for(let i=1;i<Math.min(n,10);i++)setTimeout(chime,i*1400);}
 // A push alert arrived while this admin is open: the phone's notification already made the
 // sound, so just remember the order and refresh the list.
 if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener?.("message",e=>{const d=e.data||{};if(d.type!=="gearhub-order-alert")return;if(d.orderId!=null)announced.add(String(d.orderId));if(d.kind==="order"&&typeof refreshAll==="function")refreshAll().catch?.(()=>{});});
 function updateBell(orders){
  const bell=$("admin-bell"),count=$("admin-bell-count");if(!bell||!count)return;
  bell.classList.remove("hidden");
  const pending=(orders||[]).filter(o=>o.status==="pending");
  count.textContent=pending.length>99?"99+":String(pending.length);count.hidden=!pending.length;
  const ids=new Set((orders||[]).map(o=>String(o.id)));
  const firstLoad=!known;let seen=known;if(!seen){try{seen=new Set(JSON.parse(localStorage.getItem(scope)||"null")||[])}catch{seen=new Set()}if(!seen.size)seen=new Set(ids);}
  const fresh=[...ids].filter(id=>!seen.has(id));
  known=ids;try{localStorage.setItem(scope,JSON.stringify([...ids]))}catch{}
  // One sound per new order (5 orders = 5 sounds); orders this phone already got as a push alert are not repeated.
  // Orders that came while the app was closed already rang as phone alerts when alerts are on.
  const alertsOn=firstLoad&&window.Notification&&Notification.permission==="granted";
  const unheard=fresh.filter(id=>!announced.has(id));unheard.forEach(id=>announced.add(id));if(!alertsOn)chimeTimes(unheard.length);
  if(fresh.length){bell.classList.remove("ring");void bell.offsetWidth;bell.classList.add("ring");
   const toast=$("toast");if(toast){toast.textContent="🔔 "+fresh.length+" new order"+(fresh.length>1?"s":"")+" / အော်ဒါအသစ် "+fresh.length+" ခု";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),4000);}}
 }
 $("admin-bell")?.addEventListener("click",()=>{
  // Tapping the bell plays the order sound once, so the volume can be checked.
  unlockAudio();setTimeout(chime,soundReady?0:250);
  const link=document.querySelector('.admin-sidebar a[href="#orders-content"]');
  if(link&&window.matchMedia("(min-width:1100px)").matches){link.click();}
  const content=$("orders-content"),toggle=document.querySelector('[data-content-id="orders-content"]');
  if(content?.classList.contains("hidden"))toggle?.click();
  requestAnimationFrame(()=>toggle?.scrollIntoView({behavior:"smooth",block:"start"}));
 });

 // Poll for new orders while the admin is open and online (no reload, no pop-up).
 let polling=false;
 async function poll(){
  if(polling||document.hidden||!navigator.onLine||document.getElementById("dashboard")?.classList.contains("hidden"))return;
  polling=true;try{if(typeof refreshAll==="function")await refreshAll();}catch{}finally{polling=false;}
 }
 setInterval(poll,20000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll();});
 window.addEventListener("online",()=>poll());
 window.addEventListener("offline",()=>document.body.classList.add("admin-offline"));

 // Offline notice above the dashboard.
 const bar=document.createElement("div");bar.id="admin-offline-bar";bar.className="admin-offline-bar";bar.hidden=true;bar.setAttribute("role","status");
 document.getElementById("dashboard")?.prepend(bar);

 // Keep the admin page itself available offline (GearHub and seller admins).
 if("serviceWorker" in navigator&&window.isSecureContext)navigator.serviceWorker.register(SW_URL,{updateViaCache:"none"}).catch(()=>{});

 // Top-right avatar shows the store's own logo (person icon when there is none).
 function setLogo(url){const box=document.querySelector(".admin-user-avatar");if(!box)return;box.querySelector("img")?.remove();
  if(!url||!/^(\/|https:\/\/)/.test(String(url))){box.classList.remove("has-logo");return;}
  const img=document.createElement("img");img.alt="";img.src=url;img.addEventListener("error",()=>{img.remove();box.classList.remove("has-logo");});box.append(img);box.classList.add("has-logo");}
 // ---- Order alerts on this phone: push notifications, heard even when the phone is
 // locked or the admin app is closed. Each store (GearHub or a seller shop) has its own.
 let alertsReady=false,alertsInfo=null;
 const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const standalone=()=>window.matchMedia?.("(display-mode: standalone)").matches||navigator.standalone===true;
 function keyBytes(key){const raw=atob((key+"=".repeat((4-key.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
 async function pushApi(path,body){const r=await adminFetch("/api/admin/push"+path,body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d;}
 async function pushRegistration(){await navigator.serviceWorker.register(SW_URL,{updateViaCache:"none"}).catch(()=>{});return navigator.serviceWorker.ready;}
 function alertsCard(){
  let card=$("order-alerts-card");if(card)return card;const settings=$("site-settings-content");if(!settings)return null;
  card=document.createElement("section");card.id="order-alerts-card";card.className="order-alerts-card";card.setAttribute("aria-live","polite");settings.prepend(card);
  card.addEventListener("click",e=>{const b=e.target.closest("[data-alerts]");if(b)alertsAction(b.dataset.alerts,b);});return card;
 }
 function renderAlerts(state,note=""){
  const card=alertsCard();if(!card)return;
  const on=state==="on",title='<strong>📲 ဖုန်း lock ထားလည်း အော်ဒါအသစ် သတိပေးမယ်</strong><small>Order alerts on this phone — even when it is locked</small>';
  const buttons=state==="on"?'<button type="button" class="secondary" data-alerts="test">🔔 စမ်းပို့မယ် / Test</button><button type="button" class="secondary" data-alerts="off">ပိတ်မယ် / Turn off</button>'
   :state==="off"?'<button type="button" class="primary" data-alerts="on">ဖွင့်မယ် / Turn on</button>':"";
  const status={on:"✅ ဖွင့်ထားပါတယ် / On",off:"ပိတ်ထားပါတယ် / Off",ios:"iPhone: Safari ရဲ့ Share ⬆︎ → Add to Home Screen လုပ်ပြီး Home Screen က icon ကနေ ဖွင့်မှ ရပါမယ်။ / Add this admin to the Home Screen first, then open it from the icon.",unsupported:"ဒီ browser မှာ မရပါ။ Chrome (Android) သို့မဟုတ် Home Screen app (iPhone) ကို သုံးပါ။ / Not supported in this browser.",denied:"Notification ခွင့်ပိတ်ထားပါတယ်။ ဖုန်း Settings → Notifications မှာ ခွင့်ပြုပြီး ပြန်နှိပ်ပါ။ / Notifications are blocked in phone settings.",busy:"…"}[state]||"";
  card.className="order-alerts-card"+(on?" is-on":"");
  const store=String($("admin-store-title")?.textContent||"").replace(/\s*·\s*Admin\s*$/i,"").trim();
  const info=alertsInfo?'<span class="order-alerts-diag">'+(store?"🏪 "+escapeHtml(store)+" · ":"")+"ဖုန်း "+Number(alertsInfo.count||0)+" လုံး / "+Number(alertsInfo.count||0)+" phone(s)"+(alertsInfo.last?" · နောက်ဆုံး / last: "+new Date(alertsInfo.last.at).toLocaleString()+" — ✅ "+alertsInfo.last.sent+(alertsInfo.last.failed?" ❌ "+alertsInfo.last.failed+(alertsInfo.last.error?" ("+escapeHtml(alertsInfo.last.error)+")":""):""):"")+'</span>':"";
  card.innerHTML='<div class="order-alerts-text">'+title+'<span class="order-alerts-status">'+status+'</span>'+(note?'<span class="order-alerts-note">'+note+'</span>':"")+info+'</div><div class="order-alerts-actions">'+buttons+'</div>';
 }
 async function currentSubscription(){const reg=await pushRegistration();return reg.pushManager.getSubscription();}
 // Phones that turned alerts on before shops had their own service worker: move this shop's
 // alert to the shop's own worker (new one first, then drop the old), no tap needed.
 async function moveOldShopAlert(){
  if(!SHOP_SCOPE||Notification.permission!=="granted")return;
  const old=await navigator.serviceWorker.getRegistration("/");if(!old||new URL(old.scope).pathname!=="/")return;
  const oldSub=await old.pushManager?.getSubscription();if(!oldSub)return;
  const mine=await pushApi("?endpoint="+encodeURIComponent(oldSub.endpoint)).catch(()=>null);if(!mine?.subscribed)return;
  const reg=await pushRegistration();if(!reg||reg.scope===old.scope)return;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(mine.publicKey)});
  await pushApi("/subscribe",{subscription:sub.toJSON()});
  await pushApi("/unsubscribe",{endpoint:oldSub.endpoint}).catch(()=>{});await oldSub.unsubscribe().catch(()=>{});
 }
 async function refreshAlerts(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!window.Notification||!window.isSecureContext)return renderAlerts(isIOS&&!standalone()?"ios":"unsupported");
  if(isIOS&&!standalone())return renderAlerts("ios");
  if(Notification.permission==="denied")return renderAlerts("denied");
  try{await moveOldShopAlert();}catch{}
  try{const sub=await currentSubscription();const s=await pushApi(sub?"?endpoint="+encodeURIComponent(sub.endpoint):"");alertsInfo=s;renderAlerts(sub&&s.subscribed?"on":"off");}catch{renderAlerts("off");}
 }
 async function alertsAction(action,button){
  button.disabled=true;
  try{
   if(action==="on"){
    const permission=await Notification.requestPermission();if(permission!=="granted")return renderAlerts(permission==="denied"?"denied":"off","ခွင့်မပြုရသေးပါ / Permission not given.");
    const {publicKey}=await pushApi("");const reg=await pushRegistration();let sub=await reg.pushManager.getSubscription();
    const key=keyBytes(publicKey);if(sub&&sub.options?.applicationServerKey){const old=new Uint8Array(sub.options.applicationServerKey);if(old.length!==key.length||old.some((v,i)=>v!==key[i])){await sub.unsubscribe();sub=null;}}
    sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    alertsInfo={...(alertsInfo||{}),...(await pushApi("/subscribe",{subscription:sub.toJSON()}))};renderAlerts("on","အော်ဒါအသစ်ဝင်ရင် ဒီဖုန်းကို အသိပေးပါမယ်။ 🔔 စမ်းပို့မယ် ကိုနှိပ်ပြီး စမ်းကြည့်ပါ။ / Tap Test to try it.");
   }else if(action==="off"){
    const sub=await currentSubscription();if(sub){await pushApi("/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{});}renderAlerts("off");
   }else if(action==="test"){
    const {sent}=await pushApi("/test",{});try{const sub=await currentSubscription();alertsInfo=await pushApi(sub?"?endpoint="+encodeURIComponent(sub.endpoint):"");}catch{}renderAlerts("on",sent?"စမ်းသတိပေးချက် ပို့ပြီးပါပြီ — ဖုန်းကို စစ်ကြည့်ပါ / Test sent to "+sent+" phone(s).":"ပို့လို့မရပါ — ပိတ်ပြီး ပြန်ဖွင့်ကြည့်ပါ / Could not reach this phone; turn alerts off and on again.");
   }
  }catch(e){renderAlerts("off","မအောင်မြင်ပါ / "+(e.message||"Failed"));}
  finally{button.disabled=false;}
 }
 function initAlerts(){if(alertsReady)return;alertsReady=true;if(typeof adminFetch!=="function")return;renderAlerts("busy");refreshAlerts();}

 window.GearHubAdminExtras={update(summary,orders,products){renderKpis(summary,orders,products);updateBell(orders);initAlerts();},setLogo,chime};
 if(window.__gearhubAdminLogo)setLogo(window.__gearhubAdminLogo);
})();
