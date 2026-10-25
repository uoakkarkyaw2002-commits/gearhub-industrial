// Admin dashboard (owner's request): no "Cancelled orders" card; cancelled and deleted orders are kept
// together in one trash ("Deleted orders"). No "Add a product" card: Product Inventory has "+ Add Product".
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('cancelled orders go to the one trash; no Cancelled or Add a product card',()=>{
 const html=read('public/admin.html'),js=read('public/admin.js'),css=read('public/site-admin.css');
 assert.doesNotMatch(html,/id="cancelled-toggle"|id="trash-panel"|href="#cancelled-toggle"/);
 assert.match(html,/<a href="#deleted-toggle">Deleted Orders<\/a>/);
 assert.match(js,/const deletedOrders=orders\.filter\(o=>o\.status==="deleted"\|\|o\.status==="cancelled"\);/);
 assert.match(js,/if\(forever&&cancelled\)await api\("\/api\/admin\/orders\/"\+id,\{method:"DELETE",body:"\{\}"\}\);/,'a cancelled order is moved to deleted first, then deleted for good');
 assert.match(js,/for\(const o of orders\.filter\(o=>o\.status==="cancelled"\)\)await api/,'Permanently delete all also clears cancelled orders');
 assert.doesNotMatch(js,/\$\("trash-count"\)|\$\("trash-orders-table"\)/);
 assert.match(css,/#product-form-toggle\{display:none!important\}/);
 assert.match(css,/#product-form-panel:not\(:has\(#product-form-content:not\(\.hidden\)\)\)\{display:none!important\}/);
 assert.match(html,/id="inventory-add-product"/,'products are still added from Product Inventory');
});
