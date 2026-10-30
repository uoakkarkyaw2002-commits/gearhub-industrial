/* 1.1.212 owner: inside an installed app (Home Screen / Play), opening another shop (GearHub app →
   POLESTAR) mixed the two. The first page an app session opens is that app's own place; on another
   shop the robot asks to add that shop as its own app (Safari / Chrome opens its admin with the install
   helper). "I have it" stops asking for that shop. Nothing is sent to the server. */
(()=>{
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(!standalone)return;
 const match=location.pathname.match(/^\/shops\/([^/]+)(?:\/|$)/),here=match?decodeURIComponent(match[1]):'';
 const get=(s,k)=>{try{return s.getItem(k)}catch{return null}},set=(s,k,v)=>{try{s.setItem(k,v)}catch{}};
 let home=get(sessionStorage,'gh-app-home');if(home===null){set(sessionStorage,'gh-app-home',here);home=here}
 if(!here||home===here||get(localStorage,'gh-app-own:'+here)||get(sessionStorage,'gh-app-asked:'+here))return;
 set(sessionStorage,'gh-app-asked:'+here,'1');
 const name=(document.title.trim().replace(/\s*Admin$/,'')||here).slice(0,40);
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/android/i.test(ua);
 const path='/shops/'+encodeURIComponent(here)+'/admin?welcome=1',link=location.origin+path;
 // iPhone: x-safari-https opens Safari (iOS 17+); Android: open the page in Chrome.
 const open=ios?'x-safari-https://'+location.host+path:android?'intent://'+location.host+path+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(link)+';end':link;
 const style=document.createElement('style');
 style.textContent='.app-switch{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:flex-end;justify-content:center;background:#0b1a1266}.app-switch[hidden]{display:none}.app-switch-card{width:min(520px,100%);box-sizing:border-box;margin:0;padding:22px 18px calc(18px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;background:#fff;color:#14261c;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 -10px 40px #0003}.app-switch-top{display:flex;align-items:center;gap:12px;margin-bottom:10px}.app-switch-top img{flex:none}.app-switch h2{margin:0;font-size:19px;line-height:1.4}.app-switch p{margin:0 0 6px}.app-switch small{display:block;color:#56685d;margin-bottom:14px}.app-switch a,.app-switch button{display:block;width:100%;box-sizing:border-box;margin:8px 0 0;padding:13px;border-radius:14px;border:1px solid #cfdcd3;background:#fff;color:#14261c;font:inherit;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}.app-switch .app-switch-go{border:0;background:#13803d;color:#fff}.app-switch .app-switch-later{border:0;background:none;color:#56685d;font-weight:600}';
 const sheet=document.createElement('div');sheet.className='app-switch';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','app-switch-title');
 sheet.innerHTML='<div class="app-switch-card"><div class="app-switch-top"><img src="/images/product-ai-robot.png?v=1.1.193" alt="" width="48" height="38"><h2 id="app-switch-title">'+esc(name)+' အတွက် app သီးသန့် တင်ပါ</h2></div>'
  +'<p>ဒီ app က တခြားဆိုင်အတွက်ပါ။ <b>'+esc(name)+'</b> ကို ရောမသွားအောင် သူ့ app သီးသန့် Home Screen ပေါ် တင်ပါ။</p>'
  +'<small>This app belongs to another shop. Add <b>'+esc(name)+'</b> as its own app so the two do not mix.</small>'
  +'<a class="app-switch-go" href="'+esc(open)+'" data-switch="go">⬇ '+esc(name)+' app တင်မယ် / Add app</a>'
  +'<button type="button" data-switch="copy">🔗 Link ကို copy ကူးမယ် / Copy link</button>'
  +'<button type="button" data-switch="have">ရှိပြီးသား / I have it</button>'
  +'<button type="button" class="app-switch-later" data-switch="later">ဒီမှာပဲ ကြည့်မယ် / Not now</button></div>';
 const close=()=>{sheet.hidden=true};
 sheet.addEventListener('click',async e=>{
  if(e.target===sheet){close();return}
  const b=e.target.closest('[data-switch]');if(!b)return;const k=b.dataset.switch;
  if(k==='later')close();
  else if(k==='have'){set(localStorage,'gh-app-own:'+here,'1');close()}
  else if(k==='copy'){try{await navigator.clipboard.writeText(link);b.textContent='✓ Copy ကူးပြီးပါပြီ — Safari / Chrome မှာ ဖွင့်ပါ'}catch{b.textContent=link}}
 });
 const show=()=>{document.head.append(style);document.body.append(sheet);sheet.querySelector('.app-switch-go').focus({preventScroll:true})};
 document.readyState==='loading'?addEventListener('DOMContentLoaded',show,{once:true}):show();
})();
