// Network speed under the shop logo (owner's request): a wifi icon in green (good), yellow (normal) or
// red (low) and the measured speed, e.g. "1.2MB" per second. iPhone Safari does not report the speed,
// so it is measured: a tiny request gives the delay, then the shop's catalogue (no-store, ~100 KB)
// gives the bytes per second. Measured when the shop opens, every minute while it is on screen, and
// when the phone comes back online.
(()=>{
 const avatar=document.querySelector('.home-profile-banner .settings-profile-avatar');if(!avatar)return;
 const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
 const SAMPLE=slug?'/api/platform/store/'+encodeURIComponent(decodeURIComponent(slug)):'/api/products';
 const GOOD=1024*1024,NORMAL=200*1024;// bytes per second
 const badge=document.createElement('b');badge.className='net-speed';badge.dataset.level='checking';badge.setAttribute('role','status');
 badge.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9.2a14 14 0 0 1 19 0" /><path d="M5.6 12.6a9.5 9.5 0 0 1 12.8 0" /><path d="M8.8 15.9a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.2" r="1.6" /></svg><small></small>';
 avatar.append(badge);
 const text=badge.querySelector('small');
 const label=bps=>bps>=1000*1024?(bps/GOOD).toFixed(bps>=10*GOOD?0:1).replace(/\.0$/,'')+'MB':Math.max(1,Math.round(bps/1024))+'KB';
 function show(level,value,title){badge.dataset.level=level;text.textContent=value;badge.title=title;badge.setAttribute('aria-label',title)}
 let busy=false;
 async function measure(){
  if(busy||document.hidden)return;
  if(navigator.onLine===false){show('offline','Offline','No internet');return}
  busy=true;
  try{
   const bust=()=>(SAMPLE.includes('?')?'&':'?')+'speed='+Date.now();
   let t=performance.now();await fetch('/api/platform/me'+bust(),{cache:'no-store',credentials:'same-origin'}).then(r=>r.arrayBuffer());const delay=performance.now()-t;
   t=performance.now();const body=await fetch(SAMPLE+bust(),{cache:'no-store',credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer()});
   const seconds=Math.max(0.01,(performance.now()-t-delay*0.9)/1000),bps=body.byteLength/seconds;
   // A slow answer to the tiny request (bad signal) never counts as good, however fast the download was.
   const level=bps>=GOOD&&delay<600?'good':bps>=NORMAL&&delay<1500?'normal':'low';
   show(level,label(bps),(level==='good'?'Good':level==='normal'?'Normal':'Low')+' connection · '+label(bps)+'/s · '+Math.round(delay)+' ms');
  }catch(_){if(navigator.onLine===false)show('offline','Offline','No internet');else show('low','–','Connection problem')}
  finally{busy=false}
 }
 setTimeout(measure,1500);setInterval(measure,60000);
 addEventListener('online',measure);addEventListener('offline',()=>show('offline','Offline','No internet'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)measure()});
})();
