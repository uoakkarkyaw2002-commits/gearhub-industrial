// Opening picture of a shop with a 0–100% counter. The shop opens only at 100%: its own name,
// banner and products are on the page and the pictures at the top have loaded. If the shop cannot
// load (no internet, server down) the picture stays and it keeps retrying, so GearHub's empty
// template is never shown. During an app update it says "Updating…" and plays no sound. On a
// reload it is a plain cover first and turns into the picture only if loading takes a while.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const shop=location.pathname.match(/^\/shops\/([^/]+)/);
 const updateKey='gh-update-splash:'+(shop?'/shops/'+shop[1]+'/':'/');
 // The page before the reload stores how far the update got (1–99), so the counter continues.
 let updating=false,carried=0;try{const saved=sessionStorage.getItem(updateKey);updating=Boolean(saved);carried=Math.min(99,Number(saved)||0);if(updating)sessionStorage.removeItem(updateKey)}catch{}
 const message=node=>node.querySelector('.sky-splash-message');
 const loadingText=updating?'Updating…':'ဆိုင်ကို ဖွင့်နေပါတယ် / Loading';
 const prepareUpdate=node=>{
  node.classList.remove('is-quiet','is-leaving');node.classList.add('is-updating');node.removeAttribute('data-sound');
  const label=message(node);if(label)label.textContent='Updating…';
  bloom(node);
 };
 // "Updating" animation (owner's video): on a dark screen pink flowers grow, leaves and grass appear,
 // gold sparkles float, then everything fades and grows again — a 6-second loop until 100%.
 function bloom(node){
  if(node.querySelector('.sky-bloom'))return;
  const stems=[['M150 250C148 200 152 140 150 70',150,70,1,0],['M140 250C130 200 110 150 100 115',100,115,.85,.05],['M160 250C170 200 190 160 200 105',200,105,.85,.08],['M130 250C125 225 118 205 112 190',112,190,.55,.12],['M172 250C178 230 186 215 190 205',190,205,.5,.15]];
  const leaves=[[148,205,-40],[152,175,40],[149,145,-35],[151,112,35],[124,195,-50],[114,160,30],[176,190,50],[188,150,-30],[138,234,-60],[164,234,60],[118,244,-75],[182,244,75]];
  const grass=[24,36,48,60,240,252,264,278];
  let svg='<svg viewBox="30 40 240 220" preserveAspectRatio="xMidYMax meet"><defs><radialGradient id="sb-petal" cx="50%" cy="80%" r="80%"><stop offset="0" stop-color="#ffd3e6"/><stop offset="1" stop-color="#e2639c"/></radialGradient><radialGradient id="sb-glow"><stop offset="0" stop-color="#ff9fcd" stop-opacity=".55"/><stop offset="1" stop-color="#ff9fcd" stop-opacity="0"/></radialGradient><linearGradient id="sb-leaf" x1="0" x2="1"><stop offset="0" stop-color="#7d2a6c"/><stop offset="1" stop-color="#c2407f"/></linearGradient></defs><g class="sb-all"><ellipse cx="150" cy="252" rx="140" ry="16" fill="url(#sb-glow)"/>';
  grass.forEach((x,i)=>{const lean=x<150?-12:12;svg+='<path class="sb-draw" data-at="'+(.12+i*.02)+'" pathLength="1" d="M'+x+' 252Q'+(x+lean/2)+' 205 '+(x+lean)+' '+(170+(i%3)*12)+'" fill="none" stroke="#2f9e44" stroke-width="2.4" stroke-linecap="round"/>'});
  stems.forEach(([d],i)=>{svg+='<path class="sb-draw" data-at="'+stems[i][4]+'" pathLength="1" d="'+d+'" fill="none" stroke="#c63c7d" stroke-width="3" stroke-linecap="round"/>'});
  leaves.forEach(([x,y,r],i)=>{svg+='<g transform="translate('+x+' '+y+') rotate('+r+')"><ellipse class="sb-pop" data-at="'+(.14+i*.015)+'" rx="10" ry="4.5" fill="url(#sb-leaf)"/></g>'});
  stems.forEach(([,x,y,size,at])=>{let petals='';for(let k=0;k<5;k++)petals+='<ellipse cx="0" cy="-10" rx="7.5" ry="11" transform="rotate('+k*72+')" fill="url(#sb-petal)"/>';svg+='<g transform="translate('+x+' '+y+') scale('+size+')"><g class="sb-pop" data-at="'+(at+.24)+'"><circle r="22" fill="url(#sb-glow)"/>'+petals+'<circle r="5" fill="#ffd76b"/></g></g>'});
  for(let i=0;i<14;i++)svg+='<circle class="sb-spark" data-at="'+(.38+(i%7)*.05)+'" cx="'+(70+((i*53)%160))+'" cy="'+(70+((i*37)%120))+'" r="'+(1.1+(i%3)*.5)+'" fill="#ffd76b"/>';
  const wrap=document.createElement('div');wrap.className='sky-bloom';wrap.setAttribute('aria-hidden','true');wrap.innerHTML=svg+'</g></svg>';node.prepend(wrap);
  if(!wrap.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const loop=(item,frames)=>item.animate(frames,{duration:6000,iterations:Infinity,easing:'linear'});
  const at=item=>Number(item.dataset.at);
  wrap.querySelectorAll('.sb-draw').forEach(item=>{const a=at(item);loop(item,[{strokeDasharray:1,strokeDashoffset:1,offset:0},{strokeDashoffset:1,offset:a},{strokeDashoffset:0,offset:Math.min(.8,a+.18)},{strokeDasharray:1,strokeDashoffset:0,offset:1}])});
  wrap.querySelectorAll('.sb-pop').forEach(item=>{const a=at(item);loop(item,[{transform:'scale(0)',offset:0},{transform:'scale(0)',offset:a},{transform:'scale(1.15)',offset:Math.min(.8,a+.08)},{transform:'scale(1)',offset:Math.min(.81,a+.12)},{transform:'scale(1)',offset:1}])});
  wrap.querySelectorAll('.sb-spark').forEach(item=>{const a=at(item);loop(item,[{opacity:0,transform:'translateY(0)',offset:0},{opacity:0,transform:'translateY(0)',offset:a},{opacity:1,offset:a+.08},{opacity:0,transform:'translateY(-26px)',offset:Math.min(.86,a+.3)},{opacity:0,transform:'translateY(-26px)',offset:1}])});
  loop(wrap.querySelector('.sb-all'),[{opacity:1,offset:0},{opacity:1,offset:.82},{opacity:0,offset:.93},{opacity:0,offset:1}]);
 }
 const template=el.cloneNode(true);
 // Before the reload: "Updating… 0%" counts up while the new version downloads (to 60%, then to
 // the step updates.js reports) and the number is handed to the next page.
 window.GearHubSplash={showUpdating:()=>{
  let screen=document.getElementById('sky-splash');
  if(!screen){screen=template.cloneNode(true);document.body.prepend(screen)}
  prepareUpdate(screen);
  if(screen===el&&!gone)return {progress(){}};
  screen.classList.add('is-progress');
  let count=screen.querySelector('.sky-splash-percent');
  if(!count){count=document.createElement('b');count.className='sky-splash-percent';message(screen)?.after?.(count)}
  const fill=screen.querySelector('.sky-splash-bar i');
  let value=0,goal=60;clearInterval(screen._count);
  const show=()=>{const whole=Math.floor(value);count.textContent=whole+'%';if(fill)fill.style.width=whole+'%';try{sessionStorage.setItem(updateKey,String(Math.max(1,whole)))}catch{}};
  show();screen._count=setInterval(()=>{if(value<goal){value=Math.min(goal,value+Math.max(0.2,(goal-value)*0.05));show()}},50);
  return {progress(step){goal=Math.max(goal,Math.min(99,step))}};
 }};
 const nav=performance.getEntriesByType?.("navigation")?.[0];
 // Moving between pages of the same site within seconds is not "opening the shop" (the referrer is
 // hidden by the site's referrer policy, so the page leaves a timestamp when it is closed).
 let left=0;try{left=Number(sessionStorage.getItem("sky-left"))||0}catch{}
 addEventListener("pagehide",()=>{try{sessionStorage.setItem("sky-left",String(Date.now()))}catch{}});
 const quiet=!updating&&((nav&&nav.type!=="navigate")||Date.now()-left<8000);
 const seconds=updating?1.2:quiet?0:Math.min(10,Math.max(0.5,Number(el.dataset.seconds)||3));
 let audio=null;
 if(updating)prepareUpdate(el);
 else if(quiet){el.classList.add('is-quiet');el.removeAttribute('data-sound')}
 else if(el.dataset.sound){
  audio=new Audio(el.dataset.sound);audio.preload="auto";
  const gestures=["pointerdown","touchstart","keydown"];
  const start=()=>{if(!el.isConnected)return;audio.play().then(()=>gestures.forEach(g=>document.removeEventListener(g,start,true))).catch(()=>{})};
  // The sound starts by itself. Where the browser blocks that (an iPhone Home Screen start has no
  // touch yet) it starts silently on the first touch; no message is shown.
  audio.play().catch(()=>{if(!el.isConnected)return;gestures.forEach(g=>document.addEventListener(g,start,true))});
 }

 // Counter: the bar and the number follow real steps (page, shop data, pictures). While waiting
 // for the network it creeps slowly and never passes 75% until the shop data has arrived.
 el.classList.add('is-progress');
 const bar=el.querySelector('.sky-splash-bar i');
 const percent=document.createElement('b');percent.className='sky-splash-percent';percent.textContent='0%';
 message(el)?.after?.(percent);
 const started=Date.now();
 let shown=carried,goal=Math.max(75,carried),data=false,done=false,gone=false,failed=false,pictures=[0,0];
 const label=text=>{const node=message(el);if(node)node.textContent=text};
 const render=()=>{const value=Math.floor(shown);percent.textContent=value+'%';if(bar)bar.style.width=value+'%'};
 const leave=()=>{if(gone)return;gone=true;clearInterval(tick);el.classList.add("is-leaving");if(audio)audio.pause();setTimeout(()=>el.remove(),quiet?250:550)};
 const tick=setInterval(()=>{
  if(gone)return;
  const byTime=seconds?Math.min(100,(Date.now()-started)/(seconds*1000)*100):100;
  if(data&&!done)goal=80+19*(pictures[1]?pictures[0]/pictures[1]:1);
  if(done)goal=100;
  const target=Math.min(goal,byTime);
  if(target>shown)shown=Math.min(target,shown+Math.max(data?0.8:0.15,(target-shown)*(data?0.18:0.04)));
  render();
  if(done&&byTime>=100&&shown>=100)setTimeout(leave,150);
 },50);
 // A reload shows a plain cover; if the shop is not ready soon, show the picture and the counter.
 if(quiet)setTimeout(()=>{if(!gone)el.classList.remove('is-quiet')},700);

 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const loaded=img=>new Promise(r=>{if(img.complete)return r();img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true})});
 // Pictures in the first screen (photos and CSS backgrounds such as the banner and logo).
 function picturesReady(){
  const waits=[],urls=new Set(),bottom=innerHeight*1.2;
  for(const node of document.body.querySelectorAll('*')){
   if(node===el||el.contains(node))continue;
   const box=node.getBoundingClientRect();if(!box.width||box.bottom<0||box.top>bottom)continue;
   if(node.tagName==='IMG'&&node.loading!=='lazy')waits.push(loaded(node));
   for(const part of [null,'::before','::after'])for(const m of getComputedStyle(node,part).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(m[1]);
  }
  for(const url of urls){const img=new Image();img.src=url;waits.push(loaded(img))}
  if(document.fonts?.ready)waits.push(document.fonts.ready);
  pictures=[0,waits.length];
  waits.forEach(w=>w.then(()=>pictures[0]++));
  return Promise.race([Promise.all(waits),wait(2500)]);
 }
 // store.js says "gearhub:store-shown" when the shop's own data is on the page (live or the saved
 // offline copy) and "gearhub:store-failed" when it could not load. On failure the picture stays,
 // says so, and tries again every few seconds and as soon as the phone is back online.
 let retrying=false;
 const retry=()=>{if(gone||data||retrying||!failed)return;retrying=true;setTimeout(()=>{retrying=false},15000);window.GearHubStore?.retry?.()};
 addEventListener('gearhub:store-shown',()=>{
  if(data)return;data=true;failed=false;retrying=false;label(loadingText);
  picturesReady().then(()=>{done=true});
 });
 addEventListener('gearhub:store-failed',()=>{
  if(data)return;failed=true;retrying=false;el.classList.remove('is-quiet');
  label(navigator.onLine===false?'အင်တာနက် မရှိပါ — ပြန်ချိတ်နေပါတယ် / Offline, retrying':'ပြန်ကြိုးစားနေပါတယ် / Retrying');
 });
 setInterval(retry,5000);
 addEventListener('online',retry);
})();
