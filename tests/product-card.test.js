const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
const {productDetails}=require('../lib/tenant-admin');

test('seller shops store the part number in product details',()=>{
 const fail=(s,m)=>{throw Error(m)},text=(v,max)=>String(v??'').trim().slice(0,max);
 const d=productDetails({partNo:'  2543-9015 ',imageIds:[]},{details:'{}'},{id:1},()=>{},fail,text);
 assert.equal(d.partNo,'2543-9015');
 const kept=productDetails({imageIds:[]},{details:JSON.stringify({partNo:'2543-9015'})},{id:1},()=>{},fail,text);
 assert.equal(kept.partNo,'2543-9015');
});

test('admin form, storefront and seller adapters all carry Part No',()=>{
 assert.match(pub('admin.html'),/name="partNo"/);
 assert.match(pub('admin.js'),/namedItem\("partNo"\)/);
 assert.match(pub('tenant-admin.js'),/partNo:b\.partNo/);
 assert.match(pub('tenant-admin.js'),/part_no:d\.partNo/);
 assert.match(pub('tenant-store.js'),/part_no:d\.partNo/);
});

test('product card shows View photos, a quantity stepper and a cart button',()=>{
 const s=pub('store.js');
 assert.match(s,/class=\\"view-photos\\" data-store-action=\\"open-gallery\\"/);
 assert.match(s,/class=\\"qty-stepper\\"/);
 assert.match(s,/case "qty-step"/);
 assert.match(s,/addCart\(id,button,out\?Number\(out\.textContent\):1\)/);
 assert.match(s,/String\(p\.part_no\|\|""\)\.trim\(\)\|\|p\.sku/);
 assert.doesNotMatch(s,/class=\\"gallery-open\\"/);
});
