const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function adapter(slug='alice',settings={}){
 const calls=[],window={},document={querySelectorAll:()=>[],querySelector:()=>null};
 const shop={name:'Alice',settings,products:[{id:7,name:'Part',sku:'A-7',category:'Tools',price:1000,stock:5}]};
 const fetch=async(url,options)=>{calls.push({url,options});if(url==='/api/platform/store/'+slug)return new Response(JSON.stringify(shop));if(url==='/api/platform/me')return new Response(JSON.stringify({csrfToken:'fixture-token'}));if(url.endsWith('/orders'))return new Response(JSON.stringify({code:'TEST-ORDER'}));throw Error('Unexpected root API');};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/tenant-store'),'utf8'),{window,document,location:{pathname:'/shops/'+slug,origin:'https://fixture.test'},navigator:{storage:{estimate:async()=>({usage:20,quota:100})}},Response,fetch,URL,encodeURIComponent,decodeURIComponent});
 return {api:window.GearHubTenantStore,calls};
}
test('shared tenant storefront maps only scoped catalogue/config and namespaces saved state',async()=>{
 const a=adapter(),b=adapter('bob');
 assert.notEqual(a.api.key('gh-cart'),b.api.key('gh-cart'));
 assert.equal(a.api.key('gh-cart'),'gh-shop-cart:alice'); // existing tenant carts retained
 assert.notEqual(a.api.key('gh-offline-catalog'),b.api.key('gh-offline-catalog'));
 const products=await(await a.api.fetch('/api/products')).json();assert.equal(products[0].name_en,'Part');
 assert.equal((await(await a.api.fetch('/api/categories')).json())[0].category_en,'Tools');
 const config=await(await a.api.fetch('/api/config')).json();assert.equal(config.site.brandName,'Alice');assert.equal(config.bankName,'');
 assert.equal((await a.api.fetch('/api/orders',{method:'POST',body:new FormData()})).status,409);
 assert.ok(a.calls.every(c=>c.url.startsWith('/api/platform/')));
});
test('tenant checkout adapts shared form, requires own payment setup and retains idempotency/CSRF',async()=>{
 const {api,calls}=adapter('alice',{bankName:'Fixture bank',bankAccountName:'Fixture',bankAccountNumber:'TEST-ONLY'});
 const f=new FormData();f.set('customerName','Test');f.set('receipt',new Blob(['fixture']), 'receipt.png');f.set('items','[{"id":7,"quantity":1}]');
 const result=await(await api.fetch('/api/orders',{method:'POST',headers:{'Idempotency-Key':'fixture-retry'},body:f})).json();assert.equal(result.order.orderCode,'TEST-ORDER');
 const order=calls.at(-1);assert.equal(order.url,'/api/platform/store/alice/orders');assert.equal(order.options.headers['X-CSRF-Token'],'fixture-token');assert.equal(order.options.headers['Idempotency-Key'],'fixture-retry');assert.equal(order.options.body.get('customer'),'Test');assert.ok(order.options.body.get('file'));assert.equal(order.options.body.get('receipt'),null);
});
