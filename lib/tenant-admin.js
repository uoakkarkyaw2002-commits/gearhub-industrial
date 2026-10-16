// Shop-owned metadata only. All routes use the platform's Google identity,
// owner/tenant boundary, subscription permissions and CSRF middleware.
function productDetails(b,current,shop,asset,fail,text){
 const previous=JSON.parse(current?.details||'{}');
 const ids=b.imageIds===undefined?(b.imageId?[b.imageId]:[]):b.imageIds;
 if(!Array.isArray(ids)||ids.length>10||ids.some(id=>typeof id!=='string'))fail(400,'Choose up to ten uploaded photos.');
 ids.forEach(id=>asset(shop,id,'image'));
 const result={...previous,imageIds:[...new Set(ids)]};
 for(const k of ['nameMy','categoryMy','descriptionMy','imageEmoji']) if(b[k]!==undefined)result[k]=text(b[k],k==='descriptionMy'?1000:150);
 return result;
}
function install({router,db,shopFor,asset,wrap,fail,text}){
 const save=(shop,settings)=>db.prepare('UPDATE platform_shops SET settings=? WHERE id=?').run(JSON.stringify(settings),shop.id);
 const categories=shop=>{
  const settings=JSON.parse(shop.settings),rows=settings.categories||[];
  const products=db.prepare('SELECT category,COUNT(*) n FROM platform_products WHERE shop_id=? GROUP BY category').all(shop.id);
  const out=rows.map(c=>({...c}));
  for(const p of products)if(p.category&&!out.some(c=>c.category_en.toLowerCase()===p.category.toLowerCase()))out.push({id:Math.max(0,...out.map(c=>c.id))+1,category_en:p.category,category_my:p.category,icon:'',parent_en:''});
  return out.map(c=>({...c,parent_id:out.find(p=>p.category_en===c.parent_en)?.id||null,product_count:products.filter(p=>p.category.toLowerCase()===c.category_en.toLowerCase()).reduce((n,p)=>n+p.n,0)}));
 };
 router.get('/shops/:id/categories',wrap((req,res)=>res.json(categories(shopFor(req).shop))));
 router.put('/shops/:id/categories',wrap((req,res)=>{
  const {shop}=shopFor(req,'products'),input=req.body.categories;
  if(!Array.isArray(input)||input.length>200)fail(400,'Up to 200 categories are allowed.');
  const old=categories(shop),names=new Set(),ids=new Set();let next=Math.max(0,...old.map(c=>c.id))+1;
  const rows=input.map(c=>{
   if(!c||typeof c!=='object')fail(400,'Invalid category.');
   const name=text(c.category_en,100),my=text(c.category_my,100)||name;
   if(!name||names.has(name.toLowerCase()))fail(400,'Category names must be non-empty and unique.');names.add(name.toLowerCase());
   const id=c.id==null?next++:Number(c.id);
   if(!Number.isSafeInteger(id)||ids.has(id)||(c.id!=null&&!old.some(o=>o.id===id)))fail(400,'Unknown category. Reload before editing.');ids.add(id);
   const parent=text(c.parent_en,100),bannerUrl=text(c.bannerUrl,1000);
   if(bannerUrl){
    if(parent)fail(400,'Only main categories can have a banner image.');
    const match=bannerUrl.match(/^\/api\/platform\/images\/([^/?#]+)$/);if(!match)fail(400,'Use a banner photo uploaded to this shop.');asset(shop,match[1],'image');
   }
   return {id,category_en:name,category_my:my,icon:text(c.icon,12),parent_en:parent,...(bannerUrl?{bannerUrl}:{}),...(c.parent_id!=null?{parent_id:Number(c.parent_id)}:{})};
  });
  try{require('./category-hierarchy').validateHierarchy(rows);}catch(e){fail(400,e.message);}
  db.transaction(()=>{
   const removed=old.filter(c=>!rows.some(row=>row.id===c.id));
   if(removed.some(c=>db.prepare('SELECT COUNT(*) n FROM platform_products WHERE shop_id=? AND category=? COLLATE NOCASE').get(shop.id,c.category_en).n))fail(409,'This category still contains products. Edit those products and choose another category before deleting. ပစ္စည်းများကို အခြားအမျိုးအစားသို့ အရင်ပြောင်းပါ။');
   // Renames follow stable IDs, not user supplied product IDs. Deleted category
   // names remain available while products use them; no product is discarded.
   const rename=new Map(rows.filter(c=>old.some(o=>o.id===c.id)).map(c=>[old.find(o=>o.id===c.id).category_en.toLowerCase(),c.category_en]));
   for(const p of db.prepare('SELECT id,category FROM platform_products WHERE shop_id=?').all(shop.id))if(rename.has(p.category.toLowerCase())&&rename.get(p.category.toLowerCase())!==p.category)db.prepare('UPDATE platform_products SET category=? WHERE id=? AND shop_id=?').run(rename.get(p.category.toLowerCase()),p.id,shop.id);
   save(shop,{...JSON.parse(shop.settings),categories:rows.map(({parent_id,...row})=>row)});
  }).immediate();
  res.json({ok:true,categories:categories({...shop,settings:db.prepare('SELECT settings FROM platform_shops WHERE id=?').get(shop.id).settings})});
 }));
 router.post('/shops/:id/products/:product/delete-permanently',wrap((req,res)=>{const {shop}=shopFor(req,'products');try{res.json(require('./product-trash').deleteTrashedProduct(db,{table:'platform_products',id:Number(req.params.product),shopId:shop.id,confirmed:req.body.confirmPermanent===true}));}catch(e){fail(e.status||400,e.message);}}));
 for(const action of ['trash','restore'])router.post('/shops/:id/products/:product/'+action,wrap((req,res)=>{const {shop,limits}=shopFor(req,'products');try{res.json(require('./product-trash').changeTrash(db,{table:'platform_products',id:Number(req.params.product),shopId:shop.id,restore:action==='restore',productLimit:limits.productLimit}));}catch(e){fail(e.status||400,e.message);}}));
 router.get('/shops/:id/appearance',wrap((req,res)=>{
  const {shop}=shopFor(req),s=JSON.parse(shop.settings);
  res.json({siteTitle:shop.name,brandName:shop.name,brandTagline:s.description||'',logoUrl:s.logoId?'/api/platform/images/'+s.logoId:'',translations:{en:{heroTitle:shop.name,heroText:s.description||'',footer:s.description||'',footerLocation:s.address||'',footerHours:''},my:{heroTitle:shop.name,heroText:s.description||'',footer:s.description||'',footerLocation:s.address||'',footerHours:''}},...s.appearance,payment:Object.fromEntries(['bankName','bankAccountName','bankAccountNumber','paymentInstructions'].map(k=>[k,s[k]||'']))});
 }));
 router.put('/shops/:id/appearance',wrap((req,res)=>{
  const {shop}=shopFor(req,'products'),b=req.body,s=JSON.parse(shop.settings),a={};
  for(const k of ['siteTitle','brandName','brandTagline','heroIcon'])a[k]=text(b[k],k==='heroIcon'?12:160);
  for(const k of ['logoUrl','appIconUrl','categoryBannerUrl','navigationBackgroundUrl','wallpaperUrl','heroImageUrl']){
   const v=text(k==='categoryBannerUrl'?(b[k]??s.appearance?.categoryBannerUrl):b[k],1000);if(v&&v!=='/images/hero-excavator.jpg'){
    const m=v.match(/^\/api\/platform\/images\/([^/?#]+)$/);if(!m)fail(400,'Use a photo uploaded to this shop.');asset(shop,m[1],'image');
   }a[k]=v;
  }
  a.colors={};for(const k of ['brand','accent','page','hero']){if(!/^#[a-f0-9]{6}$/i.test(b.colors?.[k]||''))fail(400,'Choose valid colors.');a.colors[k]=b.colors[k];}
  a.translations={en:{},my:{}};
  for(const lang of ['en','my']){
   const entries=Object.entries(b.translations?.[lang]||{});if(entries.length>300)fail(400,'Too many text fields.');
   for(const [k,v] of entries){if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(k)||typeof v!=='string'||v.length>1000)fail(400,'Invalid text field.');a.translations[lang][k]=v.trim();}
  }
  a.layout=normalizeSiteLayout(b.layout);
  // Payment/contact are saved separately, so stale appearance forms cannot
  // overwrite a merchant's newly updated bank details.
  save(shop,{...s,appearance:a});res.json({ok:true,settings:{...a,payment:Object.fromEntries(['bankName','bankAccountName','bankAccountNumber','paymentInstructions'].map(k=>[k,s[k]||'']))}});
 }));
 router.get('/shops/:id/export',wrap((req,res)=>{
  const {shop}=shopFor(req);
  res.set({'Content-Disposition':'attachment; filename="shop-data.json"','Cache-Control':'no-store'}).json({formatVersion:1,createdAt:new Date().toISOString(),shop:{name:shop.name,slug:shop.slug,settings:JSON.parse(shop.settings)},products:db.prepare('SELECT * FROM platform_products WHERE shop_id=?').all(shop.id),orders:db.prepare('SELECT * FROM platform_orders WHERE shop_id=?').all(shop.id),media:db.prepare('SELECT id,kind,bytes,mime FROM platform_files WHERE shop_id=? AND ready=1').all(shop.id),note:'Shop data export only. Media bytes and platform sessions are excluded. Platform recovery uses the private full backup.'});
 }));
 // Deliberately no catch-all proxy to /api/admin. Backups, password reset and
 // global operations keep requiring the independent legacy admin session.
}
module.exports={install,productDetails};

const siteLayoutDefaults = {
 announcement: {padding:9,radius:0}, navigation:{padding:17,radius:0}, hero:{padding:0,radius:26},
 catalog:{padding:0,radius:0}, productCards:{padding:13,radius:17}, highlights:{padding:23,radius:16},
 footer:{padding:34,radius:0}, cart:{padding:23,radius:0}, checkout:{padding:24,radius:19}, gallery:{padding:20,radius:20}
};
function defaultSiteLayout() {
 return Object.fromEntries(Object.entries(siteLayoutDefaults).map(([key,values]) => [key, {
  enabled:false, padding:values.padding, margin:0, borderWidth:0, borderColor:"#e0e7dd", borderStyle:"solid",
  borderRadius:values.radius, backgroundColor:"", textColor:"", shadow:"keep"
 }]));
}
function normalizeSiteLayout(input, fallback=defaultSiteLayout()) {
 const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
 const result = {};
 for (const [key, defaults] of Object.entries(defaultSiteLayout())) {
  const value = source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) ? source[key] : {};
  const previous = fallback[key] || defaults;
  const number = (name,min,max) => {
   const parsed = Number(value[name]);
   return Number.isFinite(parsed) ? Math.min(max,Math.max(min,Math.round(parsed))) : previous[name];
  };
  const safeColor = (name,allowEmpty=false) => {
   const color = String(value[name] ?? previous[name] ?? "");
   return allowEmpty && color === "" ? "" : (/^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : previous[name]);
  };
  const borderStyle = ["none","solid","dashed","dotted"].includes(value.borderStyle) ? value.borderStyle : previous.borderStyle;
  const shadow = ["keep","none","soft","strong"].includes(value.shadow) ? value.shadow : previous.shadow;
  result[key] = {
   enabled:value.enabled === true,
   padding:number("padding",0,120), margin:number("margin",0,160), borderWidth:number("borderWidth",0,12),
   borderColor:safeColor("borderColor"), borderStyle, borderRadius:number("borderRadius",0,100),
   backgroundColor:safeColor("backgroundColor",true), textColor:safeColor("textColor",true), shadow
  };
 }
 return result;
}
