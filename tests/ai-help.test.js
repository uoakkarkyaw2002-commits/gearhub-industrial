// 1.1.332 owner: an AI robot that answers only questions about using this app (English and Myanmar).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
function load(){
 const el=()=>new Proxy(function(){},{get:(t,k)=>k==='children'?[]:k==='style'?{}:typeof k==='symbol'?undefined:el(),set:()=>true,apply:()=>el()});
 const window={};const context={window,document:{documentElement:{lang:'en'},querySelector:()=>({}),createElement:()=>el(),body:el()},MutationObserver:function(){return {observe(){}}},matchMedia:()=>({matches:false}),setTimeout};
 vm.runInNewContext(read('ai-help.js'),context);return window.GearHubAiHelp.answer;
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
 for(const [q,want] of Object.entries(cases))assert.equal(id(q),want,q);
 for(const q of ['ထမင်းဘယ်လိုချက်ရမလဲ','What is bitcoin price','ကမ္ဘာ့အမြင့်ဆုံးတောင်က ဘာလဲ','ဘောလုံးပွဲ ဘယ်သူနိုင်လဲ'])assert.equal(id(q),null,q);
 for(const q of ['What is the capital of France?','Write me a poem','မနက်ဖြန် မိုးရွာမလား','2+2','Tell me a joke about cats'])assert.equal(id(q),null,q);
 const html=read('index.html'),sw=read('sw.js');
 for(const tag of ['/ai-help.js?v=1.1.334','/ai-help.css?v=1.1.333'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
});
