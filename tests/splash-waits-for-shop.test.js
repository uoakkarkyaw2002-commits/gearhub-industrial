// During an update (and on a reload) the cover stays until the shop's own data is on the page,
// so GearHub's template or other pictures never flash; an update never plays the sound.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

function run({navType='navigate',updating=false,seconds=3,saved='1'}={}){const made=[];
 const listeners={},timers=[],classes=new Set(),attrs={'data-sound':'/s.mp3'};let removed=false,played=0,now=0;
 const label={textContent:'Loading',after(){},style:{},complete:false,addEventListener(){},getAttribute(){return null}};let retries=0;
 const el={dataset:{seconds:String(seconds),get sound(){return attrs['data-sound']}},classList:{add:(...c)=>c.forEach(x=>classes.add(x)),remove:(...c)=>c.forEach(x=>classes.delete(x)),contains:c=>classes.has(c)},
  removeAttribute:k=>delete attrs[k],hasAttribute:k=>k in attrs,querySelector:()=>label,cloneNode(){return this},remove(){removed=true},get isConnected(){return !removed},contains:()=>false};
 const session=new Map(updating?[['gh-update-splash:/',saved]]:[]);
 const ctx={document:{createElement:()=>{const n={className:'',textContent:''};made.push(n);return n},getElementById:()=>removed?null:el,body:{querySelectorAll:()=>[],prepend(){}},addEventListener(){},removeEventListener(){}},
  sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},location:{pathname:'/'},performance:{getEntriesByType:()=>[{type:navType}]},
  addEventListener:(n,f)=>(listeners[n]=listeners[n]||[]).push(f),setTimeout:(f,ms)=>{timers.push({f,at:now+ms});return timers.length},setInterval:(f,ms)=>{const t={f,at:now+ms,every:ms};timers.push(t);return timers.length},clearInterval(){},navigator:{onLine:true},GearHubStore:{retry:()=>retries++},innerHeight:800,getComputedStyle:()=>({backgroundImage:'none'}),Image:class{},
  Audio:class{constructor(){this.preload=''}play(){played++;return Promise.resolve()}pause(){}},Promise,Date:{now:()=>1e12+now}};
 ctx.window=ctx;vm.runInNewContext(read('public/skyshop-splash.js'),ctx);
 const tick=async ms=>{const end=now+ms;while(true){const due=timers.filter(t=>t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!due)break;now=due.at;if(due.every)due.at+=due.every;else timers.splice(timers.indexOf(due),1);due.f();await Promise.resolve();await Promise.resolve();}now=end;for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
 return {made,dbg:()=>ctx,classes,label,tick,fire:async(name='gearhub:store-shown')=>{(listeners[name]||[]).forEach(f=>f());await tick(0)},removedSoon:async()=>{await tick(600);return removed},played:()=>played,retries:()=>retries};
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
 await s.tick(1000);assert.ok(s.classes.has('is-leaving'));
});

test('if the shop cannot load, the picture stays (never the empty template) and it retries',async()=>{
 const s=run({navType:'reload'});
 await s.fire('gearhub:store-failed');assert.ok(!s.classes.has('is-quiet'),'the picture is shown');
 await s.tick(60000);assert.ok(!s.classes.has('is-leaving'),'still covering after a minute');assert.ok(s.retries()>=3,'keeps retrying');
 await s.fire();await s.tick(3000);assert.ok(s.classes.has('is-leaving'),'opens once the shop data arrives');
});

test('store.js tells the splash when the shop is drawn; CSS for the quiet cover and moving bar',()=>{
 const store=read('public/store.js');assert.match(store,/const announceStore=\(\)=>window\.dispatchEvent\(new Event\(catalogLoaded\?"gearhub:store-shown":"gearhub:store-failed"\)\);\ninit\(\)\.then\(announceStore,announceStore\);/);assert.match(store,/window\.GearHubStore=\{retry:\(\)=>init\(\)\.then\(announceStore,announceStore\)\};/);
 const css=read('public/skyshop-splash.css');
 assert.match(css,/#sky-splash\.is-quiet picture,#sky-splash\.is-quiet \.sky-splash-loading\{display:none\}/);
 assert.match(css,/#sky-splash\.is-progress \.sky-splash-bar i\{width:0;animation:none!important/);assert.match(read('public/skyshop-splash.js'),/percent\.textContent=value\+'%'/);
});

test('Updating counts 0-100%: before the reload it counts up and hands the number to the next page',()=>{
 const js=read('public/skyshop-splash.js'),up=read('public/updates.js');
 assert.match(js,/const saved=sessionStorage\.getItem\(updateKey\);updating=Boolean\(saved\);carried=Math\.min\(99,Number\(saved\)\|\|0\)/);
 assert.match(js,/let shown=carried,goal=Math\.max\(5,carried\)/,'the new page continues from the carried number');
 assert.match(js,/sessionStorage\.setItem\(updateKey,String\(Math\.max\(1,whole\)\)\)/,'the page before the reload stores its number');
 assert.match(js,/return \{progress\(step\)\{goal=Math\.max\(goal,Math\.min\(99,step\)\)\}\}/);
 assert.match(up,/splash=window\.GearHubSplash\?\.showUpdating\?\.\(\);/);assert.match(up,/splash\?\.progress\?\.\(80\);/);
});

test('a reload during an update starts the counter where the old page stopped',async()=>{
 const s=run({updating:true,saved:'70'});
 await s.tick(100);assert.equal(s.made[0].textContent,'70%','continues from 70%, not from 0');
 await s.fire();await s.tick(3000);assert.equal(s.made[0].textContent,'100%');assert.ok(s.classes.has('is-leaving'));
});

test('Updating shows the looping flower animation (owner video) instead of the shop picture',()=>{
 const js=read('public/skyshop-splash.js'),css=read('public/skyshop-splash.css');
 assert.match(js,/const label=message\(node\);if\(label\)label\.textContent='Updating…';\n  bloom\(node\);/,'every Updating screen gets the animation');
 assert.match(js,/item\.animate\(frames,\{duration:BLOOM_CYCLE,iterations:Infinity/,'loops every 6 seconds until the screen closes');assert.match(js,/BLOOM_CYCLE=6000,BLOOM_DONE=4900/);
 assert.match(js,/loop\(wrap\.querySelector\('\.sb-all'\),\[\{opacity:1,offset:0\},\{opacity:1,offset:\.82\},\{opacity:0,offset:\.93\}/,'fades out and grows again');
 assert.match(css,/#sky-splash\.is-updating picture\{display:none\}/);
 assert.match(css,/#sky-splash\.is-updating\{background:radial-gradient/);
});

test('fast line: only the picture shows (no Loading box); slow line: the box appears',async()=>{
 const fast=run({seconds:3});await fast.fire();await fast.tick(3600);assert.ok(fast.classes.has('is-leaving'));assert.ok(!fast.classes.has('show-loading'),'never shown on a fast line');
 const slow=run({seconds:3});await slow.tick(4500);assert.ok(slow.classes.has('show-loading'),'shown when still waiting');
});

test('the counter only moves on real steps (no creeping while the line is stuck)',async()=>{
 const s=run({seconds:3});await s.tick(20000);
 assert.ok(Number(s.made[0].textContent.replace('%',''))<=15,'stays at the page step until the shop data arrives');
});

test('opening picture: saved on the phone, versioned, shown only when fully loaded',()=>{
 const sw=read('public/sw.js'),install=read('lib/tenant-install.js'),css=read('public/skyshop-splash.css'),js=read('public/skyshop-splash.js');
 assert.match(sw,/"\/images\/skyshop-splash-phone\.jpg\?v=1","\/images\/skyshop-splash-pc\.jpg\?v=1"/,'built-in pictures are precached');
 assert.match(sw,/url\.pathname\.startsWith\("\/images\/skyshop-splash-"\) \|\| \/\^\\\/splash-asset\\\/\(\?:pc\|phone\)\$\/\.test\(url\.pathname\)\) \{\n\s*event\.respondWith\(caches\.match\(request\)\.then\(saved => saved \|\|/,'cache first, network only when not saved yet');
 assert.match(install,/'\/images\/skyshop-splash-'\+kind\+'\.jpg\?v='\+SPLASH_IMAGE_V/);
 assert.match(css,/#sky-splash\{position:fixed;inset:0;z-index:2147483000;background:#f5f7f1;/,'no blue box while the picture loads');
 assert.match(css,/#sky-splash\.is-picture-wait picture\{opacity:0\}/);
 assert.match(js,/const decode=\(\)=>\(photo\.decode\?photo\.decode\(\):Promise\.resolve\(\)\)\.then\(reveal,reveal\);/);
});

test('Updating and Settings Refresh: the flowers always finish and continue across the reload',()=>{
 const js=read('public/skyshop-splash.js'),settings=read('public/settings.js');
 assert.match(js,/run\.currentTime=\(Date\.now\(\)-start\)%BLOOM_CYCLE/,'continues where the old page was');
 assert.match(js,/return passed>=BLOOM_DONE&&phase>=BLOOM_DONE&&phase<BLOOM_DONE\+600/,'leaves only at full bloom');
 assert.match(js,/if\(done&&shown>=100&&Date\.now\(\)-started>=seconds\*1000&&bloomFinished\(\)\)setTimeout\(leave,150\)/);
 assert.match(settings,/if \(window\.GearHubSplash\?\.showUpdating\) \{ window\.GearHubSplash\.showUpdating\(\); setTimeout\(\(\) => location\.reload\(\), 80\); \}/);
});
