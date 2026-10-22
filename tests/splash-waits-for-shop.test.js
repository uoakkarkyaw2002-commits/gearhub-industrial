// During an update (and on a reload) the cover stays until the shop's own data is on the page,
// so GearHub's template or other pictures never flash; an update never plays the sound.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

function run({navType='navigate',updating=false,seconds=3}={}){
 const listeners={},timers=[],classes=new Set(),attrs={'data-sound':'/s.mp3'};let removed=false,played=0,now=0;
 const label={textContent:'Loading'};
 const el={dataset:{seconds:String(seconds),get sound(){return attrs['data-sound']}},classList:{add:(...c)=>c.forEach(x=>classes.add(x)),remove:(...c)=>c.forEach(x=>classes.delete(x)),contains:c=>classes.has(c)},
  removeAttribute:k=>delete attrs[k],hasAttribute:k=>k in attrs,querySelector:()=>label,cloneNode(){return this},remove(){removed=true},get isConnected(){return !removed},contains:()=>false};
 const session=new Map(updating?[['gh-update-splash:/','1']]:[]);
 const ctx={document:{getElementById:()=>removed?null:el,body:{querySelectorAll:()=>[],prepend(){}},addEventListener(){},removeEventListener(){}},
  sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},location:{pathname:'/'},performance:{getEntriesByType:()=>[{type:navType}]},
  addEventListener:(n,f)=>(listeners[n]=listeners[n]||[]).push(f),setTimeout:(f,ms)=>{timers.push({f,at:now+ms});return timers.length},innerHeight:800,getComputedStyle:()=>({backgroundImage:'none'}),Image:class{},
  Audio:class{constructor(){this.preload=''}play(){played++;return Promise.resolve()}pause(){}},Promise,Date:{now:()=>1e12}};
 ctx.window=ctx;vm.runInNewContext(read('public/skyshop-splash.js'),ctx);
 const tick=async ms=>{now+=ms;for(const t of timers.splice(0))if(t.at<=now)t.f();else timers.push(t);for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
 return {classes,label,tick,fire:async()=>{(listeners['gearhub:store-shown']||[]).forEach(f=>f());await tick(0)},removedSoon:async()=>{await tick(600);return removed},played:()=>played};
}

test('update: "Updating…" picture, no sound, held until the shop is drawn',async()=>{
 const s=run({updating:true});
 assert.ok(s.classes.has('is-updating'));assert.equal(s.label.textContent,'Updating…');assert.equal(s.played(),0,'no sound during an update');
 await s.tick(5000);assert.ok(!s.classes.has('is-leaving'),'still covering: the shop data has not arrived');
 await s.fire();await s.tick(2600);assert.ok(s.classes.has('is-leaving'));assert.ok(await s.removedSoon());
});

test('reload: a plain cover (no picture, no sound) until the shop is drawn',async()=>{
 const s=run({navType:'reload'});
 assert.ok(s.classes.has('is-quiet'));assert.equal(s.played(),0);
 await s.tick(3000);assert.ok(!s.classes.has('is-leaving'));
 await s.fire();await s.tick(2600);assert.ok(s.classes.has('is-leaving'));
});

test('opening the shop keeps the picture for its time and also waits for the data',async()=>{
 const s=run({seconds:3});
 await s.fire();await s.tick(2600);assert.ok(!s.classes.has('is-leaving'),'opening time not over yet');
 await s.tick(500);assert.ok(s.classes.has('is-leaving'));
});

test('never covers the page for more than about 12 seconds',async()=>{
 const s=run({navType:'reload'});await s.tick(12000);await s.tick(2600);assert.ok(s.classes.has('is-leaving'));
});

test('store.js tells the splash when the shop is drawn; CSS for the quiet cover and moving bar',()=>{
 assert.match(read('public/store.js'),/\}init\(\)\.finally\(\(\)=>window\.dispatchEvent\(new Event\("gearhub:store-shown"\)\)\);/);
 const css=read('public/skyshop-splash.css');
 assert.match(css,/#sky-splash\.is-quiet picture,#sky-splash\.is-quiet \.sky-splash-loading\{display:none\}/);
 assert.match(css,/#sky-splash\.is-waiting \.sky-splash-bar i\{width:35%;animation:sky-splash-wait/);
});
