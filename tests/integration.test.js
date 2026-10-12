const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');const net=require('node:net');const {spawn,spawnSync}=require('node:child_process');const {once}=require('node:events');const Database=require('better-sqlite3');
const secret='test-session-secret-'.repeat(3),password='GearHub test passphrase 2026';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function freePort(){const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(r=>server.close(r));return port;}
class Client{constructor(origin){this.origin=origin;this.cookie='';this.token='';}async request(url,method='GET',body,extra={}){const headers={Origin:this.origin,...extra};if(this.cookie)headers.Cookie=this.cookie;if(this.token)headers['X-CSRF-Token']=this.token;Object.assign(headers,extra);if(body&&! (body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}const res=await fetch(this.origin+url,{method,headers,body});const cookie=res.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];return res;}async json(url,method='GET',body,extra){const res=await this.request(url,method,body,extra);const data=await res.json();return {status:res.status,data,res};}async csrf(){this.token=(await this.json('/api/admin/csrf')).data.csrfToken;}async login(pass=password){await this.csrf();const r=await this.json('/api/admin/login','POST',{password:pass});assert.equal(r.status,200);this.token=r.data.csrfToken;}}
function cart(items){const f=new FormData();for(const [key,value] of Object.entries({customerName:'Test customer',phone:'09123456',address:'Test address',language:'en',items:JSON.stringify(items)}))f.set(key,value);f.set('receipt',new Blob([png],{type:'image/png'}),'receipt.png');return f;}
test('stock transactions, CSRF, idempotency, reset races, backups and restart persistence',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gearhub-test-'));const port=await freePort();const origin=`http://127.0.0.1:${port}`;
 let server;let logs='';let db;
 const start=async(extra={})=>{server=spawn(process.execPath,['--require',path.join(__dirname,'fixtures/failures.cjs'),'server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'test',PORT:String(port),DATA_DIR:temp,UPLOAD_DIR:path.join(temp,'uploads'),PUBLIC_ORIGIN:origin,SESSION_SECRET:secret,ADMIN_PASSWORD:password,ADMIN_USERNAME:'admin',BACKUP_INTERVAL_HOURS:'24',BACKUP_S3_BUCKET:'',BACKUP_EMAIL_ENABLED:'false',ALERT_EMAIL_ENABLED:'false',...extra}});server.stdout.on('data',v=>logs+=v);server.stderr.on('data',v=>logs+=v);for(let i=0;i<200;i++){if(server.exitCode!==null)throw Error(logs);try{if((await fetch(origin+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,50));}throw Error(logs);};
 const stop=async()=>{if(server&&server.exitCode===null){const finished=once(server,'exit');server.kill('SIGTERM');await finished;}};
 t.after(async()=>{db?.close();await stop();fs.rmSync(temp,{recursive:true,force:true});});await start();db=new Database(path.join(temp,'gearhub.sqlite'));const admin=new Client(origin);await admin.login();
 await t.test('origin and CSRF defenses cover JSON, login, and multipart uploads',async()=>{const anonymous=new Client(origin);assert.equal((await anonymous.json('/api/admin/login','POST',{password})).status,403);await anonymous.csrf();assert.equal((await anonymous.json('/api/admin/login','POST',{password},{Origin:'https://attacker.example'})).status,403);assert.equal((await admin.json('/api/admin/products','POST',{}, {'X-CSRF-Token':'bad'})).status,403);const files=new FormData();files.set('images',new Blob([png],{type:'image/png'}),'image.png');const uploaded=await admin.json('/api/admin/uploads','POST',files);assert.equal(uploaded.status,201);assert.equal(uploaded.data.imageUrls.length,1);const headers=(await fetch(origin+'/')).headers;assert.match(headers.get('content-security-policy'),/script-src 'self'/);assert.equal(headers.get('x-content-type-options'),'nosniff');});
 await t.test('invalid receipt MIME, signatures and oversize files fail without creating orders',async()=>{
 const before=db.prepare('SELECT COUNT(*) n FROM orders').get().n;
 const client=new Client(origin);
 for(const file of [new Blob(['not an image'],{type:'image/png'}),new Blob(['unsupported'],{type:'text/plain'}),new Blob([Buffer.alloc(5*1024*1024+1)],{type:'image/png'})]){
  const form=cart([{id:1,quantity:1}]);form.set('receipt',file,'invalid.png');assert.equal((await client.json('/api/orders','POST',form)).status,400);
 }
 const absent=cart([{id:1,quantity:1}]);absent.delete('receipt');assert.equal((await client.json('/api/orders','POST',absent)).status,400);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n,before);
 const publicReceipt=await fetch(origin+'/uploads/../receipts/test.png');assert.equal(publicReceipt.status,404);
 assert.equal((await client.json('/api/admin/orders/1/receipt')).status,401);
 assert.equal(fs.readdirSync(path.join(temp,'receipts')).length,0);
 });
 await t.test('admin upload signature failures and size limits leave no invalid public files',async()=>{
 const before=fs.readdirSync(path.join(temp,'uploads')).length;
 for(const file of [new Blob(['fake png'],{type:'image/png'}),new Blob([Buffer.alloc(5*1024*1024+1)],{type:'image/png'})]){const form=new FormData();form.set('images',file,'bad.png');assert.equal((await admin.json('/api/admin/uploads','POST',form)).status,400);}
 assert.equal(fs.readdirSync(path.join(temp,'uploads')).length,before);
 });
 // Restart clears rate-limit counters between independent receipt and checkout cases.
 db.close();db=null;await stop();await start();db=new Database(path.join(temp,'gearhub.sqlite'));
 let product,order;
 await t.test('duplicate concurrent checkout reserves inventory exactly once',async()=>{const created=await admin.json('/api/admin/products','POST',{sku:'SEC-TEST',nameEn:'Test part',categoryEn:'Tests',price:100,stock:5});assert.equal(created.status,201);product=created.data.id;const client=new Client(origin),key=crypto.randomUUID();const results=await Promise.all([client.json('/api/orders','POST',cart([{id:product,quantity:3}]),{'Idempotency-Key':key}),client.json('/api/orders','POST',cart([{id:product,quantity:3}]),{'Idempotency-Key':key})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);assert.equal(results[0].data.order.id,results[1].data.order.id);order=results[0].data.order.id;assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM orders WHERE request_key=?').get(key).n,1);assert.equal((await client.json('/api/orders','POST',cart([{id:product,quantity:1}]),{'Idempotency-Key':key})).status,409);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);});
 await t.test('competing orders and invalid carts cannot oversell',async()=>{const client=new Client(origin);const results=await Promise.all([client.json('/api/orders','POST',cart([{id:product,quantity:2}]),{'Idempotency-Key':crypto.randomUUID()}),client.json('/api/orders','POST',cart([{id:product,quantity:2}]),{'Idempotency-Key':crypto.randomUUID()})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,0);assert.equal((await admin.json('/api/admin/products/'+product,'PATCH',{stock:5,expectedStock:2})).status,409);const failed=await client.json('/api/orders','POST',cart([{id:product,quantity:1000},{id:product,quantity:1}]));assert.equal(failed.status,400);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,0);});
 await t.test('server pricing ignores submitted price and multi-product restore rolls back atomically',async()=>{
 const make=async(sku,stock)=>(await admin.json('/api/admin/products','POST',{sku,nameEn:sku,categoryEn:'Tests',price:75,stock})).data.id;
 const first=await make('PAIR-A',4),second=await make('PAIR-B',4),client=new Client(origin);
 const placed=await client.json('/api/orders','POST',cart([{id:first,quantity:2,unitPrice:1},{id:second,quantity:2,unitPrice:1}]),{'Idempotency-Key':crypto.randomUUID()});assert.equal(placed.status,201);assert.equal(placed.data.order.total,300);
 const id=placed.data.order.id;
 assert.equal((await admin.json('/api/admin/orders/'+id,'PATCH',{status:'cancelled',paymentStatus:'pending'})).status,200);
 await admin.json('/api/admin/products/'+second,'PATCH',{stock:1,expectedStock:4});
 const reopen=await admin.json('/api/admin/orders/'+id,'PATCH',{status:'pending',paymentStatus:'pending'});assert.equal(reopen.status,400);
 assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(first).stock,4);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(second).stock,1);assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(id).status,'cancelled');
 });
 const update=(status,paymentStatus='pending',extra={})=>admin.json('/api/admin/orders/'+order,'PATCH',{status,paymentStatus,...extra});
 await t.test('cancel once, reject insufficient restore, and block unsafe fulfillment transitions',async()=>{assert.equal((await update('confirmed','pending',{confirmationDate:'2026-02-31'})).status,400);assert.equal((await update('cancelled')).status,200);assert.equal((await update('cancelled')).status,200);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,3);await admin.json('/api/admin/products/'+product,'PATCH',{stock:2,expectedStock:3});assert.equal((await update('pending')).status,400);assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order).status,'cancelled');assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);await admin.json('/api/admin/products/'+product,'PATCH',{stock:5,expectedStock:2});assert.equal((await update('pending')).status,200);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);assert.equal((await update('shipped')).status,400);assert.equal((await update('shipped','paid')).status,200);assert.equal((await update('cancelled','paid')).status,400);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);});
 await t.test('session and catalog persist across a process restart',async()=>{db.close();db=null;await stop();await start();db=new Database(path.join(temp,'gearhub.sqlite'));assert.equal((await admin.json('/api/admin/me')).status,200);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);});
 await t.test('backups contain committed database, product uploads and private receipts',async()=>{const result=await admin.json('/api/admin/backup/run','POST',{});assert.equal(result.status,200);const state=(await admin.json('/api/admin/operations')).data;assert.ok(state.last_success);assert.equal(state.offsiteConfigured,false);const archives=fs.readdirSync(path.join(temp,'backups')).filter(n=>n.endsWith('.tar.gz'));assert.ok(archives.length);const archive=path.join(temp,'backups',archives.at(-1));const listing=spawnSync('tar',['-tzf',archive],{encoding:'utf8'});assert.equal(listing.status,0);assert.match(listing.stdout,/gearhub.sqlite/);assert.match(listing.stdout,/uploads\/.*png/);assert.match(listing.stdout,/receipts\/.*png/);const restore=path.join(temp,'restore');fs.mkdirSync(restore);assert.equal(spawnSync('tar',['-xzf',archive,'-C',restore]).status,0);assert.equal(require('../scripts/verify-restore').verifyRestore(path.join(restore,'gearhub-backup')).ok,true);const snapshot=new Database(path.join(restore,'gearhub-backup','gearhub.sqlite'),{readonly:true});assert.equal(snapshot.pragma('integrity_check',{simple:true}),'ok');assert.equal(snapshot.prepare('SELECT stock FROM products WHERE id=?').get(product).stock,2);snapshot.close();});
 await t.test('backup alerts do not mark a functioning storefront unhealthy',async()=>{
 db.prepare("UPDATE backup_status SET last_failure=? WHERE id=1").run(new Date().toISOString());
 assert.equal((await fetch(origin+'/api/health')).status,200);
 assert.equal((await fetch(origin+'/api/health/backups')).status,503);
 db.prepare("UPDATE backup_status SET last_failure=NULL WHERE id=1").run();
 assert.equal((await fetch(origin+'/api/health/backups')).status,200);
 });
 await t.test('backup export temp-directory failure responds safely without stopping the app',async()=>{
 db.close();db=null;await stop();await start({TEST_EXPORT_FAILURE:'true'});db=new Database(path.join(temp,'gearhub.sqlite'));
 assert.equal((await admin.json('/api/admin/backup')).status,500);assert.equal((await fetch(origin+'/api/health')).status,200);
 });
 await t.test('real SMTP failure preserves local archives and storefront availability without sensitive logs',async()=>{
 db.close();db=null;await stop();const failureStart=logs.length;
 await start({TEST_SMTP_FAILURE:'true',ALERT_EMAIL_ENABLED:'true',BACKUP_EMAIL_ENABLED:'true',SMTP_USER:'sender@example.test',SMTP_APP_PASSWORD:'not-a-real-password',PASSWORD_RESET_EMAIL:'owner@example.test'});db=new Database(path.join(temp,'gearhub.sqlite'));
 assert.equal((await admin.json('/api/admin/backup/run','POST',{})).status,500);
 assert.ok(db.prepare('SELECT last_failure FROM backup_status WHERE id=1').get().last_failure);
 assert.equal((await fetch(origin+'/api/health')).status,200);assert.equal((await fetch(origin+'/api/health/backups')).status,503);
 assert.ok(fs.readdirSync(path.join(temp,'backups')).some(n=>n.endsWith('.tar.gz')));
 assert.ok(!logs.slice(failureStart).includes('private-owner@example.test'));assert.ok(!logs.slice(failureStart).includes('credential-value'));
 db.close();db=null;await stop();await start();db=new Database(path.join(temp,'gearhub.sqlite'));
 });
 await t.test('password resets reject short passwords and consume one-time code atomically',async()=>{assert.equal((await admin.json('/api/admin/password-reset/verify','POST',{code:'123456',newPassword:'123456'})).status,400);assert.equal((await admin.json('/api/admin/password-reset/verify','POST',{code:'123456',newPassword:'မ'.repeat(25)})).status,400);const hash=crypto.createHmac('sha256',secret).update('123456').digest('hex');db.prepare('INSERT OR REPLACE INTO password_reset_codes(id,code_hash,expires_at,attempts,created_at) VALUES(1,?,?,0,?)').run(hash,Date.now()+60000,Date.now());const results=await Promise.all([admin.json('/api/admin/password-reset/verify','POST',{code:'123456',newPassword:'A new strong passphrase 2026'}),admin.json('/api/admin/password-reset/verify','POST',{code:'123456',newPassword:'Another strong passphrase 2026'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);assert.equal(db.prepare('SELECT COUNT(*) n FROM password_reset_codes').get().n,0);assert.equal((await admin.json('/api/admin/me')).status,401);assert.equal(db.prepare('SELECT auth_version FROM admins').get().auth_version,2);const fresh=new Client(origin);await fresh.login(results[0].status===200?'A new strong passphrase 2026':'Another strong passphrase 2026');assert.equal((await fresh.json('/api/admin/me')).status,200);});
 await t.test('reset attempt exhaustion and login/reset-request rate limits remain enforced',async()=>{
 db.close();db=null;await stop();await start({SMTP_USER:'',SMTP_APP_PASSWORD:'',PASSWORD_RESET_EMAIL:''});db=new Database(path.join(temp,'gearhub.sqlite'));
 const anonymous=new Client(origin);await anonymous.csrf();const hash=crypto.createHmac('sha256',secret).update('123456').digest('hex');db.prepare('INSERT OR REPLACE INTO password_reset_codes(id,code_hash,expires_at,attempts,created_at) VALUES(1,?,?,0,?)').run(hash,Date.now()+60000,Date.now());
 for(let i=0;i<8;i++)assert.equal((await anonymous.request('/api/admin/password-reset/verify','POST',{code:'000000',newPassword:'Valid long review passphrase'})).status,400);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM password_reset_codes').get().n,0);
 assert.equal((await anonymous.request('/api/admin/password-reset/verify','POST',{code:'000000',newPassword:'Valid long review passphrase'})).status,429);
 for(let i=0;i<5;i++)assert.equal((await anonymous.request('/api/admin/login','POST',{password:'invalid-password'})).status,401);
 assert.equal((await anonymous.request('/api/admin/login','POST',{password:'invalid-password'})).status,429);
 for(let i=0;i<3;i++)assert.equal((await anonymous.request('/api/admin/password-reset/request','POST',{})).status,503);
 assert.equal((await anonymous.request('/api/admin/password-reset/request','POST',{})).status,429);
 });

});
