/* Shared legacy admin UI, explicit shop transport. Never fall back to root APIs. */
(()=>{
 const match=location.pathname.match(/^\/shops\/([^/]+)\/admin\/?$/);if(!match)return;
 const slug=decodeURIComponent(match[1]),json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
 let context,token,loading,setupDone=false;
 async function init(){
  if(context&&(token||!navigator.onLine))return context;if(loading)return loading;
  loading=(async()=>{
   // While a new version is being deployed the server answers 502/503 for a moment;
   // wait for it instead of showing the login screen to someone who is still signed in.
   let r;try{for(let i=0;;i++){r=await fetch('/api/platform/me',{cache:'no-store'});if(r.status<500||i>=40)break;await new Promise(done=>setTimeout(done,3000));}}catch(e){
    // Offline: reuse the shop this device last opened so saved data can be shown.
    let saved=null;try{saved=JSON.parse(localStorage.getItem('gh-admin-ctx:'+slug)||'null');}catch{}
    if(saved){context=saved;token='';if(!setupDone)setup(context);setupDone=true;return context;}throw e;}
   const me=await r.json();
   if(!r.ok||!me.user)throw Error('Google login required.');
   let shop=me.shop&&me.shop.slug===slug?me.shop:null;
   // GearHub controls every shop: the platform owner may open any seller admin.
   if(!shop&&me.isOwner){const o=await fetch('/api/platform/owner',{cache:'no-store'});const v=await o.json().catch(()=>({}));shop=o.ok&&(v.shops||[]).find(x=>x.slug===slug&&!x.legacy)||null;if(shop)shop.managedByOwner=true;}
   if(!shop)throw Error('This Google account does not own this shop.');
   context=shop;token=me.csrfToken;try{localStorage.setItem('gh-admin-ctx:'+slug,JSON.stringify(shop));}catch{}if(!setupDone)setup(context);setupDone=true;return context;
  })();try{return await loading;}finally{loading=null;}
 }
 const base=()=>'/api/platform/shops/'+context.id;
 async function call(suffix,options={}){
  await init();return fetch(base()+suffix,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.headers,'X-CSRF-Token':token}});
 }
 const details=p=>{try{return JSON.parse(p.details||'{}');}catch{return {};}};
 function product(p){const d=details(p);return {...p,name_en:p.name,name_my:d.nameMy||p.name,category_en:p.category,category_id:d.categoryId??null,category_my:d.categoryMy||p.category,description_en:p.description,description_my:d.descriptionMy||'',image_emoji:d.imageEmoji||'⚙',promotion_price:d.promotionPrice??null,part_no:d.partNo||'',imageUrls:(d.imageIds||[p.image_id].filter(Boolean)).map(id=>'/api/platform/images/'+encodeURIComponent(id))};}
 function order(o){const d=details(o);return {...o,...d,order_code:o.code,customer_name:o.customer,invoice_no:o.invoice,hasReceipt:!!o.receipt_id,items:o.items.map(i=>({...i,nameEn:i.name}))};}
 async function snapshot(){const r=await call('');if(!r.ok)throw Error((await r.json()).error);return r.json();}
 function setup(shop){
  for(const lang of ['en','my'])for(const key of ['footer','footerLocation','footerHours','footerReliable','footerDelivery','footerSelection','footerSupport','footerTagline','servicesText','promotionText','eyebrow','heroTitle','heroText','highlight1','highlight2','highlight3'])if(window.GEARHUB_DEFAULT_TRANSLATIONS?.[lang]&&key in window.GEARHUB_DEFAULT_TRANSLATIONS[lang])window.GEARHUB_DEFAULT_TRANSLATIONS[lang][key]='';
  document.title=shop.name+' · Admin';
  if(shop.managedByOwner&&!document.getElementById('owner-managing')){const bar=document.createElement('div');bar.id='owner-managing';bar.className='owner-managing';bar.textContent='👑 GearHub owner အနေနဲ့ '+shop.name+' ကို စီမံနေပါတယ် / Managing as GearHub owner';document.getElementById('dashboard')?.prepend(bar);}
  const heading=document.querySelector('.admin-head h1');if(heading)heading.textContent=shop.name+' · Admin';
  const storeTitle=document.getElementById('admin-store-title');if(storeTitle)storeTitle.textContent=shop.name+' · Admin';
  // Seller admins carry their own shop name and logo, never the GearHub brand.
  const brandName=document.querySelector('.admin-brand-name');if(brandName){brandName.textContent=shop.name;const small=document.createElement('small');small.textContent='ADMIN CONSOLE';brandName.append(small);brandName.classList.add('shop-brand');}
  const logoId=shop.settings?.logoId,appearanceLogo=String(shop.settings?.appearance?.logoUrl||'');window.__gearhubAdminLogo=/^\/api\/platform\/images\/[A-Za-z0-9-]+$/.test(appearanceLogo)?appearanceLogo:logoId?'/api/platform/images/'+encodeURIComponent(logoId):'';window.GearHubAdminExtras?.setLogo(window.__gearhubAdminLogo);
  document.querySelectorAll('a[href="/"]').forEach(a=>a.href='/shops/'+encodeURIComponent(slug)+'/');
  
  // Global backups/reset are not merchant APIs. ("Delete all" in the Recycle Bin is: it empties this shop only.)
  document.getElementById('operations-status')?.closest('.panel')?.setAttribute('hidden','');
  document.querySelectorAll('a[href*="/api/admin/"]').forEach(a=>a.hidden=true);
  document.querySelector('.product-drive-details')?.setAttribute('hidden','');
  const urls=document.getElementById('product-image-urls');if(urls){urls.placeholder='Uploaded shop photos';}
  const host=document.createElement('section');host.className='panel';host.id='tenant-contact-panel';
  const title=document.createElement('h2');title.textContent='Shop contact & payment / ဆိုင်အချက်အလက်';host.append(title);
  const form=document.createElement('form');form.className='product-form';form.id='tenant-contact';
  for(const key of ['name','description','phone','email','address','bankName','bankAccountName','bankAccountNumber','paymentInstructions']){
   const label=document.createElement('label');label.textContent=({name:'Shop name',description:'About the shop',phone:'Contact phone',email:'Contact email',address:'Shop address',bankName:'Bank / wallet name',bankAccountName:'Account holder',bankAccountNumber:'Account number',paymentInstructions:'Transfer instructions'})[key];
   const input=document.createElement('input');input.name=key;input.value=key==='name'?shop.name:shop.settings[key]||'';label.append(input);form.append(label);
  }
  const button=document.createElement('button');button.textContent='Save contact & payment';form.append(button);
  const message=document.createElement('p');message.setAttribute('role','status');form.append(message);
  form.onsubmit=async e=>{e.preventDefault();button.disabled=true;window.__gearhubPlatformPending=true;try{const r=await call('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const d=await r.json();if(!r.ok)throw Error(d.error);message.textContent='Saved';}catch(e){message.textContent=e.message;}finally{button.disabled=false;window.__gearhubPlatformPending=false;}};
  host.append(form);(document.getElementById('site-settings-content')||document.getElementById('dashboard')).append(host);
    const active=document.createElement('label');active.textContent='Product visibility';active.innerHTML+=' <select name=active><option value=1>Active</option><option value=0>Hidden</option></select>';document.getElementById('product-form').append(active);
  const exports=document.createElement('a');exports.href=base()+'/export';exports.textContent='Export this shop data (JSON)';exports.download='shop-data.json';host.append(exports);
  const quota=document.createElement('p');quota.textContent=`Storage ${(shop.limits.usedBytes/1048576).toFixed(2)} / ${(shop.limits.storageLimit/1048576).toFixed(0)} MB · ${shop.limits.subscriptionState} · ${shop.starts_at||''} → ${shop.ends_at||'No expiry'}`;host.prepend(quota);
 }
 window.GearHubTenantAdmin={
  // Free AI calls (product-ai.js, order receipt reader) go to this shop's platform API.
  ai:(suffix,options={})=>call('/ai'+suffix,options),
  nameDraftFields:()=>{
   window.GearHubTenantAdmin.draftReady=true;
   document.querySelectorAll('[data-site-text]').forEach(e=>e.name='text.'+e.dataset.language+'.'+e.dataset.siteText);
  },
  receipt:o=>base()+'/receipts/'+encodeURIComponent(o.receipt_id),
  login:error=>{
   if(/google login required/i.test(error?.message||'')){location.replace('/platform.html');return;}
   document.getElementById('dashboard').classList.add('hidden');
   const box=document.getElementById('login-view');box.classList.remove('hidden');box.classList.add('tenant-denied');box.replaceChildren();
   const card=document.createElement('div');card.className='tenant-denied-card';
   const icon=document.createElement('div');icon.className='tenant-denied-icon';icon.textContent='🔒';
   const h=document.createElement('h2');h.textContent='ဒီဆိုင်ကို ဒီ Google account နဲ့ စီမံခွင့် မရှိပါ';
   const en=document.createElement('p');en.className='tenant-denied-en';en.textContent='This Google account cannot manage this shop.';
   const help=document.createElement('p');help.textContent='ဆိုင်ပိုင်ရှင်ရဲ့ Google account နဲ့ ပြန်ဝင်ပါ။ / Sign in with the shop owner\'s Google account.';
   const sw=document.createElement('button');sw.type='button';sw.className='primary tenant-denied-switch';sw.textContent='Google account ပြောင်းဝင်ရန် / Switch account';
   sw.onclick=async()=>{sw.disabled=true;try{const me=await (await fetch('/api/platform/me',{cache:'no-store'})).json();await fetch('/api/platform/logout',{method:'POST',headers:{'X-CSRF-Token':me.csrfToken||''}});}catch{}location.replace('/platform.html');};
   const back=document.createElement('a');back.className='tenant-denied-back';back.href='/shops/'+encodeURIComponent(slug)+'/';back.textContent='ဆိုင်ကို ကြည့်ရန် / View shop';
   card.append(icon,h,en,help,sw,back);box.append(card);
  },
  enhanceOrders:orders=>{for(const o of orders){const select=document.getElementById('status-'+o.id);if(!select)continue;select.replaceChildren(...['pending','confirmed','processing','shipped','completed','cancelled'].map(v=>{const option=document.createElement('option');option.value=v;option.textContent=v;option.selected=v===o.status;return option;}));}},
  async fetch(url,options={}){
   const method=options.method||'GET';if(method!=='GET')window.__gearhubPlatformPending=true;
   try{
    await init();const suffix=url.replace(/^\/api\/admin/,'');
    if(suffix==='/me')return json({ok:true});
    if(suffix==='/logout'){const r=await fetch('/api/platform/logout',{...options,headers:{...options.headers,'X-CSRF-Token':token}});if(r.ok){context=null;location.replace('/platform.html');}return r;}
    if(suffix==='/summary'){const s=await snapshot();return json({sales:s.orders.filter(o=>o.payment_status==='paid'&&!['cancelled','deleted'].includes(o.status)).reduce((a,o)=>a+o.total,0),orders:s.orders.filter(o=>o.status!=='deleted').length,pending:s.orders.filter(o=>o.status==='pending').length,products:s.products.length,lowStock:s.products.filter(p=>p.active&&p.stock<5).map(product)});}
    if(suffix==='/products'&&method==='GET')return json((await snapshot()).products.map(product));
    if(/^\/products\/\d+\/(?:trash|restore|delete-permanently)$/.test(suffix)&&method==='POST')return await call(suffix,options);
    if(suffix==='/orders'&&method==='GET')return json((await snapshot()).orders.map(order));
    if(suffix==='/categories')return await call('/categories',options);
    if(suffix==='/site-settings')return await call('/appearance',options);
    if(/^\/orders\/\d+$/.test(suffix)&&['PATCH','DELETE'].includes(method))return await call(suffix,options);
    if(suffix==='/trash'&&method==='DELETE')return await call('/trash',options);
    if(/^\/products(?:\/\d+)?$/.test(suffix)&&['POST','PATCH'].includes(method)){
     const b=JSON.parse(options.body),ids=[];
     const photos=[...(b.imageUrls||[])];if(Number.isInteger(Number(b.coverIndex))&&photos[Number(b.coverIndex)])photos.unshift(...photos.splice(Number(b.coverIndex),1));for(const url of photos){const m=url.match(/^\/api\/platform\/images\/([^/?#]+)$/);if(!m)return json({error:'Upload images to this shop first.'},400);ids.push(m[1]);}
     return await call(suffix,{...options,body:JSON.stringify({name:b.nameEn,nameMy:b.nameMy,sku:b.sku,description:b.descriptionEn,descriptionMy:b.descriptionMy,category:b.categoryEn,categoryId:b.categoryId===''||b.categoryId==null?undefined:Number(b.categoryId),categoryMy:b.categoryMy,imageEmoji:b.emoji,price:b.price,promotionPrice:b.promotionPrice,partNo:b.partNo,stock:b.stock,expectedStock:b.expectedStock,active:b.active!==false&&b.active!=='0',imageId:ids[0]||null,imageIds:ids})});
    }
    if(suffix==='/uploads'&&method==='POST'){
     const urls=[];for(const f of options.body.getAll('images')){const form=new FormData();form.append('file',f);const r=await call('/files',{method:'POST',body:form});const d=await r.json();if(!r.ok)return json(d,r.status);urls.push('/api/platform/images/'+d.id);}return json({imageUrls:urls});
    }
    // Order alerts on this phone go to this shop only.
    if(/^\/push(?:\/(?:subscribe|unsubscribe|test))?(?:\?.*)?$/.test(suffix))return await call(suffix,options);
    return json({error:'This operation is reserved for the platform administrator.'},403);
   }catch(e){return json({error:e.message},/failed to fetch|network|load failed/i.test(e.message)?503:401);}finally{if(method!=='GET')window.__gearhubPlatformPending=false;}
  }
 };
})();
