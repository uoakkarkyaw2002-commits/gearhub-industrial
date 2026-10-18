const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('seller admin header shows the shop name and logo instead of GearHub',()=>{
 const s=pub('tenant-admin.js');
 assert.match(s,/querySelector\('\.admin-brand-name'\)[\s\S]*brandName\.textContent=shop\.name/);
 assert.match(s,/shop\.settings\?\.logoId/);
 assert.match(pub('admin.html'),/class="admin-brand-name">GEAR <em>HUB<\/em>/,'GearHub admin keeps its own brand');
});

test('seller storefront never borrows the GearHub "INDUSTRIAL" tagline',()=>{
 assert.match(pub('store.js'),/site\.brandTagline\|\|\(tenantStore\?"":"INDUSTRIAL"\)/);
});
