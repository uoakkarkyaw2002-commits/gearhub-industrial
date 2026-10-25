// Owner's request: a subcategory name (e.g. "Sany") may repeat under another main category. Products
// keep their category by ID, so each "Sany" keeps its own products.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {validateHierarchy,categoryOf}=require('../lib/category-hierarchy');const {model}=require('../public/category-browser');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const rows=()=>[{id:1,category_en:'Electrical Parts'},{id:2,category_en:'Swing Gear Parts'},{id:3,category_en:'SANY',parent_en:'Electrical Parts',parent_id:1},{id:4,category_en:'Sany',parent_en:'Swing Gear Parts',parent_id:2}];

test('seller shops allow the same name under different parents, never twice under one parent',()=>{
 assert.throws(()=>validateHierarchy(rows()),/unique/,'GearHub main keeps one name per shop');
 assert.deepEqual(validateHierarchy(rows(),{sameNameUnderOtherParents:true}).map(c=>c.id),[1,2,3,4]);
 assert.throws(()=>validateHierarchy([...rows(),{id:5,category_en:'sany',parent_en:'Swing Gear Parts',parent_id:2}],{sameNameUnderOtherParents:true}),/same place/);
 assert.throws(()=>validateHierarchy([{id:1,category_en:'A'},{id:2,category_en:'A'}],{sameNameUnderOtherParents:true}),/same place/,'two main categories with one name');
 // a child given only a parent name that two subcategories share must choose again
 assert.throws(()=>validateHierarchy([...rows(),{id:5,category_en:'Bolt',parent_en:'Sany'}],{sameNameUnderOtherParents:true}),/Choose the parent category again/);
 const linked=validateHierarchy([...rows(),{id:5,category_en:'Bolt',parent_en:'Sany',parent_id:4}],{sameNameUnderOtherParents:true});assert.equal(linked[4].parent_en,'Sany');
});

test('a product belongs to its category ID while the name matches, else to the first with its name',()=>{
 const cats=rows();
 assert.equal(categoryOf({category:'Sany',categoryId:4},cats).id,4);
 assert.equal(categoryOf({category:'sany'},cats).id,3,'older products (no ID) stay with the category they had');
 assert.equal(categoryOf({category:'Other',categoryId:4},cats),null,'a stale ID never moves a product');
});

test('the shop shows each "Sany" with its own products',()=>{
 const categories=rows().map(c=>({...c,parent_id:c.parent_id??null})),products=[{id:10,category_en:'SANY',category_id:3},{id:11,category_en:'Sany',category_id:4},{id:12,category_en:'SANY'}];
 assert.deepEqual(model(products,categories,{selected:'4'}).matching.map(p=>p.id),[11]);
 assert.deepEqual(model(products,categories,{selected:'3'}).matching.map(p=>p.id),[10,12]);
 assert.deepEqual(model(products,categories,{selected:'2'}).matching.map(p=>p.id),[11],'the main category shows only its own Sany');
});

test('admin and shop pages pick and filter categories by ID',()=>{
 const picker=read('public/category-picker.js'),admin=read('public/admin.js'),tenantAdmin=read('public/tenant-admin.js'),store=read('public/store.js'),tenantStore=read('public/tenant-store.js'),css=read('public/site-admin.css');
 assert.match(picker,/id\.type="hidden";id\.name="categoryId"/,'the product form sends the chosen category ID');
 assert.match(picker,/if\(id\)id\.value=selected\.id\?\?""/);
 assert.match(tenantAdmin,/categoryId:b\.categoryId===''\|\|b\.categoryId==null\?undefined:Number\(b\.categoryId\)/);
 assert.match(tenantAdmin,/category_id:d\.categoryId\?\?null/);
 assert.match(admin,/categoryEn:p\.category_en,categoryId:p\.category_id\?\?""/,'editing a product keeps its category');
 assert.match(admin,/function categoryParent\(c\)/);
 assert.match(admin,/parent_id:Number\(categoryParent\(c\)\.id\)/,'the category editor saves which parent it means');
 // Inventory filter: the same picker as Add Product (main category, then subcategory).
 assert.match(admin,/noneText:"All Categories"/);
 assert.match(admin,/titleText:"Filter by Category"/);
 assert.match(admin,/list=list\.filter\(p=>inventoryCategoryIn\(p,activeCategory\)\)/);
 assert.match(css,/\.inventory-category-open\{position:absolute;inset:0;/);
 assert.match(store,/data-category-id=/);
 assert.match(store,/function productCategory\(p\)/);
 assert.match(tenantStore,/category_id:d\.categoryId\?\?null/);
 assert.match(admin,/window\.GearHubCategoryPicker\?\.reset\?\.\(\)/,'a new category shows in Add Product at once');
});
