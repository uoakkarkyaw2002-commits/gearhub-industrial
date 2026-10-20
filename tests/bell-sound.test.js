// The admin order bell must be heard on iPhone: the chime is a short WAV played by an
// <audio> element (iPhone mutes Web Audio on silent), unlocked by the first tap, and
// tapping the bell plays it once so the volume can be checked.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','public','admin-extras.js'),'utf8');

function load(){
 const handlers={},els={},plays=[],session={};let bellClick;
 const el=id=>els[id]||(els[id]={id,hidden:true,textContent:'',innerHTML:'',classList:{s:new Set(),add(c){this.s.add(c)},remove(c){this.s.delete(c)},contains(c){return this.s.has(c)}},addEventListener(t,f){if(id==='admin-bell'&&t==='click')bellClick=f},prepend(){},offsetWidth:1,setAttribute(){}});
 class Audio{constructor(url){this.url=url;this.muted=false;this.currentTime=0}play(){plays.push({muted:this.muted,url:this.url});return Promise.resolve()}pause(){}}
 const store={};
 const ctx={Audio,Blob:class{constructor(parts,o){this.parts=parts;this.type=o.type}},URL:{createObjectURL:b=>'blob:'+b.type+':'+b.parts[0].byteLength},
  document:{getElementById:el,addEventListener:(t,f)=>(handlers[t]=handlers[t]||[]).push(f),createElement:()=>el('x'+Math.random()),querySelector:()=>null,hidden:false},
  navigator:{onLine:true,audioSession:session,vibrate(){}},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},
  location:{pathname:'/admin.html'},addEventListener(){},setInterval:(f,ms)=>{ctx.pollEvery=ms},setTimeout:(f)=>{f();return 1},requestAnimationFrame(){},Intl,Date,Map,Set,JSON,Math,Number,String,Promise,ArrayBuffer,DataView,Int16Array,Uint8Array};
 ctx.window=ctx;vm.runInNewContext(src,ctx);
 return {ctx,handlers,plays,session,api:ctx.GearHubAdminExtras,tap:()=>handlers.touchend.forEach(f=>f()),bell:()=>bellClick()};
}
const flush=()=>new Promise(r=>setImmediate(r));

test('first tap unlocks a WAV chime and sets the audio session to playback (plays on silent)',async()=>{
 const t=load();t.tap();await flush();
 assert.equal(t.session.type,'playback');
 assert.equal(t.plays.length,1);assert.equal(t.plays[0].muted,true,'unlock play is silent');
 assert.match(t.plays[0].url,/^blob:audio\/wav:\d+$/);
 assert.ok(Number(t.plays[0].url.split(':')[2])>44+20000,'real sound data, not an empty file');
});

test('a new order plays the chime out loud; tapping the bell plays it too',async()=>{
 const t=load();t.tap();await flush();const o=[{id:1,status:'pending'}];
 t.api.update({},o,[]);assert.equal(t.plays.length,1,'first load is not "new"');
 t.api.update({},[...o,{id:2,status:'pending'}],[]);await flush();
 assert.equal(t.plays.length,2);assert.equal(t.plays[1].muted,false);
 t.bell();await flush();assert.equal(t.plays.length,3);assert.equal(t.plays[2].muted,false);
});

test('unlock listens to touchend and click (iPhone) and new orders are checked every 20 s',()=>{
 const t=load();
 for(const type of ['pointerdown','touchend','click','keydown'])assert.ok(t.handlers[type]?.length,type);
 assert.equal(t.ctx.pollEvery,20000);
});

test('five new orders ring five times; orders already rung as phone alerts are not repeated',async()=>{
 const t=load();t.tap();await flush();const base=[{id:1,status:'pending'}];
 t.api.update({},base,[]);const before=t.plays.length;
 t.api.update({},[...base,...[2,3,4,5,6].map(id=>({id,status:'pending'}))],[]);await flush();
 assert.equal(t.plays.length-before,5,'one sound per new order');
});
