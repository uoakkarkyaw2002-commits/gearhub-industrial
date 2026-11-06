/* 1.1.343 owner: voice calls between a buyer and a shop (WebRTC — the voice goes phone to phone, the server only passes
   the offer/answer). Also the sounds: ring while a call comes in, ring-back while calling, a "ding" when a chat message
   arrives, a soft tick when one is sent, and a tone when a call ends. */
(()=>{
 if(window.GearHubCall)return;
 const my=()=>document.documentElement.lang==='my';
 const T={en:{calling:'Calling…',ringing:'Ringing…',incoming:'Incoming call',connecting:'Connecting…',connected:'Connected',ended:'Call ended',speaker:'Speaker',speakerOff:'Earpiece',speakerNo:'Use your phone volume or speaker button',video:'Video call',cam:'Camera',camOff:'Camera off',flip:'Flip',camDenied:'The camera is not allowed. Allow it in your browser settings.',declined:'Call declined',missed:'No answer',mic:'The microphone is not allowed. Allow it in your browser settings.',nomic:'Calls are not supported on this phone or browser.',failed:'The call could not connect. Try again.',accept:'Accept',decline:'Decline',end:'End call',mute:'Mute',unmute:'Unmute',busy:'You are already in a call.'},
  my:{calling:'ခေါ်နေပါတယ်…',ringing:'မြည်နေပါတယ်…',incoming:'အသံ ခေါ်ဆိုမှု',connecting:'ချိတ်ဆက်နေပါတယ်…',connected:'ချိတ်ဆက်ပြီး',ended:'ခေါ်ဆိုမှု ပြီးပါပြီ',speaker:'စပီကာ',speakerOff:'နားကြပ်',speakerNo:'ဖုန်းရဲ့ အသံခလုတ်ကို သုံးပါ',video:'ဗီဒီယို ခေါ်ဆိုမှု',cam:'ကင်မရာ',camOff:'ကင်မရာ ပိတ်',flip:'လှည့်',camDenied:'ကင်မရာ ခွင့်မပြုထားပါ။ Browser setting မှာ ခွင့်ပြုပေးပါ။',declined:'မကိုင်ပါ',missed:'ဖုန်းမကိုင်ပါ',mic:'မိုက်ခရိုဖုန်း ခွင့်မပြုထားပါ။ Browser setting မှာ ခွင့်ပြုပေးပါ။',nomic:'ဒီဖုန်း/browser မှာ ခေါ်ဆိုမှု မသုံးနိုင်ပါ။',failed:'ချိတ်ဆက်မရပါ။ ပြန်ခေါ်ကြည့်ပါ။',accept:'ကိုင်မယ်',decline:'မကိုင်ဘူး',end:'ချမယ်',mute:'အသံပိတ်',unmute:'အသံဖွင့်',busy:'ခေါ်ဆိုမှု လုပ်နေဆဲပါ။'}};
 const t=k=>T[my()?'my':'en'][k];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // ---- sounds ----
 // Made in the page as small WAV files and played through <audio> elements: on iPhone, audio made with Web Audio is silent
 // when the side switch is on silent or the page was never unlocked, while <audio> played after a tap is not.
 const SR=22050,DEFS={
  ding:[{f:880,at:0,dur:.16,v:.55},{f:1318,at:.14,dur:.34,v:.55}],
  sent:[{f:660,at:0,dur:.1,v:.4}],
  end:[{f:520,at:0,dur:.18,v:.5},{f:390,at:.2,dur:.34,v:.5}],
  ring:[{f:440,at:0,dur:.42,v:.3},{f:480,at:0,dur:.42,v:.3},{f:440,at:.55,dur:.42,v:.3},{f:480,at:.55,dur:.42,v:.3}],
  back:[{f:425,at:0,dur:1,v:.4}]
 },urls={};
 function wav(tones){
  const n=Math.ceil((Math.max(...tones.map(x=>x.at+x.dur))+.05)*SR),d=new Float32Array(n);
  for(const x of tones){const s=Math.floor(x.at*SR),len=Math.floor(x.dur*SR);for(let i=0;i<len&&s+i<n;i++){const t=i/SR,env=Math.max(0,Math.min(1,t/.02,(x.dur-t)/.04));d[s+i]+=Math.sin(2*Math.PI*x.f*t)*x.v*env}}
  const b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,str)=>[...str].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,d[i]))*32767,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
 }
 const fx=new Audio(),rg=new Audio();let unlocked=false;
 const unlock=()=>{
  if(unlocked)return;unlocked=true;urls.silent=urls.silent||wav([{f:200,at:0,dur:.05,v:0}]);
  for(const a of [fx,rg]){a.src=urls.silent;a.play().then(()=>a.pause()).catch(()=>{unlocked=false})}
 };
 ['touchend','click','pointerup','keydown'].forEach(e=>addEventListener(e,unlock,{passive:true,capture:true}));
 function play(name,loopKind){
  const a=loopKind?rg:fx;try{urls[name]=urls[name]||wav(DEFS[name]);a.src=urls[name];a.currentTime=0;a.volume=1;const r=a.play();r&&r.catch&&r.catch(()=>{})}catch{}
 }
 const sound={ding:()=>play('ding'),sent:()=>play('sent'),end:()=>play('end'),ring:()=>play('ring',true),back:()=>play('back',true)};
 let loop=0;
 const ringStart=kind=>{ringStop();sound[kind]();loop=setInterval(sound[kind],kind==='ring'?3200:3500);if(kind==='ring')try{navigator.vibrate?.([400,200,400])}catch{}};
 const ringStop=()=>{clearInterval(loop);loop=0;try{rg.pause()}catch{}};
 // ---- call state ----
 let pending=null,cur=null; // {id,pc,stream,poll,dialog,timer,since,name,role}
 let csrf='';
 async function api(url,method='GET',body){
  if(method!=='GET'&&!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';
  const send=()=>fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body?JSON.stringify(body):undefined});
  let r=await send();if(r.status===403&&method!=='GET'){csrf='';csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';r=await send()}
  const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.error||t('failed'));e.status=r.status;throw e}return d;
 }
 const mmss=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
 const inCall=()=>'<button type="button" class="vc-btn vc-spk" data-vc="spk" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.500 3A4.500 4.500 0 0 0 14 8v8a4.500 4.500 0 0 0 2.500-4zM14 3.230v2.060a7 7 0 0 1 0 13.420v2.060a9 9 0 0 0 0-17.540z"/></svg><span>'+t('speaker')+'</span></button><button type="button" class="vc-btn vc-cam" data-vc="cam" aria-pressed="false" hidden><svg viewBox="0 0 24 24"><path d="M15 8v8H5V8h10m1-2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.500l4 4v-11l-4 4V7a1 1 0 0 0-1-1z"/></svg><span>'+t('cam')+'</span></button><button type="button" class="vc-btn vc-mute" data-vc="mute" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.900V22h2v-3.100A7 7 0 0 0 19 12z"/></svg><span>'+t('mute')+'</span></button><button type="button" class="vc-btn vc-no" data-vc="end" aria-label="'+esc(t('end'))+'"><svg viewBox="0 0 24 24"><path d="M3 15c5-5 13-5 18 0l-2 3-4-1v-3c-2-.7-4-.7-6 0v3l-4 1z"/></svg><span>'+t('end')+'</span></button>';
 function screen(name,incoming){
  const d=document.createElement('dialog');d.className='vc-screen';
  d.innerHTML='<div class="vc-avatar" aria-hidden="true">'+esc(Array.from(name.trim())[0]||'?').toUpperCase()+'</div><h2>'+esc(name)+'</h2><p class="vc-status" role="status"></p><video class="vc-remote" autoplay playsinline muted hidden></video><video class="vc-local" autoplay playsinline muted hidden></video><audio class="vc-audio" autoplay playsinline></audio>'+
   '<div class="vc-actions">'+(incoming?'<button type="button" class="vc-btn vc-no" data-vc="decline" aria-label="'+esc(t('decline'))+'"><svg viewBox="0 0 24 24"><path d="M3 15c5-5 13-5 18 0l-2 3-4-1v-3c-2-.7-4-.7-6 0v3l-4 1z"/></svg><span>'+t('decline')+'</span></button><button type="button" class="vc-btn vc-yes" data-vc="accept" aria-label="'+esc(t('accept'))+'"><svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.300.2 2.500.6 3.600.1.300 0 .700-.2 1z"/></svg><span>'+t('accept')+'</span></button>':
   inCall())+'</div>';
  document.body.append(d);d.showModal();d.addEventListener('cancel',e=>e.preventDefault());return d;
 }
 const status=x=>{const e=cur?.dialog?.querySelector('.vc-status');if(e)e.textContent=x};
 function cleanup(){
  if(!cur)return;const c=cur;cur=null;pending=null;ringStop();clearInterval(c.poll);clearInterval(c.timer);
  try{c.stream?.getTracks().forEach(x=>x.stop())}catch{}try{c.pc?.close()}catch{}
  setTimeout(()=>{c.dialog.close();c.dialog.remove()},c.keep||0);
 }
 function finish(text,keep=1400){status(text);ringStop();sound.end();if(cur)cur.keep=keep;cleanup()}
 const gathered=pc=>new Promise(done=>{if(pc.iceGatheringState==='complete')return done();const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);done()}};pc.addEventListener('icegatheringstatechange',f);setTimeout(done,2000)});
 function open(name,incoming,video){
  const dialog=screen(name,incoming);cur={dialog,name,t0:0,video:Boolean(video)};dialog.classList.toggle('vc-video',Boolean(video));
  dialog.addEventListener('click',e=>{const b=e.target.closest('[data-vc]');if(!b)return;const k=b.dataset.vc;
   if(k==='end'||k==='decline')hang();
   if(k==='accept')accept();
   if(k==='spk'&&cur){const on=b.getAttribute('aria-pressed')!=='true';speaker(on).then(ok=>{b.setAttribute('aria-pressed',String(on&&ok));b.querySelector('span').textContent=t(on&&ok?'speakerOff':'speaker');if(!ok)status(t('speakerNo'))})}
   if(k==='cam'&&cur?.stream){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));cur.stream.getVideoTracks().forEach(x=>x.enabled=!on);b.querySelector('span').textContent=t(on?'camOff':'cam');dialog.querySelector('.vc-local').style.visibility=on?'hidden':'visible'}
   if(k==='mute'&&cur?.stream){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));cur.stream.getAudioTracks().forEach(x=>x.enabled=!on);b.querySelector('span').textContent=t(on?'unmute':'mute')}});
 }
 // Loudspeaker: Chrome (desktop and some Android) can pick the output; iPhone Safari cannot be told — then the volume buttons are used.
async function speaker(on){
  const a=cur?.dialog.querySelector('.vc-audio');if(!a||typeof a.setSinkId!=='function')return false;
  try{
   const outs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput');
   const sp=outs.find(d=>/speaker|loud/i.test(d.label)),def=outs.find(d=>d.deviceId==='default')||outs[0];
   if(on&&!sp)return false;
   await a.setSinkId(on?sp.deviceId:(def?def.deviceId:''));return true;
  }catch{return false}
}
// Microphone + connection: when calling, and when the person called taps Accept (a tap is needed for the microphone).
 async function media(){
  if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==='undefined')throw Error(t('nomic'));
  const cfg=await api('/api/platform/call/config');
  const wantVideo=Boolean(cur&&cur.video);
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:wantVideo?{facingMode:'user',width:{ideal:640},height:{ideal:480}}:false})}catch{throw Error(t(wantVideo?'camDenied':'mic'))}
  const c=cur;if(!c){stream.getTracks().forEach(x=>x.stop());throw Error(t('ended'))}
  const pc=new RTCPeerConnection({iceServers:cfg.iceServers});
  stream.getTracks().forEach(x=>pc.addTrack(x,stream));c.pc=pc;c.stream=stream;
  pc.ontrack=e=>{const a=c.dialog.querySelector('.vc-audio');a.srcObject=e.streams[0];a.play?.().catch(()=>{});
   if(e.track.kind==='video'){const v=c.dialog.querySelector('.vc-remote');v.srcObject=e.streams[0];v.hidden=false;v.play?.().catch(()=>{});c.dialog.classList.add('vc-has-video')}};
  if(wantVideo){const l=c.dialog.querySelector('.vc-local');l.srcObject=stream;l.hidden=false;l.play?.().catch(()=>{});c.dialog.querySelector('.vc-cam').hidden=false;c.dialog.classList.add('vc-video')}
  pc.onconnectionstatechange=()=>{if(cur!==c)return;
   if(pc.connectionState==='connected'){ringStop();c.t0=c.t0||Date.now();clearInterval(c.timer);c.timer=setInterval(()=>status(t('connected')+' · '+mmss(Math.round((Date.now()-c.t0)/1000))),500);status(t('connected')+' · 0:00')}
   if(pc.connectionState==='failed')hang(t('failed'))};
  return pc;
 }
 async function hang(message){
  const c=cur;if(!c)return;const id=c.id;finish(message||t('ended'));
  if(id)api('/api/platform/call/'+id+'/end','POST',{}).catch(()=>{});
 }
 function watch(){
  const c=cur;clearInterval(c.poll);
  c.poll=setInterval(async()=>{
   if(!cur||cur!==c||!c.id)return;
   try{
    const d=await api('/api/platform/call/'+c.id);
    if(cur!==c)return;
    if(d.state==='active'&&d.answer&&c.role==='caller'&&!c.answered){c.answered=true;ringStop();status(t('connecting'));await c.pc.setRemoteDescription({type:'answer',sdp:d.answer})}
    if(d.state==='ended'){const why={declined:'declined',missed:'missed'}[d.reason];finish(t(why||'ended'))}
    else if(c.role==='caller'&&d.state==='ringing'&&Date.now()-c.created>46000)hang(t('missed'));
   }catch(e){if(e.status===404&&cur===c)finish(t('ended'))}
  },1000);
 }
 async function start(slug,chat,name,video){
  if(cur)throw Error(t('busy'));
  open(name||slug,false,video);cur.role='caller';cur.created=Date.now();status(t('calling'));
  try{
   const pc=await media();
   await pc.setLocalDescription(await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:Boolean(video)}));await gathered(pc);
   const d=await api('/api/platform/call/start','POST',{slug,chat:chat||undefined,offer:pc.localDescription.sdp,video:Boolean(video)});
   if(!cur||cur.pc!==pc){api('/api/platform/call/'+d.id+'/end','POST',{}).catch(()=>{});return}
   cur.id=d.id;cur.created=Date.now();status(t('ringing'));ringStart('back');watch();
  }catch(e){const m=e.message;cur&&cleanup();throw Error(m)}
 }

 async function accept(){
  const inc=pending;pending=null;if(!inc||!cur)return;const c=cur;ringStop();status(t('connecting'));c.dialog.querySelector('.vc-actions').innerHTML=inCall();
  try{
   await media();
   await c.pc.setRemoteDescription({type:'offer',sdp:inc.offer});
   await c.pc.setLocalDescription(await c.pc.createAnswer());await gathered(c.pc);
   await api('/api/platform/call/'+inc.id+'/answer','POST',{answer:c.pc.localDescription.sdp});
   c.id=inc.id;c.role='callee';watch();
  }catch(e){hang(e.status===409?t('ended'):e.message||t('failed'))}
 }
 let shownId='';
 async function incoming(inc){
  shownId=inc.id;
  open(inc.name,true,inc.video);pending=inc;if(autoAccept&&!autoDone){autoDone=true;setTimeout(()=>accept(),0)}cur.id=inc.id;cur.role='callee';status(t(inc.video?'video':'incoming'));ringStart('ring');
  // Keep watching so the screen closes if the caller gives up.
  cur.poll=setInterval(async()=>{const c=cur;if(!c||c.id!==inc.id)return;try{const d=await api('/api/platform/call/'+inc.id);if(d.state==='ended'&&cur===c){pending=null;finish(t(d.reason==='missed'?'missed':'ended'))}}catch(e){if(e.status===404&&cur===c)finish(t('ended'))}},1500);
 }
 // ---- polling: incoming calls + unread messages (ding) ----
 let unread=null,signedOut=false;
 async function tick(){
  if(document.hidden||signedOut)return;
  try{
   const d=await api('/api/platform/call/incoming');
   if(!cur){const inc=d.calls?.[0];if(inc&&inc.id!==shownId)incoming(inc)}
   if(unread!==null&&d.unread>unread){sound.ding();dispatchEvent(new Event('gearhub:chat-unread'))}
   else if(unread!==null&&d.unread!==unread)dispatchEvent(new Event('gearhub:chat-unread'));
   unread=d.unread;
  }catch(e){if(e.status===401)signedOut=true}
 }
 // 1.1.361: "Answer" on the native call screen opens the app at ?call=accept — find the call at once and accept it without a second tap.
 let autoAccept=/[?&]call=accept/.test(location.search),autoDone=false;
 if(/[?&]call=/.test(location.search)){try{const q=new URLSearchParams(location.search);q.delete('call');history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}catch{}}
 addEventListener('load',()=>{tick();setInterval(tick,4000)},{once:true});
 if(autoAccept||/[?&]call=1/.test(location.search)){let n=0;const fast=setInterval(()=>{tick();if(++n>14||autoDone)clearInterval(fast)},700);setTimeout(tick,250)}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){signedOut=false;tick()}});
 window.GearHubCall={start,sound,busy:()=>Boolean(cur)};
})();
