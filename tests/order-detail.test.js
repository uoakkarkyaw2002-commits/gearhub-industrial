// Order detail matches the owner's design: dark person/phone/pin icons, English digits,
// facts with status pills and Admin Note, item cards with photo / Part No / SKU / Brand /
// Qty / Unit price / Amount, filled "View Received", and the payment receipt card.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
function load(){const ctx={document:{readyState:'complete',getElementById:()=>null,addEventListener(){}},Intl,Date,Map,Set,JSON,Number,String,Math,Array,Promise,queueMicrotask};ctx.window=ctx;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','public','order-detail.js'),'utf8'),ctx);return ctx.GearHubOrderDetail;}
const order={id:7,order_code:'GH-4816e05d',status:'pending',payment_status:'pending',customer_name:'Oakkar Kyaw',phone:'၀၉-၁၂၃၄၅၆၇၈',address:'60F',created_at:'2026-10-19 07:49:55',admin_note:'',hasReceipt:true,total:485000,
 items:[{productId:1,nameEn:'STOP MOTOR',quantity:1,unitPrice:315000,lineTotal:315000},{productId:2,nameEn:'FUEL FILTER',quantity:1,unitPrice:85000,lineTotal:85000}]};
const catalog={products:new Map([[1,{id:1,sku:'SM-001',part_no:'12345678',category_en:'ENGINE',imageUrls:['/uploads/a.jpg']}],[2,{id:2,sku:'FF-1001',part_no:'14567890',category_en:'CAT E320',imageUrls:[]}]]),
 categories:[{id:1,category_en:'ENGINE',parent_id:null},{id:2,category_en:'CAT',parent_id:1},{id:3,category_en:'CAT E320',parent_id:2}]};

test('order detail shows every field of the design',()=>{
 const api=load();api.setCatalog(catalog);const html=api.detail(order);
 assert.match(html,/class="od-head"[\s\S]*Order Detail[\s\S]*class="od-code od-clip" tabindex="0">GH-4816e05d<[\s\S]*od-pill od-pending">pending</);
 assert.match(html,/09-12345678/,'Myanmar digits shown as English digits');
 for(const label of ['Order Date','Order Status','Payment','Confirm Date','Admin Note','Part No','SKU','Brand','Qty','Unit','Unit Price :','Amount','Total Items','Total Amount'])assert.ok(html.includes(label),label);
 assert.match(html,/>12345678<\/b>[\s\S]*>SM-001<\/b>[\s\S]*Brand<\/span><i>:<\/i><b class="od-clip" tabindex="0">-<\/b>/,'part no / SKU from the product, no brand for a main-category product');
 assert.match(html,/>14567890<\/b>[\s\S]*>FF-1001<\/b>[\s\S]*Brand<\/span><i>:<\/i><b class="od-clip" tabindex="0">CAT<\/b>/,'brand = the level under the main category');
 assert.match(html,/<img src="\/uploads\/a\.jpg" alt="">/);assert.match(html,/315,000 KS/);assert.match(html,/485,000 KS/);
 assert.match(html,/class="od-btn od-received" href="[^"]+"[^>]*>[\s\S]*View Received/);
 assert.doesNotMatch(html,/Payment Information/,'payment section removed (View Received is enough)');
 assert.match(html,/class="od-card od-edit"[\s\S]*data-od-quick="confirm"[\s\S]*data-od-quick="cancel"[\s\S]*name="status" form="od-form-7"[\s\S]*type="submit" form="od-form-7"/,'edit panel at the top: Confirm / Cancel, fields, Save');
 assert.ok(html.indexOf('od-edit')<html.indexOf('od-customer'),'edit panel sits above the invoice');
 assert.match(html,/<form class="order-page-form od-form" id="od-form-7">/);
 for(const icon of ['person','phone','pin','cart'])assert.ok(html.includes('od-icon'),icon);
});

test('styles keep the order detail inside a phone screen',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','order-detail.js'),'utf8');
 assert.match(js,/pop\.className="od-pop"/,'a cut value opens in a bubble when tapped');
 const css=fs.readFileSync(path.join(__dirname,'..','public','order-detail.css'),'utf8');
 assert.match(css,/\.od\{display:grid;grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/\.od>\*,\.od-card>\*,\.od-items ol>\*\{min-width:0/);
 assert.match(css,/\.od-received\{background:#11893a/);assert.match(css,/@media\(max-width:559px\)/);assert.match(css,/\.od-clip\{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/);assert.match(css,/\.od\.is-editing \.od-edit\{display:grid\}/);
});

test('phones: the order detail fills the screen width (6px edge), nothing clipped',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','order-detail.css'),'utf8');
 assert.match(css,/#orders-content:has\(\.od\)\{padding-left:0!important;padding-right:0!important/);
 assert.match(css,/\.od\{width:calc\(100% \+ 12px\)!important;max-width:none!important;margin-left:-6px!important;margin-right:-6px!important\}/);
 assert.match(css,/\.panel:has\(\.od\),\.admin-grid:has\(\.od\),#orders-content:has\(\.od\),#orders-table:has\(\.od\)\{overflow:visible!important\}/);
});

test('Delete removes a cancelled order after a confirm; other orders must be cancelled first',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','order-detail.js'),'utf8'),tenant=fs.readFileSync(path.join(__dirname,'..','public','tenant-admin.js'),'utf8');
 assert.match(js,/if\(order\.status!=="cancelled"\)\{page\.classList\.add\("is-editing"\)/);
 assert.match(js,/if\(!confirm\("ဒီအော်ဒါကို အပြီးဖျက်မှာ/);
 assert.match(js,/request\("\/api\/admin\/orders\/"\+id,\{method:"DELETE"/);
 assert.match(tenant,/\['PATCH','DELETE'\]\.includes\(method\)/,'seller shops send the delete to their own shop');
});

test('the 20-second refresh never brings back the old table or redraws an unchanged page',async()=>{
 // A small stand-in for #orders-table that counts every redraw.
 let writes=0,html='';
 const host={addEventListener(){},contains:()=>false,get innerHTML(){return html},set innerHTML(v){html=v;writes++},
  querySelector:sel=>sel==='.order-page.is-editing'?(html.includes('order-page is-editing')?{}:null):(/order-invoice-list|order-page/.test(html)?{}:null)};
 const ctx={document:{readyState:'complete',activeElement:null,getElementById:id=>id==='orders-table'?host:null,addEventListener(){}},Intl,Date,Map,Set,JSON,Number,String,Math,Array,Promise,queueMicrotask,
  fetch:async()=>({ok:true,json:async()=>[]}),MutationObserver:class{observe(){}}};
 ctx.window=ctx;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','public','order-detail.js'),'utf8'),ctx);
 const api=ctx.GearHubOrderDetail;assert.equal(typeof api.refresh,'function');
 await new Promise(r=>setTimeout(r,20));writes=0;
 api.refresh([order]);assert.equal(writes,1);assert.match(html,/order-invoice-list/);
 api.refresh([order]);assert.equal(writes,1,'same orders: nothing is redrawn, so nothing flickers');
 api.refresh([order,{...order,id:8,order_code:'GH-new'}]);assert.equal(writes,2,'a new order is drawn');
 const admin=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.match(admin,/if\(window\.GearHubOrderDetail\?\.refresh\)window\.GearHubOrderDetail\.refresh\(orders\);else \$\("orders-table"\)\.innerHTML=/,'admin.js hands its orders over instead of drawing the old table');
});
