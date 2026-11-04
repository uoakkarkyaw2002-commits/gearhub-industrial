// 1.1.306 owner: during a Render deploy the black "502 Bad Gateway" page showed. The service worker now opens
// the saved page (also the admin) on a 5xx, and with nothing saved shows a short "updating" page that retries.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('a 5xx during a deploy never reaches the screen',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');
 assert.match(sw,/const busyPage = \(\) => new Response\(/);assert.match(sw,/http-equiv="refresh" content="5"/,'opens again by itself');
 assert.match(sw,/cache\.put\(url\.pathname, copy\)\); \}\n\s*if \(response\.status >= 500\) throw new Error\("server restarting"\);/,'admin pages too');
 assert.match(sw,/\|\| busyPage\(\)\)\);/);assert.match(sw,/saved\|\|await caches\.match\('\/'\)\|\|busyPage\(\)/);
 assert.doesNotMatch(sw,/cache\.put\([^)]*busyPage/,'the updating page is never saved');
});

test('running sw.js: a 502 page from Render is replaced by the saved page, or by the updating page',async()=>{
 const vm=require('node:vm'),sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');
 const stores=new Map(),handlers={};
 const cacheFor=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {match:async k=>m.get(typeof k==='string'?new URL(k,'https://shop.test').pathname===k?k:k:k.url)||m.get(String(k)),put:async(k,v)=>{m.set(typeof k==='string'?k:k.url,v)},keys:async()=>[...m.keys()],delete:async k=>m.delete(k),addAll:async()=>{}}};
 const ctx={URL,Response,Request,Headers,setTimeout,clearTimeout,console,self:{clients:{claim:async()=>{},matchAll:async()=>[],get:async()=>null},location:{origin:'https://shop.test'},registration:{scope:'https://shop.test/'},skipWaiting:()=>{},addEventListener:(t,f)=>handlers[t]=f},
  caches:{open:async n=>cacheFor(n),match:async k=>{for(const m of stores.values()){const v=m.get(typeof k==='string'?k:k.url);if(v)return v}},keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n)},
  fetch:async()=>new Response('<h1>502 Bad Gateway</h1>',{status:502,headers:{'Content-Type':'text/html'}})};
 ctx.addEventListener=ctx.self.addEventListener;vm.runInNewContext(sw,ctx);
 const go=async(href)=>{let out;handlers.fetch({request:{url:href,mode:'navigate',method:'GET',headers:new Headers()},respondWith:p=>{out=p},waitUntil(){}});return out&&await out};
 let r=await go('https://shop.test/shops/polestar/admin');
 assert.equal(r.status,503);assert.match(await r.text(),/update လုပ်နေပါတယ်/,'admin with nothing saved: the updating page, never Render\'s 502');
 (await ctx.caches.open('gearhub-admin-v1')).put('/shops/polestar/admin',new Response('<p>saved admin</p>'));
 r=await go('https://shop.test/shops/polestar/admin');assert.equal(await r.text(),'<p>saved admin</p>','admin opens from its saved copy');
 r=await go('https://shop.test/shops/polestar/?x=1');assert.match(await r.text(),/http-equiv="refresh"/,'shop page with nothing saved: the updating page');
});
