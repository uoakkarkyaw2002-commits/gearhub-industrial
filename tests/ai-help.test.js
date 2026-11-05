// 1.1.332 owner: an AI robot that answers only questions about using this app (English and Myanmar).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
function load(){
 const el=()=>new Proxy(function(){},{get:(t,k)=>k==='children'?[]:k==='style'?{}:typeof k==='symbol'?undefined:el(),set:()=>true,apply:()=>el()});
 const window={};const context={window,document:{documentElement:{lang:'en'},querySelector:()=>({}),createElement:()=>el(),body:el(),addEventListener(){}},addEventListener(){},MutationObserver:function(){return {observe(){}}},matchMedia:()=>({matches:false}),setTimeout};
 vm.runInNewContext(read('ai-help.js'),context);const h=window.GearHubAiHelp;load.last={tours:h.tours,ids:h.ids,labels:h.labels,near:h.near};return h.answer;
}
test('the AI helper answers app questions and refuses everything else',()=>{
 const answer=load(),id=q=>answer(q)?.[0]||null;
 assert.equal(id('How do I order?'),'order');assert.equal(id('ဘယ်လိုမှာရမလဲ'),'order');
 assert.equal(id('How to search a part no'),'search');assert.equal(id('ကင်မရာနဲ့ ရှာလို့ရလား'),'scan');
 assert.equal(id('how do I add to home screen'),'install');assert.equal(id('ဆိုင်ကို ဖော်လိုလုပ်နည်း'),'follow');
 assert.equal(id('add product'),'addproduct');assert.equal(id('dark mode'),'theme');assert.equal(id('App က လေးနေတယ်'),'speed');
 assert.equal(id('how to create my own shop'),'createshop');assert.equal(id('chat with the shop'),'chat');
 // 1.1.333 owner's iPhone test: mixed Myanmar / English ways of asking.
 const cases={'Product ဘယ်လိုထည့်ရလဲ':'addproduct','App အသုံးပြုနည်း ပြောပြပါ':'help','ပစ္စည်းအသစ် ဘယ်လိုတင်ရမလဲ':'addproduct','ဘယ်လို order တင်ရမလဲ':'order','ငွေဘယ်လိုလွှဲရမလဲ':'payment',
  'ဆိုင်ဘယ်လိုဖွင့်ရမလဲ':'createshop','Excel ဘယ်လိုတင်ရမလဲ':'excel','category အသစ်ထည့်ချင်တယ်':'editcategory','Profile ပုံ ဘယ်လိုပြောင်းရမလဲ':'profile','ဆိုင်ကို စာပို့ချင်တယ်':'chat',
  'ဖုန်းထဲ app ဘယ်လိုထည့်ရမလဲ':'install','comment ဘယ်လိုဖျက်ရမလဲ':'comment','ဒီ app က ဘာတွေလုပ်လို့ရလဲ':'help','how to change my logo':'profile','where are my orders':'myorder',
  'Product ဘယ်လိုဖျက်ရမလဲ':'editproduct','stock ဘယ်လိုပြင်ရမလဲ':'editproduct','ဆိုင်ကို ဖော်လိုလုပ်နည်း':'follow'};
 // 1.1.334 owner's iPhone: its keyboard typed ထည့် with the marks in the other order; a topic beats "how to use".
 Object.assign(cases,{'Category အသုံးပြုနည်းပြောပြ':'category','Excel အသုံးပြုနည်း':'excel','help me':'help'});
 assert.equal(id('Product ဘယ်လိုထ\u100a\u103a\u1037လဲ'),'addproduct','iPhone mark order');
 // 1.1.337 owner's iPhone: questions about this shop and account are answered from the real data.
 Object.assign(cases,{'ငါ့မှာ product ဘယ်နှစ်ခု ရှိလဲ':'countproducts','how many products do I have':'countproducts','ငါ့ အကောင့်မှာ ဘာ error ရှိလဲ':'check','check my account':'check',
  'ဖော်လိုဝါ ဘယ်နှစ်ယောက်ရှိလဲ':'countfollowers','cart ထဲ ဘာရှိလဲ':'cartnow','ဘယ် အကောင့်နဲ့ ဝင်ထားလဲ':'whoami','app version':'version','cart ထဲ ဘယ်လိုထည့်ရမလဲ':'cart'});
 for(const [q,want] of Object.entries(cases))assert.equal(id(q),want,q);
 for(const q of ['ထမင်းဘယ်လိုချက်ရမလဲ','What is bitcoin price','ကမ္ဘာ့အမြင့်ဆုံးတောင်က ဘာလဲ','ဘောလုံးပွဲ ဘယ်သူနိုင်လဲ'])assert.equal(id(q),null,q);
 for(const q of ['What is the capital of France?','Write me a poem','မနက်ဖြန် မိုးရွာမလား','2+2','Tell me a joke about cats'])assert.equal(id(q),null,q);
 // 1.1.335 owner: Go shows each step on the real screen; every guide belongs to an answer.
 {const w=load.last;const ids=new Set(w.ids);for(const k of Object.keys(w.tours))assert.ok(ids.has(k),'guide without answer: '+k);
  assert.ok(['addproduct','order','install','excel','profile'].every(k=>w.tours[k]?.length>=2));}
 // 1.1.338 owner: "make the free assistant the best" — more of the app, and "did you mean" instead of a bare refusal.
 {const more={'Hero image ဘယ်လိုပြောင်းရလဲ':'hero','ငါက ဘယ်သူလဲ':'whoami','ငါမှာ user ဘယ်လောက်ရှိသလဲ':'countfollowers','ဆိုင်နာမည် ဘယ်လိုပြင်ရမလဲ':'profile','ပစ္စည်းဈေး ဖျောက်ချင်တယ်':'usershow',
   'ပစ္စည်းကုန်သွားရင်':'lowstock','အော်ဒါ ဘယ်လိုအတည်ပြုရမလဲ':'confirmorder','ဖျက်ထားတဲ့ ပစ္စည်း ပြန်ယူချင်တယ်':'recycle','ဖုန်းနံပါတ် ဘာလဲ':'contactus','password မေ့သွားပြီ':'signin',
   'ပုံပြပြီး မေးလို့ရလား':'sendimage','SKU ဆိုတာ ဘာလဲ':'sku','ဒီ app ဆိုတာ ဘာလဲ':'aboutapp','how to change the home banner':'hero','where is the recycle bin':'recycle','how do I confirm an order':'confirmorder'};
  for(const [q,want] of Object.entries(more))assert.equal(id(q),want,q);
  for(const q of ['ထမင်းဘယ်လိုချက်ရမလဲ','ဘောလုံးပွဲ ဘယ်သူနိုင်လဲ','what is the weather'])assert.equal(id(q),null,q);
  assert.equal(load.last.near('ဘောလုံးပွဲ ဘယ်သူနိုင်လဲ').length,0,'off-topic gets no suggestions');
  assert.ok(load.last.near('ပစ္စည်း ဈေးကို ဘာပြုလုပ်ရမလဲ').length>=0);
  for(const [lid,[en,my]] of Object.entries(load.last.labels)){assert.equal(id(en),lid,'label '+en);assert.equal(id(my),lid,'label '+my)}}
 // 1.1.339 owner: "release the update" — answered with the real state; the assistant never presses Confirm update.
 for(const q of ['Update ကို release လုပ်လိုက်တော့','update နှိပ်ပေးပါ','ဆိုင်အားလုံး update လုပ်ပေး','Confirm update နှိပ်ခိုင်းတာ','release the update to all shops'])assert.equal(id(q),'releaseupdate',q);
 assert.equal(id('App update ရှိလား'),'version');assert.equal(id('refresh လုပ်နည်း'),'refresh');
 {const w=load.last,steps=w.tours.releaseupdate,last=steps[steps.length-1];assert.equal(last[0],'#shop-release-confirm');assert.equal(last[3],true,'the Confirm update step is manual: Next must not tap it');}
 {const src=read('ai-help.js');assert.ok(src.includes('!tour.steps[tour.i][3]'),'Next only taps non-manual steps');assert.ok(!/app-release[^\n]*method\s*:\s*['"]POST/.test(src),'the assistant never POSTs a release');}
 const html=read('index.html'),sw=read('sw.js');
 for(const tag of ['/ai-help.js?v=1.1.339','/ai-help.css?v=1.1.338'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
});
