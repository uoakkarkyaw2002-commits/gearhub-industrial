// Every uploaded Excel file is saved on the phone by itself and opens offline; the viewer's top bar is plain white.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function worker(fetchImpl){
 const handlers={},stores=new Map();
 const cacheFor=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return{match:async r=>m.get(typeof r==='string'?r:r.url),put:async(r,v)=>{m.set(typeof r==='string'?r:r.url,v)}}};
 const ctx={URL,self:{location:{origin:'https://shop.test'},addEventListener:(t,f)=>handlers[t]=f},caches:{open:async n=>cacheFor(n),match:async()=>undefined},fetch:fetchImpl,Response:{error:()=>'ERROR'}};
 vm.runInNewContext(read('sw.js'),ctx);
 const get=async url=>{let p;handlers.fetch({request:{method:'GET',mode:'cors',url:'https://shop.test'+url},respondWith:x=>p=x});return p&&await p};
 return{get,stores};
}
const ok=body=>({ok:true,body,clone(){return ok(body)}});

test('an Excel file is kept on the phone and opens from it offline',async()=>{
 let online=true,downloads=0;const w=worker(async()=>{if(!online)throw TypeError('offline');downloads++;return ok('xlsx')});
 assert.equal((await w.get('/api/platform/spreadsheets/abc')).body,'xlsx');
 online=false;assert.equal((await w.get('/api/platform/spreadsheets/abc')).body,'xlsx','offline: the saved copy');
 assert.equal(downloads,1,'not downloaded again');
});

test('the shop file list is fresh online and the saved list offline',async()=>{
 let online=true,n=0;const w=worker(async()=>{if(!online)throw TypeError('offline');return ok('list'+(++n))});
 assert.equal((await w.get('/api/platform/store/polestar/spreadsheets')).body,'list1');
 assert.equal((await w.get('/api/platform/store/polestar/spreadsheets')).body,'list2','online: always fresh');
 online=false;assert.equal((await w.get('/api/platform/store/polestar/spreadsheets')).body,'list2');
});

test('the shop page saves every Excel file by itself and removes old ones',()=>{
 const js=read('excel-library.js');
 assert.match(js,/async function keepOffline\(\)\{/);
 assert.match(js,/if\(document\.readyState==='complete'\)later\(\);else addEventListener\('load',later,\{once:true\}\);/,'runs on every shop visit, no button');
 assert.match(js,/!keep\.has\(request\.url\)\)await cache\.delete\(request\)/,'files no longer in the shop are removed');
 assert.match(js,/show\('Uploaded\.'\);await load\(\);keepOffline\(\)/,'a new upload is saved at once');
});

test('Excel full screen: plain white top bar, sheet starts below it',()=>{
 const css=read('style.css');
 assert.match(css,/\.excel-fullscreen \.excel-preview::before\{content:"";position:absolute;top:0;left:0;right:0;height:50px;background:#fff/);
 assert.match(css,/\.excel-fullscreen \.excel-sheet-search input\{-webkit-appearance:none;appearance:none;box-shadow:none/);
 assert.match(css,/\.excel-fullscreen \.excel-sheet\{margin-top:50px\}/);
});
