const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const express=require('express'),session=require('express-session'),Database=require('better-sqlite3');
const model=require('../lib/platform-model'),{createPlatform}=require('../lib/platform');

test('manual and spreadsheet products record server posting time once; edits and legacy rows keep their history',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-posted-time-')),db=new Database(':memory:');model.migrate(db);
  db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(10,'fixture','fixture@example.test','Owner');INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(10,10,'time-shop','Time shop',1,'active');INSERT INTO platform_products(shop_id,sku,name,price,stock,details) VALUES(10,'LEGACY','Legacy',100,5,'{}')");
  const app=express();app.use(express.json(),session({secret:'posting-time-fixture-'.repeat(3),resave:false,saveUninitialized:false}));
  app.post('/fixture-login',(req,res)=>{req.session.platformUser=10;res.json({ok:true});});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
  app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:base,env:{}}));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(root,{recursive:true,force:true});});
  let cookie='',token='';
  const request=async(url,method='GET',body)=>{const r=await fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
  await request('/fixture-login','POST',{});token=(await(await request('/api/platform/me')).json()).csrfToken;
  const product={sku:'MANUAL',name:'Manual product',description:'Caption',price:1000,stock:5,postedAt:'1999-01-01T00:00:00.000Z'};
  const start=Date.now();assert.equal((await request('/api/platform/shops/10/products','POST',product)).status,200);
  const row=sku=>db.prepare('SELECT * FROM platform_products WHERE shop_id=? AND sku=?').get(10,sku),details=sku=>JSON.parse(row(sku).details);
  const original=details('MANUAL').postedAt;
  assert.ok(Date.parse(original)>=start&&Date.parse(original)<=Date.now(),'timestamp comes from the server, not the request');
  assert.notEqual(original,product.postedAt);
  assert.equal((await request('/api/platform/shops/10/products/'+row('MANUAL').id,'PATCH',{...product,name:'Edited',stock:6,expectedStock:5,postedAt:'2000-01-01T00:00:00Z'})).status,200);
  assert.equal(details('MANUAL').postedAt,original);
  const importedAt=Date.now();
  const rows=[{sku:'MANUAL',name:'Imported edit'},{sku:'LEGACY',name:'Legacy edit'},{sku:'EXCEL',name:'Excel new',postedAt:product.postedAt}];
  assert.equal((await request('/api/platform/shops/10/spreadsheets/import','POST',{rows})).status,200);
  const excel=details('EXCEL').postedAt;assert.ok(Date.parse(excel)>=importedAt&&Date.parse(excel)<=Date.now());
  assert.equal(details('MANUAL').postedAt,original);assert.equal(details('LEGACY').postedAt,undefined,'old dates are never guessed');
  assert.equal((await request('/api/platform/shops/10/spreadsheets/import','POST',{rows})).status,200);assert.equal(details('EXCEL').postedAt,excel);
  const feed=(await(await request('/api/platform/feed?mode=mixed')).json()).items;
  assert.equal(feed.find(p=>p.sku==='MANUAL').postedAt,original);assert.equal(feed.find(p=>p.sku==='EXCEL').postedAt,excel);assert.equal(feed.find(p=>p.sku==='LEGACY').postedAt,null);
});

test('post dates use Myanmar time and unknown saved/legacy dates never become a fake timestamp',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/shops-feed.js'),'utf8');
  const start=source.indexOf('function postTime('),end=source.indexOf('  const icon =',start);
  const render=new Function('t','esc',source.slice(start,end)+';return postTime;')(key=>({timeUnknown:'Time unavailable',posted:'Posted',myanmarTime:'Myanmar time'})[key],s=>String(s).replace(/[&<>"']/g,'_'));
  const html=render('2026-11-04T13:22:00.000Z');
  assert.match(html,/datetime="2026-11-04T13:22:00.000Z"/);assert.match(html,/4 Nov 2026/);assert.match(html.toLowerCase(),/7:52\s?pm/);assert.match(html,/UTC\+06:30/);
  for(const value of [undefined,null,'not-a-date','" onmouseover="bad']){const unknown=render(value);assert.match(unknown,/Time unavailable/);assert.doesNotMatch(unknown,/datetime=|onmouseover/);}
});

test('Discover keeps the existing navigation route and uses compass icons at both sizes',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  for(const kind of ['desktop-nav-item','bottom-nav-item']){
    const button=html.match(new RegExp('<button[^>]*class="'+kind+'"[^>]*data-store-view="shops">[\\s\\S]*?</button>'))[0];
    assert.match(button,/>Discover</);assert.match(button,/<circle/);assert.doesNotMatch(button,/>Shops</);
  }
  assert.match(html,/id="shops-heading">Discover<\/h1>/);
});
