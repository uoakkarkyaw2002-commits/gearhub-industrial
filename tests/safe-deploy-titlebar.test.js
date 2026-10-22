// During a Render deploy the server restarts for a few seconds. The page must never show
// without its styles, and the installed PC store app has no dark title bar with the shop name.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('a stylesheet or script that fails during a deploy falls back to a saved copy',()=>{
 const sw=read('public/sw.js');
 assert.match(sw,/if \(response\.ok\) return response;\n\s*return cachedAsset\(request\)\.then\(saved => saved \|\| response\);\n\s*\}\)\.catch\(\(\) => cachedAsset\(request\)\)/);
 assert.match(sw,/caches\.match\(request, \{ignoreSearch: true\}\)/,'any ?v= copy is better than no styles');
 assert.match(sw,/if \(response\.ok \|\| response\.status < 500\) return response;\n\s*throw new Error\("server restarting"\);/,'a 5xx page opens the saved shop page instead');
});

test('installed store app on PC hides the title bar; admin app is unchanged',()=>{
 assert.match(read('lib/tenant-install.js'),/scope:i\.base,display:'standalone',display_override:\['window-controls-overlay','standalone'\]/);
 assert.match(read('server.js'),/manifest\.display_override=\["window-controls-overlay","standalone"\];[\s\S]*?res\.set[\s\S]*?\napp\.get\("\/admin\.webmanifest"/);
 const css=read('public/desktop.css');
 assert.match(css,/@media \(display-mode:window-controls-overlay\)\{\n html::after\{[^}]*height:env\(titlebar-area-height,0px\);background:#fff;-webkit-app-region:drag/);
 assert.match(css,/body\{padding-top:env\(titlebar-area-height,0px\)\}/);
});

test('server down: style.css with a new ?v= is served from the saved copy',async()=>{
 const vm=require('node:vm'),handlers={},saved={ok:true,body:'saved css'};
 const caches={open:async()=>({put:async()=>{}}),match:async(req,opts)=>opts&&opts.ignoreSearch&&String(req.url).includes('/style.css')?saved:undefined};
 for(const fetch of [async()=>{throw new TypeError('Failed to fetch')},async()=>({ok:false,status:502})]){
  const ctx={URL,self:{location:{origin:'https://shop.test'},addEventListener:(t,fn)=>handlers[t]=fn},caches,fetch};vm.runInNewContext(read('public/sw.js'),ctx);let pending;
  handlers.fetch({request:{method:'GET',mode:'no-cors',url:'https://shop.test/style.css?v=new-version'},respondWith:p=>pending=p});
  assert.equal(await pending,saved);
 }
});
