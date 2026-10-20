// Phone Back (Android) goes back one step at a time and asks before leaving the app;
// Category/Promotion fill the phone screen; the selected sub-category stays readable.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function shop(){
 const listeners={},timers=[];const entries=[{state:null}];let at=0;
 const history={pushState(s){entries.length=at+1;entries.push({state:s});at++},replaceState(s){entries[at]={state:s}},go(n){at+=n;if(at<0)return void(context.left=true);setTimeout(()=>fire({state:entries[at].state}),0)},back(){this.go(-1)}};
 const fire=e=>(listeners.popstate||[]).forEach(f=>f(e));
 const el=()=>({classList:{contains:()=>false}});const toasts=[];
 const context={history,toasts,left:false,storeView:'home',categoryProductsOpen:false,categoryDirectOnly:false,selectedCategory:'',expandedCategoryNames:new Set(),lang:'en',
  toast:m=>toasts.push(m),showStoreView(v){context.storeView=v},renderCategoryBrowser(){},
  setTimeout:(f,ms)=>{if(ms)timers.push(f);else Promise.resolve().then(f);return timers.length},clearTimeout(){},
  document:{getElementById:el,addEventListener(){}},addEventListener:(t,f)=>(listeners[t]=listeners[t]||[]).push(f)};
 context.window=context;vm.createContext(context);
 // Top-level `let` state in store.js is shared by name; here it lives on the context.
 vm.runInContext(pub('back-nav.js'),context);
 const tick=()=>new Promise(r=>setTimeout(r,5));
 return {context,record:()=>context.GearHubBackNav.record(),back:async()=>{history.back();await tick();await tick()},tick,at:()=>at};
}

test('Back walks back one step at a time, then asks before leaving',async()=>{
 const s=shop(),c=s.context;
 c.storeView='category';s.record();
 c.selectedCategory='MAIN PUMP';s.record();
 c.selectedCategory='AP2D36';c.categoryProductsOpen=true;s.record();
 await s.back();assert.equal(c.selectedCategory,'MAIN PUMP');assert.equal(c.categoryProductsOpen,false);assert.equal(c.storeView,'category');
 await s.back();assert.equal(c.selectedCategory,'');assert.equal(c.storeView,'category');
 await s.back();assert.equal(c.storeView,'home');assert.equal(c.toasts.length,0);
 await s.back();assert.equal(c.storeView,'home');assert.match(c.toasts[0],/Press Back again to exit/);assert.equal(c.left,false);
 await s.back();assert.equal(c.left,true,'second Back press leaves the app');
});

test('using the shop\'s own Home button does not pile up extra Back steps',async()=>{
 const s=shop(),c=s.context;
 c.storeView='promotion';s.record();c.storeView='home';s.record();await s.tick();await s.tick();
 assert.equal(s.at(),1,'back at the start entry');
 await s.back();assert.match(c.toasts[0]||'',/Press Back again/);
});

test('back-nav is loaded on every shop page and cached for offline use',()=>{
 assert.match(pub('index.html'),/<script src="\/settings\.js[^"]*"><\/script><script src="\/back-nav\.js\?v=[^"]+"><\/script>/);
 assert.match(pub('sw.js'),/"\/back-nav\.js\?v=[^"]+"/);
});

test('phones: Category and Promotion fill the screen; selected sub-category is green with white text',()=>{
 const css=pub('style.css');
 assert.match(css,/#category-view:not\(\.store-view-hidden\),#promotion-view:not\(\.store-view-hidden\)\{display:flex;flex-direction:column;min-height:calc\(100svh - var\(--bottom-nav-h,86px\) \+ 2px\)\}/);
 assert.match(css,/\.category-subcategories \.category-tree-choice\.selected\{background:linear-gradient\(110deg,#087629,#47a55b\)!important;color:#fff!important/);
 assert.match(pub('store.js'),/document\.documentElement\.style\.setProperty\("--bottom-nav-h",nav\.offsetHeight\+"px"\)/);
});
