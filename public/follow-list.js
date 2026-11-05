/* 1.1.330 owner: the people behind Followers / Following — used by the Profile counts and Message → Followers.
   A shop row opens that shop; a customer row (no shop) only shows the name. */
(()=>{
 const my=()=>document.documentElement.lang==='my';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const empty={followers:{en:'No followers yet.',my:'Follower မရှိသေးပါ။'},following:{en:'Not following any shop yet.',my:'Follow လုပ်ထားတဲ့ ဆိုင် မရှိသေးပါ။'}};
 async function load(slug,list){
  const r=await fetch('/api/platform/profile/'+encodeURIComponent(slug)+'/people?list='+(list==='following'?'following':'followers'),{credentials:'same-origin',cache:'no-store'});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||(my()?'မရပါ။ ပြန်စမ်းပါ။':'Something went wrong. Please try again.'));return d.people||[];
 }
 function html(people,list){
  if(!people.length)return '<p class="fl-empty">'+empty[list==='following'?'following':'followers'][my()?'my':'en']+'</p>';
  return '<ul class="fl-list">'+people.map(p=>{
   const initials=Array.from(String(p.name||'?').trim().split(/\s+/).map(w=>Array.from(w)[0]||'').slice(0,2).join('')).join('').toLocaleUpperCase();
   const tone=Array.from(String(p.name||'')).reduce((n,c)=>n+c.codePointAt(0),0)%4;
   const face='<span class="fl-avatar fl-tone-'+tone+'" aria-hidden="true">'+(p.logo?'<img src="'+esc(p.logo)+'" alt="" loading="lazy">':esc(initials))+'</span><span class="fl-name">'+esc(p.name)+'</span>';
   return '<li>'+(p.url?'<a class="fl-row" href="'+esc(p.url)+'">'+face+'<span class="fl-go" aria-hidden="true">›</span></a>':'<span class="fl-row">'+face+'</span>')+'</li>';
  }).join('')+'</ul>';
 }
 window.GearHubFollowList={load,html};
})();
