const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('admin header has the order bell and an Admin menu holding Log out',()=>{
 const h=pub('admin.html');
 assert.match(h,/id="admin-bell"/);assert.match(h,/id="admin-bell-count"/);
 assert.match(h,/id="admin-user-toggle"[\s\S]*class="admin-user-dropdown"[\s\S]*id="logout"/);
 assert.match(h,/id="admin-kpis"/);assert.match(h,/<script src="\/admin-extras\.js\?v=/);
});

function extras(){
 const els={},el=id=>els[id]||(els[id]={id,hidden:true,textContent:'',innerHTML:'',classList:{s:new Set(['hidden']),add(c){this.s.add(c)},remove(c){this.s.delete(c)},contains(c){return this.s.has(c)}},addEventListener(){},prepend(){},offsetWidth:1,setAttribute(){}});
 const store={};let chimes=0;
 const ctx={window:{},document:{getElementById:el,addEventListener(){},createElement:()=>el('x'+Math.random()),querySelector:()=>null,hidden:false},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},navigator:{onLine:true},addEventListener(){},location:{pathname:'/admin.html'},setInterval(){},setTimeout(){},requestAnimationFrame(){},Intl,Date,Map,Set,JSON,Math,Number,String};
 ctx.window=ctx;ctx.AudioContext=function(){chimes++;this.state='running';this.currentTime=0;this.createOscillator=()=>({frequency:{},connect:()=>({connect(){}}),start(){},stop(){}});this.createGain=()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})});this.destination={};};
 vm.runInNewContext(pub('admin-extras.js'),ctx);return {api:ctx.GearHubAdminExtras,els,chimes:()=>chimes};
}

test('summary cards use real totals and the bell counts pending orders',()=>{
 const {api,els}=extras();const m=new Date().toISOString().slice(0,7);
 const orders=[{id:1,status:'pending',payment_status:'paid',total:1000,phone:'09-1',created_at:m+'-02 10:00:00'},{id:2,status:'confirmed',payment_status:'paid',total:500,phone:'091',created_at:m+'-03 10:00:00'},{id:3,status:'cancelled',payment_status:'paid',total:9,phone:'092',created_at:m+'-03 10:00:00'}];
 api.update({orders:3,sales:1500},orders,[{stock:2},{stock:9},{stock:1,trashed_at:'x'}]);
 const html=els['admin-kpis'].innerHTML;
 assert.match(html,/Total Product<\/span><strong class="kpi-value">2</);
 assert.match(html,/Total Sales<\/span><strong class="kpi-value">1,500 Ks</);
 assert.match(html,/Total Customers<\/span><strong class="kpi-value">1</);
 assert.equal(els['admin-bell-count'].textContent,'1');assert.equal(els['admin-bell-count'].hidden,false);
});

test('a chime plays only when a new order arrives',()=>{
 const t=extras();const o=[{id:1,status:'pending'}];
 t.api.update({},o,[]);assert.equal(t.chimes(),0,'first load is not "new"');
 t.api.update({},o,[]);assert.equal(t.chimes(),0);
 t.api.update({},[...o,{id:2,status:'pending'}],[]);assert.equal(t.chimes(),1);
});

test('admin keeps last data for offline use and clears it on log out',()=>{
 const a=pub('admin.js');
 assert.match(a,/function adminOfflineSave/);assert.match(a,/if\(url\.endsWith\("\/logout"\)\)adminOfflineClear\(\)/);
 assert.match(pub('tenant-admin.js'),/gh-admin-ctx:/);
 assert.match(pub('sw.js'),/const copy = response\.clone\(\); caches\.open\(CACHE_NAME\)\.then\(cache => cache\.put\(request, copy\)\)/);
});

test('phone: orders show as cards without sideways scrolling',()=>{
 const css=pub('site-admin.css');
 assert.match(css,/@media\(max-width:760px\)\{\n :is\(#orders-table,#confirmed-orders-table,#trash-orders-table\) \.admin-table\{display:block;width:100%;min-width:0!important/);
 assert.match(css,/\.admin-table thead\{display:none\}/);
});
