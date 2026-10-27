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
 const phone=matchMedia('(max-width:800px)');
 const alertIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.7a2 2 0 0 1 3.4 0l9 15.5a2 2 0 0 1-1.7 3H3a2 2 0 0 1-1.7-3z"/><path d="M12 8v6" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="#fff"/></svg>';
 const bulbIcon='<svg viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 24v-3c0-3-6-5-6-11a10 10 0 0 1 20 0c0 6-6 8-6 11v3zM8 27h8M10 30h4M7 10c0-3 2-5 5-5"/></svg>';
 let asked=0,suggestions=[],lastResult=null,chosen=-1;
 function render(d){
   const parts=[],q=d.quality||{};
   if(q.dark)parts.push('<p class="product-ai-warn">⚠ ပုံ မှောင်နေပါတယ်။ အလင်းကောင်းကောင်းနဲ့ ပြန်ရိုက်ပါ။ / The photo is dark — retake it in better light.</p>');
   if(q.blurry)parts.push('<p class="product-ai-warn">⚠ ပုံ ဝါးနေပါတယ်။ ကင်မရာ ငြိမ်ငြိမ်ကိုင်ပြီး ပြန်ရိုက်ပါ။ / The photo is blurred — hold still and retake it.</p>');
   for(const p of d.duplicates||[]){
    if(phone.matches)parts.push('<section class="product-ai-duplicate"><img src="/images/product-ai-robot.png?v=1.1.193" alt="" width="120" height="140"><div><h4>'+alertIcon+'<span>သတိပေးချက်:</span></h4><p>ဒီပစ္စည်း ရှိပြီးသားဖြစ်နိုင်ပါတယ်</p><strong>'+esc(p.name)+(p.sku?' ('+esc(p.sku)+')':'')+' — '+pct(p.score)+' တူညီ!</strong><p class="product-ai-translation">This part may already be in the shop.</p></div></section>');
    else parts.push('<p class="product-ai-warn">⚠ ဒီပစ္စည်း ရှိပြီးသား ဖြစ်နိုင်တယ်: <b>'+esc(p.name)+'</b>'+(p.sku?' ('+esc(p.sku)+')':'')+' — '+pct(p.score)+' တူ / This part may already be in the shop.</p>');
   }
   suggestions=d.categories||[];
   if(suggestions.length){
    if(phone.matches)parts.push('<div class="product-ai-phone-cats"><span class="product-ai-bulb">'+bulbIcon+'</span><p>Category အကြံပြု / Suggested category (AI)</p>'+suggestions.map((c,i)=>'<button type="button" data-ai-category="'+i+'"><b>'+esc(c.path||c.name)+'</b><small>'+pct(c.score)+' like '+esc(c.example)+'</small></button>').join('')+'</div>');
    else parts.push('<div class="product-ai-cats"><p>💡 Category အကြံ / Suggested category</p>'+suggestions.map((c,i)=>'<button type="button" data-ai-category="'+i+'"><b>'+esc(c.path||c.name)+'</b><small>'+pct(c.score)+' like '+esc(c.example)+'</small></button>').join("")+'</div>');
   }
   if(d.ready===false)parts.push('<p class="product-ai-note">AI က ဆိုင်ရဲ့ ပုံတွေကို လေ့လာနေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။ / Still learning the shop\'s photos — try again in a minute.</p>');
   else if(!parts.length)parts.push('<p class="product-ai-ok">✓ ပုံ ကောင်းပါတယ်။ / The photo looks good.</p>');
   show(parts.join(''));if(chosen>=0)panel.querySelector('[data-ai-category="'+chosen+'"]')?.classList.add('chosen');
 }
 async function check(){
  const file=input.files?.[0],api=window.GearHubTenantAdmin?.ai;if(!file||!api){show("");return}
  const mine=++asked;lastResult=null;chosen=-1;show('<p class="product-ai-busy">🤖 AI က ပုံကို စစ်နေပါတယ်… / Checking the photo…</p>');
  try{
   const editing=typeof editingProductId!=="undefined"&&editingProductId?editingProductId:"";
   const r=await api("/photo?product="+encodeURIComponent(editing),{method:"POST",headers:{"Content-Type":"image/jpeg"},body:await jpeg(file)});
   const d=await r.json();if(mine!==asked)return;if(!r.ok)throw Error(d.error||"AI");
   lastResult=d;render(d);
  }catch(_){if(mine===asked)show("")}
 }
 input.addEventListener("change",check);
 panel.addEventListener("click",e=>{const b=e.target.closest("[data-ai-category]");if(!b)return;const c=suggestions[Number(b.dataset.aiCategory)];if(!c)return;
  const en=form.elements.namedItem("categoryEn"),my=form.elements.namedItem("categoryMy"),id=form.elements.namedItem("categoryId");
  if(en){en.value=c.name;en.dispatchEvent(new Event("input",{bubbles:true}));en.dispatchEvent(new Event("change",{bubbles:true}))}
  if(my)my.value=c.nameMy||c.name;if(id)id.value=c.id??"";
  chosen=Number(b.dataset.aiCategory);panel.querySelectorAll("[data-ai-category]").forEach(x=>x.classList.toggle("chosen",x===b));});
 phone.addEventListener('change',()=>{if(lastResult)render(lastResult)});
 form.addEventListener("reset",()=>{asked++;suggestions=[];lastResult=null;chosen=-1;show("")});
})();
