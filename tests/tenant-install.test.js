const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const express=require('express'),Database=require('better-sqlite3'),sharp=require('sharp');
const {installTenantApps}=require('../lib/tenant-install'),model=require('../lib/platform-model');
test('public install identities: server HTML, canonical URL, owned PNG icons, missing and suspended shops',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-install-')),db=new Database(':memory:');model.migrate(db);
 db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'a','a@example.test','A'),(11,'b','b@example.test','B');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'shop-a','Shop A',1,'active'),(11,11,'shop-b','Shop B',1,'active')");
 for(const [id,color]of [[10,'red'],[11,'blue']]){const dir=path.join(root,'platform-media',String(id));fs.mkdirSync(dir,{recursive:true});await sharp({create:{width:40,height:20,channels:3,background:color}}).jpeg().toFile(dir+'/logo.jpg');db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES(?,?,'image','image/jpeg',100,'logo.jpg',1)").run('logo-'+id,id);db.prepare('UPDATE platform_shops SET settings=? WHERE id=?').run(JSON.stringify({logoId:'logo-'+id,appearance:{brandName:id===10?'POLESTAR <A>':'Other shop',appIconUrl:id===10?'/api/platform/images/logo-11':''}}),id);}
 const app=express();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;installTenantApps(app,{db,dataDir:root,publicDir:path.join(__dirname,'../public'),publicOrigin:base});app.use(express.static(path.join(__dirname,'../public')));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(root,{recursive:true,force:true});});
 const r=await fetch(base+'/shops/shop-a?x=1',{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/shops/shop-a/?x=1');
 const html=await(await fetch(base+'/shops/shop-a/')).text();assert.match(html,/<title>POLESTAR &lt;A&gt;<\/title>/);assert.match(html,/apple-mobile-web-app-title" content="POLESTAR &lt;A&gt;/);assert.match(html,/href="\/shops\/shop-a\/app.webmanifest"/);assert.match(html,/rel="canonical" href="http:[^"]+\/shops\/shop-a\/"/);assert.doesNotMatch(html,/href="\/app-icon.png"/);assert.match(html,/<body><div id="sky-splash"[\s\S]*skyshop-splash-pc\.jpg[\s\S]*skyshop-splash-phone\.jpg[\s\S]*<script src="\/skyshop-splash\.js\?v=/,'every seller shop opens with the SkyShopMM picture');assert.match(html,/<link rel="stylesheet" href="\/skyshop-splash\.css\?v=/);
 // The owner's seconds, picture and sound reach every shop page; 0 seconds removes the opening screen.
 const splash=require('../lib/splash'),sdir=splash.dirOf(root);fs.mkdirSync(sdir,{recursive:true});
 fs.writeFileSync(path.join(sdir,'pc.jpg'),await sharp({create:{width:8,height:8,channels:3,background:'#3366ff'}}).jpeg().toBuffer());
 fs.writeFileSync(path.join(sdir,'sound.wav'),Buffer.concat([Buffer.from('RIFF'),Buffer.from([36,0,0,0]),Buffer.from('WAVEfmt '),Buffer.alloc(24)]));
 splash.save(db,{seconds:5,pc:true,phone:false,sound:'wav'});
 const custom=await(await fetch(base+'/shops/shop-a/')).text();
 assert.match(custom,/id="sky-splash"[^>]*data-seconds="5"[^>]*data-sound="\/splash-asset\/sound\?v=\d+"/);assert.match(custom,/srcset="\/splash-asset\/pc\?v=\d+"/);assert.match(custom,/<img src="\/images\/skyshop-splash-phone\.jpg\?v=1"/);assert.match(custom,/animation-duration:5s/);
 const pcAsset=await fetch(base+'/splash-asset/pc?v=1');assert.equal(pcAsset.status,200);assert.equal(pcAsset.headers.get('content-type'),'image/jpeg');
 const soundAsset=await fetch(base+'/splash-asset/sound?v=1');assert.equal(soundAsset.status,200);assert.equal(soundAsset.headers.get('content-type'),'audio/wav');
 assert.equal((await fetch(base+'/splash-asset/phone')).status,404,'no custom phone picture: the built-in one is used');
 splash.save(db,{seconds:0,pc:true,phone:false,sound:'wav'});assert.doesNotMatch(await(await fetch(base+'/shops/shop-a/')).text(),/id="sky-splash"/);
 splash.save(db,{seconds:3,pc:false,phone:false,sound:''});
 const a=await(await fetch(base+'/shops/shop-a/app.webmanifest')).json(),b=await(await fetch(base+'/shops/shop-b/app.webmanifest',{headers:{Cookie:'fake=owner'}})).json();assert.equal(a.id,'/shops/shop-a/');const am=await(await fetch(base+'/shops/shop-a/admin.webmanifest')).json();assert.equal(am.id,'/shops/shop-a/admin');assert.equal(am.start_url,'/shops/shop-a/admin');assert.equal(am.scope,'/');const ah=await(await fetch(base+'/shops/shop-a/admin')).text();assert.match(ah,/href="\/shops\/shop-a\/admin\.webmanifest"/);assert.doesNotMatch(ah,/href="\/admin\.webmanifest"/);assert.match(ah,/<title>POLESTAR &lt;A&gt; Admin<\/title>/);assert.match(ah,/class="admin-brand-name shop-brand">POLESTAR &lt;A&gt;<small>ADMIN CONSOLE/);assert.match(ah,/<h1>POLESTAR &lt;A&gt; · Admin<\/h1>/);assert.match(ah,/id="admin-store-title">POLESTAR &lt;A&gt; · Admin/);assert.match(ah,/id="login-view" class="login-card hidden"/);assert.doesNotMatch(ah.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<script[\s\S]*?<\/script>/g,''),/GearHub|GEAR <em>HUB/,'a seller admin never carries the GearHub name in its first paint');assert.equal(a.scope,a.start_url);assert.equal(a.background_color,'#ffffff','Android launch background stays white behind the original shop icon');assert.equal(a.theme_color,'#ffffff','installed seller storefront top bar blends into the white page');assert.equal(a.start_url,a.id);assert.notEqual(a.id,b.id);assert.equal(a.name,'POLESTAR <A>');
 const icon=await fetch(base+a.icons[1].src);assert.equal(icon.headers.get('content-type'),'image/png');const image=Buffer.from(await icon.arrayBuffer()),meta=await sharp(image).metadata();assert.equal(meta.width,512);assert.equal(meta.height,512);const raw=await sharp(image).raw().toBuffer({resolveWithObject:true});const middle=(256*512+256)*raw.info.channels;assert(raw.data[middle]>200&&raw.data[middle+2]<60,'cross-tenant app icon must fall back to OWN red logo');assert.equal(raw.info.channels,4);assert.equal(raw.data[3],0,'shop icon corners are transparent so Android shows the circular icon');
 const rootManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/manifest.webmanifest')));assert.equal(rootManifest.id,'/');assert.equal(rootManifest.start_url,'/');assert.equal(rootManifest.short_name,'GearHub');
 db.prepare("UPDATE platform_shops SET settings='{}' WHERE id=10").run();const fallback=await fetch(base+'/shops/shop-a/app-icon-180.png');assert.equal((await sharp(Buffer.from(await fallback.arrayBuffer())).metadata()).width,180);
 assert.equal((await fetch(base+'/shops/missing/')).status,404);db.prepare("UPDATE platform_users SET status='suspended' WHERE id=11").run();assert.equal((await fetch(base+'/shops/shop-b/app.webmanifest')).status,404);
});
test('offline navigation never falls back from a tenant to root or another tenant',async()=>{
 const handlers={},entries=new Map();const origin='https://example.test';
 const caches={open:async name=>({match:async key=>entries.get(name+' '+(typeof key==='string'?new URL(key,origin).href:key.url)),put:async()=>{}}),match:async()=>new Response('ROOT'),keys:async()=>[]};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'),{self:{location:{origin},addEventListener:(n,f)=>handlers[n]=f},caches,URL,Response,fetch:async()=>{throw Error('offline')}});
 async function navigate(p){let response;handlers.fetch({request:{url:origin+p,mode:'navigate',method:'GET'},respondWith:r=>response=r});return response;}
 entries.set('gearhub-shell-v85-1.1.174 '+origin+'/shops/shop-a/',new Response('SHOP A'));entries.set('gearhub-offline-v2:/shops/shop-b/ '+origin+'/shops/shop-b/',new Response('SHOP B'));
 assert.equal(await(await navigate('/shops/shop-a/')).text(),'SHOP A');assert.equal(await(await navigate('/shops/shop-b/')).text(),'SHOP B');assert.equal((await navigate('/shops/shop-c/')).status,503);assert.equal(await(await navigate('/')).text(),'ROOT');
});
test('offline saves reject root, other tenant and admin URLs from a shop client',async()=>{
 const handlers={},saved=[],posted=[];let pending;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>handlers[n]=f},URL,Response,caches:{open:async name=>({put:async url=>saved.push([name,url]),match:async()=>null}),match:async()=>null},fetch:async()=>new Response('ok')});
 handlers.message({source:{url:'https://example.test/shops/shop-a/'},data:{type:'SAVE_OFFLINE',urls:['/','/shops/shop-b/','/shops/shop-a/admin','/shops/shop-a/','/style.css','/api/products','/api/platform/images/photo-1']},waitUntil:p=>pending=p,ports:[{postMessage:m=>posted.push(m)}]});await pending;
 assert.deepEqual(saved.map(x=>x[1]),['/shops/shop-a/','/style.css','/api/platform/images/photo-1'],'product photos are saved for offline (owner: photos blank with internet off)');
 // Settings shows the download as 1–100 %, then "Offline success" (owner: "I can't tell whether offline finished").
 assert.equal(JSON.stringify(posted),JSON.stringify([{progress:3,total:3},{ok:true,error:null}]));assert(saved.every(x=>x[0]==='gearhub-offline-v2:/shops/shop-a/'));
});

test('offline save does not download saved product photos again (POLESTAR has ~650)',async()=>{
 const handlers={},fetched=[],saved=[];let pending;
 const store=new Map([['/api/platform/images/old',new Response('old')]]),seen=new Map([['/api/platform/images/seen',new Response('seen')]]);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>handlers[n]=f},URL,Response,caches:{open:async()=>({put:async url=>saved.push(url),match:async url=>store.get(url)}),match:async url=>seen.get(url)||store.get(url)},fetch:async url=>{fetched.push(url);return new Response('ok')}});
 handlers.message({source:{url:'https://example.test/shops/shop-a/'},data:{type:'SAVE_OFFLINE',urls:['/api/platform/images/old','/api/platform/images/seen','/api/platform/images/new','/shops/shop-a/']},waitUntil:p=>pending=p,ports:[{postMessage:()=>{}}]});await pending;
 assert.deepEqual(fetched.sort(),['/api/platform/images/new','/shops/shop-a/']);assert.deepEqual(saved.sort(),['/api/platform/images/new','/api/platform/images/seen','/shops/shop-a/']);
});

test('saved product photos show at once even when the network hangs (gallery thumbnails were blank offline)',async()=>{
 const handlers={};let answer;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>handlers[n]=f},URL,Response,caches:{match:async()=>new Response('saved photo')},fetch:()=>new Promise(()=>{})});
 handlers.fetch({request:{method:'GET',url:'https://example.test/api/platform/images/photo-2',mode:'no-cors'},respondWith:p=>answer=p});
 assert.equal(await (await answer).text(),'saved photo');
});

test('admin pages are installable apps whose scope includes the store and login',async()=>{
 const fs=require('fs'),path=require('path');
 const html=fs.readFileSync(path.join(__dirname,'..','public','admin.html'),'utf8');
 assert.match(html,/<link rel="manifest" href="\/admin\.webmanifest">/);
 assert.match(html,/apple-mobile-web-app-capable/);
 const lib=fs.readFileSync(path.join(__dirname,'..','lib','tenant-install.js'),'utf8');
 assert.match(lib,/start_url:i\.base\+'admin',scope:'\/'/);
});
