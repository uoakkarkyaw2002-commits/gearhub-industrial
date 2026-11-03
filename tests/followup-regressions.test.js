const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const read=name=>fs.readFileSync(require.resolve('../public/'+name),'utf8');
test('CSV preserves quoted commas, escaped quotes, CRLF and multiline values',()=>{
 const s=read('excel-map.js'),parse=new Function(s.slice(s.indexOf('function csvBook('),s.indexOf('function setForm('))+';return csvBook;')();
 const sheet=parse('\ufeffSKU,Name,Price\r\nX1,"Seal, large",100\r\nX2,"Say ""yes""\r\nnext",200\r\n').sheets[0];
 assert.equal(sheet.cells.get('1,1').text,'Seal, large');assert.equal(sheet.cells.get('1,2').text,'100');
 assert.equal(sheet.cells.get('2,1').text,'Say "yes"\r\nnext');assert.equal(sheet.cells.get('2,2').text,'200');assert.equal(sheet.maxR,2);
 assert.throws(()=>parse('SKU,Name\nX1,"unfinished'),/unclosed/);
 assert.throws(()=>parse('SKU,Name\nX1,"name"extra'),/closing quote/);
});
test('Excel revalidates IDs on expiry/force, shares requests, and keeps parsed offline fallback',async()=>{
 let now=100000,url='old',requests=0,online=true,disposed=0;
 const source=read('excel-search.js'),ctx={Date:{now:()=>now},AbortSignal,navigator:{get onLine(){return online}},window:{GearHubExcelViewer:{sheet:async url=>({name:'BC',url})},GearHubExcelIndex:{forSheet:async()=>({dispose(){disposed++}})}},fetch:async()=>{requests++;return{ok:true,json:async()=>({files:[{url,name:'stock.xlsx'}]})}}};
 vm.createContext(ctx);vm.runInContext("const slug='demo',SHEET='BC';"+source.slice(source.indexOf(' let loading='),source.indexOf(' // 1.1.217:'))+';this.get=workbook;',ctx);
 assert.equal((await ctx.get()).file.url,'old');url='new';assert.equal((await ctx.get()).file.url,'old');assert.equal(requests,1);
 now+=31000;const [a,b]=await Promise.all([ctx.get(),ctx.get()]);assert.equal(a.file.url,'new');assert.equal(b.file.url,'new');assert.equal(requests,2);assert.equal(disposed,1);
 url='newest';assert.equal((await ctx.get(true)).file.url,'newest');assert.equal(disposed,2);
 online=false;now+=31000;assert.equal((await ctx.get(true)).file.url,'newest');assert.equal(requests,3);
});
test('Excel cleanup is shop-scoped and migrates only matching legacy files',async()=>{
 const stores=new Map(),origin='https://fixture.test',a=origin+'/api/platform/spreadsheets/a',b=origin+'/api/platform/spreadsheets/b',old=origin+'/api/platform/spreadsheets/old-a';
 const cache=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name),key=r=>r.url||r;return{keys:async()=>[...m.keys()].map(url=>({url})),match:async r=>m.get(key(r)),put:async(r,v)=>m.set(key(r),v),delete:async r=>m.delete(key(r))}};
 await cache('gearhub-excel-v1').put(a,'legacy A');await cache('gearhub-excel-v1').put(b,'legacy B');await cache('gearhub-excel-v2:shop-a').put(old,'old A');await cache('gearhub-excel-v2:shop-b').put(b,'B');
 const s=read('excel-library.js'),ctx={slug:'shop-a',window:{caches:{},GearHubExcelViewer:{idle:async()=>{}}},navigator:{onLine:true},location:{origin},URL,caches:{open:async n=>cache(n)},fetch:async()=>({ok:true,json:async()=>({files:[{url:a}]})})};
 vm.createContext(ctx);vm.runInContext(s.slice(s.indexOf('async function keepOffline()'),s.indexOf('const later='))+';this.run=keepOffline;',ctx);await ctx.run();
 assert.equal(await cache('gearhub-excel-v2:shop-a').match(a),'legacy A');assert.equal(await cache('gearhub-excel-v2:shop-a').match(old),undefined);assert.equal(await cache('gearhub-excel-v2:shop-b').match(b),'B');assert.equal(await cache('gearhub-excel-v1').match(b),'legacy B');
});
test('tenant consumers cancel independently while shared fetch has an 8s bound and can retry',async()=>{
 let complete,deadline=new AbortController(),calls=0;const window={},ctx={window,document:{querySelectorAll:()=>[],querySelector:()=>null},location:{pathname:'/shops/demo/',origin:'https://fixture.test'},Response,AbortSignal:{timeout:ms=>{assert.equal(ms,8000);return deadline.signal}},fetch:async(_url,opts)=>{calls++;return new Promise((resolve,reject)=>{complete=()=>resolve(new Response(JSON.stringify({name:'Demo',settings:{},products:[]})));opts.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true})})}};
 vm.runInNewContext(read('tenant-store.js'),ctx);const one=new AbortController(),two=new AbortController();
 const a=window.GearHubTenantStore.fetch('/api/products',{signal:one.signal}),b=window.GearHubTenantStore.fetch('/api/categories',{signal:two.signal});one.abort();assert.equal((await a).status,503);assert.equal(deadline.signal.aborted,false);complete();assert.equal((await b).status,200);assert.equal(calls,1);
 const stalled=window.GearHubTenantStore.fetch('/api/products');deadline.abort();assert.equal((await stalled).status,503);
 deadline=new AbortController();const retry=window.GearHubTenantStore.fetch('/api/products');complete();assert.equal((await retry).status,200);assert.equal(calls,3);
});
test('speed sampling waits for readiness and Excel idle, respects Save-Data and cooldown',async()=>{
 const handlers={},timers=new Map();let tid=0,requests=0,now=100000,resolveIdle,tick=0;const idle=new Promise(r=>resolveIdle=r),badge={dataset:{},setAttribute(){},querySelector:()=>({textContent:''})},ctx={window:{GearHubExcelSearchIdle:()=>idle},navigator:{onLine:true,connection:{saveData:true}},document:{hidden:false,body:{classList:{contains:()=>false}},querySelector:()=>({append(){}}),createElement:()=>badge,addEventListener:(n,f)=>handlers[n]=f,getElementById:()=>null},Date:{now:()=>now},performance:{now:()=>++tick*100},AbortController,setTimeout:(f,ms)=>{timers.set(++tid,{f,ms});return tid},clearTimeout:id=>timers.delete(id),setInterval(){},addEventListener:(n,f)=>handlers[n]=f,fetch:async()=>{requests++;let read=false;return{ok:true,body:{getReader:()=>({read:async()=>read?{done:true}:(read=true,{done:false,value:new Uint8Array(65536)})})}}}};
 vm.runInNewContext(read('net-speed.js'),ctx);assert.equal(requests,0);handlers['gearhub:data-ready']();const run=()=>[...timers.values()].find(t=>t.ms===15000).f();await run();assert.equal(requests,0);
 ctx.navigator.connection.saveData=false;const pending=run();await Promise.resolve();assert.equal(requests,0);resolveIdle();await pending;assert.equal(requests,1);
 handlers.online();await run();assert.equal(requests,1);now+=180001;await run();assert.equal(requests,2);
});
