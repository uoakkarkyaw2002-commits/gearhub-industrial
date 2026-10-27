// Public installation identity is selected ONLY by storefront path, never cookies.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const model=require('./platform-model');
const splash=require('./splash'),siteScene=require('./site-scene');
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
  const name=String(a.brandName||s.name).trim()||s.name,revision=crypto.createHash('sha256').update(JSON.stringify([name,file?.id||'neutral','round-icon-1'])).digest('hex').slice(0,16);
  return {base,name,revision,file,icon:size=>base+'app-icon-'+size+'.png?v='+revision};
 }
 const resolve=(req,res,next)=>{const s=shop(req.params.slug);if(!s)return res.status(404).type('text').send('Shop unavailable.');req.installShop=s;req.installIdentity=identity(s);res.set('Cache-Control','no-cache');next();};
 app.get('/shops/:slug/app.webmanifest',resolve,(req,res)=>{const i=req.installIdentity;res.type('application/manifest+json').json({id:i.base,name:i.name,short_name:i.name.slice(0,30),start_url:i.base,scope:i.base,display:'standalone',display_override:['window-controls-overlay','standalone'],related_applications:[{platform:'webapp',url:new URL(i.base+'app.webmanifest',publicOrigin).href}],background_color:'#ffffff',theme_color:'#ffffff',icons:[192,512].map(size=>({src:i.icon(size),sizes:size+'x'+size,type:'image/png',purpose:'any'}))});});
 // related_applications names the manifest itself so a browser tab can tell the app is installed
 // (navigator.getInstalledRelatedApps, public/open-in-app.js, owner 1.1.200).
 // Seller admin installed on a Home Screen: start at the admin; the scope is the whole
 // site so Google login (/platform.html) and "View store" stay inside the app (no browser bars).
 const anyShop=slug=>db.prepare('SELECT * FROM platform_shops WHERE slug=? AND legacy=0').get(slug);
 // Each shop has its own service worker (same code as /sw.js) scoped to /shops/<slug>/, so an
 // installed shop app on Android shows its order alerts under the shop's own name and icon.
 const swSource=path.join(publicDir,'sw.js');
 app.get('/shops/:slug/sw.js',(req,res)=>{if(!/^[a-z0-9-]{1,60}$/.test(req.params.slug))return res.sendStatus(404);res.set({'Cache-Control':'no-cache','Content-Type':'application/javascript; charset=utf-8'});res.sendFile(swSource);});
 app.get('/shops/:slug/admin.webmanifest',(req,res)=>{const s=anyShop(req.params.slug);if(!s)return res.status(404).type('text').send('Shop unavailable.');const i=identity(s),name=i.name+' Admin';res.set('Cache-Control','no-cache').type('application/manifest+json').json({id:i.base+'admin',name,short_name:name.slice(0,30),start_url:i.base+'admin',scope:'/',related_applications:[{platform:'webapp',url:new URL(i.base+'admin.webmanifest',publicOrigin).href}],display:'standalone',background_color:'#f5f7f1',theme_color:'#183426',icons:[192,512].map(size=>({src:i.icon(size),sizes:size+'x'+size,type:'image/png',purpose:'any'}))});});
 app.get('/shops/:slug/admin',(req,res)=>{
  res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});
  const s=anyShop(req.params.slug);if(!s)return res.type('html').send(adminHtml);const i=identity(s);
  // The shop's own name is in the page before any script runs, so the GearHub brand never
  // flashes on a seller admin. The login card stays hidden until the session check shows it.
  const name=escape(i.name),swap=(html,from,to)=>html.replace(from,()=>to);
  let page=adminHtml.replace('href="/admin.webmanifest"','href="'+i.base+'admin.webmanifest"')
   .replace('content="GearHub Admin"><link rel="apple-touch-icon" href="/app-icon.png"','content="'+escape(i.name+' Admin')+'"><link rel="apple-touch-icon" href="'+i.icon(180)+'"');
  page=swap(page,'<title>GearHub Admin</title>','<title>'+name+' Admin</title>');
  page=swap(page,'<a class="brand" href="/">','<a class="brand" href="'+i.base+'">');
  page=swap(page,'<span class="admin-brand-name">GEAR <em>HUB</em><small>ADMIN CONSOLE</small></span>','<span class="admin-brand-name shop-brand">'+name+'<small>ADMIN CONSOLE</small></span>');
  page=swap(page,'id="view-store-link" href="/"','id="view-store-link" href="'+i.base+'"');
  page=swap(page,'<h1>GearHub Admin</h1>','<h1>'+name+' · Admin</h1>');
  page=swap(page,'<h2 id="admin-store-title">GearHub · Admin</h2>','<h2 id="admin-store-title">'+name+' · Admin</h2>');
  page=swap(page,'<body class="admin-page">','<body class="admin-page seller-admin">');
  page=swap(page,'id="login-view" class="login-card"','id="login-view" class="login-card hidden"');
  res.type('html').send(page);
 });
 app.get('/shops/:slug/app-icon-:size.png',resolve,async(req,res,next)=>{try{const size=Number(req.params.size);if(![180,192,512].includes(size))return res.sendStatus(404);const i=req.installIdentity;
   let buffer;if(i.file){try{const logo=await sharp(i.file.path,{limitInputPixels:25000000,animated:false}).rotate().resize(Math.round(size*.72),Math.round(size*.72),{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();const circle=Buffer.from('<svg width="'+size+'" height="'+size+'" xmlns="http://www.w3.org/2000/svg"><circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+Math.round(size*.46)+'" fill="#fff"/></svg>');const inset=Math.round(size*.14);buffer=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:circle},{input:logo,left:inset,top:inset}]).png().toBuffer();}catch{}}
   // Neutral storefront fallback, never another tenant or the GearHub icon.
   if(!buffer)buffer=await sharp(Buffer.from('<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#f5f7f1"/><path d="M112 220V130h288v90M130 220v180h252V220M210 400V290h92v110M100 130l30-40h252l30 40" fill="none" stroke="#183426" stroke-width="24" stroke-linejoin="round"/></svg>')).resize(size,size).png().toBuffer();
   res.type('png').set('X-Content-Type-Options','nosniff').send(buffer);
  }catch(e){next(e);}});
 app.get('/splash-asset/:kind',(req,res)=>{
  const settings=splash.load(db),dir=splash.dirOf(dataDir),kind=req.params.kind;let file,type;
  if((kind==='pc'||kind==='phone')&&settings[kind]){file=path.join(dir,kind+'.jpg');type='image/jpeg';}
  else if(kind==='sound'&&settings.sound&&splash.SOUND_TYPES[settings.sound]){file=path.join(dir,'sound.'+settings.sound);type=splash.SOUND_TYPES[settings.sound];}
  else return res.sendStatus(404);
  res.set({'Content-Type':type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});
  res.sendFile(file,err=>{if(err&&!res.headersSent)res.sendStatus(404);});
 });
 // skyshopmm.com background: the owner's picture / moving SVG layer, or the built-in drawing.
 // Codex background pages run their own code, so they are served sandboxed (own empty origin, no
 // cookies, no outside requests) and only to frames of this site.
 // (frame-ancestors names the site itself: inside a sandbox 'self' means the page's own blank origin.)
 const PAGE_CSP="sandbox allow-scripts; default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors "+(publicOrigin?new URL(publicOrigin).origin:"'self'");
 app.get('/scene-asset/state',(req,res)=>{const st=siteScene.load(db);res.set('Cache-Control','no-cache').json({rev:st.rev,page:!!st.page,phonePage:!!st.phonePage,phone:!!st.phone});});
 app.get(['/scene-asset/page','/scene-asset/phone-page'],(req,res)=>{
  const st=siteScene.load(db),kind=req.path.endsWith('phone-page')&&st.phonePage?'phone-page':st.page?'page':st.phonePage?'phone-page':'';
  if(!kind)return res.sendStatus(404);
  res.removeHeader('X-Frame-Options');
  res.set({'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':PAGE_CSP}).type('html');
  res.sendFile(path.join(siteScene.dirOf(dataDir),siteScene.KINDS[kind][1]),err=>{if(err&&!res.headersSent)res.sendStatus(404);});
 });
 // Phones run the phone page's own program (e.g. swaying grass) in the page itself, not in a frame
 // (iPhone froze animations inside the frame). Only the owner can upload this page.
 app.get('/scene-asset/phone-script',(req,res)=>{
  if(!siteScene.load(db).phonePage)return res.sendStatus(404);
  let html;try{html=fs.readFileSync(path.join(siteScene.dirOf(dataDir),siteScene.KINDS['phone-page'][1]),'utf8');}catch{return res.sendStatus(404);}
  const code=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/i.exec(html)?.[1];
  if(!code)return res.sendStatus(404);
  res.set({'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).type('application/javascript').send(code);
 });
 app.get('/scene-asset/:kind',(req,res)=>{
  // Phones without their own picture/layer get the PC one; no picture at all = the built-in drawing.
  // (Sent directly, not redirected: a redirect to the sandboxed SVG fails to load in browsers.)
  const settings=siteScene.load(db),dir=siteScene.dirOf(dataDir),order={picture:['picture'],phone:['phone','picture'],layer:['layer'],'phone-layer':['phone-layer','layer']}[req.params.kind];
  if(!order)return res.sendStatus(404);
  const kind=order.find(k=>settings[siteScene.KINDS[k][0]]);
  res.set({'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  let file;
  if(kind)file=path.join(dir,siteScene.KINDS[kind][1]);
  else if(order.includes('picture'))file=path.join(publicDir,'images','platform-scene.svg');
  // No moving layer: an empty, see-through picture (a 404 shows a broken-image icon in Chrome).
  else return res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  if(file.endsWith('.svg'))res.type('image/svg+xml').set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");else res.type('image/jpeg');
  res.sendFile(file,err=>{if(err&&!res.headersSent)res.sendStatus(404);});
 });
 app.get('/shops/:slug', (req,res,next)=>{if(req.params.slug==='gearhub')return res.redirect('/');next();},resolve,(req,res)=>{const i=req.installIdentity;if(!req.path.endsWith('/'))return res.redirect(302,i.base+new URL(req.originalUrl,'http://localhost').search);
  const page=html.replace(/<title>[^<]*<\/title>/,'<title>'+escape(i.name)+'</title>')
   .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(">)/,'$1'+escape(i.name)+'$2')
   .replace('href="/app.webmanifest"','href="'+i.base+'app.webmanifest"')
   .replace('href="/app-icon.png"','href="'+i.icon(180)+'"')
   .replace('id="site-favicon" rel="icon" href="/favicon.ico"','id="site-favicon" rel="icon" href="'+i.icon(192)+'"')
   .replace('</head>','<link rel="canonical" href="'+escape(new URL(i.base,publicOrigin).href)+'"><meta name="gearhub-shop-name" content="'+escape(i.name)+'"></head>')
;
  // The owner console previews only public storefronts on this same origin.
  // Keep every other page (especially admin/login) under the global DENY policy.
  const csp=res.get('Content-Security-Policy')||"frame-ancestors 'none'";
  res.set({'X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':csp.replace(/frame-ancestors [^;]*/,"frame-ancestors 'self'")});
  res.type('html').send(withSplash(sellerBranding(page,i.name),splash.load(db)));
 });
}
// Every seller shop opens with the SkyShopMM picture (PC picture on wide / landscape screens,
// phone picture otherwise), a loading bar and an optional sound. The platform owner can change
// the pictures, the sound and the length (0 = none); skyshop-splash.js removes it.
const SPLASH_V='20261022-solid-1';
// The built-in opening pictures are versioned so phones keep them (and the service worker saves them).
const SPLASH_IMAGE_V='1';
function withSplash(page,settings){
 const seconds=Number(settings.seconds);if(!(seconds>0))return page;
 const asset=kind=>settings[kind]?'/splash-asset/'+kind+'?v='+encodeURIComponent(settings.rev):'/images/skyshop-splash-'+kind+'.jpg?v='+SPLASH_IMAGE_V;
 const sound=settings.sound?'/splash-asset/sound?v='+encodeURIComponent(settings.rev):'';
 const markup='<div id="sky-splash" role="presentation" data-seconds="'+seconds+'"'+(sound?' data-sound="'+sound+'"':'')+'><picture><source media="(orientation:landscape)" srcset="'+asset('pc')+'"><img src="'+asset('phone')+'" alt="" decoding="async" fetchpriority="high"></picture>'
  +'<div class="sky-splash-loading" role="status"><span class="sky-splash-message">ဆိုင်ကို ဖွင့်နေပါတယ် / Loading<span class="sky-splash-dots"></span></span><div class="sky-splash-bar"><i style="animation-duration:'+seconds+'s"></i></div></div></div><script src="/skyshop-splash.js?v='+SPLASH_V+'"></script>';
 return page.replace('</head>',()=>'<link rel="stylesheet" href="/skyshop-splash.css?v='+SPLASH_V+'"></head>').replace('<body>',()=>'<body>'+markup);
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
module.exports={installTenantApps,sellerBranding,withSplash};
