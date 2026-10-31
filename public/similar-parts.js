// Free AI #6 (FREE_AI_PLAN.md): "Similar parts" under a product's photos in a seller shop. The shop server's
// image model (the one Photo scan uses) finds products whose photos look alike; a tap opens that product.
(()=>{
 const slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];if(!slug||typeof openGallery!=="function")return;
 const api="/api/platform/store/"+encodeURIComponent(decodeURIComponent(slug))+"/similar/";
 const thumbs=document.getElementById("gallery-thumbs");if(!thumbs)return;
 const row=document.createElement("div");row.className="gallery-similar";row.hidden=true;thumbs.after(row);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
 const my=()=>document.documentElement.lang==="my",cache=new Map();let shown=null;
 const shopProducts=()=>typeof products!=="undefined"&&Array.isArray(products)?products:[];
 async function show(id){
  shown=id;row.hidden=true;row.innerHTML="";
  try{
   if(!cache.has(id))cache.set(id,fetch(api+encodeURIComponent(id),{credentials:"same-origin"}).then(r=>r.ok?r.json():{products:[]}));
   const d=await cache.get(id);if(shown!==id)return;
   const list=(d.products||[]).map(m=>shopProducts().find(p=>String(p.id)===String(m.id))).filter(p=>p&&p.imageUrls?.length);
   if(!list.length)return;
   // 1.1.235 owner: "See all" (phones, more than 4) and a "View" button on each card.
   row.classList.remove("all");
   row.innerHTML='<p>'+(my()?"ဆင်တူ ပစ္စည်းများ":"Similar parts")+(list.length>4?'<button type="button" class="gallery-similar-all">'+seeAll(false)+'</button>':'')+'</p><div>'+list.map(p=>'<button type="button" data-similar-id="'+esc(p.id)+'"><img src="'+esc(p.imageUrls[0])+'" alt="" loading="lazy"><span>'+esc((my()?p.name_my:p.name_en)||p.name_en||"")+'</span><i class="gallery-similar-view">View <b aria-hidden="true">›</b></i></button>').join("")+'</div>';
   row.hidden=false;
  }catch(_){cache.delete(id)}
 }
 const open=openGallery;
 window.openGallery=function(id,index){open(id,index);if(document.body.classList.contains("gallery-open"))show(id)};
 const seeAll=open=>open?(my()?"ပြန်ချုံ့မယ်":"Show less"):(my()?"အားလုံးကြည့်မယ်":"See all")+' <b aria-hidden="true">›</b>';
 row.addEventListener("click",e=>{const all=e.target.closest(".gallery-similar-all");if(all){const on=row.classList.toggle("all");all.innerHTML=seeAll(on);return}const b=e.target.closest("[data-similar-id]");if(!b)return;const p=shopProducts().find(x=>String(x.id)===b.dataset.similarId);if(p)window.openGallery(p.id,0)});
})();
