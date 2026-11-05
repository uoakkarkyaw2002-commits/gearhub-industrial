/* 1.1.314 owner's picture: two glass buttons at the top right of the shop banner — 🔔 notifications (everything
   that happened: orders, likes, comments, follows, chats; answers for buyers) and 💬 chat between a buyer and the
   shop (the shop sees the list of chats and answers). Google sign-in is needed for both. */
(()=>{
 const slug=(location.pathname.match(/^\/shops\/([a-z0-9-]{1,80})\//)||[])[1];
 const banner=document.querySelector('.home-profile-banner');
 if(!slug||!banner)return;
 const my=()=>document.documentElement.lang==='my';
 const T={en:{noti:'Notifications',chat:'Chat',none:'Nothing new yet.',signIn:'Sign in with Google to see notifications and chat with the shop.',google:'Continue with Google',write:'Write a message…',send:'Send',noChats:'No chats yet.',back:'Chats',error:'Something went wrong. Please try again.',close:'Close',hello:'Ask the shop anything — price, stock, delivery.'},
  my:{noti:'အသိပေးချက်များ',chat:'Chat',none:'အသစ် မရှိသေးပါ။',signIn:'အသိပေးချက်ကြည့်ဖို့နဲ့ ဆိုင်ကို စာပို့ဖို့ Google နဲ့ ဝင်ပါ။',google:'Google နဲ့ ဝင်မယ်',write:'စာရေးပါ…',send:'ပို့မယ်',noChats:'Chat မရှိသေးပါ။',back:'Chats',error:'မအောင်မြင်ပါ။ ပြန်စမ်းကြည့်ပါ။',close:'ပိတ်ရန်',hello:'ဈေးနှုန်း၊ လက်ကျန်၊ ပို့ဆောင်ရေး — ဆိုင်ကို မေးလို့ရပါတယ်။'}};
 const t=k=>T[my()?'my':'en'][k];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bell='<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="nc-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9dcf5"/></linearGradient></defs><path d="M13 10.5a12 12 0 0 0-3 6.5M8 8a16 16 0 0 0-3.5 9M35 10.5a12 12 0 0 1 3 6.5M40 8a16 16 0 0 1 3.5 9" stroke="#e6f0ff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M24 8c-7 0-11 5.4-11 12v7.5L9.5 33h29L35 27.5V20c0-6.6-4-12-11-12z" fill="url(#nc-b)"/><rect x="22" y="5" width="4" height="4.5" rx="2" fill="#fff"/><ellipse cx="24" cy="34" rx="15" ry="2.6" fill="#1d58b8" opacity=".6"/><circle cx="24" cy="37.5" r="4" fill="#f5a623"/></svg>';
 const bubble='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 18h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-1l1.5 6-8-6h-3a6 6 0 0 1-6-6" fill="#2f7cf0"/><path d="M9 7h20a7 7 0 0 1 7 7v9a7 7 0 0 1-7 7H17l-8 6 1.5-6H9a7 7 0 0 1-7-7v-9a7 7 0 0 1 7-7z" fill="#fff"/><circle cx="12" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="19" cy="18.5" r="2.4" fill="#1d58b8"/><circle cx="26" cy="18.5" r="2.4" fill="#1d58b8"/></svg>';
 const box=document.createElement('div');box.className='nc-buttons';
 // The owner's own icon pictures (the bell's red dot is drawn in the picture, so it shows only when something is new).
 box.innerHTML='<button type="button" class="nc-button" data-nc="noti"><img src="/images/noti-bell-quiet.png?v=1" alt="" class="nc-bell"></button><button type="button" class="nc-button" data-nc="chat"><img src="/images/noti-chat.png?v=1" alt=""><i class="nc-dot" hidden></i></button>';
 banner.append(box);
 const [notiButton,chatButton]=box.querySelectorAll('button');
 const SEEN='gh-noti-seen:'+slug;
 let csrf='',data=null,role='',openChat=null,timer=0;
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
 async function refresh(){if(document.hidden)return;try{data=await call('/api/platform/notifications/'+slug)}catch{data=null}dots()}
 // One sheet for both.
 const sheet=document.createElement('dialog');sheet.className='nc-sheet';sheet.id='nc-sheet';document.body.append(sheet);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close()});
 sheet.addEventListener('close',()=>{sheet.classList.remove('open');openChat=null;clearInterval(timer);window.GearHubBackNav?.record();refresh()});
 function open(title,html){
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
  try{localStorage.setItem(SEEN,data.items[0]?.at||new Date().toISOString())}catch{}dots();
 }
 const messagesHtml=list=>'<div class="nc-messages">'+(list.length?list.map(m=>'<p class="nc-msg'+((role==='shop')===m.fromShop?' mine':'')+'"><span>'+esc(m.body)+'</span><small>'+esc(ago(m.at))+'</small></p>').join(''):'<p class="nc-empty">'+t('hello')+'</p>')+'</div><form class="nc-form" data-nc-form="send"><textarea name="body" rows="1" maxlength="2000" placeholder="'+esc(t('write'))+'" aria-label="'+esc(t('write'))+'"></textarea><button type="submit" class="nc-primary">'+t('send')+'</button></form>';
 function scrollEnd(){const m=sheet.querySelector('.nc-messages');if(m)m.scrollTop=m.scrollHeight}
 async function showChat(){
  let d;try{d=await call('/api/platform/chat/'+slug)}catch(e){if(e.status===401)return signIn();return open(bubble+'<span>'+t('chat')+'</span>','<p class="nc-empty">'+esc(e.message)+'</p>')}
  role=d.role;
  if(role==='shop')return open(bubble+'<span>'+t('chat')+'</span>',d.chats.length?'<ul class="nc-list">'+d.chats.map(c=>'<li><button type="button" class="nc-item'+(c.unread?' is-new':'')+'" data-nc="thread" data-id="'+c.id+'"><b>'+esc(c.name)+(c.unread?' <i>'+c.unread+'</i>':'')+'</b><span>'+esc(c.last)+'</span><small>'+esc(ago(c.at))+'</small></button></li>').join('')+'</ul>':'<p class="nc-empty">'+t('noChats')+'</p>');
  openChat='buyer';open(bubble+'<span>'+esc(d.shop)+'</span>',messagesHtml(d.messages));scrollEnd();live();
 }
 async function showThread(id){
  try{const d=await call('/api/platform/chat/'+slug+'/'+id);openChat=id;open('<button type="button" class="nc-back" data-nc="chats">‹ '+t('back')+'</button><span>'+esc(d.name)+'</span>',messagesHtml(d.messages));scrollEnd();live()}catch(e){note(e.message)}
 }
 // While a chat is open, new messages come in every few seconds.
 function live(){clearInterval(timer);timer=setInterval(async()=>{if(!sheet.open||document.hidden||!openChat)return;try{const d=await call('/api/platform/chat/'+slug+(openChat==='buyer'?'':'/'+openChat));const box=sheet.querySelector('.nc-messages'),typing=sheet.querySelector('.nc-form textarea')?.value;if(!box)return;const html=messagesHtml(d.messages);const tmp=document.createElement('div');tmp.innerHTML=html;if(tmp.querySelector('.nc-messages').innerHTML!==box.innerHTML){box.innerHTML=tmp.querySelector('.nc-messages').innerHTML;scrollEnd()}if(typing)sheet.querySelector('.nc-form textarea').value=typing}catch{}},5000)}
 sheet.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-nc-form="send"]');if(!f)return;e.preventDefault();
  const body=f.elements.body.value.trim();if(!body)return;const b=f.querySelector('button');b.disabled=true;note('');
  try{const d=await call('/api/platform/chat/'+slug+(openChat==='buyer'?'':'/'+openChat),'POST',{body});sheet.querySelector('.nc-body').innerHTML=messagesHtml(d.messages);scrollEnd()}
  catch(err){b.disabled=false;note(err.message)}
 });
 sheet.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.matches('.nc-form textarea')&&matchMedia('(pointer:fine)').matches){e.preventDefault();e.target.form.requestSubmit()}});
 sheet.addEventListener('click',e=>{
  const b=e.target.closest('[data-nc]');if(!b)return;const k=b.dataset.nc;
  if(k==='signin')return (window.GearHubAppLogin?.start('/shops/'+slug+'/')||Promise.resolve()).catch(err=>note(err.message));
  if(k==='thread')return showThread(Number(b.dataset.id));
  if(k==='chats')return showChat();
  if(k==='item'){const i=data.items[Number(b.dataset.k)];if(i.chat){showChat();return}sheet.close();if(i.url){location.href=i.url;return}if(i.view)window.showStoreView?.(i.view)}
 });
 notiButton.addEventListener('click',showNoti);chatButton.addEventListener('click',showChat);
 window.GearHubNoti={open:showNoti,chat:showChat};
 // From a chat alert on the phone (?chat=1) the chat opens.
 if(new URLSearchParams(location.search).get('chat')==='1')addEventListener('gearhub:data-ready',()=>{showChat();history.replaceState(history.state,'',location.pathname)},{once:true});
 refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
})();
