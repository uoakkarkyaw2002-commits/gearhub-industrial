// Phone Back button (Android) and swipe-back: go back one step at a time inside the
// shop — close the open photo/cart/checkout, then the category, then the tab — and
// only leave the app after a second Back press on Home ("press again to exit").
// Each step the shopper takes becomes one browser history entry.
(()=>{
 if(!window.history||!history.pushState)return;
 const overlays=[["gallery-modal","gallery-close"],["checkout-modal","checkout-close"],["share-modal","share-close"],["drawer","cart-close"]];
 const openOverlay=()=>overlays.find(([id])=>document.getElementById(id)?.classList.contains("open"))?.[0]||"";
 const snapshot=()=>({view:storeView,open:categoryProductsOpen,direct:categoryDirectOnly,sel:selectedCategory,exp:[...expandedCategoryNames],overlay:openOverlay()});
 const key=s=>[s.view,s.view==="category"?[s.open,s.direct,s.sel].join("|"):"",s.overlay].join("#");
 const steps=[];let index=0,restoring=false,ignorePops=0,exitArmed=0,exitTimer;
 function restore(s){
  restoring=true;
  try{
   for(const [id,close] of overlays)if(id!==s.overlay&&document.getElementById(id)?.classList.contains("open"))document.getElementById(close)?.click();
   categoryProductsOpen=s.open;categoryDirectOnly=s.direct;selectedCategory=s.sel;expandedCategoryNames.clear();s.exp.forEach(name=>expandedCategoryNames.add(name));
   if(storeView!==s.view)showStoreView(s.view);else if(s.view==="category")renderCategoryBrowser();
  }finally{restoring=false}
 }
 function record(){
  if(restoring)return;
  // Tapped something while "press again to exit" was showing: put the guard back first.
  if(index===0){clearTimeout(exitTimer);exitArmed=0;steps.length=1;steps.push(steps[0]);history.pushState({ghStep:1},"");index=1}
  const now=snapshot(),k=key(now);if(k===key(steps[index]))return void(steps[index]=now);
  // Going back through the shop's own buttons (✕, Home, ‹ Categories): reuse the history.
  for(let i=index-1;i>=1;i--)if(key(steps[i])===k){ignorePops++;steps[i]=now;const back=i-index;index=i;steps.length=index+1;history.go(back);return}
  steps.length=index+1;steps.push(now);index++;history.pushState({ghStep:index},"");
 }
 function armExit(){
  clearTimeout(exitTimer);exitArmed=Date.now();
  const message=(typeof lang!=="undefined"&&lang==="my")?"ထွက်မှာ သေချာလား? ထွက်ရန် Back ကို ထပ်နှိပ်ပါ":"Exit the app? Press Back again to exit.";
  if(typeof toast==="function")toast(message);
  // Not pressed again in time: stay in the app and ask again next time.
  exitTimer=setTimeout(()=>{exitArmed=0;if(index===0){history.pushState({ghStep:1},"");index=1}},2500);
 }
 window.addEventListener("popstate",event=>{
  if(ignorePops){ignorePops--;return}
  const target=Number(event.state?.ghStep);
  if(!Number.isInteger(target))return;
  if(target===0){index=0;restore(steps[1]||steps[0]);armExit();return}
  clearTimeout(exitTimer);exitArmed=0;
  index=Math.min(target,steps.length-1);restore(steps[index]);
 });
 const later=()=>setTimeout(record,0);
 document.addEventListener("click",later);document.addEventListener("touchend",later,{passive:true});document.addEventListener("keyup",event=>{if(event.key==="Escape")later()});
 // Entry 0 is the "leave the app" edge; entry 1 is where the shop starts.
 const start=snapshot();steps.push(start,start);
 history.replaceState({ghStep:0},"");history.pushState({ghStep:1},"");index=1;
 window.GearHubBackNav={record,steps:()=>steps.map(key),index:()=>index};
})();
