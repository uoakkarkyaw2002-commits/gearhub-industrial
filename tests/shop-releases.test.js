const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const {createShopReleases} = require('../lib/shop-releases');
const {createPlatform} = require('../lib/platform');
const {installTenantApps} = require('../lib/tenant-install');
const {originGuard} = require('../lib/security');
const model = require('../lib/platform-model');
const current = require('../package.json').version;
const publicDir = path.join(__dirname, '../public');

test('deploys keep seller HTML, admin, worker and lazy assets pinned until the GearHub owner confirms', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-release-'));
  const db = new Database(path.join(root, 'test.sqlite'));
  model.migrate(db);
  let releases = createShopReleases({db, dataDir:root, publicDir});
  assert.equal(releases.status().deployedVersion, current);
  assert.equal(releases.published().version, '1.1.287', 'the first deployment is also gated');
  const app = express();
  app.use(express.json(), session({secret:'fixture-secret-'.repeat(3), resave:false, saveUninitialized:false}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  app.use('/api', originGuard(base));
  app.use('/api/platform', createPlatform({db, dataDir:root, publicOrigin:base, releases,
    env:{PLATFORM_OWNER_EMAIL:'owner@gmail.com'},
    identityProvider:async (code, nonce) => ({sub:code, email:code+'@gmail.com', email_verified:true, nonce})}));
  app.use('/app-builds', releases.assets);
  installTenantApps(app, {db, dataDir:root, publicDir, publicOrigin:base, releases});
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); fs.rmSync(root, {recursive:true, force:true}); });
  async function login(code) {
    let cookie = '', token;
    async function request(url, method='GET', body, csrf=true) {
      const response = await fetch(base + '/api/platform' + url, {method, redirect:'manual',
        headers:{Origin:base, Cookie:cookie, 'Content-Type':'application/json', ...(csrf?{'X-CSRF-Token':token||''}:{})},
        body:body?JSON.stringify(body):undefined});
      if (response.headers.get('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
      return response;
    }
    token=(await (await request('/me')).json()).csrfToken;
    const {url}=await (await request('/auth/start','POST',{})).json();
    await request('/auth/callback?code='+code+'&state='+new URL(url).searchParams.get('state'));
    token=(await (await request('/me')).json()).csrfToken;
    return request;
  }
  const owner = await login('owner'), seller = await login('seller');
  const sellerUser=db.prepare("SELECT id FROM platform_users WHERE google_sub='seller'").get();
  db.prepare("INSERT INTO platform_shops(owner_id,slug,name,plan_id,subscription_status) VALUES(?, 'qa-a', 'QA A', 1, 'active')").run(sellerUser.id);
  const get = async url => (await fetch(base+url)).text();
  const before = await get('/shops/qa-a/');
  assert.match(before, /gearhub-build-version" content="1\.1\.287/);
  assert.match(before, /\/app-builds\/1\.1\.287\/excel-map\.js/);
  assert.doesNotMatch(before, /<title>GearHub/);
  assert.match(await get('/shops/qa-a/admin'), /\/app-builds\/1\.1\.287\/admin\.js/);
  const workerBefore = await get('/shops/qa-a/sw.js');
  assert.match(workerBefore, /gearhub-shell-v85-1\.1\.287:shop-qa-a/);
  const workerOther = releases.worker('qa-b');
  assert.notEqual(workerBefore, workerOther, 'one shop cannot purge another shop shell cache');
  const workerHandlers={}, deleted=[];
  vm.runInNewContext(workerBefore,{self:{location:{origin:base},addEventListener:(n,f)=>workerHandlers[n]=f,clients:{claim:async()=>{}}},caches:{keys:async()=>['gearhub-shell-v85-old:shop-qa-a','gearhub-shell-v85-old:shop-qa-b','gearhub-shell-v85-new:gearhub'],delete:async key=>deleted.push(key)}});
  let activation;workerHandlers.activate({waitUntil:p=>activation=p});await activation;
  assert.deepEqual(deleted,['gearhub-shell-v85-old:shop-qa-a']);
  const rootFetch=[];
  vm.runInNewContext(releases.worker(),{URL,self:{location:{origin:base},clients:{get:async id=>({url:base+(id==='seller'?'/shops/qa-a/':'/index.html')})},addEventListener:(name,fn)=>{if(name==='fetch')rootFetch.push(fn);}},fetch:async url=>url});
  const legacyCheck=async id=>{let reply;for(const fn of rootFetch)fn({clientId:id,request:{url:base+'/api/app-release',method:'GET'},respondWith:value=>reply=value});return reply;};
  assert.equal(await legacyCheck('gearhub'),base+'/api/app-release?preview=gearhub','existing GearHub pages update on the first deploy');
  assert.equal(await legacyCheck('seller'),base+'/api/app-release','legacy seller pages never bypass approval');
  const lazy = await get('/app-builds/1.1.287/excel-search-index.js');
  assert.match(lazy, /new Worker\('\/app-builds\/1\.1\.287\/excel-search-index\.js/);
  assert.equal((await fetch(base+'/app-builds/1.1.287/files.json')).status,404);
  assert.equal((await fetch(base+'/app-builds/1.1.287/%2e%2e%2fgearhub.sqlite')).status,404);
  assert.equal((await seller('/owner/release','POST',{version:current})).status,403);
  assert.equal((await owner('/owner/release','POST',{version:current},false)).status,403);
  assert.equal(releases.published().version,'1.1.287');
  assert.equal((await owner('/owner/release','POST',{version:'9.9.9'})).status,409);
  assert.equal((await owner('/owner/release','POST',{version:current,notes:'Confirmed fixture'})).status,200);
  const after = await get('/shops/qa-a/');
  assert.ok(after.includes('gearhub-build-version" content="'+current));
  assert.ok(after.includes('/app-builds/'+current+'/excel-map.js'));
  assert.ok((await get('/shops/qa-a/admin')).includes('/app-builds/'+current+'/admin.js'));
  assert.ok((await get('/shops/qa-a/sw.js')).includes('gearhub-shell-v85-'+current+':shop-qa-a'));
  const publishedAt = releases.published().publishedAt;
  releases.publish(current);
  assert.equal(releases.published().publishedAt,publishedAt,'confirmation is idempotent');
  // A subsequent deploy uses new source files but the same durable release state.
  const next='1.1.999';
  const restarted=createShopReleases({db,dataDir:root,publicDir,version:next});
  assert.equal(restarted.published().version,current);
  assert.equal(restarted.worker('qa-a'),releases.worker('qa-a'),'unapproved deploy cannot change the shop worker');
  assert.equal(restarted.status().pending,true);
  assert.throws(()=>restarted.publish(current),/Deploy changed/);
  assert.equal(await get('/shops/qa-a/'),after,'fresh visitors also retain the confirmed build');
  assert.equal(await get('/app-builds/1.1.287/excel-search-index.js'),lazy,'in-flight old pages retain their assets after confirmation');
  fs.rmSync(path.join(root,'app-builds',current),{recursive:true});
  assert.throws(()=>createShopReleases({db,dataDir:root,publicDir,version:next}),/ENOENT/,'missing approved files must not silently publish a pending build');
});

test('Settings confirmation stays owner-only, sends CSRF and prevents double submission', async () => {
  const source=fs.readFileSync(path.join(publicDir,'release-control.js'),'utf8');
  const nodes=Object.fromEntries(['control','detail','feedback','confirm'].map(name=>['shop-release-'+name,{hidden:true,addEventListener:(event,fn)=>{nodes['shop-release-'+name].click=fn;}}]));
  let allowed=false, posts=0, pending=true, resolvePost;
  const requests=[];
  const fetch=async (url, options={}) => {
    requests.push([url,options]);
    if(url.endsWith('/csrf'))return {ok:true,json:async()=>({csrfToken:'test-token'})};
    if(options.method==='POST'){posts++;assert.equal(options.headers['X-CSRF-Token'],'test-token');assert.equal(JSON.parse(options.body).version,current);await new Promise(resolve=>resolvePost=resolve);pending=false;}
    return {ok:allowed,json:async()=>({deployedVersion:current,sellerVersion:pending?'1.1.287':current,pending})};
  };
  const ctx={location:{pathname:'/index.html'},document:{getElementById:id=>nodes[id],addEventListener(){}},fetch};
  vm.runInNewContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes['shop-release-control'].hidden,true,'visitors cannot see a release action');
  allowed=true;vm.runInNewContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes['shop-release-control'].hidden,false);
  const first=nodes['shop-release-confirm'].click();await new Promise(resolve=>setImmediate(resolve));
  await nodes['shop-release-confirm'].click();assert.equal(posts,1);
  resolvePost();await first;assert.equal(nodes['shop-release-confirm'].disabled,true);
  const count=requests.length;ctx.location.pathname='/shops/qa-a/';vm.runInNewContext(source,ctx);assert.equal(requests.length,count);
});

test('real server Settings endpoint requires GearHub login and CSRF, and changes every shop only on confirmation', async t => {
  const {spawn}=require('node:child_process'),net=require('node:net');
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gh-release-server-'));
  const socket=net.createServer();socket.listen(0,'127.0.0.1');await new Promise(resolve=>socket.once('listening',resolve));
  const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const base='http://127.0.0.1:'+port,password='Release fixture passphrase 2026';
  let logs='';
  const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'test',PORT:String(port),DATA_DIR:dataDir,UPLOAD_DIR:path.join(dataDir,'uploads'),PUBLIC_ORIGIN:base,SESSION_SECRET:'release-fixture-secret-'.repeat(3),ADMIN_PASSWORD:password,ADMIN_USERNAME:'admin',PLATFORM_ENABLED:'true',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',BACKUP_S3_BUCKET:'',FILES_S3_BUCKET:'',BACKUP_EMAIL_ENABLED:'false',ALERT_EMAIL_ENABLED:'false'}});
  child.stdout.on('data',value=>logs+=value);child.stderr.on('data',value=>logs+=value);
  t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}fs.rmSync(dataDir,{recursive:true,force:true});});
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}if(child.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,logs);
  const db=new Database(path.join(dataDir,'gearhub.sqlite'));
  db.exec("INSERT INTO platform_users(id,google_sub,email,name) VALUES(101,'fixture-a','fixture-a@example.test','A'),(102,'fixture-b','fixture-b@example.test','B');INSERT INTO platform_shops(owner_id,slug,name,plan_id,subscription_status) VALUES(101,'fixture-a','A',1,'active'),(102,'fixture-b','B',1,'active')");db.close();
  const page=async slug=>(await fetch(base+'/shops/'+slug+'/')).text();
  const beforeA=await page('fixture-a'),beforeB=await page('fixture-b');
  assert.match(beforeA,/gearhub-build-version" content="1\.1\.287/);assert.match(beforeB,/gearhub-build-version" content="1\.1\.287/);
  assert.equal((await (await fetch(base+'/api/app-release')).json()).version,'1.1.287');
  assert.equal((await (await fetch(base+'/api/app-release?preview=gearhub')).json()).version,current);
  assert.ok((await (await fetch(base+'/index.html')).text()).includes('gearhub-build-version" content="'+current));
  let cookie='',token='';
  const request=async(url,method='GET',body,csrf=true)=>{
    const response=await fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':token}:{})},body:body?JSON.stringify(body):undefined});
    if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;
  };
  assert.equal((await request('/api/admin/app-release')).status,401);
  token=(await(await request('/api/admin/csrf')).json()).csrfToken;
  assert.equal((await request('/api/admin/app-release','POST',{version:current})).status,401);
  const login=await request('/api/admin/login','POST',{password});assert.equal(login.status,200);token=(await login.json()).csrfToken;
  assert.equal((await(await request('/api/admin/app-release')).json()).pending,true);
  assert.equal((await request('/api/admin/app-release','POST',{version:current},false)).status,403);
  assert.equal((await request('/api/admin/app-release','POST',{version:'9.9.9'})).status,409);
  assert.equal(await page('fixture-a'),beforeA,'failed confirmations do not publish');
  const confirmed=await request('/api/admin/app-release','POST',{version:current});assert.equal(confirmed.status,200);assert.equal((await confirmed.json()).pending,false);
  assert.ok((await page('fixture-a')).includes('gearhub-build-version" content="'+current));
  assert.ok((await page('fixture-b')).includes('gearhub-build-version" content="'+current));
  assert.equal((await(await fetch(base+'/api/app-release')).json()).version,current);
});
