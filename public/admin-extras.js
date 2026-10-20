/* Admin extras shared by GearHub and every seller shop: PC summary cards, the new-order
   bell (badge + sound), the offline notice and offline page caching. */
(()=>{
 const $=id=>document.getElementById(id);
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
 function updateBell(orders){
  const bell=$("admin-bell"),count=$("admin-bell-count");if(!bell||!count)return;
  bell.classList.remove("hidden");
  const pending=(orders||[]).filter(o=>o.status==="pending");
  count.textContent=pending.length>99?"99+":String(pending.length);count.hidden=!pending.length;
  const ids=new Set((orders||[]).map(o=>String(o.id)));
  let seen=known;if(!seen){try{seen=new Set(JSON.parse(localStorage.getItem(scope)||"null")||[])}catch{seen=new Set()}if(!seen.size)seen=new Set(ids);}
  const fresh=[...ids].filter(id=>!seen.has(id));
  known=ids;try{localStorage.setItem(scope,JSON.stringify([...ids]))}catch{}
  if(fresh.length){chime();bell.classList.remove("ring");void bell.offsetWidth;bell.classList.add("ring");
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
 if("serviceWorker" in navigator&&window.isSecureContext)navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).catch(()=>{});

 // Top-right avatar shows the store's own logo (person icon when there is none).
 function setLogo(url){const box=document.querySelector(".admin-user-avatar");if(!box)return;box.querySelector("img")?.remove();
  if(!url||!/^(\/|https:\/\/)/.test(String(url))){box.classList.remove("has-logo");return;}
  const img=document.createElement("img");img.alt="";img.src=url;img.addEventListener("error",()=>{img.remove();box.classList.remove("has-logo");});box.append(img);box.classList.add("has-logo");}
 window.GearHubAdminExtras={update(summary,orders,products){renderKpis(summary,orders,products);updateBell(orders);},setLogo,chime};
 if(window.__gearhubAdminLogo)setLogo(window.__gearhubAdminLogo);
})();
