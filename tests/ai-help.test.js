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
 for(const q of ['What is the capital of France?','Write me a poem','မနက်ဖြန် မိုးရွာမလား','2+2','Tell me a joke about cats'])assert.equal(id(q),null,q);
 const html=read('index.html'),sw=read('sw.js');
 for(const tag of ['/ai-help.js?v=1.1.332','/ai-help.css?v=1.1.332'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
});
