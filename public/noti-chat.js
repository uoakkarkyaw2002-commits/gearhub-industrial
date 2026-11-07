/* 1.1.314 owner's picture: two glass buttons at the top right of the shop banner — 🔔 notifications (everything
   that happened: orders, likes, comments, follows, chats; answers for buyers) and 💬 chat between a buyer and the
   shop (the shop sees the list of chats and answers). Google sign-in is needed for both. */
(()=>{
 // 1.1.319 owner: on GearHub's own Home the GearHub owner gets them too (GearHub alerts + every shop's chats).
 let slug=(location.pathname.match(/^\/shops\/([a-z0-9-]{1,80})\//)||[])[1];
 const ownerMode=!slug&&!/^\/shops\//.test(location.pathname);
 const banner=document.querySelector('.home-profile-banner');
 if((!slug&&!ownerMode)||!banner)return;
 const my=()=>document.documentElement.lang==='my';
 const T={en:{noti:'Notifications',chat:'Chat',none:'Nothing new yet.',signIn:'Sign in with Google to see notifications and chat with the shop.',google:'Continue with Google',write:'Write a message…',send:'Send',noChats:'No chats yet.',back:'Chats',error:'Something went wrong. Please try again.',close:'Close',hello:'Ask the shop anything — price, stock, delivery.'},
  my:{noti:'အသိပေးချက်များ',chat:'Chat',none:'အသစ် မရှိသေးပါ။',signIn:'အသိပေးချက်ကြည့်ဖို့နဲ့ ဆိုင်ကို စာပို့ဖို့ Google နဲ့ ဝင်ပါ။',google:'Google နဲ့ ဝင်မယ်',write:'စာရေးပါ…',send:'ပို့မယ်',noChats:'Chat မရှိသေးပါ။',back:'Chats',error:'မအောင်မြင်ပါ။ ပြန်စမ်းကြည့်ပါ။',close:'ပိတ်ရန်',hello:'ဈေးနှုန်း၊ လက်ကျန်၊ ပို့ဆောင်ရေး — ဆိုင်ကို မေးလို့ရပါတယ်။'}};
 Object.assign(T.en,{updating:'The server is being updated. Reconnecting automatically…'});Object.assign(T.my,{updating:'Server ပြင်နေပါတယ်။ ခဏနေ ကိုယ်တိုင် ပြန်ချိတ်ပါမယ်…'});
 Object.assign(T.en,{sticker:'Sticker',voice:'Voice message',record:'Record a voice message',cancel:'Cancel',micDenied:'The microphone is not allowed. Allow it in your browser settings.',micNone:'Voice messages are not supported on this phone.',recording:'Recording…',allShops:'All shops',message:'Message',search:'Search',chats:'Chats',active:'Active Now',followers:'Followers',all:'All chats',unread:'Unread',noResults:'No conversations found.',activeInfo:'Active status is not shared yet.',followerInfo:'View this shop’s followers count on its profile.',profile:'View profile',loading:'Loading conversations…'});
 Object.assign(T.my,{sticker:'Sticker',voice:'အသံ စာ',record:'အသံ ဖမ်းမယ်',cancel:'မလုပ်တော့ဘူး',micDenied:'မိုက်ခရိုဖုန် ခွင့်မပြုထားပါ။ Browser setting မှာ ခွင့်ပြုပေးပါ။',micNone:'ဒီဖုန်းမှာ အသံစာ မသုံးနိုင်ပါ။',recording:'ဖမ်းနေပါတယ်…',allShops:'ဆိုင်အားလုံး',message:'Message',search:'ရှာရန်',chats:'Chats',active:'Active Now',followers:'Followers',all:'Chat အားလုံး',unread:'မဖတ်ရသေးသောစာများ',noResults:'စကားဝိုင်း မတွေ့ပါ။',activeInfo:'Online အခြေအနေကို မဖော်ပြနိုင်သေးပါ။',followerInfo:'ဒီဆိုင်ရဲ့ Profile မှာ Follower အရေအတွက် ကြည့်နိုင်ပါတယ်။',profile:'Profile ကြည့်ရန်',loading:'စကားဝိုင်းများ ဖွင့်နေပါသည်…'});
 Object.assign(T.en,{attach:'Attach file',fileLimit:'Choose a file between 1 byte and 5 MB.',uploading:'Sending file…'});
 Object.assign(T.my,{attach:'ဖိုင်တွဲပို့ရန်',fileLimit:'အလွတ်မဟုတ်သော ဖိုင်၊ 5 MB အထိ ရွေးပါ။',uploading:'ဖိုင် ပို့နေပါတယ်…'});
 const t=k=>T[my()?'my':'en'][k];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bell='<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="nc-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9dcf5"/></linearGradient></defs><path d="M13 10.5a12 12 0 0 0-3 6.5M8 8a16 16 0 0 0-3.5 9M35 10.5a12 12 0 0 1 3 6.5M40 8a16 16 0 0 1 3.5 9" stroke="#e6f0ff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M24 8c-7 0-11 5.4-11 12v7.5L9.5 33h29L35 27.5V20c0-6.6-4-12-11-12z" fill="url(#nc-b)"/><rect x="22" y="5" width="4" height="4.5" rx="2" fill="#fff"/><ellipse cx="24" cy="34" rx="15" ry="2.6" fill="#1d58b8" opacity=".6"/><circle cx="24" cy="37.5" r="4" fill="#f5a623"/></svg>';
 const bubble='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 18h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-1l1.5 6-8-6h-3a6 6 0 0 1-6-6" fill="#2f7cf0"/><path d="M9 7h20a7 7 0 0 1 7 7v9a7 7 0 0 1-7 7H17l-8 6 1.5-6H9a7 7 0 0 1-7-7v-9a7 7 0 0 1 7-7z" fill="#fff"/><circle cx="12" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="19" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="26" cy="18.5" r="2.4" fill="#1d58b8"/></svg>';
 const box=document.createElement('div');box.className='nc-buttons';
 // The owner's own icon pictures (the bell's red dot is drawn in the picture, so it shows only when something is new).
 box.innerHTML='<button type="button" class="nc-button nc-scan" data-nc="scan" aria-label="Search by photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="2"/></svg></button><button type="button" class="nc-button" data-nc="noti"><img src="/images/noti-bell-quiet.png?v=1" alt="" class="nc-bell"></button><button type="button" class="nc-button" data-nc="chat"><img src="/images/noti-chat.png?v=1" alt=""><i class="nc-dot" hidden></i></button>';
 banner.append(box);
 if(ownerMode)box.hidden=true;
 const [,notiButton,chatButton]=box.querySelectorAll('button');box.querySelector('.nc-scan').addEventListener('click',e=>{e.stopPropagation();document.querySelector('.photo-scan-button')?.click()});
 const SEEN='gh-noti-seen:'+(slug||'gearhub');
 let cs=slug,csrf='',data=null,role='',openChat=null,timer=0,inbox=[],inboxTab='chats',unreadOnly=false,viewId=0,refreshing=null,warmedAt=0,uiOwnLogo='',uiPeerName='',uiIdentity=null,selectedConversation='';
 // Private, page-lifetime snapshots only: never put conversations in shared/offline storage.
 const chatCache=window.GearHubMessageCache(key=>key==='inbox'?loadInbox():call(key),24);
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function call(url,method='GET',body){
  const send=async()=>fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:body?JSON.stringify(body):undefined});
  /* 1.1.382: while Render deploys the server is away for a minute or two; read requests wait and retry, and the message says so. */
  const away=x=>!x||x.status===502||x.status===503||x.status===504,tryOnce=async()=>{try{return await send()}catch{return null}};
  let r=await tryOnce();
  if(method==='GET')for(let i=0;i<2&&away(r);i++){await new Promise(x=>setTimeout(x,1500));r=await tryOnce()}
  if(away(r)){const e=Error(t('updating'));e.status=503;e.updating=true;throw e}
  if(r.status===403&&method!=='GET'){csrf='';r=await send()}
  const d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401||r.status===403)chatCache.clear();const e=Error(d.error||t('error'));e.status=r.status;throw e}if(method!=='GET'&&d.messages){const path=url.replace(/\/voice(?:\?.*)?$/,'');chatCache.put(path+(d.role==='buyer'?'?as=buyer':''),d);warmedAt=0}return d;
 }
 const seen=()=>{try{return localStorage.getItem(SEEN)||''}catch{return ''}};
 function dots(){
  const fresh=(data?.items||[]).filter(i=>i.at>seen()&&!i.chat).length;
  notiButton.querySelector('.nc-bell').src=fresh?'/images/noti-bell.png?v=1':'/images/noti-bell-quiet.png?v=1';chatButton.querySelector('.nc-dot').hidden=!data?.unreadChats;
  notiButton.setAttribute('aria-label',t('noti')+(fresh?' · '+fresh:''));chatButton.setAttribute('aria-label',t('chat')+(data?.unreadChats?' · '+data.unreadChats:''));
 }
 async function refresh(warm=true){
  if(document.hidden)return;if(refreshing)return refreshing;
  refreshing=(async()=>{try{data=await call(ownerMode?'/api/platform/owner/notifications':'/api/platform/notifications/'+slug)}catch{data=null}if(ownerMode)box.hidden=!data?.signedIn;dots();if(!data?.signedIn)chatCache.clear();else if(warm)warmInbox().catch(()=>{});return data})();
  try{return await refreshing}finally{refreshing=null}
 }
 // One sheet for both.
 const sheet=document.createElement('dialog');sheet.className='nc-sheet';sheet.id='nc-sheet';document.body.append(sheet);
 /* 1.1.379: iPhone keyboard pans the page; keep the phone sheet exactly as tall as the visible area, pinned to its top, so the header stays on screen. */
 const fit=()=>{const v=window.visualViewport;if(!v||!matchMedia('(max-width:640px)').matches||!sheet.open){sheet.style.removeProperty('height');sheet.style.removeProperty('max-height');sheet.style.removeProperty('top');return}sheet.style.height=v.height+'px';sheet.style.maxHeight=v.height+'px';sheet.style.top=v.offsetTop+'px'};
 /* 1.1.383 owner: with the keyboard open the page behind must not move; only the message list scrolls. */
 sheet.addEventListener('touchmove',e=>{if(!sheet.open||!matchMedia('(max-width:640px)').matches)return;if(!e.target.closest('.nc-messages,.nc-conversations,.nc-stickers,textarea'))e.preventDefault()},{passive:false});
 window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);sheet.addEventListener('close',fit);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close()});
 sheet.addEventListener('close',()=>{viewId++;if(rec)stopRec(false);sheet.classList.remove('open');openChat=null;clearInterval(timer);window.GearHubBackNav?.record();refresh()});
 function open(title,html,mode=''){
  sheet.classList.toggle('nc-chat-view',Boolean(mode));sheet.classList.toggle('nc-inbox',mode==='inbox');sheet.classList.toggle('nc-thread',mode==='thread');
  sheet.setAttribute('aria-label',mode?t('message'):t('noti'));
  sheet.innerHTML='<div class="nc-grip" aria-hidden="true"></div><header><h2>'+title+'</h2><button type="button" id="nc-close" aria-label="'+t('close')+'">✕</button></header><div class="nc-body">'+html+'</div><p class="nc-note" role="status"></p>';
  sheet.querySelector('#nc-close').onclick=()=>sheet.close();
  if(!sheet.open){sheet.classList.add('open');sheet.showModal();fit();document.activeElement?.blur?.();window.GearHubBackNav?.record()}
 }
 const note=x=>{const n=sheet.querySelector('.nc-note');if(n)n.textContent=x||''};
 const signIn=()=>open(t('noti'),'<p class="nc-empty">'+t('signIn')+'</p><button type="button" class="nc-primary" data-nc="signin">'+t('google')+'</button>');
 const ago=iso=>{const s=(Date.parse(iso)-Date.now())/1000,f=new Intl.RelativeTimeFormat(my()?'my':'en',{numeric:'auto'});for(const [u,n] of [['year',31536e3],['month',2592e3],['day',86400],['hour',3600],['minute',60]])if(Math.abs(s)>=n)return f.format(Math.round(s/n),u);return my()?'ခုနကပဲ':'Just now'};
 async function showNoti(){
  viewId++;openChat=null;clearInterval(timer);await refresh();if(!data||!data.signedIn)return signIn();
  const before=seen();
  open(bell+'<span>'+t('noti')+'</span>',data.items.length?'<ul class="nc-list">'+data.items.map((i,k)=>'<li><button type="button" class="nc-item'+(i.at>before?' is-new':'')+'" data-nc="item" data-k="'+k+'"><span>'+esc(i.text)+'</span><small>'+esc(ago(i.at))+'</small></button></li>').join('')+'</ul>':'<p class="nc-empty">'+t('none')+'</p>');
  {const v=data.items[0]?.at||new Date().toISOString();try{localStorage.setItem(SEEN,v)}catch{}window.GearHubUserData?.put('noti-seen-'+(slug||'gearhub'),v)}dots();
 }
 // Presentation only: keep every existing call, recording and message action below unchanged.
 const threadIcon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+({attach:'<path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m7 14 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',phone:'<path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2z"/>',video:'<rect x="2" y="5" width="13" height="14" rx="3"/><path d="m16 9 6-4v14l-6-4z"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" fill="none" stroke="currentColor" stroke-width="2"/>',send:'<path d="m3 11 18-8-6 18-4-7z"/><path d="m11 14 10-11" fill="none" stroke="#0869dc" stroke-width="1.3"/>'})[kind]+'</svg>';
 const face=(logo,label)=>'<i class="nc-thread-face" aria-hidden="true">'+(logo?'<img src="'+esc(logo)+'" alt="">':esc(Array.from(String(label||'?').trim())[0]||'?'))+'</i>';
 const shopFace=()=>inbox.find(c=>c.slug===cs&&c.kind==='shop')?.logo||(cs===slug?document.querySelector('#home-profile-avatar:not([hidden])')?.getAttribute('src'):'')||'';
 const ownFace=()=>role==='shop'?shopFace():uiOwnLogo;
 const peerFace=()=>role==='buyer'?shopFace():'';
 function threadHeading(peer){
  uiPeerName=peer;
  return '<button type="button" class="nc-back" data-nc="chats">‹ '+t('back')+'</button>'+face(peerFace(),peer)+'<span class="nc-peer-name">'+esc(peer)+'</span><i class="nc-peer-link" aria-hidden="true">↔</i>'+face(ownFace(),my()?'ကိုယ်':'You')+callBtn;
 }
 const callBtn='<button type="button" class="nc-call" data-nc="call" aria-label="'+(my()?'အသံ ခေါ်မယ်':'Voice call')+'">'+threadIcon('phone')+'</button><button type="button" class="nc-call nc-vcall" data-nc="vcall" aria-label="'+(my()?'ဗီဒီယို ခေါ်မယ်':'Video call')+'">'+threadIcon('video')+'</button>';
 const STICKERS=['👍','❤️','😂','😮','😢','🙏','👏','🔥','🎉','😍','😎','🤝','✅','🛒','📦','🚚'];
 const mmss=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
 const oneMessage=m=>{
  const mine=(role==='shop')===m.fromShop?' mine':'';
  if(m.kind==='call'){
   const r=m.recording,parts=r?.parts||[],kind=r?.video?'video':'audio';
   const url=p=>'/api/platform/call-recordings/'+encodeURIComponent(r.id)+'/parts/'+p.id;
   return '<div class="nc-msg nc-callmsg'+(parts.length?' nc-callrecord':'')+'"><i class="nc-log-icon'+(/voice/i.test(m.body)?' is-voice':'')+'" aria-hidden="true">'+threadIcon(/voice/i.test(m.body)?'phone':'video')+'</i><span>'+esc(m.body.replace(/^(?:📹|📞|☎️|🎥)\s*/u,''))+'</span><small>'+esc(ago(m.at))+'</small>'+(parts.length?'<span class="nc-record-label">'+(r.state==='partial'?(my()?'တစ်စိတ်တစ်ပိုင်း မှတ်တမ်း':'Partial recording'):(my()?'သိမ်းထားသော မှတ်တမ်း':'Call recording'))+'</span><'+kind+' controls playsinline preload="none" src="'+url(parts[0])+'"></'+kind+'>'+(parts.length>1?'<label>'+(my()?'အပိုင်း':'Part')+' <select class="nc-record-part" aria-label="'+(my()?'မှတ်တမ်း အပိုင်း':'Recording part')+'">'+parts.map((p,i)=>'<option value="'+url(p)+'">'+(i+1)+' · '+mmss(p.secs)+'</option>').join('')+'</select></label>':''):r?'<span class="nc-record-label">'+(r.state==='recording'?(my()?'မှတ်တမ်း သိမ်းနေပါတယ်…':'Saving recording…'):(my()?'မှတ်တမ်း မသိမ်းနိုင်ပါ':'Recording unavailable'))+'</span>':'')+'</div>';
  }
  if(m.kind==='sticker')return '<p class="nc-msg nc-sticker'+mine+'"><span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>';
  if(m.kind==='file'&&m.file&&/^\/api\/platform\/chat\/[a-z0-9-]+\/files\/[a-f0-9-]+$/.test(m.file.url))return '<p class="nc-msg nc-filemsg'+mine+'"><a href="'+esc(m.file.url)+'" download><i aria-hidden="true">📎</i><b>'+esc(m.file.name)+'</b><small>'+esc(m.file.bytes>=1048576?(m.file.bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(m.file.bytes/1024))+' KB')+'</small></a><small>'+esc(ago(m.at))+'</small></p>';
  if(m.kind==='voice')return '<p class="nc-msg nc-voice'+mine+'"><audio controls preload="none" src="/api/platform/chat/'+encodeURIComponent(cs)+'/voice/'+m.voice+'"></audio><small>🎤 '+mmss(m.secs||0)+' · '+esc(ago(m.at))+'</small></p>';
  return '<p class="nc-msg nc-textmsg'+mine+'">'+face(mine?ownFace():peerFace(),mine?(my()?'ကိုယ်':'You'):uiPeerName)+'<span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>';
 };
 const messagesHtml=list=>'<div class="nc-messages">'+(list.length?list.map(m=>oneMessage(m).replace(/^(<\w+)/,'$1 data-nc-message="'+esc(m.id)+'"')).join(''):'<p class="nc-empty">'+t('hello')+'</p>')+'</div><div class="nc-stickers" hidden>'+STICKERS.map(x=>'<button type="button" data-nc="sticker" data-s="'+x+'" aria-label="'+t('sticker')+' '+x+'">'+x+'</button>').join('')+'</div><form class="nc-form" data-nc-form="send"><button type="button" class="nc-tool" data-nc="stickers" aria-label="'+esc(t('sticker'))+'">😊</button><button type="button" class="nc-tool nc-attach" data-nc="attach" aria-label="'+esc(t('attach'))+'">'+threadIcon('attach')+'</button><input class="nc-file-input" type="file" hidden aria-label="'+esc(t('attach'))+'"><textarea name="body" rows="1" maxlength="2000" placeholder="'+esc(t('write'))+'" aria-label="'+esc(t('write'))+'"></textarea><button type="button" class="nc-primary nc-mic" data-nc="mic" aria-label="'+esc(t('record'))+'">'+threadIcon('mic')+'</button><button type="submit" class="nc-primary" aria-label="'+esc(t('send'))+'">'+threadIcon('send')+'<span class="nc-send-label">'+t('send')+'</span></button><div class="nc-rec" hidden><button type="button" data-nc="rec-cancel" aria-label="'+esc(t('cancel'))+'">✕</button><i class="nc-rec-dot"></i><b class="nc-rec-time">0:00</b><span>'+t('recording')+'</span><button type="button" class="nc-primary" data-nc="rec-send">'+t('send')+'</button></div></form>';
 // Voice message: tap 🎤 to record (up to 60 s), then ➤ to send or ✕ to throw away.
 let rec=null;
 const chatPath=()=>'/api/platform/chat/'+cs+(openChat==='buyer'?'':'/'+openChat);
 const readPath=()=>chatPath()+(openChat==='buyer'?'?as=buyer':'');
 function stopRec(send){
  const r=rec;if(!r)return;rec=null;clearInterval(r.tick);
  r.mr.onstop=async()=>{
   r.stream.getTracks().forEach(x=>x.stop());
   const form=sheet.querySelector('.nc-form');form?.classList.remove('recording');form?.querySelector('.nc-rec')&&(form.querySelector('.nc-rec').hidden=true);
   const secs=Math.max(1,Math.round((Date.now()-r.t0)/1000)),blob=new Blob(r.chunks,{type:r.mr.mimeType||'audio/mp4'});
   if(!send||blob.size<200)return;const view=viewId,path=chatPath(),read=readPath();
   try{
    const go=async()=>fetch(path+'/voice?secs='+secs,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':blob.type||'audio/mp4','X-CSRF-Token':await token()},body:blob});
    let res=await go();if(res.status===403){csrf='';res=await go()}
    const d=await res.json().catch(()=>({}));if(!res.ok)throw Error(d.error||t('error'));chatCache.put(read,d);warmedAt=0;if(view!==viewId||!sheet.open)return;
    const body=sheet.querySelector('.nc-body');if(body){body.innerHTML=messagesHtml(d.messages);scrollEnd()}
   }catch(err){note(err.message)}
  };
  try{r.mr.stop()}catch{}
 }
 async function startRec(){
  if(rec)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')return note(t('micNone'));
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch{return note(t('micDenied'))}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported?.(x))||'';
  const mr=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream),chunks=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  const form=sheet.querySelector('.nc-form');if(!form){stream.getTracks().forEach(x=>x.stop());return}
  form.classList.add('recording');const bar=form.querySelector('.nc-rec');bar.hidden=false;const clock=bar.querySelector('.nc-rec-time');clock.textContent='0:00';
  const t0=Date.now();rec={mr,stream,chunks,t0,tick:setInterval(()=>{const n=Math.round((Date.now()-t0)/1000);clock.textContent=mmss(n);if(n>=60)stopRec(true)},500)};
  mr.start();
 }
 function scrollEnd(){const m=sheet.querySelector('.nc-messages');if(m)m.scrollTop=m.scrollHeight}
 const glyph={
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  filter:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="9" cy="6" r="2.5"/><circle cx="16" cy="12" r="2.5"/><circle cx="9" cy="18" r="2.5"/>',
  active:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 5a3 3 0 0 1 0 6M19 15a5 5 0 0 1 3 5"/>',
  followers:'<path d="M12 12S3 7 5 3c2-3 5-1 7 1 2-2 5-4 7-1 2 4-7 9-7 9zM3 21v-2a3 3 0 0 1 3-3h5l2 2h5l3-2M8 21h9l4-4"/>',
  bell:'<path d="M6 10a6 6 0 0 1 12 0v5l3 3H3l3-3zM10 21h4"/>'
 };
 const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+glyph[k]+'</svg>';
 function chatDate(value){
  const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return '';
  const zone={timeZone:'Asia/Yangon'},day=d=>new Intl.DateTimeFormat('en-CA',{...zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  return new Intl.DateTimeFormat('en-US',{...zone,...(day(date)===day(new Date())?{hour:'numeric',minute:'2-digit',hour12:true}:{month:'short',day:'numeric'})}).format(date);
 }
 const messageMark=id=>'<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="'+id+'" x2=".9" y2="1"><stop stop-color="#00d9f0"/><stop offset=".6" stop-color="#058bfa"/><stop offset="1" stop-color="#1256e4"/></linearGradient></defs><path d="M29 17h8a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8h-1l-6 4 1-5a9 9 0 0 1-8-8V25z" fill="#33bdff"/><path d="M12 5h18a10 10 0 0 1 10 10v10a10 10 0 0 1-10 10H17L6 42l2-10a10 10 0 0 1-5-9v-8A10 10 0 0 1 12 5z" fill="url(#'+id+')" stroke="#70d9ff" stroke-width=".7"/><g fill="#fff"><circle cx="13" cy="20" r="2.2"/><circle cx="21" cy="20" r="2.2"/><circle cx="29" cy="20" r="2.2"/></g></svg>';
 function inboxHeader(){return '<span class="nc-message-mark nc-cloud-cart" aria-hidden="true"><svg viewBox="0 0 72 56"><path d="M18 45H12a10 10 0 0 1-2-20 18 18 0 0 1 34-10 13 13 0 0 1 17 19 9 9 0 0 1-5 16H20" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M16 25h7l5 18h23l5-13H25m7 1h20m-17 6h15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="49" r="3" fill="currentColor"/><circle cx="48" cy="49" r="3" fill="currentColor"/></svg></span><span class="nc-wordmark">SkyShopMM</span>'}
 function renderInbox(){
  const query=sheet.querySelector('.nc-search input')?.value.trim().toLocaleLowerCase()||'';
  const list=sheet.querySelector('.nc-conversations');if(!list)return;
  sheet.querySelectorAll('[data-nc-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ncTab===inboxTab)));
  sheet.querySelector('.nc-search').hidden=inboxTab!=='chats';
  if(inboxTab==='active'){list.innerHTML='<p class="nc-empty">'+t('activeInfo')+'</p>';return}
  // 1.1.330 owner: the people who follow this shop (GearHub's own followers on GearHub Home).
  if(inboxTab==='followers'){list.innerHTML='<p class="nc-empty">…</p>';const own=ownerMode?'gearhub':slug;window.GearHubFollowList?.load(own,'followers').then(people=>{if(inboxTab==='followers'&&sheet.contains(list))list.innerHTML=window.GearHubFollowList.html(people,'followers')},e=>{if(inboxTab==='followers'&&sheet.contains(list))list.innerHTML='<p class="nc-empty">'+esc(e.message)+'</p>'});return}
  const rows=inbox.filter(c=>(!unreadOnly||c.unread)&&(!query||(c.name+' '+c.last).toLocaleLowerCase().includes(query)));
  list.innerHTML=rows.length?'<ul class="nc-conversation-list">'+rows.map(c=>{
   const initials=Array.from(c.name.trim().split(/\s+/).map(w=>Array.from(w)[0]).slice(0,2).join('')).join('').toLocaleUpperCase();
   const tone=Array.from(c.name).reduce((n,c)=>n+c.codePointAt(0),0)%6;
   const key=(c.slug||slug)+'/'+c.id,current=selectedConversation?key===selectedConversation:c===rows[0];
   return '<li><button type="button" class="nc-conversation'+(c.unread?' is-unread':'')+(current?' is-current':'')+'"'+(current?' aria-current="true"':'')+' data-nc="'+(c.kind==='thread'?'thread':'buyer')+'" data-id="'+c.id+'"'+(c.slug?' data-slug="'+esc(c.slug)+'"':'')+'><span class="nc-avatar nc-tone-'+tone+'" aria-hidden="true">'+(c.logo?'<img src="'+esc(c.logo)+'" alt="" loading="lazy">':esc(initials))+'</span><span class="nc-conversation-copy"><b>'+esc(c.name)+'</b><span>'+esc(c.last||t('hello'))+'</span></span><span class="nc-conversation-meta"><time datetime="'+esc(c.at||'')+'">'+esc(chatDate(c.at))+'</time>'+(c.unread?'<i class="nc-unread-dot" aria-label="'+esc(t('unread'))+'"></i>':'')+'</span></button></li>';
  }).join('')+'</ul>':'<p class="nc-empty">'+t(query||unreadOnly?'noResults':'noChats')+'</p>';
 }
 function inboxShell(content){
  open(inboxHeader(),'<label class="nc-search">'+svg('search')+'<input type="search" autocomplete="off" placeholder="'+(my()?'Message များ ရှာရန်…':'Search messages…')+'" aria-label="'+t('search')+'"><button type="button" data-nc="filter" aria-label="'+t('unread')+'" aria-pressed="'+unreadOnly+'">'+svg('filter')+'</button></label><div class="nc-conversations">'+content+'</div><nav class="nc-message-tabs" role="tablist" aria-label="'+t('message')+'">'+['chats','active','followers'].map(k=>'<button type="button" role="tab" data-nc-tab="'+k+'" aria-selected="'+(k===inboxTab)+'">'+(k==='chats'?'<span class="nc-tab-bubble" aria-hidden="true">'+messageMark('nc-message-tab')+'</span>':svg(k))+'<span>'+t(k)+'</span></button>').join('')+'</nav>','inbox');
  const alerts=document.createElement('button');alerts.type='button';alerts.className='nc-inbox-bell';alerts.dataset.nc='noti';alerts.setAttribute('aria-label',t('noti'));alerts.innerHTML=svg('bell')+'<i class="nc-unread-dot"'+((data?.items||[]).some(i=>!i.chat&&i.at>seen())?'':' hidden')+'></i>';sheet.querySelector('header').insertBefore(alerts,sheet.querySelector('#nc-close'));
 }
 // These list routes do not mark messages read. A buyer's /chat/:slug GET does, so never prefetch it.
 async function loadInbox(){
  if(!data)await refresh(false);
  if(!data?.signedIn){const e=Error(t('signIn'));e.status=401;throw e}
  const [d,all,me]=await Promise.all([ownerMode?call('/api/platform/owner/chats'):data.manager?call('/api/platform/chat/'+slug):Promise.resolve({role:'buyer'}),call('/api/platform/chat-shops'),uiIdentity||(uiIdentity=call('/api/platform/me').catch(()=>({})))]);
  const threads=(d.chats||[]).map(c=>({...c,...(ownerMode?{name:c.name+' · '+c.shop}:{}),kind:'thread'}));
  const shops=(all.shops||[]).map(x=>({id:'buyer',name:x.name,last:x.last,at:x.at,unread:x.unread,slug:x.slug,logo:x.logo,kind:'shop'}));
  uiOwnLogo=me.shop?.settings?.logoId?'/api/platform/images/'+encodeURIComponent(me.shop.settings.logoId):me.shop?.settings?.appearance?.logoUrl||'';
  return {role:d.role,ownLogo:uiOwnLogo,rows:[...threads,...shops].sort((a,b)=>(b.at||'').localeCompare(a.at||''))};
 }
 function warmInbox(force=false){
  if(document.hidden)return Promise.resolve(null);
  const saved=chatCache.peek('inbox');if(!force&&saved&&Date.now()-warmedAt<30000)return Promise.resolve(saved);
  return chatCache.load('inbox').then(d=>{warmedAt=Date.now();return d});
 }
 async function showChat(){
  const view=++viewId;openChat=null;clearInterval(timer);inboxTab='chats';
  const saved=chatCache.peek('inbox');inboxShell(saved?'':'<p class="nc-empty">'+t('loading')+'</p>');
  if(saved){role=saved.role;uiOwnLogo=saved.ownLogo||'';inbox=saved.rows;renderInbox()}
  try{
   const d=await warmInbox(true);if(!d||view!==viewId||!sheet.open||!sheet.classList.contains('nc-inbox'))return;
   role=d.role;uiOwnLogo=d.ownLogo||'';inbox=d.rows;renderInbox();
  }catch(e){
   if(view!==viewId||!sheet.open||!sheet.classList.contains('nc-inbox'))return;
   if(e.updating)setTimeout(()=>{if(view===viewId&&sheet.open&&sheet.classList.contains('nc-inbox'))showChat()},5000);
   if(saved&&e.status!==401&&e.status!==403){note(e.message);return}
   sheet.querySelector('.nc-conversations').innerHTML='<p class="nc-empty">'+esc(e.status===401?t('signIn'):e.message)+'</p>'+(e.status===401?'<button type="button" class="nc-primary" data-nc="signin">'+t('google')+'</button>':'');
  }
 }
 function updateMessages(d){
  const box=sheet.querySelector('.nc-messages');if(!box)return;
  const tmp=document.createElement('div');tmp.innerHTML=messagesHtml(d.messages);
  const html=tmp.querySelector('.nc-messages').innerHTML;
  if([...box.querySelectorAll('audio,video')].some(p=>!p.paused)){
   // Keep a playing media element mounted while still adding new incoming messages.
   const fresh=tmp.querySelector('.nc-messages'),wanted=new Set([...fresh.children].map(n=>n.dataset.ncMessage));
   for(const child of [...fresh.children]){const old=[...box.children].find(n=>n.dataset.ncMessage===child.dataset.ncMessage);if(!old)box.append(child);else if(![...old.querySelectorAll('audio,video')].some(p=>!p.paused)&&old.innerHTML!==child.innerHTML)old.replaceWith(child)}
   for(const old of [...box.children])if(!wanted.has(old.dataset.ncMessage)&&![...old.querySelectorAll('audio,video')].some(p=>!p.paused))old.remove();
   return;
  }
  if(box.innerHTML!==html){box.innerHTML=html;scrollEnd()}
 }
 async function showConversation(id){
  selectedConversation=cs+'/'+id;const view=++viewId,shop=cs,path='/api/platform/chat/'+shop+(id==='buyer'?'?as=buyer':'/'+id);
  clearInterval(timer);openChat=null;const saved=chatCache.peek(path);
  const display=d=>{role=id==='buyer'?d.role:'shop';openChat=id;open(threadHeading(id==='buyer'?d.shop:d.name),messagesHtml(d.messages),'thread');scrollEnd();live()};
  if(saved)display(saved);
  try{const d=await chatCache.load(path);if(!d||view!==viewId||!sheet.open||cs!==shop)return;if(saved)updateMessages(d);else display(d)}
  catch(e){if(view!==viewId||!sheet.open)return;if(e.status===401||e.status===403){openChat=null;clearInterval(timer);signIn()}else note(e.message)}
 }
 const showBuyer=()=>showConversation('buyer');
 const showThread=id=>showConversation(id);
 // Keep the open conversation fresh without replacing the composer or letting an old request change another chat.
 function live(){clearInterval(timer);timer=setInterval(async()=>{
  if(!sheet.open||document.hidden||!openChat)return;const view=viewId,path=readPath();
  try{const d=await chatCache.load(path);if(view===viewId&&sheet.open&&path===readPath())updateMessages(d)}catch{}
 },5000)}
 sheet.addEventListener('change',e=>{if(!e.target.matches('.nc-record-part'))return;const player=e.target.closest('.nc-callrecord').querySelector('audio,video');player.src=e.target.value;player.play().catch(()=>{})});
 sheet.addEventListener('ended',e=>{const select=e.target.closest('.nc-callrecord')?.querySelector('.nc-record-part');if(select&&select.selectedIndex<select.options.length-1){select.selectedIndex++;select.dispatchEvent(new Event('change',{bubbles:true}))}},true);
 sheet.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-nc-form="send"]');if(!f)return;e.preventDefault();
  const body=f.elements.body.value.trim();if(!body)return;const view=viewId,path=chatPath();const b=f.querySelector('button');b.disabled=true;note('');
  try{const d=await call(path,'POST',{body});if(view!==viewId||!sheet.open)return;sheet.querySelector('.nc-body').innerHTML=messagesHtml(d.messages);scrollEnd();window.GearHubCall?.sound.sent()}
  catch(err){b.disabled=false;note(err.message)}
 });
 sheet.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.matches('.nc-form textarea')&&matchMedia('(pointer:fine)').matches){e.preventDefault();e.target.form.requestSubmit()}});
 let filePending=false;
 sheet.addEventListener('change',async e=>{
  if(!e.target.matches('.nc-file-input'))return;
  const file=e.target.files[0];e.target.value='';if(!file)return;
  if(filePending)return note(t('uploading'));
  if(!file.size||file.size>5*1024*1024)return note(t('fileLimit'));
  const view=viewId,read=readPath(),path=chatPath(),url=path+(openChat==='buyer'?'/files/upload':'/files'),button=sheet.querySelector('[data-nc="attach"]');filePending=true;button.disabled=true;note(t('uploading'));
  try{
   const form=new FormData();form.append('file',file);
   const send=async()=>fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-CSRF-Token':await token()},body:form});
   let response=await send();if(response.status===403){csrf='';response=await send()}
   const d=await response.json();if(!response.ok)throw Error(d.error||t('error'));
   chatCache.put(read,d);warmedAt=0;if(view===viewId&&sheet.open&&chatPath()===path){updateMessages(d);note('');scrollEnd();window.GearHubCall?.sound.sent()}
  }catch(error){if(sheet.open&&chatPath()===path)note(error.message||t('error'))}
  finally{filePending=false;if(button.isConnected)button.disabled=false}
 });
 sheet.addEventListener('input',e=>{if(e.target.matches('.nc-search input'))renderInbox();if(e.target.matches('.nc-form textarea')){e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,118)+'px'}});
 sheet.addEventListener('click',e=>{
  const tab=e.target.closest('[data-nc-tab]');if(tab){inboxTab=tab.dataset.ncTab;renderInbox();return}
  const b=e.target.closest('[data-nc]');if(!b)return;const k=b.dataset.nc;
  if(k==='signin')return (window.GearHubAppLogin?.start('/shops/'+slug+'/')||Promise.resolve()).catch(err=>note(err.message));
  if(k==='thread'){cs=b.dataset.slug||slug;return showThread(Number(b.dataset.id))}
  if(k==='buyer'){cs=b.dataset.slug||slug;return showBuyer()}
  if(k==='stickers'){const p=sheet.querySelector('.nc-stickers');p.hidden=!p.hidden;return}
  if(k==='sticker'){const view=viewId,path=chatPath();sheet.querySelector('.nc-stickers').hidden=true;return call(path,'POST',{sticker:b.dataset.s}).then(d=>{if(view!==viewId||!sheet.open)return;sheet.querySelector('.nc-body').innerHTML=messagesHtml(d.messages);scrollEnd()},err=>note(err.message))}
  if(k==='attach')return sheet.querySelector('.nc-file-input')?.click();
  if(k==='mic')return startRec();
  if(k==='vcall'){const who=sheet.querySelector('h2 span')?.textContent||'';return window.GearHubCall?.start(cs,openChat==='buyer'?null:openChat,who,true).catch(err=>note(err.message))}
  if(k==='call'){const who=sheet.querySelector('h2 span')?.textContent||'';return window.GearHubCall?.start(cs,openChat==='buyer'?null:openChat,who).catch(err=>note(err.message))}
  if(k==='rec-cancel')return stopRec(false);
  if(k==='rec-send')return stopRec(true);
  if(k==='noti')return showNoti();
  if(k==='filter'){unreadOnly=!unreadOnly;b.setAttribute('aria-pressed',String(unreadOnly));renderInbox();return}
  if(k==='profile'){sheet.close();window.showStoreView?.('profile');return}
  if(k==='chats')return showChat();
  if(k==='item'){const i=data.items[Number(b.dataset.k)];if(i.chat){showChat();return}sheet.close();if(i.url){location.href=i.url;return}if(i.view)window.showStoreView?.(i.view)}
 });
 addEventListener('gearhub:chat-unread',()=>refresh(false).then(()=>warmInbox(true)).catch(()=>{}));
 for(const event of ['pointerenter','focusin'])chatButton.addEventListener(event,()=>warmInbox().catch(()=>{}));
 addEventListener('pagehide',()=>chatCache.clear());
 notiButton.addEventListener('click',showNoti);chatButton.addEventListener('click',showChat);
 window.GearHubNoti={open:showNoti,chat:showChat};
 // From a chat alert on the phone (?chat=1) the chat opens.
 if(new URLSearchParams(location.search).get('chat')==='1')addEventListener('gearhub:data-ready',()=>{showChat();history.replaceState(history.state,'',location.pathname)},{once:true});
 // The "seen up to" mark also lives on the server, so a new phone does not show old alerts as new.
 addEventListener('gearhub:data-ready',()=>setTimeout(async()=>{const key='noti-seen-'+(slug||'gearhub'),srv=await window.GearHubUserData?.get(key);if(typeof srv==='string'&&srv>seen()){try{localStorage.setItem(SEEN,srv)}catch{}dots()}},4000),{once:true});
 refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(document.hidden){chatCache.clear();warmedAt=0}else refresh()});
})();
