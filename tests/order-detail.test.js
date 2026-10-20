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
 assert.match(html,/class="od-head"[\s\S]*Order Detail[\s\S]*class="od-code">GH-4816e05d<[\s\S]*od-pill od-pending">pending</);
 assert.match(html,/09-12345678/,'Myanmar digits shown as English digits');
 for(const label of ['Order Date','Order Status','Payment','Confirm Date','Admin Note','Part No','SKU','Brand','Qty','Unit','Unit Price :','Amount','Total Items','Total Amount','Payment Method','Payment Date','Ref'])assert.ok(html.includes(label),label);
 assert.match(html,/<b>12345678<\/b>[\s\S]*<b>SM-001<\/b>[\s\S]*Brand<\/span><i>:<\/i><b>-<\/b>/,'part no / SKU from the product, no brand for a main-category product');
 assert.match(html,/<b>14567890<\/b>[\s\S]*<b>FF-1001<\/b>[\s\S]*Brand<\/span><i>:<\/i><b>CAT<\/b>/,'brand = the level under the main category');
 assert.match(html,/<img src="\/uploads\/a\.jpg" alt="">/);assert.match(html,/315,000 KS/);assert.match(html,/485,000 KS/);
 assert.match(html,/class="od-btn od-received" href="[^"]+"[^>]*>[\s\S]*View Received/);
 assert.match(html,/class="od-receipt" href=[\s\S]*View payment receipt[\s\S]*2026-10-19 \d\d:\d\d:55/);
 for(const icon of ['person','phone','pin','cart'])assert.ok(html.includes('od-icon'),icon);
});

test('styles keep the order detail inside a phone screen',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','order-detail.css'),'utf8');
 assert.match(css,/\.od\{display:grid;grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/\.od>\*,\.od-card>\*,\.od-items ol>\*\{min-width:0/);
 assert.match(css,/\.od-received\{background:#11893a/);assert.match(css,/@media\(max-width:559px\)/);
});
