// Free AI in the shop admin (owner's request, FREE_AI_PLAN.md #2 #3 #4). When a product photo is chosen in
// Add / Edit Product, the shop server's image model (the one Photo scan uses, no outside service) says:
// which category look-alike products are in (one tap fills Category), whether the same part is already in
// the shop, and whether the photo is dark or blurred. Advice only; nothing is saved by it.
(()=>{
 const form=document.getElementById("product-form"),input=form?.querySelector('input[name="images"]'),zone=input?.closest(".product-upload-zone");
 if(!form||!input||!zone)return;
 const panel=document.createElement("div");panel.className="product-ai";panel.hidden=true;panel.setAttribute("role","status");panel.setAttribute("aria-live","polite");
 zone.after(panel);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
 const pct=s=>Math.round(Number(s)*100)+"%";
 const show=html=>{panel.hidden=!html;panel.innerHTML=html||""};
 // Smaller picture (longest side 640): faster on mobile data, same answer.
 async function jpeg(file){const img=await createImageBitmap(file),s=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);img.close?.();return new Promise(r=>c.toBlob(r,"image/jpeg",.85))}
 let asked=0,suggestions=[];
 async function check(){
  const file=input.files?.[0],api=window.GearHubTenantAdmin?.ai;if(!file||!api){show("");return}
  const mine=++asked;show('<p class="product-ai-busy">🤖 AI က ပုံကို စစ်နေပါတယ်… / Checking the photo…</p>');
  try{
   const editing=typeof editingProductId!=="undefined"&&editingProductId?editingProductId:"";
   const r=await api("/photo?product="+encodeURIComponent(editing),{method:"POST",headers:{"Content-Type":"image/jpeg"},body:await jpeg(file)});
   const d=await r.json();if(mine!==asked)return;if(!r.ok)throw Error(d.error||"AI");
   const parts=[],q=d.quality||{};
   if(q.dark)parts.push('<p class="product-ai-warn">⚠ ပုံ မှောင်နေပါတယ်။ အလင်းကောင်းကောင်းနဲ့ ပြန်ရိုက်ပါ။ / The photo is dark — retake it in better light.</p>');
   if(q.blurry)parts.push('<p class="product-ai-warn">⚠ ပုံ ဝါးနေပါတယ်။ ကင်မရာ ငြိမ်ငြိမ်ကိုင်ပြီး ပြန်ရိုက်ပါ။ / The photo is blurred — hold still and retake it.</p>');
   for(const p of d.duplicates||[])parts.push('<p class="product-ai-warn">⚠ ဒီပစ္စည်း ရှိပြီးသား ဖြစ်နိုင်တယ်: <b>'+esc(p.name)+'</b>'+(p.sku?' ('+esc(p.sku)+')':'')+' — '+pct(p.score)+' တူ / This part may already be in the shop.</p>');
   suggestions=d.categories||[];
   if(suggestions.length)parts.push('<div class="product-ai-cats"><p>💡 Category အကြံ / Suggested category</p>'+suggestions.map((c,i)=>'<button type="button" data-ai-category="'+i+'"><b>'+esc(c.path||c.name)+'</b><small>'+pct(c.score)+' like '+esc(c.example)+'</small></button>').join("")+'</div>');
   if(d.ready===false)parts.push('<p class="product-ai-note">AI က ဆိုင်ရဲ့ ပုံတွေကို လေ့လာနေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။ / Still learning the shop\'s photos — try again in a minute.</p>');
   else if(!parts.length)parts.push('<p class="product-ai-ok">✓ ပုံ ကောင်းပါတယ်။ / The photo looks good.</p>');
   show(parts.join(""));
  }catch(_){if(mine===asked)show("")}
 }
 input.addEventListener("change",check);
 panel.addEventListener("click",e=>{const b=e.target.closest("[data-ai-category]");if(!b)return;const c=suggestions[Number(b.dataset.aiCategory)];if(!c)return;
  const en=form.elements.namedItem("categoryEn"),my=form.elements.namedItem("categoryMy"),id=form.elements.namedItem("categoryId");
  if(en){en.value=c.name;en.dispatchEvent(new Event("input",{bubbles:true}));en.dispatchEvent(new Event("change",{bubbles:true}))}
  if(my)my.value=c.nameMy||c.name;if(id)id.value=c.id??"";
  panel.querySelectorAll("[data-ai-category]").forEach(x=>x.classList.toggle("chosen",x===b));});
 form.addEventListener("reset",()=>{asked++;suggestions=[];show("")});
})();
