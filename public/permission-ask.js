/* 1.1.353 owner: other apps ask for Notifications / Camera right when they are opened; SkyShopMM asked for nothing.
   In the installed app (Play Store app or Home Screen app) a small sheet asks once: tap Allow next to each one and the
   phone shows its own question. Permissions can only be asked from a tap, so each row has its own Allow button. */
(()=>{
 const KEY='gh-perm-ask-v1';
 // The Play Store app opens the first page with referrer android-app://…; remember it, later pages have another referrer.
 try{if(String(document.referrer).startsWith('android-app://'))localStorage.setItem('gh-twa','1')}catch{}
 const inApp=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||String(document.referrer).startsWith('android-app://')||(()=>{try{return localStorage.getItem('gh-twa')==='1'}catch{return false}})();
 let asked=false;try{asked=Boolean(localStorage.getItem(KEY))}catch{}
 const my=()=>document.documentElement.lang==='my';
 const T={en:{title:'Allow SkyShopMM to use…',notif:'Notifications',notifD:'New orders, chat messages and calls',cam:'Camera',camD:'Scan products and parts',mic:'Microphone',micD:'Voice messages and voice calls',allow:'Allow',on:'Allowed ✓',off:'Blocked — turn it on in the phone Settings',done:'Done',later:'Not now'},
  my:{title:'SkyShopMM ကို ခွင့်ပြုပေးပါ…',notif:'Notifications',notifD:'အော်ဒါအသစ်၊ chat စာ၊ ဖုန်းခေါ်တာ သိရန်',cam:'ကင်မရာ',camD:'ပစ္စည်း scan ဖတ်ရန်',mic:'မိုက်ခရိုဖုန်း',micD:'အသံစာ နဲ့ အသံခေါ်ဆိုမှုအတွက်',allow:'ခွင့်ပြုမယ်',on:'ခွင့်ပြုပြီး ✓',off:'ပိတ်ထားတယ် — ဖုန်း Settings မှာ ဖွင့်ပါ',done:'ပြီးပြီ',later:'နောက်မှ'}};
 const t=k=>T[my()?'my':'en'][k];
 const state={
  notif:async()=>!window.Notification?'na':Notification.permission==='default'?'prompt':Notification.permission,
  cam:async()=>{try{return (await navigator.permissions.query({name:'camera'})).state}catch{return 'prompt'}},
  mic:async()=>{try{return (await navigator.permissions.query({name:'microphone'})).state}catch{return 'prompt'}}
 };
 const ask={
  notif:async()=>{await Notification.requestPermission();if(Notification.permission==='granted')dispatchEvent(new Event('gearhub:alerts-allowed'))},
  cam:async()=>{const s=await navigator.mediaDevices.getUserMedia({video:true});s.getTracks().forEach(x=>x.stop())},
  mic:async()=>{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(x=>x.stop())}
 };
 const ids=['notif','cam','mic'];
 const mark=()=>{try{localStorage.setItem(KEY,'1')}catch{}};
 async function open(force){
  if(document.querySelector('.perm-ask'))return;
  const now=await Promise.all(ids.map(k=>state[k]()));
  if(!force&&!ids.some((k,i)=>now[i]==='prompt')){mark();return}
  const d=document.createElement('dialog');d.className='perm-ask';
  d.style.cssText='position:fixed;inset:auto 0 0 0;margin:0;width:100%;max-width:none;border:0;border-radius:24px 24px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));background:#fff;color:#1f2b24;box-shadow:0 -10px 40px #0003;font:16px/1.5 system-ui,"Noto Sans Myanmar",sans-serif';
  const rows=()=>d.querySelectorAll('[data-k]');
  async function paint(){
   const st=await Promise.all(ids.map(k=>state[k]()));
   d.innerHTML='<h2 style="margin:0 0 12px;font-size:20px">'+t('title')+'</h2>'+ids.map((k,i)=>st[i]==='na'?'':'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #e8ece9"><span style="font-size:26px" aria-hidden="true">'+({notif:'🔔',cam:'📷',mic:'🎤'})[k]+'</span><span style="flex:1"><b>'+t(k)+'</b><br><small style="color:#5f6f65">'+t(k+'D')+'</small></span>'+
    (st[i]==='granted'?'<span style="color:#2e7d32;font-weight:700">'+t('on')+'</span>':st[i]==='denied'?'<small style="color:#b3261e;max-width:130px;text-align:right">'+t('off')+'</small>':'<button type="button" data-k="'+k+'" style="margin:0;padding:9px 16px;border:0;border-radius:999px;background:#2e8b2e;color:#fff;font:inherit;font-weight:700">'+t('allow')+'</button>')+'</div>').join('')+
    '<button type="button" data-done style="width:100%;margin:14px 0 0;padding:12px;border:0;border-radius:14px;background:#eef2ef;color:#1f2b24;font:inherit;font-weight:700">'+(st.includes('prompt')?t('later'):t('done'))+'</button>';
  }
  d.addEventListener('click',async e=>{
   if(e.target.closest('[data-done]')){mark();d.close();return}
   const b=e.target.closest('[data-k]');if(!b)return;b.disabled=true;
   try{await ask[b.dataset.k]()}catch{}
   await paint();
  });
  d.addEventListener('close',()=>{mark();d.remove()});
  document.body.append(d);await paint();d.showModal();
 }
 const go=()=>setTimeout(()=>open().catch(()=>{}),2500);
 if(inApp&&!asked){addEventListener('gearhub:data-ready',go,{once:true});if(document.readyState==='complete')setTimeout(go,6000)}
 // 1.1.354 owner (Android Play app): the sheet did not appear on its own — Settings → Permissions opens it any time, in every browser and app.
 const share=document.getElementById('share-store-action');
 if(share){
  const row=document.createElement('button');row.type='button';row.className='settings-row settings-row-button';row.id='permission-ask-action';
  row.innerHTML='<span class="settings-icon" aria-hidden="true">🔐</span><span class="settings-copy"><strong></strong><small></small></span><span class="settings-chevron" aria-hidden="true">›</span>';
  const paint=()=>{row.querySelector('strong').textContent=my()?'ခွင့်ပြုချက်များ':'Permissions';row.querySelector('small').textContent=my()?'Notifications၊ ကင်မရာ၊ မိုက်ခရိုဖုန်း':'Notifications, camera, microphone'};
  paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  row.addEventListener('click',()=>open(true).catch(()=>{}));
  share.after(row);
 }
 window.GearHubPermissions={open:()=>open(true)};
})();
