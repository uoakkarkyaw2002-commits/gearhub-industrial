const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {model}=require('../public/category-browser');
const categories=[{id:1,category_en:'Machines',category_my:'စက်များ'},{id:2,category_en:'Parts',category_my:'အပိုပစ္စည်း',parent_id:1},{id:3,category_en:'Other',category_my:'အခြား'}];
const products=[{id:8,name_en:'Red part',name_my:'ပစ္စည်း',sku:'RP',category_en:'Parts',stock:3,price:300,imageUrls:['/owned.png']},{id:9,name_en:'Parent part',category_en:'Machines',stock:0,price:200},{id:10,name_en:'Elsewhere',category_en:'Other',stock:2,price:100}];
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('category projection preserves records, hierarchy, counts and photo associations',()=>{
 const before=hash({products,categories}),v=model(products,categories,{selected:'Machines'});assert.deepEqual(v.children.map(x=>x.category_en),['Parts']);assert.equal(v.count(v.current),2);assert.deepEqual(v.matching.map(x=>x.id),[8,9]);assert.equal(v.detail,false);assert.equal(model(products,categories,{selected:'Parts'}).detail,true);assert.equal(v.matching[0].imageUrls[0],'/owned.png');assert.equal(hash({products,categories}),before);
});
test('category search, price sorting and stock filter only project existing products',()=>{
 assert.deepEqual(model(products,categories,{query:'RP'}).matching.map(x=>x.id),[8]);assert.deepEqual(model(products,categories,{query:'စက်များ'}).visibleMains.map(x=>x.id),[1]);assert.deepEqual(model(products,categories,{selected:'Machines',sort:'low',stockOnly:true}).matching.map(x=>x.id),[8]);assert.deepEqual(model(products,categories,{sort:'high'}).matching.map(x=>x.id),[8,9]);
});
test('empty, uncategorized and many category data never fabricate or lose products',()=>{
 assert.equal(model([],[]).matching.length,0);assert.equal(model(products,[],{selected:'Parts'}).matching.length,1);
 const many=Array.from({length:80},(_,i)=>({id:i+100,category_en:'Category '+i}));assert.equal(model(products,many).mains.length,83);assert.equal(model(products,many).matching.length,0);assert.equal(model(products,many).current.category_en,"Category 0");
});
