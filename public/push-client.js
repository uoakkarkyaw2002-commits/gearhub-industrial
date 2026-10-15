(() => {
 const shop=location.pathname.match(/^\/shops\/([a-z0-9-]+)(?:\/|$)/),scope=shop?'/shops/'+shop[1]+'/':'/';
 const key='gh-push-device:'+scope,pref='gh-push-enabled:'+scope,pendingOff='gh-push-disable-pending:'+scope;
 let config,registration,busy=false;
 const supported=()=>isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches;
 function status(enabled,text){const toggle=document.getElementById('notifications-toggle'),help=document.getElementById('notifications-help');if(toggle){toggle.checked=enabled;toggle.disabled=busy;}if(help){help.removeAttribute('data-i18n');help.textContent=text;}window.dispatchEvent(new CustomEvent('gearhub:push-state',{detail:{enabled}}));}
 const guidance='App ပိတ်ထားချိန် update notifications ရနိုင်သည်။ အသံသည် OS / Silent / Focus settings အပေါ် မူတည်သည်။';
 function token(){let t=localStorage.getItem(key);if(!/^[a-f0-9]{64}$/.test(t||'')){t=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,t);}return t;}
 async function setup(){config=await(await fetch('/api/push/config',{cache:'no-store'})).json();if(!config.configured)throw Error('Web Push server setup မပြီးသေးပါ။');registration=await navigator.serviceWorker.register(shop?scope+'sw.js':'/sw.js',{scope,updateViaCache:'none'});if(!registration.active)await new Promise((resolve,reject)=>{const worker=registration.installing||registration.waiting;if(!worker)return reject(Error('App ကို ပြန်ဖွင့်ပြီး စမ်းပါ။'));const timer=setTimeout(()=>reject(Error('Worker is not ready.')),15000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}});});await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('Settings → Update app ကို အရင်နှိပ်ပြီး Notifications ပြန်ဖွင့်ပါ။')),1500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data?.push?resolve():reject(Error('Update app first.'));};registration.active.postMessage({type:'PUSH_CAPABILITY'},[channel.port2]);});return registration;}
 async function api(path,body){const r=await fetch('/api/push/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrfToken},body:JSON.stringify({scope,token:token(),...body})});if(!r.ok)throw Error('Notification setting ကို မသိမ်းနိုင်သေးပါ။ Internet စစ်ပြီး ပြန်စမ်းပါ။');return r.json();}
 async function refresh(){
  if(!supported()||ios()){status(false,ios()?'iPhone: Safari → Share → Add to Home Screen လုပ်ပြီး app icon မှ ဖွင့်ပါ။ ထို့နောက် Notifications ကို နှိပ်ပါ။':'ဤ browser တွင် Web Push မပံ့ပိုးပါ။');return;}
  if(Notification.permission!=='granted'&&localStorage.getItem(pref)==='on'){localStorage.removeItem(pref);localStorage.setItem(pendingOff,'on');}
  if(localStorage.getItem(pendingOff)==='on'){try{config=await(await fetch('/api/push/config',{cache:'no-store'})).json();if(config.configured){await api('unsubscribe',{});localStorage.removeItem(pendingOff);}}catch{}}
  if(Notification.permission!=='granted'){status(false,Notification.permission==='denied'?'Notifications ပိတ်ထားသည်။ OS/browser settings မှ ခွင့်ပြုပြီး ပြန်ဖွင့်ပါ။':'Notifications ဖွင့်ရန် toggle ကို နှိပ်ပါ။');return;}
  try{await setup();const sub=await registration.pushManager.getSubscription();const enabled=Boolean(sub&&(await api('state',{})).enabled&&localStorage.getItem(pref)==='on');status(enabled,enabled?guidance:'Notifications ပိတ်ထားသည်။ ဖွင့်ရန် toggle ကို နှိပ်ပါ။');}catch(e){status(false,e.message);}
 }
 async function setEnabled(enabled){
  if(busy)return;busy=true;
  try{
   if(!supported()||ios()){await refresh();return;}
   // Permission call is synchronous with the toggle gesture, before any network await.
   if(!enabled){
    localStorage.removeItem(pref);localStorage.removeItem('gh-notifications');localStorage.setItem(pendingOff,'on');
    const saved=await navigator.serviceWorker.getRegistration(scope);const sub=saved?.scope===location.origin+scope?await saved.pushManager.getSubscription():null;if(sub&&!await sub.unsubscribe())throw Error('Device subscription ပိတ်မရသေးပါ။ ပြန်စမ်းပါ။');
    await setup();await api('unsubscribe',{});localStorage.removeItem(pendingOff);status(false,'Notifications ပိတ်ပြီးပါပြီ။');return;
   }
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){status(false,'Permission မရသေးပါ။ OS/browser notification settings ကို စစ်ပါ။');return;}
   await setup();
   if(permission!=='granted'){status(false,'Permission မရသေးပါ။ OS/browser notification settings ကို စစ်ပါ။');return;}
   let sub=await registration.pushManager.getSubscription();
   if(!sub){const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/'));sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}
   await api('subscribe',{subscription:sub.toJSON()});localStorage.removeItem(pendingOff);localStorage.setItem(pref,'on');status(true,guidance);
  }catch(e){status(false,e.message);}finally{busy=false;const t=document.getElementById('notifications-toggle');if(t)t.disabled=false;}
 }
 window.GearHubPush={refresh,setEnabled,scope};
 const help=document.getElementById('notifications-help');if(help){const button=document.createElement('button');button.type='button';button.textContent='ဤ device ကိုသာ test notification ပို့ရန်';button.id='push-test-device';button.hidden=true;help.closest?.('label')?.after(button);window.addEventListener('gearhub:push-state',e=>{button.hidden=!e.detail.enabled;});button.addEventListener('click',async()=>{button.disabled=true;try{await setup();await api('test',{});help.textContent='Test စီစဉ်ပြီးပါပြီ။ App ပိတ်ပြီး ၁ မိနစ်ခန့် စောင့်ပါ။ အသံသည် OS settings အပေါ် မူတည်သည်။';}catch{help.textContent='Test မပို့နိုင်သေးပါ။ Live release အတည်ပြုမှု သို့မဟုတ် ၁၀ မိနစ် cooldown ကို စစ်ပါ။';}finally{button.disabled=false;}});}

 navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='OPEN_UPDATE_SETTINGS'&&e.data.scope===scope){document.querySelector('[data-store-view="profile"]')?.click();const centre=document.getElementById('app-update-notification');if(centre)centre.hidden=false;document.getElementById('app-update-action')?.scrollIntoView({block:'center'});window.GearHubUpdates?.check();}});
 window.addEventListener('load',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
})();
