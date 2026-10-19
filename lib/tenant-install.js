// Public installation identity is selected ONLY by storefront path, never cookies.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const model=require('./platform-model');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function installTenantApps(app,{db,dataDir,publicDir,publicOrigin}){
 const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
 const adminHtml=fs.readFileSync(path.join(publicDir,'admin.html'),'utf8');
 function shop(slug){
  const s=db.prepare('SELECT * FROM platform_shops WHERE slug=? AND legacy=0').get(slug);
  if(!s||!model.permissions(db,s).permissions.selling||db.prepare('SELECT status FROM platform_users WHERE id=?').get(s.owner_id)?.status!=='active')return null;
  return s;
 }
 function identity(s){const settings=JSON.parse(s.settings),a=settings.appearance||{},base='/shops/'+encodeURIComponent(s.slug)+'/';
  const candidates=[a.appIconUrl,a.logoUrl,settings.logoId?'/api/platform/images/'+settings.logoId:''];let file;
  for(const candidate of candidates){const m=String(candidate||'').match(/^\/api\/platform\/images\/([a-zA-Z0-9-]+)$/);if(!m)continue;
   const f=db.prepare("SELECT * FROM platform_files WHERE id=? AND shop_id=? AND kind='image' AND ready=1").get(m[1],s.id);if(!f)continue;
   const media=path.join(dataDir,'platform-media'),dir=path.join(media,String(s.id)),p=path.join(dir,f.filename);
   // No symlink/path traversal; only this shop's completed public image records.
   if(path.basename(f.filename)!==f.filename)continue;
   try{if([media,dir,p].some(x=>fs.lstatSync(x).isSymbolicLink())||!fs.statSync(p).isFile())continue;file={path:p,id:f.id};break;}catch{}
  }
  const name=String(a.brandName||s.name).trim()||s.name,revision=crypto.createHash('sha256').update(JSON.stringify([name,file?.id||'neutral'])).digest('hex').slice(0,16);
  return {base,name,revision,file,icon:size=>base+'app-icon-'+size+'.png?v='+revision};
 }
 const resolve=(req,res,next)=>{const s=shop(req.params.slug);if(!s)return res.status(404).type('text').send('Shop unavailable.');req.installShop=s;req.installIdentity=identity(s);res.set('Cache-Control','no-cache');next();};
 app.get('/shops/:slug/app.webmanifest',resolve,(req,res)=>{const i=req.installIdentity;res.type('application/manifest+json').json({id:i.base,name:i.name,short_name:i.name.slice(0,30),start_url:i.base,scope:i.base,display:'standalone',background_color:'#f5f7f1',theme_color:'#183426',icons:[192,512].map(size=>({src:i.icon(size),sizes:size+'x'+size,type:'image/png',purpose:'any'}))});});
 // Seller admin installed on a Home Screen: start at the admin; the scope is the whole
 // site so Google login (/platform.html) and "View store" stay inside the app (no browser bars).
 const anyShop=slug=>db.prepare('SELECT * FROM platform_shops WHERE slug=? AND legacy=0').get(slug);
 app.get('/shops/:slug/admin.webmanifest',(req,res)=>{const s=anyShop(req.params.slug);if(!s)return res.status(404).type('text').send('Shop unavailable.');const i=identity(s),name=i.name+' Admin';res.set('Cache-Control','no-cache').type('application/manifest+json').json({id:i.base+'admin',name,short_name:name.slice(0,30),start_url:i.base+'admin',scope:'/',display:'standalone',background_color:'#f5f7f1',theme_color:'#183426',icons:[192,512].map(size=>({src:i.icon(size),sizes:size+'x'+size,type:'image/png',purpose:'any'}))});});
 app.get('/shops/:slug/admin',(req,res)=>{
  res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});
  const s=anyShop(req.params.slug);if(!s)return res.type('html').send(adminHtml);const i=identity(s);
  res.type('html').send(adminHtml.replace('href="/admin.webmanifest"','href="'+i.base+'admin.webmanifest"')
   .replace('content="GearHub Admin"><link rel="apple-touch-icon" href="/app-icon.png"','content="'+escape(i.name+' Admin')+'"><link rel="apple-touch-icon" href="'+i.icon(180)+'"'));
 });
 app.get('/shops/:slug/app-icon-:size.png',resolve,async(req,res,next)=>{try{const size=Number(req.params.size);if(![180,192,512].includes(size))return res.sendStatus(404);const i=req.installIdentity;
   let buffer;if(i.file){try{buffer=await sharp(i.file.path,{limitInputPixels:25000000,animated:false}).rotate().resize(size,size,{fit:'contain',background:'#f5f7f1'}).flatten({background:'#f5f7f1'}).png().toBuffer();}catch{}}
   // Neutral storefront fallback, never another tenant or the GearHub icon.
   if(!buffer)buffer=await sharp(Buffer.from('<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#f5f7f1"/><path d="M112 220V130h288v90M130 220v180h252V220M210 400V290h92v110M100 130l30-40h252l30 40" fill="none" stroke="#183426" stroke-width="24" stroke-linejoin="round"/></svg>')).resize(size,size).png().toBuffer();
   res.type('png').set('X-Content-Type-Options','nosniff').send(buffer);
  }catch(e){next(e);}});
 app.get('/shops/:slug', (req,res,next)=>{if(req.params.slug==='gearhub')return res.redirect('/');next();},resolve,(req,res)=>{const i=req.installIdentity;if(!req.path.endsWith('/'))return res.redirect(302,i.base+new URL(req.originalUrl,'http://localhost').search);
  const page=html.replace(/<title>[^<]*<\/title>/,'<title>'+escape(i.name)+'</title>')
   .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(">)/,'$1'+escape(i.name)+'$2')
   .replace('href="/app.webmanifest"','href="'+i.base+'app.webmanifest"')
   .replace('href="/app-icon.png"','href="'+i.icon(180)+'"')
   .replace('id="site-favicon" rel="icon" href="/favicon.ico"','id="site-favicon" rel="icon" href="'+i.icon(192)+'"')
   .replace('</head>','<link rel="canonical" href="'+escape(new URL(i.base,publicOrigin).href)+'"><meta name="gearhub-shop-name" content="'+escape(i.name)+'"></head>')
;
  res.type('html').send(sellerBranding(page,i.name));
 });
}
// The storefront template is GearHub's own page. On a seller page every visible
// "GearHub" (text, alt/aria labels) becomes the shop's name, so the two never mix.
// Class names, meta names, styles and URLs are left alone.
function sellerBranding(html,name){
 const own=escape(name),swap=t=>t.replace(/gear\s*hub/gi,()=>own);
 return html.split(/(<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>)/i).map((part,index)=>index%2?part:part
  .replace(/<strong>GEARHUB<\/strong> Gear Spare Parts\./g,()=>'<strong>'+own+'</strong>.')
  .replace(/GEAR<span>HUB<\/span><small>SPARE PARTS<\/small>/g,()=>own)
  .replace(/<b>GEARHUB<\/b><small>SPARE PARTS<\/small>/g,()=>'<b>'+own+'</b>')
  .replace(/(data-site-brand-name[^>]*>)[^<]*/g,(m,open)=>open+own)
  .replace(/(data-site-brand-tagline[^>]*>)[^<]*/g,(m,open)=>open)
  .replace(/\b(aria-label|alt|title|placeholder)="([^"]*)"/g,(m,attr,value)=>attr+'="'+swap(value)+'"')
  .replace(/>([^<]+)</g,(m,text)=>'>'+swap(text)+'<')).join('');
}
module.exports={installTenantApps,sellerBranding};
