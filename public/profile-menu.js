/* 1.1.302 owner (Facebook picture): the bottom bar's Settings place is a person (Profile). Profile shows only the
   shop's profile photo and name for now; the ☰ Menu at the top opens the old Settings page. */
(()=>{
 const view=document.getElementById('profile-view');if(!view)return;
 const my=()=>document.documentElement.lang==='my';
 const home=document.createElement('div');home.className='profile-home';home.id='profile-home';
 home.innerHTML='<button type="button" class="profile-menu-open" id="profile-menu-open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><div class="profile-home-photo"><img alt="" hidden><span aria-hidden="true">⚙</span></div><h2 class="profile-home-name"></h2><p class="profile-home-counts" hidden></p><div class="profile-home-actions" hidden></div><div class="profile-home-posts"></div>';
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
 const T={en:{followers:'followers',following:'following',posts:'posts',follow:'Follow',followed:'Following ✓',add:'Add',personal:'Personal',personalHelp:'Photos and text — only on your profile and Discover',work:'Work',workHelp:'A product with SKU, Part No and price',write:'What\'s on your mind?',photos:'Photos',post:'Post',posting:'Posting…',remove:'Delete',removeAsk:'Delete this post?',signIn:'Sign in with Google to follow',signInButton:'Continue with Google',none:'No posts yet.',error:'Something went wrong. Please try again.',tooBig:'Choose up to 10 photos.',close:'Close'},
  my:{followers:'followers',following:'following',posts:'posts',follow:'Follow',followed:'Following ✓',add:'Add',personal:'Personal',personalHelp:'ပုံနဲ့ စာ — ကိုယ့် Profile နဲ့ Discover မှာပဲ ပေါ်မယ်',work:'Work',workHelp:'SKU၊ Part No၊ ဈေးနှုန်းပါတဲ့ ပစ္စည်း',write:'ဘာတွေ ပြောချင်လဲ?',photos:'ဓာတ်ပုံ',post:'တင်မယ်',posting:'တင်နေပါတယ်…',remove:'ဖျက်မယ်',removeAsk:'ဒီ post ကို ဖျက်မလား?',signIn:'Follow လုပ်ဖို့ Google နဲ့ ဝင်ပါ',signInButton:'Google နဲ့ ဝင်မယ်',none:'Post မရှိသေးပါ။',error:'မအောင်မြင်ပါ။ ပြန်စမ်းကြည့်ပါ။',tooBig:'ဓာတ်ပုံ ၁၀ ပုံအထိပဲ ရွေးပါ။',close:'ပိတ်ရန်'}};
 const t=k=>T[my()?'my':'en'][k];
 const icon={add:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',work:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',photo:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18"/></svg>',close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'};
 let info=null,csrf='',posts=[],postsNext=null;
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function call(url,method='GET',body,raw){
  const send=async()=>fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{...(raw?{}:{'Content-Type':'application/json'}),'X-CSRF-Token':await token()},body:raw||(body?JSON.stringify(body):undefined)});
  let r=await send();if(r.status===403&&method!=='GET'){csrf='';r=await send()}
  const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.error||t('error'));e.status=r.status;throw e}return d;
 }
 const counts=home.querySelector('.profile-home-counts'),actions=home.querySelector('.profile-home-actions'),list=home.querySelector('.profile-home-posts');
 function drawInfo(){
  if(!info){counts.hidden=actions.hidden=true;return}
  counts.hidden=false;counts.innerHTML='<b>'+count(info.followers)+'</b> '+t('followers')+' · <b>'+count(info.following)+'</b> '+t('following')+' · <b>'+count(info.posts)+'</b> '+t('posts');
  actions.hidden=false;
  actions.innerHTML=info.canPost?'<button type="button" class="profile-add" data-pm="add">'+icon.add+'<span>'+t('add')+'</span></button>':'<button type="button" class="profile-follow'+(info.followed?' is-on':'')+'" data-pm="follow">'+t(info.followed?'followed':'follow')+'</button>';
 }
 const ago=iso=>{const s=(Date.parse(iso)-Date.now())/1000,f=new Intl.RelativeTimeFormat(my()?'my':'en',{numeric:'auto'});for(const [u,n] of [['year',31536e3],['month',2592e3],['day',86400],['hour',3600],['minute',60]])if(Math.abs(s)>=n)return f.format(Math.round(s/n),u);return my()?'ခုနကပဲ':'Just now'};
 function drawPosts(){
  list.innerHTML=posts.length?posts.map(p=>'<article class="profile-post" data-post="'+p.postId+'"><header><b>'+esc(p.shop.name)+'</b><small>'+esc(ago(p.postedAt))+'</small>'+(p.canDelete?'<button type="button" data-pm="delete" data-post="'+p.postId+'">'+t('remove')+'</button>':'')+'</header>'+(p.body?'<p>'+esc(p.body)+'</p>':'')+(p.images.length?'<div class="profile-post-photos n'+Math.min(4,p.images.length)+'">'+p.images.slice(0,4).map((u,i)=>'<span><img src="'+esc(u)+'" alt="" loading="lazy">'+(i===3&&p.images.length>4?'<b>+'+(p.images.length-4)+'</b>':'')+'</span>').join('')+'</div>':'')+'</article>').join('')+(postsNext?'<button type="button" class="profile-more" data-pm="more">…</button>':''):(info?'<p class="profile-none">'+t('none')+'</p>':'');
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
  if(kind==='follow'){el.disabled=true;try{const d=await call('/api/platform/profile/'+encodeURIComponent(slug)+'/follow','POST',{});info.followed=d.followed;info.followers=d.followers;drawInfo();window.dispatchEvent(new Event('gearhub:follows-changed'))}catch(e){el.disabled=false;if(e.status===401)signIn();else window.toast?.(e.message)}return}
  if(kind==='delete'){if(!confirm(t('removeAsk')))return;try{await call('/api/platform/profile/'+encodeURIComponent(slug)+'/posts/'+Number(el.dataset.post),'DELETE');posts=posts.filter(p=>p.postId!==Number(el.dataset.post));info.posts=Math.max(0,info.posts-1);drawInfo();drawPosts()}catch(e){window.toast?.(e.message)}}
 }
 for(const root of [home,sheet])root.addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(b)act(b.dataset.pm,b)});
 sheet.addEventListener('submit',e=>{const f=e.target.closest('[data-pm-form="post"]');if(f){e.preventDefault();submitPost(f)}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-store-view="profile"]'))setTimeout(()=>{loadInfo();loadPosts()},0)});
 window.GearHubProfileMenu={open:()=>{if(!view.classList.contains('pm-menu'))show(true)}};
})();
