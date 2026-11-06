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
 Object.assign(T.en,{sticker:'Sticker',voice:'Voice message',record:'Record a voice message',cancel:'Cancel',micDenied:'The microphone is not allowed. Allow it in your browser settings.',micNone:'Voice messages are not supported on this phone.',recording:'Recording…',allShops:'All shops',message:'Message',search:'Search',chats:'Chats',active:'Active Now',followers:'Followers',all:'All chats',unread:'Unread',noResults:'No conversations found.',activeInfo:'Active status is not shared yet.',followerInfo:'View this shop’s followers count on its profile.',profile:'View profile',loading:'Loading conversations…'});
 Object.assign(T.my,{sticker:'Sticker',voice:'အသံ စာ',record:'အသံ ဖမ်းမယ်',cancel:'မလုပ်တော့ဘူး',micDenied:'မိုက်ခရိုဖုန် ခွင့်မပြုထားပါ။ Browser setting မှာ ခွင့်ပြုပေးပါ။',micNone:'ဒီဖုန်းမှာ အသံစာ မသုံးနိုင်ပါ။',recording:'ဖမ်းနေပါတယ်…',allShops:'ဆိုင်အားလုံး',message:'Message',search:'ရှာရန်',chats:'Chats',active:'Active Now',followers:'Followers',all:'Chat အားလုံး',unread:'မဖတ်ရသေးသောစာများ',noResults:'စကားဝိုင်း မတွေ့ပါ။',activeInfo:'Online အခြေအနေကို မဖော်ပြနိုင်သေးပါ။',followerInfo:'ဒီဆိုင်ရဲ့ Profile မှာ Follower အရေအတွက် ကြည့်နိုင်ပါတယ်။',profile:'Profile ကြည့်ရန်',loading:'စကားဝိုင်းများ ဖွင့်နေပါသည်…'});
 const t=k=>T[my()?'my':'en'][k];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bell='<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="nc-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9dcf5"/></linearGradient></defs><path d="M13 10.5a12 12 0 0 0-3 6.5M8 8a16 16 0 0 0-3.5 9M35 10.5a12 12 0 0 1 3 6.5M40 8a16 16 0 0 1 3.5 9" stroke="#e6f0ff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M24 8c-7 0-11 5.4-11 12v7.5L9.5 33h29L35 27.5V20c0-6.6-4-12-11-12z" fill="url(#nc-b)"/><rect x="22" y="5" width="4" height="4.5" rx="2" fill="#fff"/><ellipse cx="24" cy="34" rx="15" ry="2.6" fill="#1d58b8" opacity=".6"/><circle cx="24" cy="37.5" r="4" fill="#f5a623"/></svg>';
 const bubble='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 18h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-1l1.5 6-8-6h-3a6 6 0 0 1-6-6" fill="#2f7cf0"/><path d="M9 7h20a7 7 0 0 1 7 7v9a7 7 0 0 1-7 7H17l-8 6 1.5-6H9a7 7 0 0 1-7-7v-9a7 7 0 0 1 7-7z" fill="#fff"/><circle cx="12" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="19" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="26" cy="18.5" r="2.4" fill="#1d58b8"/></svg>';
 const box=document.createElement('div');box.className='nc-buttons';
 // The owner's own icon pictures (the bell's red dot is drawn in the picture, so it shows only when something is new).
 box.innerHTML='<button type="button" class="nc-button" data-nc="noti"><img src="/images/noti-bell-quiet.png?v=1" alt="" class="nc-bell"></button><button type="button" class="nc-button" data-nc="chat"><img src="/images/noti-chat.png?v=1" alt=""><i class="nc-dot" hidden></i></button>';
 banner.append(box);
 if(ownerMode)box.hidden=true;
 const [notiButton,chatButton]=box.querySelectorAll('button');
 const SEEN='gh-noti-seen:'+(slug||'gearhub');
 let cs=slug,csrf='',data=null,role='',openChat=null,timer=0,inbox=[],inboxTab='chats',unreadOnly=false;
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function call(url,method='GET',body){
  const send=async()=>fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:body?JSON.stringify(body):undefined});
  let r=await send();if(r.status===403&&method!=='GET'){csrf='';r=await send()}
  const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.error||t('error'));e.status=r.status;throw e}return d;
 }
 const seen=()=>{try{return localStorage.getItem(SEEN)||''}catch{return ''}};
 function dots(){
  const fresh=(data?.items||[]).filter(i=>i.at>seen()&&!i.chat).length;
  notiButton.querySelector('.nc-bell').src=fresh?'/images/noti-bell.png?v=1':'/images/noti-bell-quiet.png?v=1';chatButton.querySelector('.nc-dot').hidden=!data?.unreadChats;
  notiButton.setAttribute('aria-label',t('noti')+(fresh?' · '+fresh:''));chatButton.setAttribute('aria-label',t('chat')+(data?.unreadChats?' · '+data.unreadChats:''));
 }
 async function refresh(){if(document.hidden)return;try{data=await call(ownerMode?'/api/platform/owner/notifications':'/api/platform/notifications/'+slug)}catch{data=null}if(ownerMode)box.hidden=!data?.signedIn;dots()}
 // One sheet for both.
 const sheet=document.createElement('dialog');sheet.className='nc-sheet';sheet.id='nc-sheet';document.body.append(sheet);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close()});
 sheet.addEventListener('close',()=>{if(rec)stopRec(false);sheet.classList.remove('open');openChat=null;clearInterval(timer);window.GearHubBackNav?.record();refresh()});
 function open(title,html,mode=''){
  sheet.classList.toggle('nc-chat-view',Boolean(mode));sheet.classList.toggle('nc-inbox',mode==='inbox');
  sheet.setAttribute('aria-label',mode?t('message'):t('noti'));
  sheet.innerHTML='<div class="nc-grip" aria-hidden="true"></div><header><h2>'+title+'</h2><button type="button" id="nc-close" aria-label="'+t('close')+'">✕</button></header><div class="nc-body">'+html+'</div><p class="nc-note" role="status"></p>';
  sheet.querySelector('#nc-close').onclick=()=>sheet.close();
  if(!sheet.open){sheet.classList.add('open');sheet.showModal();document.activeElement?.blur?.();window.GearHubBackNav?.record()}
 }
 const note=x=>{const n=sheet.querySelector('.nc-note');if(n)n.textContent=x||''};
 const signIn=()=>open(t('noti'),'<p class="nc-empty">'+t('signIn')+'</p><button type="button" class="nc-primary" data-nc="signin">'+t('google')+'</button>');
 const ago=iso=>{const s=(Date.parse(iso)-Date.now())/1000,f=new Intl.RelativeTimeFormat(my()?'my':'en',{numeric:'auto'});for(const [u,n] of [['year',31536e3],['month',2592e3],['day',86400],['hour',3600],['minute',60]])if(Math.abs(s)>=n)return f.format(Math.round(s/n),u);return my()?'ခုနကပဲ':'Just now'};
 async function showNoti(){
  await refresh();if(!data||!data.signedIn)return signIn();
  const before=seen();
  open(bell+'<span>'+t('noti')+'</span>',data.items.length?'<ul class="nc-list">'+data.items.map((i,k)=>'<li><button type="button" class="nc-item'+(i.at>before?' is-new':'')+'" data-nc="item" data-k="'+k+'"><span>'+esc(i.text)+'</span><small>'+esc(ago(i.at))+'</small></button></li>').join('')+'</ul>':'<p class="nc-empty">'+t('none')+'</p>');
  {const v=data.items[0]?.at||new Date().toISOString();try{localStorage.setItem(SEEN,v)}catch{}window.GearHubUserData?.put('noti-seen-'+(slug||'gearhub'),v)}dots();
 }
 const callBtn='<button type="button" class="nc-call" data-nc="call" aria-label="'+(my()?'အသံ ခေါ်မယ်':'Voice call')+'">📞</button>';
 const STICKERS=['👍','❤️','😂','😮','😢','🙏','👏','🔥','🎉','😍','😎','🤝','✅','🛒','📦','🚚'];
 const mmss=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
 const oneMessage=m=>{
  const mine=(role==='shop')===m.fromShop?' mine':'';
  if(m.kind==='call')return '<p class="nc-msg nc-callmsg"><span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>';
  if(m.kind==='sticker')return '<p class="nc-msg nc-sticker'+mine+'"><span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>';
  if(m.kind==='voice')return '<p class="nc-msg nc-voice'+mine+'"><audio controls preload="none" src="/api/platform/chat/'+encodeURIComponent(cs)+'/voice/'+m.voice+'"></audio><small>🎤 '+mmss(m.secs||0)+' · '+esc(ago(m.at))+'</small></p>';
  return '<p class="nc-msg'+mine+'"><span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>';
 };
 const messagesHtml=list=>'<div class="nc-messages">'+(list.length?list.map(oneMessage).join(''):'<p class="nc-empty">'+t('hello')+'</p>')+'</div><div class="nc-stickers" hidden>'+STICKERS.map(x=>'<button type="button" data-nc="sticker" data-s="'+x+'" aria-label="'+t('sticker')+' '+x+'">'+x+'</button>').join('')+'</div><form class="nc-form" data-nc-form="send"><button type="button" class="nc-tool" data-nc="stickers" aria-label="'+esc(t('sticker'))+'">😊</button><button type="button" class="nc-tool" data-nc="mic" aria-label="'+esc(t('record'))+'">🎤</button><textarea name="body" rows="1" maxlength="2000" placeholder="'+esc(t('write'))+'" aria-label="'+esc(t('write'))+'"></textarea><button type="submit" class="nc-primary">'+t('send')+'</button><div class="nc-rec" hidden><button type="button" data-nc="rec-cancel" aria-label="'+esc(t('cancel'))+'">✕</button><i class="nc-rec-dot"></i><b class="nc-rec-time">0:00</b><span>'+t('recording')+'</span><button type="button" class="nc-primary" data-nc="rec-send">'+t('send')+'</button></div></form>';
 // Voice message: tap 🎤 to record (up to 60 s), then ➤ to send or ✕ to throw away.
 let rec=null;
 const chatPath=()=>'/api/platform/chat/'+cs+(openChat==='buyer'?'':'/'+openChat);
 function stopRec(send){
  const r=rec;if(!r)return;rec=null;clearInterval(r.tick);
  r.mr.onstop=async()=>{
   r.stream.getTracks().forEach(x=>x.stop());
   const form=sheet.querySelector('.nc-form');form?.classList.remove('recording');form?.querySelector('.nc-rec')&&(form.querySelector('.nc-rec').hidden=true);
   const secs=Math.max(1,Math.round((Date.now()-r.t0)/1000)),blob=new Blob(r.chunks,{type:r.mr.mimeType||'audio/mp4'});
   if(!send||blob.size<200)return;
   try{
    const go=async()=>fetch(chatPath()+'/voice?secs='+secs,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':blob.type||'audio/mp4','X-CSRF-Token':await token()},body:blob});
    let res=await go();if(res.status===403){csrf='';res=await go()}
    const d=await res.json().catch(()=>({}));if(!res.ok)throw Error(d.error||t('error'));
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
 function inboxHeader(){return '<span class="nc-message-mark" aria-hidden="true">'+messageMark('nc-message-title')+'</span><span>'+t('message')+'</span>'}
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
   const tone=Array.from(c.name).reduce((n,c)=>n+c.codePointAt(0),0)%4;
   return '<li><button type="button" class="nc-conversation'+(c.unread?' is-unread':'')+'" data-nc="'+(c.kind==='thread'?'thread':'buyer')+'" data-id="'+c.id+'"'+(c.slug?' data-slug="'+esc(c.slug)+'"':'')+'><span class="nc-avatar nc-tone-'+tone+'" aria-hidden="true">'+(c.logo?'<img src="'+esc(c.logo)+'" alt="" loading="lazy">':esc(initials))+'</span><span class="nc-conversation-copy"><b>'+esc(c.name)+'</b><span>'+esc(c.last||t('hello'))+'</span></span><span class="nc-conversation-meta"><time datetime="'+esc(c.at||'')+'">'+esc(chatDate(c.at))+'</time>'+(c.unread?'<i class="nc-unread-dot" aria-label="'+esc(t('unread'))+'"></i>':'')+'</span></button></li>';
  }).join('')+'</ul>':'<p class="nc-empty">'+t(query||unreadOnly?'noResults':'noChats')+'</p>';
 }
 function inboxShell(content){
  open(inboxHeader(),'<label class="nc-search">'+svg('search')+'<input type="search" autocomplete="off" placeholder="'+t('search')+'" aria-label="'+t('search')+'"><button type="button" data-nc="filter" aria-label="'+t('unread')+'" aria-pressed="'+unreadOnly+'">'+svg('filter')+'</button></label><div class="nc-conversations">'+content+'</div><nav class="nc-message-tabs" role="tablist" aria-label="'+t('message')+'">'+['chats','active','followers'].map(k=>'<button type="button" role="tab" data-nc-tab="'+k+'" aria-selected="'+(k===inboxTab)+'">'+(k==='chats'?'<span class="nc-tab-bubble" aria-hidden="true">'+messageMark('nc-message-tab')+'</span>':svg(k))+'<span>'+t(k)+'</span></button>').join('')+'</nav>','inbox');
  const alerts=document.createElement('button');alerts.type='button';alerts.className='nc-inbox-bell';alerts.dataset.nc='noti';alerts.setAttribute('aria-label',t('noti'));alerts.innerHTML=svg('bell')+'<i class="nc-unread-dot"'+((data?.items||[]).some(i=>!i.chat&&i.at>seen())?'':' hidden')+'></i>';sheet.querySelector('header').insertBefore(alerts,sheet.querySelector('#nc-close'));
 }
 async function showChat(){
  openChat=null;clearInterval(timer);inboxTab='chats';inboxShell('<p class="nc-empty">'+t('loading')+'</p>');
  try{
   const [d,all]=await Promise.all([call(ownerMode?'/api/platform/owner/chats':'/api/platform/chat/'+slug),call('/api/platform/chat-shops').catch(()=>({shops:[]}))]);if(!sheet.open||!sheet.classList.contains('nc-inbox'))return;
   if(ownerMode)d.chats=d.chats.map(c=>({...c,name:c.name+' · '+c.shop}));
   role=d.role;
   // 1.1.341 owner: every shop is in the list (talk to any of them), plus this shop's own buyer chats.
   inbox=[...(role==='shop'?d.chats.map(c=>({...c,kind:'thread'})):[]),...(all.shops||[]).map(x=>({id:'buyer',name:x.name,last:x.last,at:x.at,unread:x.unread,slug:x.slug,logo:x.logo,kind:'shop'}))].sort((a,b)=>(b.at||'').localeCompare(a.at||''));
   renderInbox();
  }catch(e){
   if(!sheet.open||!sheet.classList.contains('nc-inbox'))return;
   sheet.querySelector('.nc-conversations').innerHTML='<p class="nc-empty">'+esc(e.status===401?t('signIn'):e.message)+'</p>'+(e.status===401?'<button type="button" class="nc-primary" data-nc="signin">'+t('google')+'</button>':'');
  }
 }
 async function showBuyer(){
  try{const d=await call('/api/platform/chat/'+cs);if(!sheet.open)return;role=d.role;openChat='buyer';open('<button type="button" class="nc-back" data-nc="chats">‹ '+t('back')+'</button><span>'+esc(d.shop)+'</span>'+callBtn,messagesHtml(d.messages),'thread');scrollEnd();live()}catch(e){note(e.message)}
 }
 async function showThread(id){
  try{const d=await call('/api/platform/chat/'+cs+'/'+id);role='shop';openChat=id;open('<button type="button" class="nc-back" data-nc="chats">‹ '+t('back')+'</button><span>'+esc(d.name)+'</span>'+callBtn,messagesHtml(d.messages),'thread');scrollEnd();live()}catch(e){note(e.message)}
 }
 // While a chat is open, new messages come in every few seconds.
 function live(){clearInterval(timer);timer=setInterval(async()=>{if(!sheet.open||document.hidden||!openChat)return;try{const d=await call('/api/platform/chat/'+cs+(openChat==='buyer'?'':'/'+openChat));const box=sheet.querySelector('.nc-messages'),typing=sheet.querySelector('.nc-form textarea')?.value;if(!box)return;const html=messagesHtml(d.messages);const tmp=document.createElement('div');tmp.innerHTML=html;if(tmp.querySelector('.nc-messages').innerHTML!==box.innerHTML){box.innerHTML=tmp.querySelector('.nc-messages').innerHTML;scrollEnd()}if(typing)sheet.querySelector('.nc-form textarea').value=typing}catch{}},5000)}
 sheet.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-nc-form="send"]');if(!f)return;e.preventDefault();
  const body=f.elements.body.value.trim();if(!body)return;const b=f.querySelector('button');b.disabled=true;note('');
  try{const d=await call(chatPath(),'POST',{body});sheet.querySelector('.nc-body').innerHTML=messagesHtml(d.messages);scrollEnd();window.GearHubCall?.sound.sent()}
  catch(err){b.disabled=false;note(err.message)}
 });
 sheet.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.matches('.nc-form textarea')&&matchMedia('(pointer:fine)').matches){e.preventDefault();e.target.form.requestSubmit()}});
 sheet.addEventListener('input',e=>{if(e.target.matches('.nc-search input'))renderInbox()});
 sheet.addEventListener('click',e=>{
  const tab=e.target.closest('[data-nc-tab]');if(tab){inboxTab=tab.dataset.ncTab;renderInbox();return}
  const b=e.target.closest('[data-nc]');if(!b)return;const k=b.dataset.nc;
  if(k==='signin')return (window.GearHubAppLogin?.start('/shops/'+slug+'/')||Promise.resolve()).catch(err=>note(err.message));
  if(k==='thread'){cs=b.dataset.slug||slug;return showThread(Number(b.dataset.id))}
  if(k==='buyer'){cs=b.dataset.slug||slug;return showBuyer()}
  if(k==='stickers'){const p=sheet.querySelector('.nc-stickers');p.hidden=!p.hidden;return}
  if(k==='sticker'){sheet.querySelector('.nc-stickers').hidden=true;return call(chatPath(),'POST',{sticker:b.dataset.s}).then(d=>{sheet.querySelector('.nc-body').innerHTML=messagesHtml(d.messages);scrollEnd()},err=>note(err.message))}
  if(k==='mic')return startRec();
  if(k==='call'){const who=sheet.querySelector('h2 span')?.textContent||'';return window.GearHubCall?.start(cs,openChat==='buyer'?null:openChat,who).catch(err=>note(err.message))}
  if(k==='rec-cancel')return stopRec(false);
  if(k==='rec-send')return stopRec(true);
  if(k==='noti')return showNoti();
  if(k==='filter'){unreadOnly=!unreadOnly;b.setAttribute('aria-pressed',String(unreadOnly));renderInbox();return}
  if(k==='profile'){sheet.close();window.showStoreView?.('profile');return}
  if(k==='chats')return showChat();
  if(k==='item'){const i=data.items[Number(b.dataset.k)];if(i.chat){showChat();return}sheet.close();if(i.url){location.href=i.url;return}if(i.view)window.showStoreView?.(i.view)}
 });
 addEventListener('gearhub:chat-unread',()=>refresh());
 notiButton.addEventListener('click',showNoti);chatButton.addEventListener('click',showChat);
 window.GearHubNoti={open:showNoti,chat:showChat};
 // From a chat alert on the phone (?chat=1) the chat opens.
 if(new URLSearchParams(location.search).get('chat')==='1')addEventListener('gearhub:data-ready',()=>{showChat();history.replaceState(history.state,'',location.pathname)},{once:true});
 // The "seen up to" mark also lives on the server, so a new phone does not show old alerts as new.
 addEventListener('gearhub:data-ready',()=>setTimeout(async()=>{const key='noti-seen-'+(slug||'gearhub'),srv=await window.GearHubUserData?.get(key);if(typeof srv==='string'&&srv>seen()){try{localStorage.setItem(SEEN,srv)}catch{}dots()}},4000),{once:true});
 refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
})();
