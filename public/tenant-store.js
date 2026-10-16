/* Explicit tenant transport for the SAME GearHub template/store.js. Never falls
 * back to root catalogue, config, payment, orders or offline cart. */
(() => {
  const match=location.pathname.match(/^\/shops\/([^/]+)\/?$/);
  if(!match)return;
  const slug=decodeURIComponent(match[1]);
  let snapshot;
  const endpoint='/api/platform/store/'+encodeURIComponent(slug);
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  async function load(){
    const r=await fetch(endpoint,{cache:'no-store'});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||'Shop unavailable.');
    snapshot=data;return data;
  }
  function configFor(s){
    const b=s.settings||{},ready=Boolean(b.bankName&&b.bankAccountName&&b.bankAccountNumber);
    const image=b.logoId?location.origin+'/api/platform/images/'+encodeURIComponent(b.logoId):'';
    const result={bankName:ready?b.bankName:'',bankAccountName:ready?b.bankAccountName:'',bankAccountNumber:ready?b.bankAccountNumber:'',paymentInstructions:ready?b.paymentInstructions:'',site:{brandName:s.name,brandTagline:b.description||'',siteTitle:s.name,logoUrl:image,supportEmail:b.email||'',translations:{en:{heroTitle:s.name,heroText:b.description||'Browse our products.',footer:b.description||'Contact this shop for product information.',footerLocation:b.address||'Address not configured',footerHours:'',promotionText:'Contact this shop for current offers.'},my:{heroTitle:s.name,heroText:b.description||'ပစ္စည်းများ ကြည့်ရှုပါ။',footer:b.description||'ပစ္စည်းအကြောင်း ဆိုင်ကို ဆက်သွယ်ပါ။',footerLocation:b.address||'လိပ်စာ မသတ်မှတ်ရသေးပါ။',footerHours:'',promotionText:'လက်ရှိကမ်းလှမ်းချက်များအတွက် ဆိုင်ကို ဆက်သွယ်ပါ။'}}}};
    const a=b.appearance||{};result.site={...result.site,...a,translations:{en:{...result.site.translations.en,...a.translations?.en},my:{...result.site.translations.my,...a.translations?.my}}};for(const language of ['en','my'])if(/^GEARHUB APP$/i.test(result.site.translations[language].settingsEyebrow||''))result.site.translations[language].settingsEyebrow=s.name+' APP';return result;
  }
  function prepare(s){
    document.querySelectorAll('a[href^="/admin.html"]').forEach(a=>a.href='/shops/'+encodeURIComponent(slug)+'/admin');
    document.querySelectorAll('.settings-verified,.footer-features,[data-i18n="footerHours"]').forEach(e=>e.remove());
    const word=document.querySelector('.footer-wordmark');if(word)word.textContent=s.name;
    const fallback=document.querySelector('.footer-logo-fallback b');if(fallback)fallback.textContent=s.name;
    const b=s.settings||{};
    for(const [selector,value,prefix] of [['a[href^="tel:"]',b.phone,'tel:'],['a[href^="mailto:"]',b.email,'mailto:']]){
      document.querySelectorAll(selector).forEach(a=>{a.textContent=value||'Not configured / မသတ်မှတ်ရသေးပါ';if(value)a.href=prefix+value;else a.removeAttribute('href');});
    }
    document.querySelectorAll('.footer-logo-fallback small').forEach(e=>e.textContent='');
  }
  window.GearHubTenantStore={
    key:key=>key==='gh-cart'?'gh-shop-cart:'+slug:'gh-shop:'+slug+':'+key,
    async fetch(url,options){
      try{
        if(url==='/api/products'){
          const s=await load();prepare(s);
          return json(s.products.map(p=>{const d=JSON.parse(p.details||'{}');return {...p,name_en:p.name,name_my:d.nameMy||p.name,category_en:p.category,category_my:d.categoryMy||p.category,description_en:p.description,description_my:d.descriptionMy||p.description,image_emoji:d.imageEmoji||'⚙',promotion_price:d.promotionPrice??null,imageUrls:(d.imageIds||[p.image_id].filter(Boolean)).map(id=>'/api/platform/images/'+encodeURIComponent(id))};}));
        }
        if(url==='/api/categories'){
          const s=snapshot||await load();
          const names=[...new Set(s.products.map(p=>p.category).filter(Boolean))];
          const rows=(s.settings.categories||[]).map(c=>({...c}));for(const name of names)if(!rows.some(c=>c.category_en.toLowerCase()===name.toLowerCase()))rows.push({id:Math.max(0,...rows.map(c=>c.id))+1,category_en:name,category_my:name,icon:'⚙'});return json(rows.map(c=>({...c,parent_id:rows.find(p=>p.category_en===c.parent_en)?.id||null,product_count:s.products.filter(p=>p.category.toLowerCase()===c.category_en.toLowerCase()).length})));
        }
        if(url==='/api/config'){const s=snapshot||await load();prepare(s);return json(configFor(s));}
        if(url==='/api/storage'){
          const local=await navigator.storage?.estimate?.()||{};
          return json({usedBytes:local.usage||0,capacityBytes:local.quota||0,availableBytes:(local.quota||0)-(local.usage||0)});
        }
        if(url==='/api/orders'){
          const s=await load();if(!configFor(s).bankName)return json({error:'Payment is not configured for this shop.'},409);
          const r=await fetch('/api/platform/me',{cache:'no-store'});if(!r.ok)return json({error:'Reload before checkout.'},503);
          const me=await r.json(),f=options.body;
          f.set('customer',f.get('customerName'));f.set('file',f.get('receipt'));f.delete('receipt');f.delete('customerName');f.delete('email');f.delete('language');
          const response=await fetch(endpoint+'/orders',{...options,headers:{...options.headers,'X-CSRF-Token':me.csrfToken},body:f});
          const value=await response.json();snapshot=null;
          return response.ok?json({order:{orderCode:value.code}}):json(value,response.status);
        }
        return json({error:'Unsupported tenant operation.'},404);
      }catch{return json({error:'Shop unavailable. Please reconnect and try again.'},503);}
    }
  };
})();
