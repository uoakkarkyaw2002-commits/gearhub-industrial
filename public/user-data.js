/* 1.1.344 owner: keep what the phone remembers on the server too (signed-in people only; guests keep it on the phone).
   get(key) -> the saved value or null; put(key, value) saves it. Only a few keys are accepted by the server. */
(()=>{
 // 1.1.359: inside the native Android app the start URL carries ?app=android&fcm=<Firebase address>. Remembered for this session only
 // (sessionStorage: the app runs inside Chrome, so localStorage is shared with ordinary Chrome tabs), then taken off the address bar.
 try{
  const q=new URLSearchParams(location.search);
  if(q.get('app')==='android'){sessionStorage.setItem('gh-native','1');if(q.get('fcm'))sessionStorage.setItem('gh-native-fcm',q.get('fcm'));q.delete('app');q.delete('fcm');history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}
 }catch{}
 const nativeApp=()=>{try{return sessionStorage.getItem('gh-native')==='1'}catch{return false}};
 let csrf='',off=false;
 const url=k=>'/api/platform/userdata/'+encodeURIComponent(k);
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function get(key){
  if(off)return null;
  try{const r=await fetch(url(key),{cache:'no-store',credentials:'same-origin'});if(r.status===401){off=true;setTimeout(()=>{off=false},60000);return null}if(!r.ok)return null;return (await r.json()).value??null}catch{return null}
 }
 async function put(key,value){
  if(off)return false;
  try{
   const send=async()=>fetch(url(key),{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:JSON.stringify({value})});
   let r=await send();if(r.status===403){csrf='';r=await send()}
   if(r.status===401){off=true;setTimeout(()=>{off=false},60000)}
   return r.ok;
  }catch{return false}
 }

 // 1.1.355 owner: alerts for the person themself (a shop's answer, a new message, a call from a shop) — whoever they are.
 // Once Notifications are allowed and the person is signed in, this phone is saved to the account; no tap needed.
 const keyBytes=k=>{const raw=atob((k+'='.repeat((4-k.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
 let pushBusy=false;
// The native app gets its alerts from Firebase: save this phone's address on the account (once per sign-in).
 async function saveNativeToken(){
  let t='';try{t=sessionStorage.getItem('gh-native-fcm')||''}catch{}
  if(!t||off)return false;
  try{
   const send=async()=>fetch('/api/platform/native-push/token',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:JSON.stringify({token:t})});
   let r=await send();if(r.status===403){csrf='';r=await send()}
   if(r.status===401){off=true;setTimeout(()=>{off=false},60000);return false}
   return r.ok;
  }catch{return false}
 }
 async function enablePush(){
  if(nativeApp())return saveNativeToken();
  if(pushBusy||off||!('serviceWorker' in navigator)||!('PushManager' in window)||!window.Notification||Notification.permission!=='granted')return false;
  pushBusy=true;
  try{
   const reg=await navigator.serviceWorker.ready;
   const info=await fetch('/api/platform/user-push',{cache:'no-store',credentials:'same-origin'});
   if(info.status===401){off=true;setTimeout(()=>{off=false},60000);return false}
   const {publicKey}=await info.json();
   let sub=await reg.pushManager.getSubscription();
   if(sub&&sub.options?.applicationServerKey){const old=new Uint8Array(sub.options.applicationServerKey),key=keyBytes(publicKey);if(old.length!==key.length||old.some((v,i)=>v!==key[i])){await sub.unsubscribe().catch(()=>{});sub=null}}
   sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});
   const send=async()=>fetch('/api/platform/user-push/subscribe',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:JSON.stringify({subscription:sub.toJSON()})});
   let r=await send();if(r.status===403){csrf='';r=await send()}
   return r.ok;
  }catch{return false}finally{pushBusy=false}
 }
 addEventListener('gearhub:data-ready',()=>setTimeout(enablePush,6000),{once:true});
 addEventListener('gearhub:alerts-allowed',()=>setTimeout(enablePush,800));
 window.GearHubUserData={get,put,enablePush,nativeApp};
})();
