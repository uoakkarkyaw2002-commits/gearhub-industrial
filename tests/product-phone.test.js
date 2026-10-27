const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');

test('the phone editor does not mutate the existing desktop form on startup',()=>{
 let writes=0;const media={matches:false,addEventListener(){}},extra={querySelector:()=>({})};
 const form={querySelector:()=>extra},content={querySelector:()=>({})};
 const document={getElementById:id=>id==='product-form'?form:id==='product-form-content'?content:{},createElement(){writes++;},body:{classList:{toggle(){writes++;}}}};
 vm.runInNewContext(read('product-phone.js'),{document,matchMedia:()=>media,MutationObserver:class{observe(){}}});
 assert.equal(writes,0,'desktop markup and body classes must remain untouched');
});

test('every phone editor style is inside its phone media query; original control names are retained',()=>{
 const css=read('product-phone.css').replace(/\/\*[\s\S]*?\*\//g,'').trim();
 assert.ok(css.startsWith('@media(max-width:800px){'));let depth=0,closedAt=-1;
 for(let i=0;i<css.length;i++){if(css[i]==='{')depth++;if(css[i]==='}'&&--depth===0)closedAt=i;}
 assert.equal(closedAt,css.length-1,'no editor rules may escape into desktop');assert.equal(depth,0);
 const js=read('product-phone.js');assert.match(js,/save\.setAttribute\('form','product-form'\)/,'top Save submits the actual form');
 assert.match(js,/marker\.replaceWith\(node\)/,'mobile optional fields return to their desktop positions');
 for(const name of ['nameMy','promotionPrice','imageUrls','active'])assert.ok(js.includes("namedItem('"+name+"')"),name+' is moved, not duplicated or removed');
});

test('phone AI cards use the real response, select the existing category ID, and restore desktop markup on resize',async()=>{
 const events={},fields=new Map(['categoryEn','categoryMy','categoryId'].map(n=>[n,{value:'',dispatchEvent(){}}]));
 const input={files:[{}],closest:()=>({after(){}}),addEventListener:(name,fn)=>{events[name]=fn}};
 const form={querySelector:()=>input,elements:{namedItem:n=>fields.get(n)},addEventListener:(name,fn)=>{events['form:'+name]=fn}};
 const panel={hidden:true,innerHTML:'',setAttribute(){},querySelector(){return null},querySelectorAll(){return []},addEventListener:(name,fn)=>{events['panel:'+name]=fn}};
 const media={matches:true,addEventListener:(name,fn)=>{events['media:'+name]=fn}};
 const result={ready:true,quality:{dark:false,blurry:false},duplicates:[{name:'MONITOR <unsafe>',sku:'300426-00202',score:.99}],categories:[{id:2,name:'Doosan',nameMy:'ဒူဆန်',path:'Electrical Parts › Doosan',score:.99,example:'MONITOR'}]};
 let calls=0;const document={getElementById:()=>form,createElement:tag=>tag==='div'?panel:{getContext:()=>({drawImage(){}}),toBlob:fn=>fn(new Blob())}};
 vm.runInNewContext(read('product-ai.js'),{document,window:{GearHubTenantAdmin:{ai:async()=>{calls++;return{ok:true,json:async()=>result}}}},matchMedia:()=>media,Event,Blob,createImageBitmap:async()=>({width:100,height:100,close(){}})});
 await events.change();assert.equal(panel.hidden,false);assert.match(panel.innerHTML,/product-ai-duplicate/);assert.match(panel.innerHTML,/product-ai-robot\.png/);assert.match(panel.innerHTML,/99%/);assert.match(panel.innerHTML,/MONITOR &lt;unsafe&gt;/);assert.match(panel.innerHTML,/Suggested category \(AI\)/);assert.match(panel.innerHTML,/Electrical Parts › Doosan/);
 const button={dataset:{aiCategory:'0'}};events['panel:click']({target:{closest:()=>button}});
 assert.equal(fields.get('categoryEn').value,'Doosan');assert.equal(fields.get('categoryMy').value,'ဒူဆန်');assert.equal(fields.get('categoryId').value,2);
 media.matches=false;events['media:change']();assert.doesNotMatch(panel.innerHTML,/product-ai-duplicate|product-ai-phone-cats|product-ai-robot/);
 assert.match(panel.innerHTML,/<p class="product-ai-warn">⚠ ဒီပစ္စည်း ရှိပြီးသား ဖြစ်နိုင်တယ်: <b>MONITOR &lt;unsafe&gt;<\/b> \(300426-00202\) — 99% တူ \/ This part may already be in the shop\.<\/p>/);
 assert.match(panel.innerHTML,/<div class="product-ai-cats"><p>💡 Category အကြံ \/ Suggested category<\/p>/);assert.equal(calls,1,'resizing must not rerun the AI');
 events['form:reset']();assert.equal(panel.hidden,true);assert.equal(panel.innerHTML,'');
});
