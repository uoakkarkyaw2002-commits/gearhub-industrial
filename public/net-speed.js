// Network speed under the shop logo (owner's request): a wifi icon in green (good), yellow (normal) or
// red (low) and the measured speed, e.g. "1.80MB" per second, like the phone's own speed meter.
// iPhone Safari does not report the speed, so it is measured by downloading part of /speed-test.bin
// (1 MB of random bytes: a plain file, so no server work, no compression and no phone cache). The time
// counts from the first byte, so the wait for a far server is not counted as slow speed (the shop's
// compressed catalogue, ~28 KB, read 228 KB/s on a phone showing 1.80 MB/s). Reading stops after
// 1.5 s, so slow connections spend little data. Measured when the shop opens, every 3 minutes while
// it is on screen, on returning to the app and when the phone comes back online.
(()=>{
 const avatar=document.querySelector('.home-profile-banner .settings-profile-avatar');if(!avatar)return;
 const SAMPLE='/speed-test.bin',READ_MS=1500;
 const GOOD=1024*1024,NORMAL=200*1024;// bytes per second
 const badge=document.createElement('b');badge.className='net-speed';badge.dataset.level='checking';badge.setAttribute('role','status');
 badge.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9.2a14 14 0 0 1 19 0" /><path d="M5.6 12.6a9.5 9.5 0 0 1 12.8 0" /><path d="M8.8 15.9a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.2" r="1.6" /></svg><small></small>';
 avatar.append(badge);
 const text=badge.querySelector('small');
 const label=bps=>bps>=1000*1024?(bps/GOOD).toFixed(bps>=10*GOOD?0:2)+'MB':Math.max(1,Math.round(bps/1024))+'KB';
 function show(level,value,title){badge.dataset.level=level;text.textContent=value;badge.title=title;badge.setAttribute('aria-label',title)}
 // Bytes per second after the first byte arrived, and the wait for that first byte (ms).
 async function sample(){
  const stop=new AbortController(),asked=performance.now();
  const r=await fetch(SAMPLE+'?speed='+Date.now(),{cache:'no-store',credentials:'omit',signal:stop.signal});
  if(!r.ok||!r.body)throw Error(r.status);
  const reader=r.body.getReader();let start=0,first=0,bytes=0;
  try{for(;;){const {done,value}=await reader.read(),now=performance.now();if(done)break;
   if(!start){start=now;first=value.byteLength;continue}
   bytes+=value.byteLength;if(now-start>=READ_MS){stop.abort();break}}}catch(_){}
  const seconds=(performance.now()-start)/1000;
  // Too little after the first piece to time (a very fast or buffered answer): count the whole download.
  const bps=bytes>=64*1024&&seconds>0.05?bytes/seconds:(bytes+first)/Math.max(0.05,(performance.now()-asked)/1000);
  return {bps,delay:start-asked};
 }
 let busy=false;
 async function measure(){
  if(busy||document.hidden)return;
  if(navigator.onLine===false){show('offline','Offline','No internet');return}
  busy=true;
  try{
   const {bps,delay}=await sample();
   // A very long wait for the first byte (bad signal) is never shown as good.
   const level=bps>=GOOD&&delay<2000?'good':bps>=NORMAL?'normal':'low';
   show(level,label(bps),(level==='good'?'Good':level==='normal'?'Normal':'Low')+' connection · '+label(bps)+'/s · '+Math.round(delay)+' ms');
  }catch(_){if(navigator.onLine===false)show('offline','Offline','No internet');else show('low','–','Connection problem')}
  finally{busy=false}
 }
 setTimeout(measure,1500);setInterval(measure,180000);
 addEventListener('online',measure);addEventListener('offline',()=>show('offline','Offline','No internet'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)measure()});
})();
