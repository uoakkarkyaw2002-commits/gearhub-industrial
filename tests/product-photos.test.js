// Sellers can add as many product photos as they need; the admin uploads them
// ten per request, and seller shops accept more than ten too.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

test('admin uploads a big photo selection in groups of ten',async()=>{
 const source=pub('admin.js'),start=source.indexOf('// Products take as many photos'),end=source.indexOf('const productForm=',start);
 const requests=[];class FormData{constructor(){this.items=[]}append(_k,v){this.items.push(v)}}
 const context={FormData,msg(){},optimizeImage:async f=>f,adminFetch:async(_url,o)=>{requests.push(o.body.items.length);const n=requests.length;return {ok:true,json:async()=>({imageUrls:o.body.items.map((_,k)=>'/uploads/'+n+'-'+k+'.jpg')})}}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.upload=uploadProductPhotos;this.max=MAX_PRODUCT_PHOTOS',context);
 const files=Array.from({length:25},(_,k)=>({name:'p'+k+'.jpg'}));const urls=await context.upload(files);
 assert.deepEqual(requests,[10,10,5]);assert.equal(urls.length,25);assert.equal(context.max,200);
 assert.doesNotMatch(source,/cannot exceed 10|items\.slice\(0,10\)|importDriveUrls\(urls\)\]\.slice\(0,10\)/);
 assert.match(pub('admin.html'),/Add as many photos as you need/);
});

test('seller shop products accept more than ten photos',()=>{
 const {productDetails}=require('../lib/tenant-admin');const fail=(code,msg)=>{const e=new Error(msg);e.status=code;throw e};
 const ids=Array.from({length:30},(_,k)=>'photo-'+k);
 const out=productDetails({imageIds:ids},null,{id:1},()=>{},fail,v=>String(v));
 assert.equal(out.imageIds.length,30);
 assert.throws(()=>productDetails({imageIds:Array.from({length:201},(_,k)=>'x'+k)},null,{id:1},()=>{},fail,v=>String(v)),/up to 200 photos/);
});

test('the gallery keeps the current thumbnail in view when there are many photos',()=>{
 assert.match(pub('store.js'),/const strip=\$\("gallery-thumbs"\),active=strip\.querySelector\("\.active"\);if\(active\)\{const a=active\.getBoundingClientRect\(\),b=strip\.getBoundingClientRect\(\);strip\.scrollLeft\+=a\.left-b\.left-\(b\.width-a\.width\)\/2\}/);
});
