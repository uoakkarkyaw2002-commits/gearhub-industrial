const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat("en-US").format(n)+" Ks";
let products=[];let inventoryQuery="";let editingProductId=null;let editingStock=null;
document.addEventListener("click",e=>{const button=e.target.closest("[data-admin-action]");if(!button)return;const id=Number(button.dataset.orderId);if(button.dataset.adminAction==="restore-order")restoreOrder(id);if(button.dataset.adminAction==="delete-order")deleteOrderFromList(id,button.dataset.forever==="1",button.dataset.cancelled==="1");if(button.dataset.adminAction==="save-order")saveOrder(id);});
document.addEventListener("click",e=>{const toggle=e.target.closest(".admin-section-toggle, #product-form-toggle");if(!toggle)return;e.preventDefault();const contentId=toggle.dataset.contentId||"product-form-content";const iconId=toggle.dataset.iconId||"product-form-toggle-icon";const content=$(contentId);const open=content.classList.contains("hidden");content.classList.toggle("hidden",!open);toggle.setAttribute("aria-expanded",String(open));$(iconId).textContent=open?"−":"＋";});
const mobileDashboardDetailIds=new Set(["orders-content","low-stock-content","product-form-content","category-manager-content","site-settings-content","inventory-content","confirmed-panel","trash-panel","deleted-panel"]),mobileDashboardDetailHomes=new Map();
function positionMobileDashboardDetail(id){
 if(!mobileDashboardDetailIds.has(id)||!window.matchMedia("(max-width:800px)").matches)return;
 const content=$(id),dashboard=$("dashboard");if(!content||!dashboard)return;
 if(!mobileDashboardDetailHomes.has(id))mobileDashboardDetailHomes.set(id,content.parentElement);
 let host=$("mobile-dashboard-detail-host");if(!host){host=document.createElement("div");host.id="mobile-dashboard-detail-host";dashboard.append(host);}
 if(content.classList.contains("hidden")){const home=mobileDashboardDetailHomes.get(id);if(home&&content.parentElement===host)home.append(content);}
 else if(content.parentElement!==host)host.append(content);
}
document.addEventListener("click",e=>{const button=e.target.closest(".admin-section-toggle,#product-form-toggle,#confirmed-toggle,#cancelled-toggle,#deleted-toggle");if(!button)return;const id=button.dataset.contentId||({ "confirmed-toggle":"confirmed-panel","cancelled-toggle":"trash-panel","deleted-toggle":"deleted-panel"}[button.id]);if(id)requestAnimationFrame(()=>{positionMobileDashboardDetail(id);updateMobileDashboardOpenState(id);});});
function updateMobileDashboardOpenState(id){
 if(!window.matchMedia("(max-width:800px)").matches)return;
 const content=$(id),buttons=[...document.querySelectorAll("#dashboard .admin-section-toggle,#confirmed-toggle,#cancelled-toggle,#deleted-toggle")];
 buttons.forEach(button=>{button.classList.remove("mobile-dashboard-open");button.removeAttribute("data-dashboard-open");});
 if(!content||content.classList.contains("hidden"))return;
 const button=document.querySelector('[data-content-id="'+id+'"]')||document.getElementById(({ "confirmed-panel":"confirmed-toggle","trash-panel":"cancelled-toggle","deleted-panel":"deleted-toggle"}[id]||""));
 if(button){button.classList.add("mobile-dashboard-open");button.dataset.dashboardOpen="true";}
}
window.addEventListener("resize",()=>{if(window.matchMedia("(max-width:800px)").matches)return;const host=$("mobile-dashboard-detail-host");if(!host)return;mobileDashboardDetailIds.forEach(id=>{const content=$(id),home=mobileDashboardDetailHomes.get(id);if(content&&home&&content.parentElement===host)home.append(content);});});
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let adminCsrfPromise;
async function adminFetch(url,opts={}) {
 if(window.GearHubTenantAdmin)return window.GearHubTenantAdmin.fetch(url,opts);
 const method=(opts.method||"GET").toUpperCase();
 const headers=new Headers(opts.headers||{});
 if (!["GET","HEAD","OPTIONS"].includes(method)) {
  if (!adminCsrfPromise) adminCsrfPromise=fetch("/api/admin/csrf",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Could not load security token.");return (await r.json()).csrfToken}).catch(error=>{adminCsrfPromise=null;throw error});
  headers.set("X-CSRF-Token",await adminCsrfPromise);
 }
 const response=await fetch(url,{...opts,credentials:"same-origin",headers});
 if(response.status===403||response.status===401)adminCsrfPromise=null;
 if(url.endsWith("/login")&&response.ok){const data=await response.clone().json();adminCsrfPromise=Promise.resolve(data.csrfToken);}
 if(url.endsWith("/logout")||url.endsWith("/password-reset/verify"))adminCsrfPromise=null;
 return response;
}
// Offline: the last good answer of every admin GET is kept on this device (cleared on
// log out) and shown when there is no internet; changes still need a connection.
const adminOfflinePrefix="gh-admin-offline:"+location.pathname+":";
function adminOfflineSave(url,data){try{localStorage.setItem(adminOfflinePrefix+url,JSON.stringify({t:Date.now(),d:data}))}catch{}}
function adminOfflineLoad(url){try{return JSON.parse(localStorage.getItem(adminOfflinePrefix+url)||"null")}catch{return null}}
function adminOfflineClear(){try{Object.keys(localStorage).filter(k=>k.startsWith("gh-admin-offline:")||k.startsWith("gh-admin-ctx:")).forEach(k=>localStorage.removeItem(k))}catch{}}
function adminOfflineState(savedAt){document.body.classList.toggle("admin-offline",!!savedAt);const bar=$("admin-offline-bar");if(bar){bar.hidden=!savedAt;if(savedAt)bar.textContent="📴 Internet မရှိပါ — "+new Date(savedAt).toLocaleString()+" က သိမ်းထားတာကို ပြနေပါတယ်။ ပြင်ဆင်ချက်တွေ internet ပြန်ရမှ လုပ်လို့ရပါမယ်။ / Offline: showing saved data."}}
async function api(url,opts={}){const method=(opts.method||"GET").toUpperCase();if(url.endsWith("/logout"))adminOfflineClear();let r;try{r=await adminFetch(url,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}})}catch(e){if(method==="GET"){const saved=adminOfflineLoad(url);if(saved){adminOfflineState(saved.t);return saved.d}}throw new Error(navigator.onLine?e.message:"Internet မရှိပါ။ ပြန်ချိတ်ပြီးမှ လုပ်ပါ။ / No internet connection.")}const d=await r.json().catch(()=>({}));if(!r.ok){if(method==="GET"&&r.status===503){const saved=adminOfflineLoad(url);if(saved){adminOfflineState(saved.t);return saved.d}}throw new Error(d.error||"Request failed")}if(method==="GET"){adminOfflineSave(url,d);adminOfflineState(0)}return d}

// Resize and compress uploaded product photos in-browser before sending them to Render.
async function optimizeImage(file){
 if(!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
 let bitmap;
 try { bitmap = await createImageBitmap(file); } catch { return file; }
 const maxSide=1800, scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));
 canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext("2d");
 if(!ctx){bitmap.close?.();return file;}
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close?.();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.82));
 if(!blob) return file;
 const base=file.name.replace(/\.[^.]+$/," ").trim()||"product-photo";
 return new File([blob],base+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}
function msg(id,text,cls=""){const el=$(id);el.className=cls;el.textContent=text}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400)}
document.addEventListener("click",e=>{if(e.target.closest("#cancelled-toggle")){$("trash-panel").classList.toggle("hidden");if(!$("trash-panel").classList.contains("hidden"))$("trash-panel").scrollIntoView({behavior:"smooth",block:"start"})}if(e.target.closest("#deleted-toggle")){$("deleted-panel").classList.toggle("hidden");if(!$("deleted-panel").classList.contains("hidden"))$("deleted-panel").scrollIntoView({behavior:"smooth",block:"start"})}if(e.target.closest("#confirmed-toggle")){$("confirmed-panel").classList.toggle("hidden");if(!$("confirmed-panel").classList.contains("hidden"))$("confirmed-panel").scrollIntoView({behavior:"smooth",block:"start"})}if(e.target.closest("#empty-trash"))emptyTrash()});
async function checkSession(){try{if(!window.GearHubTenantAdmin)for(let i=0;i<40;i++){const r=await fetch("/api/admin/me",{credentials:"same-origin",cache:"no-store"}).catch(()=>null);if((r&&r.status<500)||!navigator.onLine)break;await new Promise(done=>setTimeout(done,3000));}await api("/api/admin/me");showDashboard()}catch(e){$("admin-bell")?.classList.add("hidden");if(window.GearHubTenantAdmin){window.GearHubTenantAdmin.login(e);return;}$("login-view").classList.remove("hidden");$("dashboard").classList.add("hidden");$("logout").classList.add("hidden");$("admin-user-menu")?.classList.add("hidden")}}
function openLinkedSiteSettings(){if(!["#site-settings-content","#site-app-icon-field","#site-navigation-background-field"].includes(location.hash))return;const toggle=document.querySelector(".site-settings-panel .admin-section-toggle"),content=$("site-settings-content");if(toggle&&content?.classList.contains("hidden"))toggle.click();requestAnimationFrame(()=>(document.querySelector(location.hash)||document.querySelector(".site-settings-panel"))?.scrollIntoView({behavior:"smooth",block:"start"}))}
function showDashboard(){$("login-view").classList.add("hidden");$("dashboard").classList.remove("hidden");$("logout").classList.remove("hidden");$("admin-user-menu")?.classList.remove("hidden");document.querySelectorAll(".admin-section-toggle").forEach(toggle=>{const content=$(toggle.dataset.contentId);if(content)content.classList.add("hidden");toggle.setAttribute("aria-expanded","false");const icon=$(toggle.dataset.iconId);if(icon)icon.textContent="＋";});if(location.hash)history.replaceState(null,"",location.pathname+location.search);prepareAdminLayout();if(window.matchMedia("(min-width:1100px)").matches){document.body.classList.add("admin-sidebar-collapsed");$("admin-sidebar-toggle")?.setAttribute("aria-expanded","false");const inventoryContent=$("inventory-content"),inventoryToggle=$("inventory-card-toggle");inventoryContent?.classList.remove("hidden");inventoryToggle?.setAttribute("aria-expanded","true");const inventoryIcon=$("inventory-card-toggle-icon");if(inventoryIcon)inventoryIcon.textContent="−";}setDesktopAdminView("dashboard");refreshAll();loadSiteSettings();}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:f.get("password")})});msg("login-message","");showDashboard()}catch(err){msg("login-message",err.message,"error")}});
document.addEventListener("click",e=>{const button=e.target.closest("[data-password-toggle]");if(!button)return;const input=$(button.dataset.passwordToggle);if(!input)return;const show=input.type==="password";input.type=show?"text":"password";button.setAttribute("aria-pressed",String(show));button.setAttribute("aria-label",show?"Hide password":"Show password");button.title=show?"Hide password":"Show password";button.textContent=show?"Hide":"Show";});
$("show-reset").addEventListener("click",()=>{$("login-form").classList.add("hidden");$("reset-request-form").classList.remove("hidden");$("reset-verify-form").classList.add("hidden")});
$("back-to-login").addEventListener("click",()=>{$("login-form").classList.remove("hidden");$("reset-request-form").classList.add("hidden");$("reset-verify-form").classList.add("hidden")});
$("reset-request-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const r=await api("/api/admin/password-reset/request",{method:"POST",body:JSON.stringify({})});msg("reset-request-message",r.message,"success");$("reset-verify-form").classList.remove("hidden")}catch(err){msg("reset-request-message",err.message,"error")}finally{b.disabled=false}});
$("reset-verify-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=e.submitter;b.disabled=true;try{const r=await api("/api/admin/password-reset/verify",{method:"POST",body:JSON.stringify({code:f.get("code"),newPassword:f.get("newPassword")})});msg("reset-verify-message",r.message,"success");$("reset-request-form").classList.add("hidden");$("login-form").classList.remove("hidden");$("reset-verify-form").classList.add("hidden")}catch(err){msg("reset-verify-message",err.message,"error")}finally{b.disabled=false}});
$("logout").onclick=async()=>{await api("/api/admin/logout",{method:"POST",body:"{}"});if(!window.GearHubTenantAdmin)checkSession()};if($("refresh"))$("refresh").onclick=refreshAll;
function normalizeInventoryText(value){return String(value??"").toLocaleLowerCase().replace(/\s+/g," ").trim()}
function searchableInventoryProduct(p){const imageUrls=Array.isArray(p.imageUrls)?p.imageUrls:(typeof p.imageUrls==="string"?p.imageUrls.split(/[\s,]+/):[]);return [p.sku,p.part_no,p.name_en,p.name_my,p.category_en,p.category_my,p.description_en,p.description_my,p.price,p.promotion_price,new Intl.NumberFormat("en-US").format(Number(p.price)||0),p.stock,p.image_emoji,p.active?"visible active":"hidden inactive",...imageUrls].map(normalizeInventoryText).join(" ")}
function renderInventory(){
 const table=$("inventory-table");if(!table)return;
 const category=$("inventory-category-filter"),stockFilter=$("inventory-stock-filter"),sort=$("inventory-sort");
 if(inventoryCategory&&!categoryRows.includes(inventoryCategory))inventoryCategory=categoryRows.find(c=>c._key===inventoryCategory._key)||null;
 const activeCategory=inventoryCategory,activeStock=stockFilter?.value||"",sortBy=sort?.value||"newest";
 const liveProducts=products.filter(p=>!p.trashed_at);
 if(category)category.innerHTML='<option value="">'+esc(activeCategory?inventoryCategoryPath(activeCategory):"All Categories")+'</option>';
 const terms=inventoryQuery.split(" ").filter(Boolean);
 let list=liveProducts.filter(p=>{const text=searchableInventoryProduct(p);return terms.every(term=>text.includes(term))});
 if(activeCategory)list=list.filter(p=>inventoryCategoryIn(p,activeCategory));
 if(activeStock==="available")list=list.filter(p=>Number(p.stock)>0);
 if(activeStock==="low")list=list.filter(p=>Number(p.stock)>0&&Number(p.stock)<=5);
 if(activeStock==="empty")list=list.filter(p=>Number(p.stock)<=0);
 list.sort((a,b)=>sortBy==="oldest"?Number(a.id)-Number(b.id):sortBy==="price-low"?Number(a.price)-Number(b.price):sortBy==="price-high"?Number(b.price)-Number(a.price):Number(b.id)-Number(a.id));
 const count=$("inventory-count"),countLabel=$("inventory-count-label");if(count){const filtered=Boolean(inventoryQuery||activeCategory||activeStock);count.textContent=String(filtered?list.length:liveProducts.length);if(countLabel)countLabel.textContent=filtered?"Matching products":"Total Products";}
 const trashIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
 const desktop=list.length?'<div class="inventory-desktop-table"><table class="admin-table"><thead><tr><th>Image</th><th>SKU / Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead><tbody>'+list.map(p=>'<tr><td><span class="inventory-photo">'+((p.imageUrls||[])[0]?'<img src="'+esc(p.imageUrls[0])+'" alt="" loading="lazy">':"📦")+'</span></td><td><button type="button" class="inventory-product inventory-edit-product" data-edit-id="'+Number(p.id)+'" aria-label="Edit '+esc(p.name_en)+'"><div><b>'+esc(p.sku)+'</b><span>'+esc(p.name_en)+'</span>'+(p.name_my?'<span>'+esc(p.name_my)+'</span>':"")+'<small>'+((p.imageUrls||[]).length)+' photo(s)</small></div></button></td><td>'+esc(p.category_en)+'</td><td>'+money(p.price)+'</td><td><span class="inventory-stock '+(Number(p.stock)<=0?"stock-empty":Number(p.stock)<=5?"stock-low":"stock-ready")+'">'+Number(p.stock)+'</span></td><td><span class="inventory-status '+(Number(p.stock)>0?"is-active":"is-hidden")+'"><i></i>'+(Number(p.stock)>0?"In Stock":"Out of Stock")+'</span></td><td><div class="inventory-row-actions"><button type="button" class="edit-product-btn inventory-edit-product" data-edit-id="'+Number(p.id)+'" aria-label="Edit '+esc(p.name_en)+'">✎ Edit</button><button type="button" class="product-trash-button" data-product-trash="trash" data-product-id="'+Number(p.id)+'" aria-label="Move '+esc(p.name_en)+' to Trash" title="Move to Trash">'+trashIcon+'<span>Delete</span></button></div></td></tr>').join("")+'</tbody></table></div>':"No matching products found. Clear the search to see all products.";
 const mobile=list.length?'<div class="inventory-mobile-list">'+list.map(p=>'<article class="inventory-mobile-card" data-mobile-product-id="'+Number(p.id)+'"><button type="button" class="inventory-mobile-open inventory-edit-product" data-edit-id="'+Number(p.id)+'" aria-label="Edit '+esc(p.name_en)+'"><span class="inventory-mobile-photo">'+((p.imageUrls||[])[0]?'<img src="'+esc(p.imageUrls[0])+'" alt="" loading="lazy">':esc(p.image_emoji||'📦'))+'</span><span class="inventory-mobile-copy"><small>'+esc(p.sku)+'</small><strong>'+esc(p.name_en)+'</strong><em>'+esc(p.category_en)+'</em><b>'+money(p.price)+'</b></span><span class="inventory-mobile-meta"><span class="inventory-stock '+(Number(p.stock)<=0?"stock-empty":Number(p.stock)<=5?"stock-low":"stock-ready")+'">'+Number(p.stock)+'</span><small>'+((p.imageUrls||[]).length)+' photo(s)</small></span></button></article>').join("")+'</div>':"";
 table.innerHTML=desktop+mobile;
 renderProductTrash();table.querySelectorAll(".inventory-edit-product").forEach(button=>{button.onclick=()=>{const id=Number(button.dataset.editId);try{editProduct(id)}catch(err){const message=$("product-message");if(message){message.textContent="Edit failed: "+(err?.message||String(err));message.className="error"}toast("Edit failed: "+(err?.message||String(err)))}}});
}
function renderProductTrash(){
 let host=$('product-trash-section');if(!host){host=document.createElement('section');host.id='product-trash-section';const note=document.createElement('p');note.id='product-trash-note';note.setAttribute('role','status');host.append(note);const list=document.createElement('details');list.id='product-trash-list';host.append(list);$('inventory-table').after(host);}
 const list=$('product-trash-list'),open=list.open,rows=products.filter(p=>p.trashed_at);list.innerHTML='<summary>Product Trash / ပစ္စည်းအမှိုက်ပုံး ('+rows.length+')</summary>'+rows.map(p=>'<div class="product-trash-row"><span><b>'+esc(p.sku)+'</b> '+esc(p.name_en)+'</span><button type="button" data-product-trash="restore" data-product-id="'+Number(p.id)+'">Restore / ပြန်ယူရန်</button><button type="button" class="product-permanent-delete" data-product-trash="delete-permanently" data-product-id="'+Number(p.id)+'">Delete permanently / အပြီးဖျက်ရန်</button></div>').join('')+(rows.length?'':'<p>No products in Trash / ပစ္စည်းမရှိပါ။</p>');list.open=open;
}
document.addEventListener('click',async e=>{const button=e.target.closest('[data-product-trash]');if(!button)return;e.preventDefault();const id=Number(button.dataset.productId),action=button.dataset.productTrash;if(action==='delete-permanently'&&!confirm('ဤပစ္စည်းကို အပြီးဖျက်မည်။ ပြန်ယူ၍ မရပါ။ / Permanently delete this product? This cannot be undone.'))return;button.disabled=true;try{await api('/api/admin/products/'+id+'/'+action,{method:'POST',body:JSON.stringify(action==='delete-permanently'?{confirmPermanent:true}:{})});await refreshAll();const note=$('product-trash-note');if(action==='trash'){note.textContent='Moved to Product Trash. Orders, stock and photos retained. ';const undo=document.createElement('button');undo.type='button';undo.textContent='Undo / ပြန်ယူရန်';undo.dataset.productTrash='restore';undo.dataset.productId=String(id);note.append(undo);}else if(action==='delete-permanently')note.textContent='Product permanently deleted. Photos retained / အပြီးဖျက်ပြီးပါပြီ။';else note.textContent='Product restored to its previous visibility / မူလအခြေအနေသို့ ပြန်ယူပြီးပါပြီ။';}catch(err){toast(err.message);}finally{button.disabled=false;}});
let inventorySwipe;document.addEventListener('touchstart',e=>{const card=e.target.closest?.('[data-mobile-product-id]');if(!card||e.touches.length!==1)return;const touch=e.touches[0];inventorySwipe={card,id:Number(card.dataset.mobileProductId),x:touch.clientX,y:touch.clientY};},{passive:true});document.addEventListener('touchend',async e=>{const swipe=inventorySwipe;inventorySwipe=null;if(!swipe)return;const touch=[...e.changedTouches].find(t=>true);if(!touch||touch.clientX-swipe.x>-72||Math.abs(touch.clientY-swipe.y)>45)return;if(!confirm('ဒီ product ကို အမှိုက်ပုံးသို့ ရွှေ့မည်။ / Move this product to Trash?'))return;e.preventDefault();try{await api('/api/admin/products/'+swipe.id+'/trash',{method:'POST',body:'{}'});toast('Product moved to Trash');await refreshAll()}catch(error){toast(error.message)}} ,{passive:false});
window.editProduct=editProduct;
window.addEventListener("error",e=>{const m=$("product-message");if(m)m.textContent="Page error: "+(e.message||"Unknown error");});
window.addEventListener("unhandledrejection",e=>{const m=$("product-message");if(m)m.textContent="Request error: "+(e.reason?.message||String(e.reason||"Unknown error"));});
function updateInventoryQuery(value){const query=normalizeInventoryText(value);$("inventory-search-clear").hidden=!query;if(query===inventoryQuery)return;inventoryQuery=query;renderInventory()}
window.filterInventory=updateInventoryQuery;
// Guard against a stale cached copy of the old search form submitting the page.
document.addEventListener("submit",e=>{if(e.target?.id==="inventory-search-form"){e.preventDefault();updateInventoryQuery($("inventory-search").value)}},true);
function handleInventorySearchEvent(e){if(e.target?.id!=="inventory-search")return;if(e.type==="keydown"&&e.key==="Enter")e.preventDefault();if(e.type!=="keydown")updateInventoryQuery(e.target.value)}
document.addEventListener("input",handleInventorySearchEvent,true);
document.addEventListener("keyup",handleInventorySearchEvent,true);
document.addEventListener("search",handleInventorySearchEvent,true);
document.addEventListener("change",handleInventorySearchEvent,true);
$("inventory-search").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();updateInventoryQuery(e.currentTarget.value)}});
$("inventory-search-clear").addEventListener("click",()=>{$("inventory-search").value="";updateInventoryQuery("");$("inventory-search").focus()});
["inventory-category-filter","inventory-stock-filter","inventory-sort"].forEach(id=>$(id)?.addEventListener("change",renderInventory));
["inventory-category-filter","inventory-stock-filter","inventory-sort"].forEach(id=>$(id)?.addEventListener("change",renderInventory));
// Recycle Bin cards (owner's reference photo): icons drawn like the photo.
const binSvg=(d,fill)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill?"currentColor":"none"}" stroke="${fill?"none":"currentColor"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const binIcon={doc:binSvg('<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4"/>'),person:binSvg('<circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/>',true),total:binSvg('<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6"/>'),date:binSvg('<rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>'),restore:binSvg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 3.5v4.2h4.2"/>')};
async function refreshAll(){refreshOperations();try{const [s,orders,loadedProducts]=await Promise.all([api("/api/admin/summary"),api("/api/admin/orders"),api("/api/admin/products")]);products=loadedProducts;window.GearHubAdminExtras?.update(s,orders,loadedProducts);const salesNode=$("sales");salesNode.textContent=money(s.sales);const sales=Number(s.sales)||0;salesNode.dataset.mobileValue=sales>=1000?`${Math.round(sales/1000)}K`:String(sales);$("orders").textContent=s.orders;$("pending").textContent=s.pending;$("products-count").textContent=s.products;
$("low-stock").innerHTML=s.lowStock.length?s.lowStock.map(p=>`<p>⚠️ <b>${esc(p.name_en)}</b> / ${esc(p.name_my)} <span style="float:right">${p.stock} left</span></p>`).join(""):"No low-stock alerts.";
const confirmedOrders=orders.filter(o=>["confirmed","processing","shipped","completed"].includes(o.status));// Cancelled and deleted orders are kept together in one trash ("Deleted orders").
const deletedOrders=orders.filter(o=>o.status==="deleted"||o.status==="cancelled");$("deleted-count").textContent=String(deletedOrders.length);$("deleted-orders-table").innerHTML=deletedOrders.length?`<div class="bin-list">${deletedOrders.map(o=>{const [day,time]=String(o.created_at||"").split(" ");return `<article class="bin-card"><div class="bin-main"><p class="bin-label">Order ID ${binIcon.doc}</p><b class="bin-id">${esc(o.order_code)}</b><p class="bin-with-icon">${binIcon.person}<span>Customer<b>${esc(o.customer_name)}</b></span></p></div><div class="bin-facts"><p class="bin-with-icon">${binIcon.total}<span>Total<b>${money(o.total)}</b></span></p><p class="bin-with-icon">${binIcon.date}<span>Order date<b>${esc(day||"")}${time?`<br>${esc(time)}`:""}</b></span></p></div><button type="button" class="bin-restore" data-admin-action="restore-order" data-order-id="${Number(o.id)}">${binIcon.restore}<span>Restore</span></button></article>`}).join("")}</div>`:"No deleted orders.";$("confirmed-count").textContent=String(confirmedOrders.length);const activeOrders=orders.filter(o=>o.status==="pending");$("confirmed-orders-table").innerHTML=confirmedOrders.length?`<table class="admin-table compact-orders"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Confirm date</th><th>Payment</th><th>Receipt</th></tr></thead><tbody>${confirmedOrders.map(o=>`<tr><td><b class="invoice-tag">${esc(o.invoice_no||o.order_code)}</b></td><td>${esc(o.customer_name)}<br><small>${esc(o.phone)}</small></td><td><b>${money(o.total)}</b></td><td>${esc(o.confirmation_date||"—")}</td><td>${esc(o.payment_status)}</td><td>${o.hasReceipt?`<a href="${window.GearHubTenantAdmin?window.GearHubTenantAdmin.receipt(o):"/api/admin/orders/"+o.id+"/receipt"}" target="_blank" rel="noopener">View receipt</a>`:"—"}</td></tr>`).join("")}</tbody></table>`:"No confirmed orders yet.";if(window.GearHubOrderDetail?.refresh)window.GearHubOrderDetail.refresh(orders);else $("orders-table").innerHTML=activeOrders.length?`<table class="admin-table"><thead><tr><th>Order / Customer</th><th>Total / Transfer ref</th><th>Statuses & save</th></tr></thead><tbody>${activeOrders.map(o=>`<tr><td><b>${esc(o.order_code)}</b><br>${esc(o.customer_name)}<br>${esc(o.phone)}<br><small>${esc(o.address)}</small><details><summary>Items</summary>${o.items.map(i=>`${esc(i.nameEn)} × ${i.quantity}`).join("<br>")}</details></td><td><b>${money(o.total)}</b><br>Ref: ${esc(o.payment_reference||"—")}${o.hasReceipt?`<br><a href="${window.GearHubTenantAdmin?window.GearHubTenantAdmin.receipt(o):"/api/admin/orders/"+o.id+"/receipt"}" target="_blank" rel="noopener">View payment receipt</a>`:"<br><small>No receipt uploaded</small>"}<br><small>${esc(o.created_at)}</small></td><td><label>Order <select id="status-${o.id}">${["confirmed","processing","cancelled"].map(v=>`<option value="${v}" ${o.status===v?"selected":""}>${v==="confirmed"?"Confirm Order":v==="processing"?"Processing":"Cancel"}</option>`).join("")}</select></label><label>Confirm date <input type="date" id="date-${o.id}" value="${esc(o.confirmation_date||"")}"></label><label>Payment <select id="pay-${o.id}">${["pending","paid","rejected"].map(v=>`<option ${o.payment_status===v?"selected":""}>${v}</option>`).join("")}</select></label><input id="note-${o.id}" placeholder="Admin note" value="${esc(o.admin_note)}"><button type="button" data-admin-action="save-order" data-order-id="${Number(o.id)}">Save</button></td></tr>`).join("")}</tbody></table>`:"No orders waiting for confirmation.";
if(window.GearHubTenantAdmin)window.GearHubTenantAdmin.enhanceOrders(orders);
renderInventory();await loadCategoryManager();}catch(e){if(e.message.includes("Admin"))checkSession();else toast(e.message)}}
async function restoreOrder(id){try{const o=(await api("/api/admin/orders")).find(x=>Number(x.id)===id);if(o&&o.status==="deleted")await api("/api/admin/orders/"+id,{method:"PATCH",body:JSON.stringify({restore:true})});else await api("/api/admin/orders/"+id,{method:"PATCH",body:JSON.stringify({status:"pending",confirmationDate:"",paymentStatus:"pending",adminNote:"Restored from trash"})});toast("Order restored")}catch(e){toast(e.message)}await refreshAll()}
// A cancelled order in the trash is moved to "deleted" first, then deleted for good.
async function deleteOrderFromList(id,forever,cancelled){if(!confirm(forever?"ဒီအော်ဒါကို အပြီးဖျက်မှာ သေချာပါသလား? ပြန်ယူလို့ မရတော့ပါ။\nDelete this order forever?":"ဒီအော်ဒါကို Deleted orders ထဲ ရွှေ့မှာလား? ပြန်ယူလို့ ရပါတယ်။\nMove this order to Deleted orders?"))return;try{if(forever&&cancelled)await api("/api/admin/orders/"+id,{method:"DELETE",body:"{}"});await api("/api/admin/orders/"+id,{method:"DELETE",body:"{}"});toast(forever?"Order deleted forever":"Moved to Deleted orders")}catch(e){toast(e.message)}await refreshAll()}
async function emptyTrash(){const orders=await api("/api/admin/orders");if(!orders.some(o=>o.status==="deleted"||o.status==="cancelled")){toast("Nothing to delete");return}if(!confirm("အမှိုက်ပုံးထဲက Order အားလုံးကို အပြီးဖျက်မှာ သေချာပါသလား? ပြန်ယူလို့ မရတော့ပါ။"))return;try{for(const o of orders.filter(o=>o.status==="cancelled"))await api("/api/admin/orders/"+o.id,{method:"DELETE",body:"{}"});await api("/api/admin/trash",{method:"DELETE",body:"{}"});toast("Trash emptied");await refreshAll()}catch(e){toast(e.message)}}
async function saveOrder(id){const button=document.querySelector(`[data-admin-action="save-order"][data-order-id="${id}"]`);if(button)button.disabled=true;try{const confirmationDate=$("date-"+id).value;const status=$("status-"+id).value;if(status==="cancelled"&&!confirm("ဒီ Order ကို အမှိုက်ပုံးထဲ ရွှေ့မှာ သေချာပါသလား? Stock ကို ပြန်ပေါင်းပေးပါမယ်။"))return;await api("/api/admin/orders/"+id,{method:"PATCH",body:JSON.stringify({status,confirmationDate,paymentStatus:$("pay-"+id).value,adminNote:$("note-"+id).value})});toast(status==="cancelled"?"Order moved to trash":status==="confirmed"?"Confirmed · invoice assigned":"Order updated");await refreshAll()}catch(e){toast(e.message);if(e.message.includes("Admin login required"))checkSession()}finally{if(button)button.disabled=false}}
function editProduct(id){setProductFormOpen(true);const p=products.find(x=>Number(x.id)===Number(id));if(!p){toast("Product could not be found. Refresh and try again.");return}$("product-editor-heading").textContent="Edit Product";editingProductId=Number(id);editingStock=p.stock;const form=$("product-form");for(const [key,val] of Object.entries({active:p.active,sku:p.sku,price:p.price,nameEn:p.name_en,nameMy:p.name_my,categoryEn:p.category_en,categoryId:p.category_id??"",categoryMy:p.category_my,stock:p.stock,emoji:p.image_emoji,imageUrls:(Array.isArray(p.imageUrls)?p.imageUrls:(typeof p.imageUrls==="string"?p.imageUrls.split(/\\s*,\\s*/).filter(Boolean):[])).join("\n"),descriptionEn:p.description_en,descriptionMy:p.description_my})){if(form.elements.namedItem(key))form.elements.namedItem(key).value=val}form.elements.namedItem("images").value="";form.elements.namedItem("driveLinks").value="";selectedCoverKey="";renderProductCoverOptions();$("product-form-title").textContent="Edit product · "+p.sku;$("product-submit").textContent="Save product changes";$("cancel-edit").classList.remove("hidden");$("product-message").textContent="Existing photo URLs are listed below. Upload new photos or remove URLs you no longer need.";const panel=form.closest(".panel")||$("product-form-content");panel.scrollIntoView({behavior:"smooth",block:"start"});form.querySelector("input[name=sku]").focus({preventScroll:true})}
const originalEditProduct=editProduct;editProduct=function(id){originalEditProduct(id);const p=products.find(x=>Number(x.id)===Number(id)),field=$("product-form")?.elements.namedItem("promotionPrice");if(field)field.value=p?.promotion_price??"";const partField=$("product-form")?.elements.namedItem("partNo");if(partField)partField.value=p?.part_no??""};window.editProduct=editProduct;
// GearHub and every seller shop share the same Promotion price field.
(()=>{const grid=document.querySelector('#product-form .product-entry-card:nth-of-type(2) .product-field-grid');if(!grid||grid.querySelector('[name="promotionPrice"]'))return;const promotion=document.createElement('label');promotion.className='wide promotion-price-field';promotion.textContent='Promotion price (MMK) / Promotion ဈေး';promotion.innerHTML+='<span class="product-input-wrap"><input name="promotionPrice" type="number" min="1" step="1" placeholder="Optional sale price / မထည့်လည်း ရ"></span><small>Lower than the price. Leave empty for no promotion. / မူလဈေးထက် နည်းရမယ်။ မထည့်ရင် promotion မရှိ။</small>';grid.append(promotion);})();
// Phones: the form opens full width below the cards (from "+ Add Product" or Edit), not inside a card slot.
function setProductFormOpen(open){$("product-form-content").classList.toggle("hidden",!open);$("product-form-toggle").setAttribute("aria-expanded",String(open));$("product-form-toggle-icon").textContent=open?"−":"＋";positionMobileDashboardDetail("product-form-content")}
window.toggleProductForm=function(){setProductFormOpen($("product-form-content").classList.contains("hidden"))};
function resetProductEditor(){$("product-editor-heading").textContent="Add Product";editingProductId=null;editingStock=null;$("product-form").reset();selectedCoverKey="";renderProductCoverOptions();$("product-form-title").textContent="Add a product";$("product-submit").textContent="Add product";$("cancel-edit").classList.add("hidden");$("product-message").textContent=""}
$("cancel-edit").addEventListener("click",resetProductEditor);


async function saveProductForm(form){const f=new FormData(form),body={};if(editingProductId){body.expectedStock=editingStock;}for(const [k,v] of f.entries()){if(k!=="images")body[k]=v}if(body.price==="")body.price="0";try{const imageInput=form.elements.namedItem("images");if(!imageInput)throw new Error("Photo upload field is missing. Reload the page.");const files=[...imageInput.files];let uploaded=[];const urls=getProductImageUrls(form);if(files.length+urls.length>MAX_PRODUCT_PHOTOS)throw new Error(tooManyPhotos());if(files.length)uploaded=await uploadProductPhotos(files);body.imageUrls=[...uploaded,...await importDriveUrls(urls)];if(editingProductId){await api("/api/admin/products/"+editingProductId,{method:"PATCH",body:JSON.stringify({...body,price:Number(body.price),stock:Number(body.stock)})});msg("product-message","Product changes saved.","success");toast("Product changes saved");resetProductEditor()}else{await api("/api/admin/products",{method:"POST",body:JSON.stringify({...body,price:Number(body.price),stock:Number(body.stock)})});msg("product-message","Product added successfully.","success");toast("Product added successfully");form.reset();selectedCoverKey="";renderProductCoverOptions()}refreshAll()}catch(err){msg("product-message",err.message,"error");toast(err.message)}}
window.saveProductForm=async function(form){const button=$("product-submit");if(!form.reportValidity())return;button.disabled=true;button.textContent="Saving…";msg("product-message","Saving product changes…","");try{await saveProductFormInternal(form)}finally{button.disabled=false;button.textContent=editingProductId?"Save product changes":"Add product"}};
async function saveProductFormInternal(form){const f=new FormData(form),body={};if(editingProductId){body.expectedStock=editingStock;}for(const [k,v] of f.entries()){if(k!=="images")body[k]=v}if(body.price==="")body.price="0";let stage="prepare";try{const imageInput=form.elements.namedItem("images");if(!imageInput)throw new Error("Photo upload field is missing. Reload the page.");const files=[...imageInput.files];let uploaded=[];const urls=getProductImageUrls(form);if(files.length+urls.length>MAX_PRODUCT_PHOTOS)throw new Error(tooManyPhotos());if(files.length){stage="upload";uploaded=await uploadProductPhotos(files)}body.imageUrls=[...uploaded,...await importDriveUrls(urls)];if(window.GearHubTenantAdmin&&uploaded.length){form.elements.namedItem("imageUrls").value=body.imageUrls.join("\n");imageInput.value="";const cover=Number(body.coverIndex);selectedCoverKey=Number.isInteger(cover)&&body.imageUrls[cover]?"url:"+body.imageUrls[cover]:"";renderProductCoverOptions();}stage="save";if(editingProductId){await api("/api/admin/products/"+editingProductId,{method:"PATCH",body:JSON.stringify({...body,price:Number(body.price),stock:Number(body.stock)})});msg("product-message","Product changes saved.","success");toast("Product changes saved");resetProductEditor()}else{await api("/api/admin/products",{method:"POST",body:JSON.stringify({...body,price:Number(body.price),stock:Number(body.stock)})});msg("product-message","Product added successfully.","success");toast("Product added successfully");form.reset();selectedCoverKey="";renderProductCoverOptions()}await refreshAll()}catch(err){const reason=err?.message||String(err);const network=/failed to fetch|network|load failed/i.test(reason);const message=network?(stage==="upload"?"Photo upload request did not complete. Your product fields are still here. / ဓာတ်ပုံတင်ခြင်း မပြီးပါ။ ဖြည့်ထားသောစာများ ဆက်ရှိပါသည်။":"Product save request did not complete. Your fields and uploaded photos are still here. Check the inventory before submitting again. / သိမ်းခြင်း မပြီးပါ။ ထပ်မသိမ်းမီ Inventory ကို စစ်ပါ။"):"Save failed: "+reason;msg("product-message",message,"error");toast(message)}}
// Products take as many photos as the seller needs. They upload in groups of ten
// (one request each) so a big selection never hits the per-request limit.
const MAX_PRODUCT_PHOTOS=200,PHOTO_BATCH=10;
function tooManyPhotos(){return "A product can have up to "+MAX_PRODUCT_PHOTOS+" photos. / ပစ္စည်းတစ်ခုမှာ ဓာတ်ပုံ "+MAX_PRODUCT_PHOTOS+" ပုံအထိ ထည့်နိုင်ပါတယ်။"}
async function uploadProductPhotos(files){
 const urls=[];
 for(let start=0;start<files.length;start+=PHOTO_BATCH){
  const batch=files.slice(start,start+PHOTO_BATCH);
  if(files.length>PHOTO_BATCH)msg("product-message","Uploading photos "+(start+1)+"–"+(start+batch.length)+" of "+files.length+"… / ဓာတ်ပုံတင်နေသည်","");
  const fd=new FormData();for(const file of batch){const optimized=await optimizeImage(file);fd.append("images",optimized,optimized.name||file.name.replace(/\.[^.]+$/,".jpg"))}
  const up=await adminFetch("/api/admin/uploads",{method:"POST",body:fd,credentials:"same-origin"});const ud=await up.json().catch(()=>({}));
  if(!up.ok)throw new Error((ud.error||"Image upload failed.")+(urls.length?" ("+urls.length+" photos were uploaded before this.)":""));
  urls.push(...(ud.imageUrls||[]));
 }
 return urls;
}
const productForm=$("product-form");productForm.addEventListener("submit",e=>{e.preventDefault();window.saveProductForm(productForm)});


let categoryRows=[],categorySequence=0,categorySaving=false;
// Inventory category filter (owner's request): the same picker as Add Product (main category, then
// subcategory), so categories with the same name under different main categories are told apart.
let inventoryCategory=null;
function inventoryCategoryOf(p){const rows=categoryRows.filter(c=>c.category_en),key=v=>String(v||"").trim().toLowerCase(),name=key(p.category_en),saved=p.category_id!=null&&rows.find(c=>c.id!=null&&String(c.id)===String(p.category_id));return saved&&key(saved.category_en)===name?saved:rows.find(c=>key(c.category_en)===name)||null;}
function inventoryCategoryIn(p,chosen){let c=inventoryCategoryOf(p);const seen=new Set();while(c&&!seen.has(c)){if(c===chosen)return true;seen.add(c);c=categoryParent(c);}return false;}
// The chosen name first (the filter box is narrow on phones), then its main category: "Sany (Swing Gear Parts)".
function inventoryCategoryPath(c){let main=c;const seen=new Set();while(categoryParent(main)&&!seen.has(main)){seen.add(main);main=categoryParent(main);}return c.category_en+(main&&main!==c?" ("+main.category_en+")":"");}
(()=>{const select=$("inventory-category-filter"),wrap=select?.parentElement;if(!wrap)return;select.tabIndex=-1;
 const open=document.createElement("button");open.type="button";open.className="inventory-category-open";open.setAttribute("aria-label","Filter by category");wrap.append(open);
 open.addEventListener("click",()=>window.GearHubCategoryPicker?.open({rows:categoryRows.filter(c=>c.category_en),value:inventoryCategory?.category_en||"",selectedId:inventoryCategory?.id,allowNone:true,noneText:"All Categories",noneHint:"Show products of every category.",mainSelectable:true,titleText:"Filter by Category",subtitleText:"Choose a main category, then a subcategory",onPick:row=>{inventoryCategory=row||null;renderInventory();}}));})();
// Unsaved category edits: an app update waits instead of reloading the page (updates.js).
const markCategoriesDirty=(dirty=true)=>{window.__gearhubCategoryDirty=dirty;};
const categoryExpanded=new Set(),categoryEditing=new Set();
// Two categories may share a name under different main categories: a row's parent is found by the
// editor key / ID it was linked to, and by name only for older rows (a main category first).
function categoryParent(c){if(!c?.parent_en)return null;const named=categoryRows.filter(p=>p!==c&&p.category_en===c.parent_en);return categoryRows.find(p=>p!==c&&(c._parentKey&&p._key===c._parentKey||c.parent_id!=null&&p.id!=null&&String(p.id)===String(c.parent_id)))||named.find(p=>!p.parent_en)||named[0]||null;}
function categoryChildren(category){return categoryRows.filter(row=>row!==category&&categoryParent(row)===category);}
function categoryDepth(c,seen=new Set()){if(!c||seen.has(c))return 3;seen.add(c);return c.parent_en?categoryDepth(categoryParent(c),seen)+1:0;}
function categoryTotal(c,seen=new Set()){if(seen.has(c))return 0;seen.add(c);return Number(c.product_count||0)+categoryChildren(c).reduce((sum,row)=>sum+categoryTotal(row,seen),0);}
function expandCategoryParents(c){const seen=new Set();while(c?.parent_en&&!seen.has(c)){seen.add(c);c=categoryParent(c);if(c)categoryExpanded.add(c._key);}}
function categoryParentChoices(c){return categoryRows.filter(p=>p!==c&&p.category_en&&categoryDepth(p)<2&&!function below(x){const visited=new Set();while(x?.parent_en&&!visited.has(x)){visited.add(x);x=categoryParent(x);if(x===c)return true;}return false;}(p));}
// Category tree icons (owner design): a plant for main categories, a folder below them.
const CATEGORY_PLANT='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M12 1.8c1.7 1.7 2.3 3.8 1.5 5.9-.4 1-1 1.7-1.5 2-.5-.3-1.1-1-1.5-2-.8-2.1-.2-4.2 1.5-5.9z"/><path d="M11.2 13.2c-1-2.7-3.5-4.2-6.7-3.8.7 2.9 3.2 4.6 6.7 3.8z"/><path d="M12.8 13.2c1-2.7 3.5-4.2 6.7-3.8-.7 2.9-3.2 4.6-6.7 3.8z"/><path d="M11.2 17.8c-1.2-2.3-3.6-3.4-6.3-2.7 1 2.4 3.4 3.5 6.3 2.7z"/><path d="M12.8 17.8c1.2-2.3 3.6-3.4 6.3-2.7-1 2.4-3.4 3.5-6.3 2.7z"/><rect x="11.2" y="8.5" width="1.6" height="14" rx=".8"/></g></svg>',CATEGORY_FOLDER='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4.2l2 2.2h6.8A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
function categoryRowMarkup(c,depth=0,seen=new Set()){
 if(seen.has(c))return '';seen=new Set(seen);seen.add(c);
 const key=esc(c._key),children=categoryChildren(c),expanded=categoryExpanded.has(c._key),editing=categoryEditing.has(c._key),count=categoryTotal(c);
 const bannerEditor=!depth?`<section class="category-banner-editor"><strong>Main category banner</strong><p>This image appears when customers open this main category. <small class="appearance-ratio">4:1 · 1600 × 400 · ထည့်ရင် ဘောင်နဲ့ကိုက်အောင် ချိန်ပေးမယ်</small></p><div class="category-banner-editor-row">${c.bannerUrl?`<img src="${esc(c.bannerUrl)}" alt="" class="category-banner-preview">`:'<span class="category-banner-empty">No banner selected</span>'}<label class="secondary category-banner-upload">Choose banner<input type="file" accept="image/jpeg,image/png,image/webp" data-category-banner-upload="${key}"></label>${c.bannerUrl?`<button type="button" class="secondary" data-category-command="remove-banner" data-category-key="${key}">Remove</button>`:''}</div></section>`:'';
 return `<article class="category-design-row ${depth?'category-child':'category-main'}" style="touch-action:pan-y" data-category-depth="${depth}" data-category-key="${key}"><div class="category-design-heading"><span class="category-tree-icon" aria-hidden="true">${depth?CATEGORY_FOLDER:CATEGORY_PLANT}</span><div class="category-design-copy"><h3>${esc(c.category_en||'New category')}</h3>${c.category_my&&c.category_my!==c.category_en?`<small class="category-admin-myanmar">${esc(c.category_my)}</small>`:''}<p>${['Main category','Subcategory','Child subcategory'][Math.min(depth,2)]} · ${count} products</p></div><div class="category-design-actions"><span class="category-count">${count} ${count===1?'product':'products'}</span><button type="button" class="category-chevron" data-category-command="expand" data-category-key="${key}" aria-expanded="${expanded}" aria-label="Expand or collapse ${esc(c.category_en||'category')}">${expanded?'⌄':'›'}</button><button type="button" data-category-command="edit" data-category-key="${key}" aria-label="Edit ${esc(c.category_en||'category')}">✎</button><button type="button" hidden data-category-command="remove" data-category-key="${key}" aria-hidden="true" tabindex="-1"></button></div></div><div class="category-edit-fields ${editing?'':'hidden'}"><div class="category-admin-fields"><label>English name<input data-category-value="category_en" data-category-key="${key}" maxlength="100" value="${esc(c.category_en)}"></label><label>မြန်မာအမည်<input data-category-value="category_my" data-category-key="${key}" maxlength="100" value="${esc(c.category_my)}"></label><label>Parent category<input readonly class="category-picker-trigger" aria-haspopup="dialog" data-category-command="pick-parent" data-category-key="${key}" value="${esc(c.parent_en||'Main category (no parent)')}"></label><label>Icon (optional)<input data-category-value="icon" data-category-key="${key}" maxlength="12" value="${esc(c.icon||'')}"></label></div>${bannerEditor}<div class="category-edit-actions"><button type="button" data-category-command="up" data-category-key="${key}">↑ Move up</button><button type="button" data-category-command="down" data-category-key="${key}">↓ Move down</button>${depth<2?`<button type="button" data-category-command="add-sub" data-category-key="${key}">＋ ${depth?'Child subcategory':'Subcategory'}</button>`:''}<button type="button" data-category-command="done" data-category-key="${key}">Done</button></div></div>${expanded?`<div class="category-design-children">${children.map(child=>categoryRowMarkup(child,depth+1,seen)).join('')}${depth<2?`<button type="button" class="category-add-sub" data-category-command="add-sub" data-category-key="${key}"><span class="category-add-plus" aria-hidden="true">+</span>Add ${depth?'Child subcategory':'Subcategory'}</button>`:''}</div>`:''}</article>`;
}
function renderCategoryManager(rows){
 if(rows){categoryRows=rows.map(c=>({...c,_key:c._key||"category-"+(c.id||"new-"+(++categorySequence))}));for(const c of categoryRows)if(c.parent_en&&!c._parentKey)c._parentKey=categoryParent(c)?._key;}
 const root=$("category-manager-rows");if(!root)return;
 const parents=categoryRows.filter(c=>!c.parent_en);
 $("category-parent-options").innerHTML=parents.filter(c=>c.category_en).map(c=>`<option value="${esc(c.category_en)}"></option>`).join("");
 root.innerHTML=parents.map(c=>categoryRowMarkup(c,0)).join("");
 const orphans=categoryRows.filter(c=>c.parent_en&&!categoryParent(c));
 if(orphans.length)root.innerHTML+=orphans.map(c=>categoryRowMarkup(c,1)).join("");
 for(const [id,field] of [["product-category-en-options","category_en"],["product-category-my-options","category_my"]])$(id).innerHTML=categoryRows.map(c=>`<option value="${esc(c[field]||c.category_en)}"></option>`).join("");
}
if(window.GearHubTenantAdmin){window.GearHubTenantAdmin.saveCategories=()=>{if(window.__gearhubCategoryDirty)sessionStorage.setItem('gh-category-draft:'+location.pathname,JSON.stringify(categoryRows));};window.GearHubTenantAdmin.restoreCategories=rows=>{const key='gh-category-draft:'+location.pathname;let draft;try{draft=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}sessionStorage.removeItem(key);// Only a real unsaved draft comes back; an empty one would hide (and on Save delete) every category.
return Array.isArray(draft)&&draft.length?draft:rows;};}
async function loadCategoryManager(){try{const loaded=await api("/api/admin/categories");
 // The 20-second order refresh must never wipe a category the admin is still adding or editing.
 if(window.__gearhubCategoryDirty)return;const rows=window.GearHubTenantAdmin?.restoreCategories?.(loaded)||loaded;markCategoriesDirty(rows!==loaded);renderCategoryManager(rows)}catch(err){if(!String(err.message).includes("Admin login required"))msg("category-manager-message","Could not load categories: "+err.message,"error")}}
function addCategory(parent){if(categorySaving)return;markCategoriesDirty();if(parent&&categoryDepth(parent)>=2){msg('category-manager-message','Maximum three category levels.','error');return;}const c={_key:"new-"+(++categorySequence),category_en:"",category_my:"",parent_en:parent?.category_en||"",_parentKey:parent?._key,icon:"",product_count:0};categoryRows.push(c);categoryEditing.add(c._key);if(parent)categoryExpanded.add(parent._key);renderCategoryManager();document.querySelector('[data-category-value="category_en"][data-category-key="'+c._key+'"]')?.focus();}
$("add-main-category").addEventListener("click",()=>addCategory());
$("category-manager-rows").addEventListener("input",event=>{const input=event.target;if(!input.dataset.categoryValue)return;markCategoriesDirty();const c=categoryRows.find(row=>row._key===input.dataset.categoryKey);if(!c)return;const field=input.dataset.categoryValue,previous=c[field];c[field]=input.value;if(field==="category_en"&&previous)categoryChildren(c).forEach(row=>row.parent_en=c.category_en);});
$("category-manager-rows").addEventListener("change",event=>{if(event.target.dataset.categoryValue){expandCategoryParents(categoryRows.find(row=>row._key===event.target.dataset.categoryKey));renderCategoryManager();}});
$("category-manager-rows").addEventListener("click",event=>{
 // Tapping the category name opens its editor (phones have no pencil button).
 const heading=!event.target.closest("[data-category-command]")&&event.target.closest(".category-design-heading");
 const button=heading?heading.querySelector('[data-category-command="edit"]'):event.target.closest("[data-category-command]");if(!button||categorySaving)return;const c=categoryRows.find(row=>row._key===button.dataset.categoryKey);if(!c)return;const action=button.dataset.categoryCommand;
 if(action==="expand"){categoryExpanded.has(c._key)?categoryExpanded.delete(c._key):categoryExpanded.add(c._key);}
 if(action==="edit"){categoryEditing.has(c._key)?categoryEditing.delete(c._key):categoryEditing.add(c._key);}
 if(action==="done"){if(!c.category_en.trim()){msg("category-manager-message","Enter an English category name.","error");return;}categoryEditing.delete(c._key);}
 if(action==="add-sub"){if(!c.category_en.trim()){msg("category-manager-message","Name the main category first.","error");return;}addCategory(c);return;}
 if(action==="pick-parent"){const choices=new Set(categoryParentChoices(c));window.GearHubCategoryPicker?.open({rows:categoryRows,value:c.parent_en,allowed:row=>choices.has(row),allowNone:true,mainSelectable:true,titleText:"Select Parent Category",subtitleText:"Choose where this category belongs",onPick:parent=>{const name=parent?.category_en||"";if(parent===categoryParent(c))return;markCategoriesDirty();c.parent_en=name;c._parentKey=parent?._key;delete c.parent_id;expandCategoryParents(c);renderCategoryManager();}});return;}
 if(["remove-banner","remove","up","down"].includes(action))markCategoriesDirty();
 if(action==="remove-banner"){c.bannerUrl="";msg("category-manager-message","Main category banner removed from the draft. Save Categories to apply.","");}
 if(action==="remove"){
  if(categoryChildren(c).length){msg("category-manager-message","Remove subcategories first. အောက်အမျိုးအစားများကို အရင်ဖျက်ပါ။", "error");return;}
  if(Number(c.product_count)>0){msg("category-manager-message","This category contains products. Edit those products and choose another category before deleting. ပစ္စည်းများကို အခြားအမျိုးအစားသို့ အရင်ပြောင်းပါ။","error");return;}
  categoryRows=categoryRows.filter(row=>row._key!==c._key);msg("category-manager-message","Empty category removed from the editor. Save Categories to apply. သိမ်းရန် Save Categories ကိုနှိပ်ပါ။","");
 }

 if(action==="up"||action==="down"){const peers=categoryRows.filter(row=>categoryParent(row)===categoryParent(c)),index=peers.indexOf(c),other=peers[index+(action==="up"?-1:1)];if(other){const a=categoryRows.indexOf(c),b=categoryRows.indexOf(other);[categoryRows[a],categoryRows[b]]=[categoryRows[b],categoryRows[a]];}}
 renderCategoryManager();
});
// Swipe a category row to the left: ask, then delete it (same rules as before: no
// subcategories, no products) and save.
let categorySwipe;
const endCategorySwipe=()=>{if(categorySwipe)categorySwipe.row.style.transform="";categorySwipe=null};
const startCategorySwipe=(target,x,y)=>{const row=target.closest?.(".category-design-row");if(!row||target.closest("input,textarea,select,button,label,a"))return;categorySwipe={row,x,y}};
const moveCategorySwipe=(x,y)=>{if(!categorySwipe)return;const dx=x-categorySwipe.x,dy=y-categorySwipe.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){endCategorySwipe();return}if(dx<0&&Math.abs(dx)>Math.abs(dy))categorySwipe.row.style.transform="translateX("+Math.max(dx,-90)+"px)"};
const finishCategorySwipe=(x,y)=>{
 if(!categorySwipe)return;
 const {row}=categorySwipe,dx=x-categorySwipe.x,dy=y-categorySwipe.y;endCategorySwipe();
 if(dx>-60||Math.abs(dy)>Math.abs(dx)/1.5)return;
 const key=row.dataset.categoryKey,name=row.querySelector("h3")?.textContent||"";
 if(!confirm("ဒီ category ကို ဖျက်မှာ သေချာပါသလား?\nDelete \""+name+"\"?"))return;
 document.querySelector('[data-category-command="remove"][data-category-key="'+CSS.escape(key)+'"]')?.click();
 // The removal rules refuse a category that still has products or subcategories.
 if(!categoryRows.some(r=>r._key===key))$("category-manager-form").requestSubmit();
};
// A finger uses touch events (the same way the inventory swipe does, which iPhones deliver
// reliably); a mouse drag uses pointer events.
document.addEventListener("touchstart",e=>{if(e.touches.length===1)startCategorySwipe(e.target,e.touches[0].clientX,e.touches[0].clientY);else endCategorySwipe()},{passive:true});
document.addEventListener("touchmove",e=>{if(e.touches.length===1)moveCategorySwipe(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
document.addEventListener("touchend",e=>{const t=e.changedTouches[0];if(t)finishCategorySwipe(t.clientX,t.clientY);else endCategorySwipe()});
document.addEventListener("touchcancel",endCategorySwipe);
document.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button===0)startCategorySwipe(e.target,e.clientX,e.clientY)});
document.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")moveCategorySwipe(e.clientX,e.clientY)});
document.addEventListener("pointerup",e=>{if(e.pointerType==="mouse")finishCategorySwipe(e.clientX,e.clientY)});
$("category-editor-back").addEventListener("click",()=>{const toggle=document.querySelector('[data-content-id="category-manager-content"]');$("category-manager-content").classList.add("hidden");toggle.setAttribute("aria-expanded","false");$("category-manager-icon").textContent="＋";toggle.scrollIntoView({behavior:"smooth",block:"center"});});
$("category-manager-form").addEventListener("submit",async e=>{
 e.preventDefault();if(categorySaving)return;
 const unnamed=categoryRows.find(c=>!c.category_en.trim());if(unnamed){categoryEditing.add(unnamed._key);expandCategoryParents(unnamed);renderCategoryManager();msg("category-manager-message","Enter an English name for every category.","error");return;}
 const rows=categoryRows.map(c=>({id:Number(c.id)||undefined,category_en:c.category_en.trim(),category_my:String(c.category_my||"").trim()||c.category_en.trim(),icon:c.icon||"",parent_en:(c.parent_en||"").trim(),...(c.parent_en&&categoryParent(c)?.id?{parent_id:Number(categoryParent(c).id)}:{}),...(c.bannerUrl?{bannerUrl:c.bannerUrl}:{})}));
 const button=$("save-categories");categorySaving=true;button.disabled=true;msg("category-manager-message","Saving categories…","");
 let result;try{result=await api("/api/admin/categories",{method:"PUT",body:JSON.stringify({categories:rows})});window.GearHubCategoryPicker?.reset?.();}catch(err){msg("category-manager-message","Could not save categories: "+err.message,"error");toast(err.message);return;}finally{categorySaving=false;button.disabled=false;}
 // Saved: the editor is usable again at once. The rest of the page refreshes in the
 // background, and a slow or failed refresh never reports the save as failed.
 markCategoriesDirty(false);categoryEditing.clear();renderCategoryManager(result.categories);msg("category-manager-message","Categories saved.","success");toast("Categories saved");refreshAll().catch(()=>{});
});


const siteTextGroups=[
 {title:"Announcement and navigation",keys:["announcement","catalog","services","admin","cart","navHome","navCategory","navPromotion","navCart"]},
 {title:"Homepage hero",keys:["eyebrow","heroBadge","heroTitle","heroText","browse","verified","transfer","support","quality"]},
 {title:"Product catalog",keys:["catalogLabel","featured","featuredText","searchPlaceholder","allCategories","recommended","priceLow","priceHigh","loadingProducts","noMatchingProducts","viewPhotos"]},
 {title:"Category and promotion tabs",keys:["categoryEyebrow","categoryHeading","categoryText","categoryProductCount","noCategories","promotionEyebrow","promotionHeading","promotionText","promotionBrowse"]},
 {title:"Service highlights",keys:["industrial","industrialText","securePay","securePayText","help","helpText"]},
 {title:"Footer",keys:["footer","footerDemo"]},
 {title:"Cart, checkout and messages",keys:["yourCart","checkout","customerName","phone","email","address","paymentRef","receiptUpload","receiptHelp","paymentNote","placeOrder","add","stock","subtotal","remove","empty","continue","orderSuccess","payPending","accountName","accountNumber","paymentUnavailable","submittingOrder","serverUnavailable","notEnoughStock","addedToCart","orderId","productPhotos"]}
];
const siteTextLabels={announcement:"Announcement bar",catalog:"Catalog link",services:"Services link",admin:"Admin link",cart:"Cart button",eyebrow:"Hero eyebrow",heroBadge:"Hero badge",heroTitle:"Main headline",heroText:"Hero description",browse:"Browse button",verified:"Stock highlight",transfer:"Payment highlight",support:"Support highlight",quality:"Hero card text",catalogLabel:"Catalog eyebrow",featured:"Catalog heading",featuredText:"Catalog description",searchPlaceholder:"Product search placeholder",allCategories:"All categories option",recommended:"Featured sort option",priceLow:"Low price sort option",priceHigh:"High price sort option",loadingProducts:"Loading message",noMatchingProducts:"No search results message",viewPhotos:"Product photo button",industrial:"Equipment highlight heading",industrialText:"Equipment highlight text",securePay:"Payment highlight heading",securePayText:"Payment highlight text",help:"Purchase support heading",helpText:"Purchase support text",footer:"Footer description",footerDemo:"Footer note",yourCart:"Cart heading",checkout:"Checkout heading/button",customerName:"Customer name label",phone:"Phone label",email:"Email label",address:"Address label",paymentRef:"Payment reference label",receiptUpload:"Receipt upload label",receiptHelp:"Receipt upload help",paymentNote:"Payment status note",placeOrder:"Place order button",add:"Add to cart button",stock:"Stock label",subtotal:"Total label",remove:"Remove item button",empty:"Empty cart message",orderSuccess:"Order success heading",payPending:"Pending payment message",accountName:"Account name label",accountNumber:"Account number label",paymentUnavailable:"Payment details error",submittingOrder:"Order submitting message",serverUnavailable:"Connection error",notEnoughStock:"Out of stock message",addedToCart:"Added to cart message",orderId:"Order number label",productPhotos:"Photo gallery heading"};
Object.assign(siteTextLabels,{navHome:"Home tab",navCategory:"Category tab",navPromotion:"Promotion tab",navCart:"Cart tab",navProfile:"Profile tab",popularCategories:"Popular categories heading",seeAll:"See all link",profileText:"Profile description",categoryEyebrow:"Category eyebrow",categoryHeading:"Category page title",categoryText:"Category page description",categoryProductCount:"Category item count",noCategories:"Empty category message",promotionEyebrow:"Promotion eyebrow",promotionHeading:"Promotion title",promotionText:"Promotion description",promotionBrowse:"Promotion button"});
let siteSettings={};
function displaySiteText(value){return String(value??"").replace(/<br\s*\/?\s*>/gi,"\n")}
function renderSiteTextEditor(values={}){
 const defaults=window.GEARHUB_DEFAULT_TRANSLATIONS||{},allKeys=Object.keys(defaults.my||{}),used=new Set(siteTextGroups.flatMap(group=>group.keys));
 const groups=[...siteTextGroups];const other=allKeys.filter(key=>!used.has(key));if(other.length)groups.push({title:"Other frontend labels",keys:other});
 $("site-text-editor").innerHTML=groups.map(group=>`<details class="site-text-group"><summary>${esc(group.title)}</summary><div class="site-text-group-grid">${group.keys.filter(key=>allKeys.includes(key)).map(key=>`<article class="site-text-card"><h4>${esc(siteTextLabels[key]||key)}</h4><label class="site-language-field">မြန်မာ<textarea data-site-text="${esc(key)}" data-language="my" maxlength="1000">${esc(displaySiteText(values.my?.[key]??defaults.my[key]))}</textarea></label><label class="site-language-field">English<textarea data-site-text="${esc(key)}" data-language="en" maxlength="1000">${esc(displaySiteText(values.en?.[key]??defaults.en?.[key]??""))}</textarea></label></article>`).join("")}</div></details>`).join("");
}
function updateAdminDashboardBackground(url){
 const head=document.querySelector(".admin-head");if(!head)return;
 if(!window.matchMedia("(max-width:800px)").matches){head.style.removeProperty("background-image");head.style.removeProperty("background-size");head.style.removeProperty("background-position");return;}
 const image=String(url||"").trim();
 head.style.backgroundImage=image?`linear-gradient(95deg,#03285fbd 0%,#0b5ba67a 48%,#0b539420 78%),url(${JSON.stringify(image)})`:"";
 head.style.backgroundSize="cover";head.style.backgroundPosition="center";
}
function updateSiteImagePreview(inputId,previewId){const url=$(inputId).value.trim(),preview=$(previewId);if(url){preview.src=url;preview.classList.remove("hidden")}else{preview.removeAttribute("src");preview.classList.add("hidden")}}
function fillSiteSettingsForm(settings){siteSettings=settings||{};if(!window.GearHubTenantAdmin){const t=$("admin-store-title");if(t)t.textContent=(siteSettings.brandName||"GearHub")+" · Admin";window.GearHubAdminExtras?.setLogo(siteSettings.logoUrl||"");}$("site-title").value=siteSettings.siteTitle||"";$("site-brand-name").value=siteSettings.brandName||"";$("site-brand-tagline").value=siteSettings.brandTagline||"";$("site-hero-icon-input").value=siteSettings.heroIcon||"⚙️";$("site-logo-url").value=siteSettings.logoUrl||"";$("site-app-icon-url").value=siteSettings.appIconUrl||"";$("site-navigation-background-url").value=siteSettings.navigationBackgroundUrl||"";$("site-navigation-image-opacity").value=String(Math.max(0,Math.min(100,Number(siteSettings.navigationImageOpacity??65)||65)));$("site-navigation-image-opacity-value").textContent=$("site-navigation-image-opacity").value+"%";updateAdminDashboardBackground(siteSettings.navigationBackgroundUrl||siteSettings.heroImageUrl||"/images/hero-excavator.jpg");$("site-wallpaper-url").value=siteSettings.wallpaperUrl||"";$("site-hero-image-url").value=siteSettings.heroImageUrl||"/images/hero-excavator.jpg";for(const key of ["brand","accent","page","hero"])$("site-color-"+key).value=siteSettings.colors?.[key]||({brand:"#183426",accent:"#b7f36b",page:"#f5f7f1",hero:"#183426"})[key];renderSiteTextEditor(siteSettings.translations||{});updateSiteImagePreview("site-logo-url","site-logo-preview");updateSiteImagePreview("site-app-icon-url","site-app-icon-preview");updateSiteImagePreview("site-navigation-background-url","site-navigation-background-preview");updateSiteImagePreview("site-wallpaper-url","site-wallpaper-preview");updateSiteImagePreview("site-hero-image-url","site-hero-image-preview");refreshAppearanceColors();if(window.GearHubTenantAdmin){window.GearHubTenantAdmin.nameDraftFields();window.GearHubUpdates?.restore?.()}}
async function loadSiteSettings(){try{fillSiteSettingsForm(await api("/api/admin/site-settings"))}catch(err){msg("site-settings-message","Could not load frontend settings: "+err.message,"error")}}
$("site-settings-form").addEventListener("input",e=>{if(e.target.id==="site-app-icon-url")updateSiteImagePreview("site-app-icon-url","site-app-icon-preview");if(e.target.id==="site-navigation-background-url")updateSiteImagePreview("site-navigation-background-url","site-navigation-background-preview");if(e.target.id==="site-navigation-image-opacity")$("site-navigation-image-opacity-value").textContent=e.target.value+"%";updateSiteImagePreview("site-logo-url","site-logo-preview");updateSiteImagePreview("site-app-icon-url","site-app-icon-preview");updateSiteImagePreview("site-navigation-background-url","site-navigation-background-preview");if(e.target.id==="site-wallpaper-url")updateSiteImagePreview("site-wallpaper-url","site-wallpaper-preview");if(e.target.id==="site-hero-image-url")updateSiteImagePreview("site-hero-image-url","site-hero-image-preview")});
// Every shop photo is fitted to the exact frame it is shown in before upload.
const SITE_IMAGE_FRAMES={"site-hero-image-url":{width:1600,height:640,label:"Hero"},"site-navigation-background-url":{width:1200,height:400,label:"Navigation"},"site-wallpaper-url":{width:1080,height:1920,label:"Wallpaper"},"site-logo-url":{width:512,height:512,label:"Logo",pad:"white"}},CATEGORY_BANNER_FRAME={width:1600,height:400,label:"Category banner"};
async function fitToFrame(file,frame){return frame&&window.GearHubImageFit&&/^image\/(jpeg|png|webp|avif)$/.test(file.type)?window.GearHubImageFit.open(file,frame):file}
$("site-settings-form").addEventListener("change",async e=>{const input=e.target;if(!input.matches("[data-site-upload-target]"))return;const picked=input.files?.[0];if(!picked)return;let file;try{file=await fitToFrame(picked,SITE_IMAGE_FRAMES[input.dataset.siteUploadTarget])}catch(err){msg("site-settings-message",err.message,"error");input.value="";return}if(!file){input.value="";return}const target=$(input.dataset.siteUploadTarget),button=$("site-settings-save");button.disabled=true;msg("site-settings-message","Uploading image…","");try{const optimized=target.id==="site-app-icon-url"?await makeAppIcon(file):await optimizeImage(file),form=new FormData();form.append("images",optimized,optimized.name||file.name);const response=await adminFetch("/api/admin/uploads",{method:"POST",body:form,credentials:"same-origin"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Image upload failed.");target.value=data.imageUrls?.[0]||"";if(target.id==="site-logo-url"&&$("site-app-icon-url")){/* One logo: the Home Screen app icon is made from the same picture. */const icon=await makeAppIcon(file),iconForm=new FormData();iconForm.append("images",icon,icon.name||"app-icon.png");const iconResponse=await adminFetch("/api/admin/uploads",{method:"POST",body:iconForm,credentials:"same-origin"});const iconData=await iconResponse.json().catch(()=>({}));if(!iconResponse.ok)throw new Error(iconData.error||"App icon upload failed.");$("site-app-icon-url").value=iconData.imageUrls?.[0]||"";updateSiteImagePreview("site-app-icon-url","site-app-icon-preview");}const previewId=target.id==="site-app-icon-url"?"site-app-icon-preview":target.id==="site-navigation-background-url"?"site-navigation-background-preview":target.id==="site-logo-url"?"site-logo-preview":target.id==="site-wallpaper-url"?"site-wallpaper-preview":"site-hero-image-preview";updateSiteImagePreview(target.id,previewId);msg("site-settings-message","Image uploaded. Save frontend settings to apply it.","success")}catch(err){msg("site-settings-message",err.message,"error")}finally{button.disabled=false;input.value=""}});
$("site-settings-form").addEventListener("submit",async e=>{e.preventDefault();const button=$("site-settings-save"),translations={my:{},en:{}};for(const field of e.currentTarget.querySelectorAll("[data-site-text]"))translations[field.dataset.language][field.dataset.siteText]=displaySiteText(field.value);const payload={siteTitle:$("site-title").value,brandName:$("site-brand-name").value,brandTagline:$("site-brand-tagline").value,heroIcon:$("site-hero-icon-input").value,logoUrl:$("site-logo-url").value,appIconUrl:$("site-app-icon-url").value,navigationBackgroundUrl:$("site-navigation-background-url").value,navigationImageOpacity:Number($("site-navigation-image-opacity").value),wallpaperUrl:$("site-wallpaper-url").value,heroImageUrl:$("site-hero-image-url").value,colors:{brand:$("site-color-brand").value,accent:$("site-color-accent").value,page:$("site-color-page").value,hero:$("site-color-hero").value},payment:siteSettings.payment||{},translations,layout:siteSettings.layout||{}};button.disabled=true;button.textContent="Saving…";msg("site-settings-message","Saving frontend settings…","");try{const result=await api("/api/admin/site-settings",{method:"PUT",body:JSON.stringify(payload)});fillSiteSettingsForm(result.settings);msg("site-settings-message","Frontend settings saved.","success");toast("Frontend settings saved")}catch(err){msg("site-settings-message","Save failed: "+err.message,"error");toast("Save failed: "+err.message)}finally{button.disabled=false;button.textContent="▣ Save"}});

function prepareAdminLayout(){if(!window.matchMedia("(min-width:1100px)").matches)return;const dashboard=$("dashboard"),inventory=$("inventory-panel"),heading=dashboard?.querySelector(".admin-head");if(dashboard&&inventory&&heading&&inventory.parentElement===dashboard)dashboard.insertBefore(inventory,heading)}
function initAdminNavigation(){
 const sidebar=document.querySelector(".admin-sidebar"),collapse=$("admin-sidebar-toggle"),userMenu=$("admin-user-menu"),userToggle=$("admin-user-toggle");
 collapse?.addEventListener("click",()=>{const collapsed=document.body.classList.toggle("admin-sidebar-collapsed");collapse.setAttribute("aria-expanded",String(!collapsed))});
 userToggle?.addEventListener("click",()=>{const open=userMenu.classList.toggle("open");userToggle.setAttribute("aria-expanded",String(open))});
 document.addEventListener("click",event=>{if(userMenu&&!userMenu.contains(event.target)){userMenu.classList.remove("open");userToggle?.setAttribute("aria-expanded","false")}});
 sidebar?.addEventListener("click",event=>{const link=event.target.closest("a[href^='#']");if(!link)return;event.preventDefault();const id=decodeURIComponent(link.getAttribute("href").slice(1));const target=$(id);if(!target)return;const toggle=document.querySelector('[data-content-id="'+id+'"]');if(toggle&&target.classList.contains("hidden"))toggle.click();if(id==="confirmed-toggle")target.click();if(id==="deleted-toggle"&&$("deleted-panel").classList.contains("hidden"))target.click();/* the link only opens the bin: a second tap closed it and left a blank page */document.querySelectorAll(".admin-sidebar nav a").forEach(item=>item.classList.toggle("active",item===link));requestAnimationFrame(()=>target.scrollIntoView({behavior:"smooth",block:"start"}))});
}
// Sidebar groups with a submenu (Orders & Payments) open and close from their own row.
document.querySelectorAll(".admin-sidebar a+.admin-sidebar-subnav").forEach(sub=>{const link=sub.previousElementSibling,key="gh-admin-subnav:"+link.textContent.trim();let open=true;try{open=localStorage.getItem(key)!=="closed"}catch{}link.setAttribute("aria-expanded",String(open));link.addEventListener("click",()=>{const next=link.getAttribute("aria-expanded")!=="true";link.setAttribute("aria-expanded",String(next));try{localStorage.setItem(key,next?"open":"closed")}catch{}})});
initAdminNavigation();
checkSession();

async function makeAppIcon(file){
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error("Choose a JPG, PNG or WebP logo under 5 MB.");
 const bitmap=await createImageBitmap(file);
 try{const canvas=document.createElement("canvas");canvas.width=canvas.height=512;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,512,512);const scale=Math.min(512/bitmap.width,512/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(512-w)/2,(512-h)/2,w,h);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw new Error("Could not prepare app logo.");return new File([blob],"gearhub-app-icon.png",{type:"image/png"})}finally{bitmap.close()}
}

let selectedCoverKey="",coverObjectUrls=[];
function getProductImageUrls(form){
 return [...String(form.elements.namedItem("imageUrls").value||"").split(/\r?\n/),...String(form.elements.namedItem("driveLinks").value||"").split(/\r?\n/)].map(value=>value.trim()).filter(Boolean);
}
function isDriveUrl(value){try{return new URL(value).hostname==="drive.google.com"}catch{return false}}
async function importDriveUrls(urls){
 const links=urls.filter(isDriveUrl);if(!links.length)return urls;
 const result=await api("/api/admin/import-drive-images",{method:"POST",body:JSON.stringify({links})});
 let index=0;return urls.map(url=>isDriveUrl(url)?result.imageUrls[index++]:url);
}
function renderProductCoverOptions(){
 const form=$("product-form"),root=$("product-cover-options");if(!root)return;
 coverObjectUrls.forEach(url=>URL.revokeObjectURL(url));coverObjectUrls=[];
 const files=[...form.elements.namedItem("images").files];
 const items=files.map((file,index)=>{const url=URL.createObjectURL(file);coverObjectUrls.push(url);return {key:"file:"+index+":"+file.name,url,label:file.name}});
 getProductImageUrls(form).forEach(url=>items.push({key:"url:"+url,url:isDriveUrl(url)?"":url,label:isDriveUrl(url)?"Google Drive photo":url.split("/").pop()}));
 root.textContent="";
 items.forEach((item,index)=>{
  const label=document.createElement("label");label.className="product-cover-option";
  const radio=document.createElement("input");radio.type="radio";radio.name="coverIndex";radio.value=String(index);radio.checked=selectedCoverKey===item.key;
  radio.addEventListener("change",()=>{selectedCoverKey=item.key});
  const img=document.createElement("img");img.alt="Photo "+(index+1);if(item.url)img.src=item.url;else img.hidden=true;
  const caption=document.createElement("span");caption.textContent="Photo "+(index+1)+(item.url?"":" · Drive");
  label.append(radio,img,caption);root.append(label);
 });
 if(!items.length)root.textContent="Add photos above to choose a cover.";
}
$("product-form").addEventListener("input",event=>{if(["imageUrls","driveLinks"].includes(event.target.name))renderProductCoverOptions()});
$("product-form").addEventListener("change",event=>{if(event.target.name==="images")renderProductCoverOptions()});
$("import-drive-photos").addEventListener("click",async()=>{
 const button=$("import-drive-photos"),form=$("product-form");button.disabled=true;
 try{
  const urls=getProductImageUrls(form);if(urls.length+form.elements.namedItem("images").files.length>MAX_PRODUCT_PHOTOS)throw new Error(tooManyPhotos());
  if(!urls.some(isDriveUrl))throw new Error("Paste a Google Drive file link first.");
  const imported=await importDriveUrls(urls),selected=Number(form.querySelector('input[name="coverIndex"]:checked')?.value);
  form.elements.namedItem("imageUrls").value=imported.join("\n");form.elements.namedItem("driveLinks").value="";
  const urlIndex=selected-form.elements.namedItem("images").files.length;
  if(selectedCoverKey.startsWith("url:")&&imported[urlIndex])selectedCoverKey="url:"+imported[urlIndex];
  renderProductCoverOptions();msg("product-message","Drive photos imported. Choose a cover and save the product.","success");
 }catch(error){msg("product-message",error.message,"error")}finally{button.disabled=false}
});
renderProductCoverOptions();

$("inventory-add-product")?.addEventListener("click",()=>{resetProductEditor();setProductFormOpen(true);$("product-form-content")?.scrollIntoView({behavior:"smooth",block:"start"});});

document.querySelectorAll("[data-product-description]").forEach(button=>button.addEventListener("click",()=>{const lang=button.dataset.productDescription;document.querySelectorAll("[data-product-description]").forEach(b=>b.setAttribute("aria-selected",String(b===button)));$("product-description-en").classList.toggle("hidden",lang!=="en");$("product-description-my").classList.toggle("hidden",lang!=="my");}));
$("product-editor-back").addEventListener("click",()=>{setProductFormOpen(false);$("inventory-panel").scrollIntoView({behavior:"smooth",block:"start"});});
$("product-save-draft").addEventListener("click",()=>{try{const form=$("product-form"),fields={};for(const el of form.elements){if(el.name&&el.type!=="file")fields[el.name]=el.value;}localStorage.setItem((window.GearHubTenantAdmin?"gh-product-draft:"+location.pathname:"gh-product-draft"),JSON.stringify(fields));$("product-message").textContent="Draft saved on this device. Choose local photo files again after reopening.";toast("Draft saved");}catch(error){toast("Could not save draft on this device");}});
let draft=null;try{draft=localStorage.getItem((window.GearHubTenantAdmin?"gh-product-draft:"+location.pathname:"gh-product-draft"))}catch(error){}if(draft){try{const fields=JSON.parse(draft);for(const [name,value] of Object.entries(fields)){const el=$("product-form").elements.namedItem(name);if(el&&el.type!=="file")el.value=value;}renderProductCoverOptions();}catch(error){}}

function refreshAppearanceColors(){document.querySelectorAll("[data-color-value]").forEach(output=>{const input=$(output.dataset.colorValue);if(input)output.textContent=input.value.toUpperCase();});}
$("site-settings-form").addEventListener("input",event=>{if(event.target.type==="color")refreshAppearanceColors();});
$("appearance-back").addEventListener("click",()=>{const section=$("site-settings-content");section.classList.add("hidden");const toggle=document.querySelector('[data-content-id="site-settings-content"]');toggle.setAttribute("aria-expanded","false");$("site-settings-icon").textContent="＋";toggle.scrollIntoView({behavior:"smooth",block:"center"});});
$("appearance-bottom-save").addEventListener("click",()=>{if(!$("site-settings-save").disabled)$("site-settings-form").requestSubmit($("site-settings-save"));});

async function refreshOperations(){
 if(window.GearHubTenantAdmin)return;
 try{const state=await api("/api/admin/operations");const node=$("operations-status");node.textContent=(state.running?"Backup running. ":"")+"Last successful backup: "+(state.last_success||"None yet")+". Off-site backup: "+(state.offsiteConfigured?(state.last_offsite_success||"Configured, awaiting first upload"):"Not configured")+(state.offsiteDestinations?.length?". Off-site destination: "+state.offsiteDestinations.join(" + "):state.emailBackupEnabled?". Off-site destination: recovery Gmail":"")+(state.retainedLocalCopies?". Copies kept on server: "+state.retainedLocalCopies:"")+(state.notifications?.enabled?". Email alerts: "+(state.notifications.lastSent||"Awaiting delivery")+(state.notifications.hasFailure?" (delivery failure)":""):"")+(state.last_failure?". Last backup failed: "+state.last_failure:"");if(state.lastAttempt&&!state.lastAttempt.ok)node.textContent+=". Failed stage: "+state.lastAttempt.stage+". Reason code: "+state.lastAttempt.code+". Complete local archive: "+(state.lastAttempt.localArchiveComplete?"Yes ("+state.lastAttempt.archiveBytes+" bytes)":"Not confirmed")+". Diagnostics cover this server process only.";node.classList.toggle("error",Boolean(state.last_failure)||!state.offsiteConfigured);}catch(error){$("operations-status").textContent=error.message;}
}
$("backup-run").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;try{await api("/api/admin/backup/run",{method:"POST",body:"{}"});toast("Backup completed");}catch(error){toast(error.message);}finally{button.disabled=false;refreshOperations();}});


// Each main category owns its banner. The image stays in the category draft
// until the seller chooses Save Categories.
$("category-manager-rows").addEventListener("change",async event=>{
 const input=event.target;if(!input.dataset.categoryBannerUpload||categorySaving)return;
 const category=categoryRows.find(row=>row._key===input.dataset.categoryBannerUpload),file=input.files?.[0];if(!category||!file)return;
 input.disabled=true;msg("category-manager-message","Uploading main category banner…","");
 try{const fitted=await fitToFrame(file,CATEGORY_BANNER_FRAME);if(!fitted){input.disabled=false;input.value="";msg("category-manager-message","","");return}const optimized=await optimizeImage(fitted),form=new FormData();form.append("images",optimized,optimized.name||file.name);const response=await adminFetch("/api/admin/uploads",{method:"POST",body:form,credentials:"same-origin"}),data=await response.json().catch(()=>({}));if(!response.ok||!data.imageUrls?.[0])throw new Error(data.error||"Banner upload failed.");category.bannerUrl=data.imageUrls[0];msg("category-manager-message","Banner uploaded. Save Categories to publish it.","success");renderCategoryManager();}
 catch(error){msg("category-manager-message",error.message||"Banner upload failed.","error");input.disabled=false;}
});

// Desktop administration shows one work area at a time. The sidebar opens the
// requested area, so its cards do not repeat below the product inventory.
const desktopAdminTargets={
  "inventory-panel":["#inventory-panel"],
  dashboard:["#inventory-panel"],
  "orders-content":["#dashboard>.admin-grid>div:first-child"],
  "confirmed-panel":["#confirmed-panel"],
  "confirmed-toggle":["#confirmed-panel"],
  "deleted-toggle":["#deleted-panel"],
  "low-stock-content":["#dashboard>.admin-grid>div:nth-child(2)>div:first-child"],
  "product-form-content":["#product-form-panel"],
  "product-form-panel":["#product-form-panel"],
  "category-manager-content":[".category-manager-panel"],
  "site-settings-content":[".site-settings-panel","#dashboard>section[aria-labelledby='operations-heading']"]
};
const desktopAdminRoots=["#inventory-panel","#dashboard>.admin-grid>div:first-child","#dashboard>.admin-grid>div:nth-child(2)>div:first-child","#product-form-panel",".category-manager-panel",".site-settings-panel","#confirmed-panel","#deleted-panel","#dashboard>section[aria-labelledby='operations-heading']","#dashboard>.order-list-controls"];
function setDesktopAdminView(targetId){
  if(!window.matchMedia("(min-width:1100px)").matches)return;
  const visible=new Set((desktopAdminTargets[targetId]||desktopAdminTargets["inventory-panel"]).flatMap(selector=>[...document.querySelectorAll(selector)]));
  desktopAdminRoots.forEach(selector=>document.querySelectorAll(selector).forEach(node=>node.classList.toggle("desktop-admin-view-hidden",!visible.has(node))));
  const activeTarget=targetId;
  document.querySelectorAll(".admin-sidebar a[href^='#']").forEach(link=>link.classList.toggle("active",link.getAttribute("href")==="#"+activeTarget));
}
document.addEventListener("click",event=>{
  if(!window.matchMedia("(min-width:1100px)").matches)return;
  const sidebarLink=event.target.closest(".admin-sidebar a[href^='#']");
  if(sidebarLink){const targetId=sidebarLink.getAttribute("href").slice(1);setDesktopAdminView(targetId);if(targetId==="confirmed-panel"&&$("confirmed-panel")?.classList.contains("hidden"))$("confirmed-toggle").click();return;}
  if(event.target.closest(".inventory-edit-product")){setDesktopAdminView("product-form-panel");}
  if(event.target.closest("#inventory-add-product")){setDesktopAdminView("product-form-panel");}
},true);
window.addEventListener("resize",()=>{
  if(window.matchMedia("(min-width:1100px)").matches)setDesktopAdminView("inventory-panel");
  else document.querySelectorAll(".desktop-admin-view-hidden").forEach(node=>node.classList.remove("desktop-admin-view-hidden"));
});
