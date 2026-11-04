// 1.1.287 owner: the installed iPhone app showed "Response served by service worker has redirections" while the
// server restarted, because the saved copy of "/" came from its redirect to /platform.html.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sw=fs.readFileSync(path.join(__dirname,'..','public','sw.js'),'utf8');

test('saved pages are handed over without the redirect mark',async()=>{
 const line=sw.match(/^const unredirect = .*$/m);assert.ok(line);
 const unredirect=new Function(line[0]+';return unredirect')();
 const saved=new Response('<p>page</p>',{status:200,headers:{'Content-Type':'text/html'}});Object.defineProperty(saved,'redirected',{value:true});
 const out=await unredirect(saved);
 assert.equal(out.redirected,false);assert.equal(await out.text(),'<p>page</p>');assert.equal(out.headers.get('content-type'),'text/html');
 const plain=new Response('x');assert.equal(unredirect(plain),plain);assert.equal(unredirect(undefined),undefined);
 assert.match(sw,/\.catch\(async \(\) => unredirect\(await \(async\(\)=>\{const tenant/,'store pages offline / server restarting');
 assert.match(sw,/\.catch\(async \(\) => unredirect\(await \(await caches\.open\(ADMIN_CACHE\)\)\.match\(url\.pathname\)\)/,'admin pages');
});
