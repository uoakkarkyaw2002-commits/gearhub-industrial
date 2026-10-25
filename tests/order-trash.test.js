// Admin dashboard (owner's request): no "Cancelled orders" card; cancelled and deleted orders are kept
// together in one trash ("Deleted orders"). No "Add a product" card: Product Inventory has "+ Add Product".
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('cancelled orders go to the one trash; no Cancelled or Add a product card',()=>{
 const html=read('public/admin.html'),js=read('public/admin.js'),css=read('public/site-admin.css');
 assert.doesNotMatch(html,/id="cancelled-toggle"|id="trash-panel"|href="#cancelled-toggle"/);
 assert.match(html,/<a href="#deleted-toggle">Recycle Bin<\/a>/);
 assert.match(js,/const deletedOrders=orders\.filter\(o=>o\.status==="deleted"\|\|o\.status==="cancelled"\);/);
 assert.match(js,/if\(forever&&cancelled\)await api\("\/api\/admin\/orders\/"\+id,\{method:"DELETE",body:"\{\}"\}\);/,'a cancelled order is moved to deleted first, then deleted for good');
 assert.match(js,/for\(const o of orders\.filter\(o=>o\.status==="cancelled"\)\)await api/,'Permanently delete all also clears cancelled orders');
 assert.doesNotMatch(js,/\$\("trash-count"\)|\$\("trash-orders-table"\)/);
 assert.match(css,/#product-form-toggle\{display:none!important\}/);
 assert.match(css,/#product-form-panel:not\(:has\(#product-form-content:not\(\.hidden\)\)\)\{display:none!important\}/);
 assert.match(html,/id="inventory-add-product"/,'products are still added from Product Inventory');
});

test('Add Product and Edit open the form full width on phones (it opened inside a card slot)',()=>{
 const js=read('public/admin.js');
 assert.match(js,/function setProductFormOpen\(open\)\{[^}]*positionMobileDashboardDetail\("product-form-content"\)\}/);
 assert.match(js,/const panel=form\.closest\("\.panel"\)\|\|\$\("product-form-content"\);/);
 assert.match(js,/setProductFormOpen\(true\);\$\("product-form-content"\)\?\.scrollIntoView/);
});

test("Recycle Bin looks like the owner's reference photo",()=>{
 const html=read('public/admin.html'),js=read('public/admin.js'),css=read('public/site-admin.css'),tenant=read('public/tenant-admin.js');
 assert.match(html,/<span class="order-summary-icon">🗑️<\/span><span>Recycle Bin<strong id="deleted-count">/,'the card is a recycle bin, not a delete (❌) icon');
 assert.match(html,/<div class="bin-head"><span class="bin-head-icon">.*<span class="bin-eyebrow">DELETED<\/span><h2>Deleted orders<\/h2><\/div><button type="button" class="bin-delete-all" id="empty-trash">.*<span>Delete all<\/span><\/button>/);
 assert.match(js,/<article class="bin-card"><div class="bin-main"><p class="bin-label">Order ID \$\{binIcon\.doc\}<\/p>/);
 assert.match(js,/<button type="button" class="bin-restore" data-admin-action="restore-order"/);
 assert.match(css,/#deleted-panel \.bin-card\{display:grid;grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,\.95fr\) auto;/);
 assert.doesNotMatch(tenant,/getElementById\('empty-trash'\)\?\.setAttribute\('hidden'/,'seller shops get "Delete all" too (it empties that shop only)');
 assert.match(js,/if\(id==="deleted-toggle"&&\$\("deleted-panel"\)\.classList\.contains\("hidden"\)\)target\.click\(\);/,'the PC link never closes the bin into a blank page');
});
