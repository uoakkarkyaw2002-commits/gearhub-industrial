// 1.1.243 owner (iPhone Home Screen app asked to log in again and the login did not stick): an installed app has
// its own cookies, and iOS runs Google sign-in in a separate browser sheet, so the sign-in landed in the sheet,
// not in the app. The app now starts Google sign-in with a one-time handoff id it keeps; when the sheet is closed
// and the app is back on screen, the app claims that sign-in for itself and reloads.
(()=>{
 const KEY="gh-login-handoff",LIFE=15*60*1000;
 const read=()=>{try{const p=JSON.parse(localStorage.getItem(KEY)||"null");return p&&Date.now()-p.at<LIFE?p:null}catch{return null}};
 const clear=()=>{try{localStorage.removeItem(KEY)}catch{}};
 const me=async()=>(await fetch("/api/platform/me",{cache:"no-store",credentials:"same-origin"})).json();
 async function start(){
  const id=[...crypto.getRandomValues(new Uint8Array(24))].map(b=>b.toString(16).padStart(2,"0")).join("");
  try{localStorage.setItem(KEY,JSON.stringify({id,at:Date.now()}))}catch{}
  const m=await me(),r=await fetch("/api/platform/auth/start",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":m.csrfToken||""},body:JSON.stringify({handoff:id})});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.url)throw new Error(d.error||"Login unavailable.");
  if(!timer)timer=setInterval(()=>{if(!read())return clearInterval(timer);claim()},3000);
  location.href=d.url;
 }
 let busy=false,timer=0;
 async function claim(){
  const p=read();if(!p){clear();return}
  if(busy||document.visibilityState==="hidden")return;busy=true;
  try{
   const m=await me();if(m.user){clear();return}
   const r=await fetch("/api/platform/auth/claim",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":m.csrfToken||""},body:JSON.stringify({handoff:p.id})});
   if(r.status===200){clear();location.reload()}
  }catch{}finally{busy=false}
 }
 const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 window.GearHubAppLogin={start,claim,standalone};
 if(read()){claim();timer=setInterval(()=>{if(!read())return clearInterval(timer);claim()},3000)}
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")claim()});
 addEventListener("focus",claim);addEventListener("pageshow",claim);
})();
