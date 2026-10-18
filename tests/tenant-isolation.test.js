const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
// Every seller route under /shops/:id must load the shop through shopFor(), which only
// returns a shop to its own seller (or the GearHub owner). A new route that skips it
// could let one shop read or change another shop's data, so this test fails loudly.
const read=f=>fs.readFileSync(path.join(__dirname,'..','lib',f),'utf8');
function routes(source){
 const re=/router\.(get|post|put|patch|delete)\(\s*(['"`])(.+?)\2/g,found=[];let m;
 while((m=re.exec(source)))found.push({at:m.index,method:m[1],path:m[3]});
 return found.map((r,i)=>({...r,body:source.slice(r.at,i+1<found.length?found[i+1].at:source.length)}));
}
test('every seller /shops/:id route checks shop ownership through shopFor',()=>{
 const platform=read('platform.js');
 const helpers=['product'].filter(name=>new RegExp('function '+name+'\\(req, res, edit\\) \\{\\s*const \\{ shop, limits \\} = shopFor\\(').test(platform));
 assert.deepEqual(helpers,['product']);
 let checked=0;
 for(const file of ['platform.js','tenant-admin.js']){
  for(const r of routes(read(file))){
   if(!r.path.startsWith('/shops/:id'))continue;checked++;
   assert.ok(/shopFor\(req/.test(r.body)||/\bproduct\(req, res/.test(r.body),file+' '+r.method.toUpperCase()+' '+r.path+' must call shopFor()');
  }
 }
 assert.ok(checked>=15,'expected the seller routes to be found, got '+checked);
});
test('shopFor hides other shops as not found and seller queries stay scoped to shop_id',()=>{
 const platform=read('platform.js');
 const shopFor=platform.slice(platform.indexOf('function shopFor('),platform.indexOf('function publicShop('));
 assert.match(shopFor,/shop\.owner_id !== u\.id && !model\.isOwner\(db, u, ownerEmail\)/);assert.match(shopFor,/fail\(404, "Shop not found\."\)/);
 // Reviewed exceptions: store()/discard() only receive ids that were just created or already
 // checked by asset(shop, ...); the public image route checks the owning shop with publicShop().
 const reviewed=new Set(['UPDATE platform_files SET ready=1 WHERE id=?','DELETE FROM platform_files WHERE id=?','SELECT * FROM platform_files WHERE id=?',"SELECT * FROM platform_files WHERE id=? AND kind="]);
 const unscoped=[...(platform+read('tenant-admin.js')).matchAll(/(SELECT|UPDATE|DELETE)[^"'`]*platform_(products|orders|files)[^"'`]*WHERE ([^"'`]*)/g)].map(m=>m[0]).filter(q=>!/shop_id/.test(q)&&!reviewed.has(q));
 assert.deepEqual(unscoped,[]);
 const image=platform.slice(platform.indexOf('"/images/:file"'));assert.match(image.slice(0,600),/publicShop\(s\.slug\)/);
});
