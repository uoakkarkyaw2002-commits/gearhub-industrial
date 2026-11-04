/* 1.1.302 owner (Facebook picture): the bottom bar's Settings place is a person (Profile). Profile shows only the
   shop's profile photo and name for now; the ☰ Menu at the top opens the old Settings page. */
(()=>{
 const view=document.getElementById('profile-view');if(!view)return;
 const my=()=>document.documentElement.lang==='my';
 const home=document.createElement('div');home.className='profile-home';home.id='profile-home';
 home.innerHTML='<button type="button" class="profile-menu-open" id="profile-menu-open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="profile-edit" hidden aria-label="Edit profile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></a><div class="profile-cover" aria-hidden="true"></div><div class="profile-home-photo"><img alt="" hidden><span aria-hidden="true">⚙</span></div><div class="profile-home-title"><h2 class="profile-home-name"></h2><svg class="profile-verified" viewBox="0 0 24 24" aria-label="Verified"><path d="m12 1.8 2.5 1.9 3.1-.2.9 3 2.6 1.8-1 2.9 1 2.9-2.6 1.8-.9 3-3.1-.2L12 22.2l-2.5-1.9-3.1.2-.9-3-2.6-1.8 1-2.9-1-2.9 2.6-1.8.9-3 3.1.2z"/><path d="m7.8 12.2 2.8 2.8 5.6-5.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p class="profile-home-counts" hidden></p><div class="profile-caption" hidden></div><div class="profile-home-actions" hidden></div><div class="profile-details" hidden></div><div class="profile-home-posts"></div>';
 const bar=document.createElement('div');bar.className='profile-menu-bar';bar.id='profile-menu';
 bar.innerHTML='<button type="button" id="profile-menu-close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><b></b>';
 view.prepend(home,bar);
 const img=home.querySelector('img'),fallback=home.querySelector('span'),name=home.querySelector('h2');
 // The same photo and name as the Settings profile card (the shop's own logo and name).
 function paint(){
  const src=document.getElementById('settings-profile-avatar'),shown=src&&!src.hidden&&src.getAttribute('src');
  if(shown&&img.getAttribute('src')!==shown)img.src=shown;img.hidden=!shown;fallback.hidden=Boolean(shown);
  fallback.textContent=document.getElementById('settings-profile-fallback')?.textContent||'⚙';
  name.textContent=document.querySelector('#settings-profile-hero [data-site-brand-name]')?.textContent?.trim()||'';
  home.querySelector('#profile-menu-open').setAttribute('aria-label',my()?'မီနူး':'Menu');
  bar.querySelector('b').textContent=my()?'မီနူး':'Menu';
  bar.querySelector('button').setAttribute('aria-label',my()?'ပရိုဖိုင်သို့ ပြန်ရန်':'Back to profile');
 }
 function show(menu){
  view.classList.toggle('pm-menu',menu);view.classList.toggle('pm-home',!menu);bar.classList.toggle('open',menu);
  if(!menu)paint();scrollTo(0,0);window.GearHubBackNav?.record();
 }
 view.classList.add('pm-home');paint();
 home.querySelector('#profile-menu-open').addEventListener('click',()=>show(true));
 bar.querySelector('button').addEventListener('click',()=>show(false));
 // The Profile button always opens the profile itself.
 document.addEventListener('click',e=>{if(e.target.closest('[data-store-view="profile"]')&&!view.classList.contains('pm-home')){view.classList.add('pm-home');view.classList.remove('pm-menu');bar.classList.remove('open');paint()}},true);
 addEventListener('gearhub:data-ready',paint);
 const avatar=document.getElementById('settings-profile-avatar');if(avatar)new MutationObserver(paint).observe(avatar,{attributes:true,attributeFilter:['src','hidden']});
 new MutationObserver(()=>{paint();drawInfo();drawPosts()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

 // 1.1.303 owner: real followers / following / posts, Follow for visitors, + Add (Personal / Work) for the shop.
 const slug=(location.pathname.match(/^\/shops\/([a-z0-9-]{1,80})\//)||[])[1]||'';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const count=n=>n>=1e6?(Math.round(n/1e5)/10)+'M':n>=1e3?(Math.round(n/100)/10)+'K':String(n||0);
 const T={en:{followers:'followers',following:'following',posts:'posts',follow:'Follow',followed:'Following ✓',add:'Add',personal:'Personal',personalHelp:'Photos and text — only on your profile and Discover',work:'Work',workHelp:'A product with SKU, Part No and price',write:'What\'s on your mind?',photos:'Photos',post:'Post',posting:'Posting…',remove:'Delete',removeAsk:'Delete this post?',signIn:'Sign in with Google to follow',signInButton:'Continue with Google',none:'No posts yet.',caption:'Write a caption about your store…',editCaption:'Edit caption',details:'Personal details',editDetails:'Edit details',noDetails:'Add your address, phone, email, birthday and work.',error:'Something went wrong. Please try again.',tooBig:'Choose up to 10 photos.',close:'Close'},
  my:{followers:'followers',following:'following',posts:'posts',follow:'Follow',followed:'Following ✓',add:'Add',personal:'Personal',personalHelp:'ပုံနဲ့ စာ — ကိုယ့် Profile နဲ့ Discover မှာပဲ ပေါ်မယ်',work:'Work',workHelp:'SKU၊ Part No၊ ဈေးနှုန်းပါတဲ့ ပစ္စည်း',write:'ဘာတွေ ပြောချင်လဲ?',photos:'ဓာတ်ပုံ',post:'တင်မယ်',posting:'တင်နေပါတယ်…',remove:'ဖျက်မယ်',removeAsk:'ဒီ post ကို ဖျက်မလား?',signIn:'Follow လုပ်ဖို့ Google နဲ့ ဝင်ပါ',signInButton:'Google နဲ့ ဝင်မယ်',none:'Post မရှိသေးပါ။',caption:'ဆိုင်အကြောင်း စာတစ်ကြောင်း ရေးပါ…',editCaption:'ပြင်မယ်',details:'Personal details',editDetails:'ပြင်မယ်',noDetails:'လိပ်စာ၊ ဖုန်း၊ email ထည့်ပါ။',error:'မအောင်မြင်ပါ။ ပြန်စမ်းကြည့်ပါ။',tooBig:'ဓာတ်ပုံ ၁၀ ပုံအထိပဲ ရွေးပါ။',close:'ပိတ်ရန်'}};
 const t=k=>T[my()?'my':'en'][k];
 const icon={add:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',work:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',photo:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18"/></svg>',close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'};
 let info=null,csrf='',posts=[],postsNext=null;
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function call(url,method='GET',body,raw){
  const send=async()=>fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{...(raw?{}:{'Content-Type':'application/json'}),'X-CSRF-Token':await token()},body:raw||(body?JSON.stringify(body):undefined)});
  let r=await send();if(r.status===403&&method!=='GET'){csrf='';r=await send()}
  const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.error||t('error'));e.status=r.status;throw e}return d;
 }
 const counts=home.querySelector('.profile-home-counts'),actions=home.querySelector('.profile-home-actions'),list=home.querySelector('.profile-home-posts'),caption=home.querySelector('.profile-caption'),details=home.querySelector('.profile-details'),edit=home.querySelector('.profile-edit');
 const svg=(d,extra='')=>'<svg viewBox="0 0 24 24" aria-hidden="true"'+extra+'>'+d+'</svg>';
 const ic={people:svg('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.8-3.4 3.2-5.2 6.2-5.2s5.4 1.8 6.2 5.2"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.4c2.4.2 4 1.8 4.7 4.6"/>'),photos:svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18"/>'),
  quote:svg('<path d="M4 17V12c0-3.5 1.6-5.6 4.8-6.4l.7 1.6C7.7 8 7 9.3 7 11h3v6zM14 17V12c0-3.5 1.6-5.6 4.8-6.4l.7 1.6C17.7 8 17 9.3 17 11h3v6z" fill="currentColor" stroke="none"/>'),pen:svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  user:svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6z"/>',' class="profile-details-user"'),pin:svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  phone:svg('<path d="M5 3.5h3.5l1.6 4.4-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.4 1.6V19a2 2 0 0 1-2.2 2C10.4 20.4 3.6 13.6 3 5.7A2 2 0 0 1 5 3.5z"/>'),mail:svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>'),
  cal:svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>'),work:svg('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'),crown:svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#f5b913" stroke="#d99a06"/>'),globe:svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>'),dots:svg('<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',' class="profile-dots"')};
 const admin=hash=>'/shops/'+encodeURIComponent(slug)+'/admin'+(hash||'');
 function drawInfo(){
  if(!info){counts.hidden=actions.hidden=true;return}
  // 1.1.311 owner's profile design: icons + numbers, a caption, Add + Dashboard (or Follow), a details card.
  counts.hidden=false;counts.innerHTML='<span>'+ic.people+'<b>'+count(info.followers)+'</b> Followers</span><i></i><span>'+ic.people+'<b>'+count(info.following)+'</b> Following</span><i></i><span>'+ic.photos+'<b>'+count(info.posts)+'</b> Posts</span>';
  const about=info.about||{},can=info.canPost;
  caption.hidden=!about.caption&&!can;
  caption.innerHTML=ic.quote+'<span'+(about.caption?'':' class="is-empty"')+'>'+esc(about.caption||t('caption'))+'</span>'+(can?'<a href="'+admin('#site-settings-content')+'" aria-label="'+t('editCaption')+'">'+ic.pen+'</a>':'');
  edit.hidden=!can;if(can)edit.href=admin('#site-settings-content');
  actions.hidden=false;
  actions.innerHTML=can?'<button type="button" class="profile-add" data-pm="add">'+icon.add+'<span>'+t('add')+'</span></button><a class="profile-dashboard" href="'+admin()+'">'+ic.crown+'<span>Dashboard</span></a>':'<button type="button" class="profile-follow'+(info.followed?' is-on':'')+'" data-pm="follow">'+t(info.followed?'followed':'follow')+'</button>';
  // 1.1.312: birthday (with age) and work rows.
  const born=about.birthday?(()=>{const d=new Date(about.birthday+'T00:00:00Z'),n=new Date();let age=n.getUTCFullYear()-d.getUTCFullYear();if(n.getUTCMonth()<d.getUTCMonth()||(n.getUTCMonth()===d.getUTCMonth()&&n.getUTCDate()<d.getUTCDate()))age--;return d.toLocaleDateString(my()?'my-MM':'en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})+' ('+age+(my()?' နှစ်':' years old')+')'})():'';
  const rows=[[ic.pin,about.address],[ic.phone,about.phone,'tel:'],[ic.mail,about.email,'mailto:'],[ic.cal,born],[ic.work,about.work]].filter(r=>r[1]);
  details.hidden=!rows.length&&!can;
  details.innerHTML='<header>'+ic.user+'<b>'+t('details')+'</b>'+(can?'<a href="'+admin('#tenant-contact-panel')+'" aria-label="'+t('editDetails')+'">'+ic.pen+'</a>':'')+'</header>'+(rows.length?rows.map(([i,v,link])=>'<p>'+i+(link?'<a href="'+link+esc(v.replace(/\s+/g,link==='tel:'?'':' '))+'">'+esc(v)+'</a>':'<span>'+esc(v)+'</span>')+'</p>').join(''):'<p class="is-empty"><span>'+t('noDetails')+'</span></p>');
 }
 const ago=iso=>{const s=(Date.parse(iso)-Date.now())/1000,f=new Intl.RelativeTimeFormat(my()?'my':'en',{numeric:'auto'});for(const [u,n] of [['year',31536e3],['month',2592e3],['day',86400],['hour',3600],['minute',60]])if(Math.abs(s)>=n)return f.format(Math.round(s/n),u);return my()?'ခုနကပဲ':'Just now'};
 function drawPosts(){
  list.innerHTML=posts.length?posts.map(p=>'<article class="profile-post" data-post="'+p.postId+'"><header><span class="profile-post-avatar">'+(p.shop.logo?'<img src="'+esc(p.shop.logo)+'" alt="">':esc([...p.shop.name][0]||'S'))+'</span><span class="profile-post-who"><b>'+esc(p.shop.name)+'</b><small>'+esc(ago(p.postedAt))+' · '+ic.globe+'</small></span>'+(p.canDelete?'<span class="profile-post-menu"><button type="button" data-pm="post-menu" aria-label="More">'+ic.dots+'</button><span hidden><button type="button" data-pm="delete" data-post="'+p.postId+'">'+t('remove')+'</button></span></span>':'')+'</header>'+(p.body?'<p>'+esc(p.body)+'</p>':'')+(p.images.length?'<div class="profile-post-photos n'+Math.min(4,p.images.length)+'">'+p.images.slice(0,4).map((u,i)=>'<span><img src="'+esc(u)+'" alt="" loading="lazy">'+(i===3&&p.images.length>4?'<b>+'+(p.images.length-4)+'</b>':'')+'</span>').join('')+'</div>':'')+'</article>').join('')+(postsNext?'<button type="button" class="profile-more" data-pm="more">…</button>':''):(info?'<p class="profile-none">'+t('none')+'</p>':'');
 }
 async function loadPosts(more){if(!slug)return;try{const d=await call('/api/platform/posts?shop='+encodeURIComponent(slug)+(more&&postsNext?'&before='+postsNext:''));posts=more?[...posts,...d.items]:d.items;postsNext=d.nextBefore;drawPosts()}catch{}}
 async function loadInfo(){if(!slug)return;try{info=await call('/api/platform/profile/'+encodeURIComponent(slug))}catch{info=null}drawInfo();drawPosts()}
 // One bottom sheet for + Add (Personal / Work), the composer and sign-in.
 const sheet=document.createElement('dialog');sheet.className='profile-sheet';sheet.id='profile-sheet';document.body.append(sheet);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close()});
 sheet.addEventListener('close',()=>{sheet.classList.remove('open');window.GearHubBackNav?.record()});
 const openSheet=html=>{sheet.innerHTML='<div class="profile-sheet-grip" aria-hidden="true"></div><button type="button" class="profile-sheet-x" id="profile-sheet-close" aria-label="'+t('close')+'">'+icon.close+'</button>'+html+'<p class="profile-sheet-note" role="status"></p>';sheet.querySelector('#profile-sheet-close').onclick=()=>sheet.close();if(!sheet.open){sheet.classList.add('open');sheet.showModal();window.GearHubBackNav?.record()}};
 const note=text=>{const n=sheet.querySelector('.profile-sheet-note');if(n)n.textContent=text||''};
 const choose=()=>openSheet('<button type="button" class="profile-choice" data-pm="personal"><i>'+icon.person+'</i><span><b>'+t('personal')+'</b><small>'+t('personalHelp')+'</small></span></button><button type="button" class="profile-choice" data-pm="work"><i>'+icon.work+'</i><span><b>'+t('work')+'</b><small>'+t('workHelp')+'</small></span></button>');
 let picked=[];
 function composer(){
  picked=[];
  openSheet('<form class="profile-compose" data-pm-form="post"><textarea name="body" rows="4" maxlength="3000" placeholder="'+esc(t('write'))+'"></textarea><div class="profile-compose-thumbs"></div><div class="profile-compose-bar"><label class="profile-compose-photo">'+icon.photo+'<span>'+t('photos')+'</span><input type="file" accept="image/*" multiple hidden></label><button type="submit" class="profile-compose-post">'+t('post')+'</button></div></form>');
  sheet.querySelector('input[type=file]').addEventListener('change',e=>{const files=[...e.target.files];if(picked.length+files.length>10)note(t('tooBig'));picked=[...picked,...files].slice(0,10);e.target.value='';thumbs()});
 }
 function thumbs(){const box=sheet.querySelector('.profile-compose-thumbs');box.innerHTML=picked.map((f,i)=>'<span><img alt="" src="'+URL.createObjectURL(f)+'"><button type="button" data-pm="unpick" data-i="'+i+'" aria-label="'+t('remove')+'">×</button></span>').join('')}
 // Phone photos are made smaller (longest side 1600 px, JPEG) so they fit the 5 MB upload limit.
 async function shrink(file){
  try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
   const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.86));return blob?new File([blob],'photo.jpg',{type:'image/jpeg'}):file}catch{return file}
 }
 async function submitPost(form){
  const body=form.elements.body.value.trim(),button=form.querySelector('.profile-compose-post');
  if(!body&&!picked.length)return;
  button.disabled=true;button.textContent=t('posting');note('');
  try{
   const ids=[];for(const f of picked){const fd=new FormData();fd.append('file',await shrink(f));ids.push((await call('/api/platform/shops/'+info.shopId+'/files','POST',null,fd)).id)}
   const d=await call('/api/platform/profile/'+encodeURIComponent(slug)+'/posts','POST',{body,imageIds:ids});
   posts=[d.item,...posts];info.posts++;drawInfo();drawPosts();sheet.close();
  }catch(e){button.disabled=false;button.textContent=t('post');note(e.message)}
 }
 function signIn(){openSheet('<p class="profile-sheet-text">'+t('signIn')+'</p><button type="button" class="profile-compose-post wide" data-pm="signin">'+t('signInButton')+'</button>')}
 async function act(kind,el){
  if(kind==='add')return choose();
  if(kind==='personal')return composer();
  if(kind==='work'){location.href='/shops/'+encodeURIComponent(slug)+'/admin?add=1';return}
  if(kind==='signin'){(window.GearHubAppLogin?.start('/shops/'+slug+'/')||Promise.resolve()).catch(e=>note(e.message));return}
  if(kind==='unpick'){picked.splice(Number(el.dataset.i),1);thumbs();return}
  if(kind==='more')return loadPosts(true);
  if(kind==='post-menu'){const pop=el.nextElementSibling;pop.hidden=!pop.hidden;return}
  if(kind==='follow'){el.disabled=true;try{const d=await call('/api/platform/profile/'+encodeURIComponent(slug)+'/follow','POST',{});info.followed=d.followed;info.followers=d.followers;drawInfo();window.dispatchEvent(new Event('gearhub:follows-changed'))}catch(e){el.disabled=false;if(e.status===401)signIn();else window.toast?.(e.message)}return}
  if(kind==='delete'){if(!confirm(t('removeAsk')))return;try{await call('/api/platform/profile/'+encodeURIComponent(slug)+'/posts/'+Number(el.dataset.post),'DELETE');posts=posts.filter(p=>p.postId!==Number(el.dataset.post));info.posts=Math.max(0,info.posts-1);drawInfo();drawPosts()}catch(e){window.toast?.(e.message)}}
 }
 for(const root of [home,sheet])root.addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(b)act(b.dataset.pm,b)});
 sheet.addEventListener('submit',e=>{const f=e.target.closest('[data-pm-form="post"]');if(f){e.preventDefault();submitPost(f)}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-store-view="profile"]'))setTimeout(()=>{loadInfo();loadPosts()},0)});
 window.GearHubProfileMenu={open:()=>{if(!view.classList.contains('pm-menu'))show(true)}};
})();
