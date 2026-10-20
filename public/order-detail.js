/* Orders are shown first as compact invoice cards; selecting one opens its full detail. */
(function(){
 const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
 const money=value=>new Intl.NumberFormat("en-US").format(Number(value)||0)+" Ks";
 const stamp=value=>{if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?esc(value):date.toLocaleString("en-GB",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})};
 const label=value=>({pending:"Pending",confirmed:"Confirmed",processing:"Processing",shipped:"Shipped",completed:"Completed",cancelled:"Cancelled",paid:"Paid",rejected:"Rejected"})[value]||String(value||"—");
 const receiptFor=order=>window.GearHubTenantAdmin?.receipt(order)||"/api/admin/orders/"+encodeURIComponent(order.id)+"/receipt";
 const request=(url,options={})=>typeof window.adminFetch==="function"?window.adminFetch(url,options):fetch(url,{...options,credentials:"same-origin"});
 const statusOptions=(values,current)=>values.map(value=>'<option value="'+value+'" '+(value===current?"selected":"")+">"+label(value)+"</option>").join("");
 const photo=item=>{const urls=Array.isArray(item.imageUrls)?item.imageUrls:[];const src=urls.find(value=>typeof value==="string"&&value.trim());return src?'<img src="'+esc(src)+'" alt="" loading="lazy">':'<span aria-hidden="true">'+esc(item.imageEmoji||"⚙️")+"</span>"};
 const calendar='<svg class="order-invoice-calendar" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
 const icon={receipt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z" fill="currentColor"/><path d="M9 8h6M9 12h6M9 16h4" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l3 3v15H4V3z" fill="currentColor"/><path d="M8 3v6h8V3M8 15h8v5H8z" fill="none" stroke="#fff" stroke-width="1.7"/></svg>',edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 17 1 3 3-1L19 8l-4-4zM14 5l4 4" fill="currentColor"/></svg>',delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8l-1 13H9L8 7Zm-2-3h12m-8 0V2h4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'};
 const count=order=>(order.items||[]).reduce((total,item)=>total+(Number(item.quantity)||0),0);
 function listCard(order){
  const headline="Invoice No",number=order.invoice_no||order.order_code;
  return '<button type="button" class="order-invoice-card status-'+esc(order.status)+'" data-order-open="'+Number(order.id)+'">'
   +'<span class="order-invoice-photos">'+(order.items||[]).slice(0,3).map(item=>'<i>'+photo(item)+"</i>").join("")+"</span>"
   +'<span class="order-invoice-meta"><small>'+headline+'</small><strong>'+esc(number)+'</strong><small>▣ &nbsp;'+stamp(order.created_at)+"</small></span>"
   +'<i class="order-invoice-rule" aria-hidden="true"></i><span class="order-invoice-total"><small>Total amount</small><strong>'+money(order.total)+'</strong><em>'+esc(label(order.status))+" · "+esc(label(order.payment_status))+"</em></span></button>";
 }
 // ---- Order detail, laid out like the owner's design: customer + facts side by side,
 // item cards with photo / Part No / SKU / Brand / Qty / Unit price / Amount, actions, payment.
 const svg=(body,cls="")=>'<svg class="od-icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';
 const odIcon={
  person:svg('<circle cx="12" cy="7.5" r="4.5" fill="currentColor"/><path d="M3.5 21c.6-4.6 4-7.5 8.5-7.5s7.9 2.9 8.5 7.5z" fill="currentColor"/>'),
  phone:svg('<path d="M6.6 2.8 9.4 2c.6-.2 1.2.1 1.4.7l1.2 3.4c.2.5 0 1.1-.4 1.4L9.9 8.9a12 12 0 0 0 5.2 5.2l1.4-1.7c.3-.4.9-.6 1.4-.4l3.4 1.2c.6.2.9.8.7 1.4l-.8 2.8c-.2.6-.7 1-1.3 1C10.3 18.3 5.7 13.7 5.6 4.1c0-.6.4-1.1 1-1.3z" fill="currentColor"/>'),
  pin:svg('<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z" fill="currentColor"/>'),
  cart:svg('<path d="M2 3h2.6l2.3 11.2c.1.5.6.8 1.1.8h9.3c.5 0 .9-.3 1-.8L20.6 7H6.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="19.5" r="1.8" fill="currentColor"/><circle cx="17" cy="19.5" r="1.8" fill="currentColor"/>'),
  doc:svg('<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="currentColor"/><path d="M15 2v5h5" fill="var(--od-doc-line,#fff)" fill-opacity=".35"/><path d="M8 11h8M8 14.5h8M8 18h5" stroke="var(--od-doc-line,#fff)" stroke-width="1.8" stroke-linecap="round"/>'),
  save:svg('<path d="M4 3h12.2L20 6.8V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="currentColor"/><path d="M7.5 3.5h8v5h-8zM7 13.5h10V20H7z" fill="#fff"/><path d="M13 4.6h1.6v2.8H13z" fill="currentColor"/>'),
  edit:svg('<path d="M3 17.3V21h3.7l11-11-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z" fill="currentColor"/>'),
  trash:svg('<path d="M9 3h6l1 2h4v2H4V5h4z" fill="currentColor"/><path d="M6 8h12l-1 13H7z" fill="currentColor"/><path d="M10 11v7M14 11v7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
  back:svg('<path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
 };
 const ascii=value=>String(value??"").replace(/[၀-၉]/g,d=>String(d.charCodeAt(0)-0x1040));
 const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],pad=n=>String(n).padStart(2,"0");
 const asDate=value=>{if(!value)return null;const d=new Date(String(value).includes("T")||/Z$/.test(value)?value:String(value).replace(" ","T")+(/\d{2}:\d{2}/.test(value)&&!/[zZ+]/.test(String(value).slice(10))?"Z":""));return Number.isNaN(d.getTime())?null:d};
 const dayTime=value=>{const d=asDate(value);return d?pad(d.getDate())+"-"+months[d.getMonth()]+"-"+d.getFullYear()+"&nbsp;&nbsp;"+pad(d.getHours())+":"+pad(d.getMinutes()):(value?esc(value):"-")};
 const fullStamp=value=>{const d=asDate(value);return d?d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds()):"-"};
 const plainDate=value=>{if(!value)return"-";const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+"-"+months[Number(m[2])-1]+"-"+m[1]:esc(value)};
 const pill=value=>'<span class="od-pill od-'+esc(String(value||"pending").toLowerCase())+'">'+esc(String(value||"pending").toLowerCase())+'</span>';
 const ks=value=>new Intl.NumberFormat("en-US").format(Number(value)||0)+" KS";
 // Product details for the order lines (photo, part no, SKU, brand) come from the store's own
 // products and categories, so GearHub and every seller shop show the same information.
 let catalog={products:new Map(),categories:[]};
 async function loadCatalog(){
  try{const [p,c]=await Promise.all([request("/api/admin/products").then(r=>r.ok?r.json():[]),request("/api/admin/categories").then(r=>r.ok?r.json():[])]);
   catalog={products:new Map((Array.isArray(p)?p:[]).map(x=>[Number(x.id),x])),categories:Array.isArray(c)?c:(c.categories||[])};}catch{}
 }
 function brandOf(categoryName){
  const list=catalog.categories,byName=name=>list.find(c=>String(c.category_en||"").toLowerCase()===String(name||"").toLowerCase());
  let node=byName(categoryName);if(!node)return"-";const chain=[];const seen=new Set();
  while(node&&!seen.has(node.id)){seen.add(node.id);chain.unshift(node);node=node.parent_id?list.find(c=>c.id===node.parent_id):null;}
  return chain.length>1?chain[1].category_en:"-";
 }
 function lineInfo(item){
  const product=catalog.products.get(Number(item.productId))||{};
  const urls=[...(Array.isArray(item.imageUrls)?item.imageUrls:[]),...(Array.isArray(product.imageUrls)?product.imageUrls:[])].filter(v=>typeof v==="string"&&v.trim());
  return {name:item.nameEn||item.name_en||item.name||product.name_en||"Product",partNo:item.partNo||product.part_no||product.partNo||"-",sku:item.sku||product.sku||"-",brand:brandOf(product.category_en||product.category),photo:urls[0]||"",emoji:item.imageEmoji||product.image_emoji||"⚙️"};
 }
 // Phone: every value stays on one line; a long one ends with … and opens when tapped.
 const clip=(html,cls="")=>'<b class="od-clip'+(cls?" "+cls:"")+'" tabindex="0">'+html+'</b>';
 const kv=(label,value)=>'<p><span>'+label+'</span><i>:</i>'+clip(value)+'</p>';
 function itemMarkup(item,index){
  const info=lineInfo(item),quantity=Number(item.quantity)||0,unit=Number(item.unitPrice)||0,total=Number(item.lineTotal)||unit*quantity;
  return '<li class="od-item"><span class="od-photo">'+(info.photo?'<img src="'+esc(info.photo)+'" alt="">':'<span aria-hidden="true">'+esc(info.emoji)+'</span>')+'</span>'
   +'<div class="od-info">'+clip(esc((index+1)+". "+info.name),"od-name")+kv("Part No",esc(info.partNo))+kv("SKU",esc(info.sku))+kv("Brand",esc(info.brand))+'</div>'
   +'<i class="od-rule" aria-hidden="true"></i><div class="od-qty">'+kv("Qty",quantity)+kv("Unit","PC")+'<p class="od-unit-price"><span>Unit Price :</span>'+clip(ks(unit))+'</p></div>'
   +'<div class="od-amount"><small>Amount</small>'+clip(ks(total))+'</div></li>';
 }
 const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
 function detail(order){
  const qty=count(order),items=order.items||[],formId="od-form-"+Number(order.id),receiptHref=order.hasReceipt?' href="'+esc(receiptFor(order))+'" target="_blank" rel="noopener"':' aria-disabled="true"';
  const field=(label,control)=>'<label><span>'+label+'</span>'+control+'</label>';
  return '<section class="order-page od" data-order-id="'+Number(order.id)+'" data-today="'+today()+'">'
   +'<header class="od-head"><button type="button" class="od-back" data-order-back aria-label="Back to orders">'+odIcon.back+'</button><h2>Order Detail</h2><span class="od-code od-clip" tabindex="0">'+esc(order.invoice_no||order.order_code)+'</span>'+pill(order.status)+'</header>'
   // Edit: confirm or cancel the whole order in one place, at the top of the invoice, then Save.
   +'<section class="od-card od-edit" aria-label="Edit order"><div class="od-quick"><button type="button" class="od-quick-confirm" data-od-quick="confirm">✓ Confirm</button><button type="button" class="od-quick-cancel" data-od-quick="cancel">✕ Cancel order</button></div>'
   +'<div class="od-edit-fields">'+field("Order Status",'<select name="status" form="'+formId+'">'+statusOptions(["pending","confirmed","processing","shipped","completed","cancelled"],order.status)+'</select>')+field("Payment",'<select name="paymentStatus" form="'+formId+'">'+statusOptions(["pending","paid","rejected"],order.payment_status)+'</select>')+field("Confirm Date",'<input type="date" name="confirmationDate" form="'+formId+'" value="'+esc(order.confirmation_date||"")+'">')+field("Admin Note",'<input name="adminNote" form="'+formId+'" maxlength="500" value="'+esc(order.admin_note||"")+'" placeholder="Admin note">')+'</div>'
   +'<div class="od-edit-actions"><button type="button" class="od-btn od-edit-close" data-order-edit>Close</button><button type="submit" form="'+formId+'" class="od-btn od-save">'+odIcon.save+'<span>Save</span></button></div><p class="order-page-message" role="status"></p></section>'
   +'<section class="od-card od-customer"><div class="od-person"><p class="od-who">'+odIcon.person+'<strong class="od-clip" tabindex="0">'+esc(order.customer_name||"-")+'</strong></p><p>'+odIcon.phone+'<span class="od-clip" tabindex="0">'+esc(ascii(order.phone)||"-")+'</span></p><p>'+odIcon.pin+'<span class="od-clip" tabindex="0">'+esc(order.address||"-")+'</span></p></div><i class="od-rule" aria-hidden="true"></i>'
   +'<div class="od-facts">'+kv("Order Date",dayTime(order.created_at))+kv("Order Status",pill(order.status))+kv("Payment",pill(order.payment_status))+kv("Confirm Date",plainDate(order.confirmation_date))+kv("Admin Note",esc(order.admin_note||"-"))+'</div></section>'
   +'<section class="od-card od-items"><div class="od-items-head"><h3>Items ('+items.length+')</h3><span class="od-count">'+odIcon.cart+'<b>'+qty+'</b></span></div><ol>'+(items.map(itemMarkup).join("")||'<li class="order-page-empty">No items found.</li>')+'</ol>'
   +'<div class="od-total"><p>Total Items <i>:</i> <b>'+qty+'</b></p><i class="od-rule" aria-hidden="true"></i><div class="od-total-amount"><small>Total Amount</small><b>'+ks(order.total)+'</b></div></div>'
   +'<form class="order-page-form od-form" id="'+formId+'"><div class="od-actions"><a class="od-btn od-received"'+receiptHref+'>'+odIcon.doc+'<span>View Received</span></a><button type="submit" class="od-btn od-save">'+odIcon.save+'<span>Save</span></button><button type="button" class="od-btn od-edit-open" data-order-edit>'+odIcon.edit+'<span>Edit</span></button><button type="button" class="od-btn od-delete order-page-delete" data-order-delete>'+odIcon.trash+'<span>Delete</span></button></div></form></section></section>';
 }
 // Exposed for tests only.
 window.GearHubOrderDetail={detail,setCatalog:c=>{catalog=c}};
 let selected=null,orders=[],loading=false;
 async function render(){
  const host=document.getElementById("orders-table");if(!host||loading)return;loading=true;
  try{const response=await request("/api/admin/orders");if(!response.ok)throw Error();orders=await response.json();if(selected)await loadCatalog();const active=orders.find(order=>Number(order.id)===Number(selected));if(selected&&!active)selected=null;host.innerHTML=selected&&active?detail(active):'<div class="order-invoice-list">'+(orders.length?orders.map(listCard).join(""):'<p class="order-page-empty">No orders yet.</p>')+'</div>'}catch{host.innerHTML='<p class="order-page-empty">Could not load orders.</p>'}finally{loading=false}
 }
 function observe(){const host=document.getElementById("orders-table");if(!host)return;render();host.addEventListener("click",event=>{const open=event.target.closest("[data-order-open]");if(open){selected=Number(open.dataset.orderOpen);render();return}if(event.target.closest("[data-order-back]")){selected=null;render();return}const edit=event.target.closest("[data-order-edit]");if(edit){const page=edit.closest(".order-page");page.classList.toggle("is-editing");if(page.classList.contains("is-editing")){page.querySelector(".od-edit")?.scrollIntoView({behavior:"smooth",block:"start"});}return}const quick=event.target.closest("[data-od-quick]");if(quick){const page=quick.closest(".order-page"),status=page.querySelector('select[name="status"]'),payment=page.querySelector('select[name="paymentStatus"]'),date=page.querySelector('input[name="confirmationDate"]');if(quick.dataset.odQuick==="confirm"){status.value="confirmed";payment.value="paid";if(!date.value)date.value=page.dataset.today||"";}else{status.value="cancelled";}page.querySelectorAll("[data-od-quick]").forEach(b=>b.classList.toggle("is-picked",b===quick));return}const page=event.target.closest(".od"),old=page?.querySelector(".od-pop");if(old&&!event.target.closest(".od-pop")){old.remove();if(old.dataset.for===event.target.closest(".od-clip")?.dataset.popId)return}const clipped=event.target.closest(".od-clip");if(clipped&&page&&clipped.scrollWidth>clipped.clientWidth+1){/* Full text in a small bubble, so the rows never stack. */const id=clipped.dataset.popId||(clipped.dataset.popId=String(Math.random()).slice(2));const pop=document.createElement("div");pop.className="od-pop";pop.dataset.for=id;pop.textContent=clipped.textContent;page.append(pop);const r=clipped.getBoundingClientRect(),base=page.getBoundingClientRect();pop.style.top=(r.bottom-base.top+6)+"px";pop.style.left=Math.max(0,Math.min(r.left-base.left,base.width-pop.offsetWidth))+"px";return}const remove=event.target.closest("[data-order-delete]");if(remove){const message=remove.closest(".order-page").querySelector(".order-page-message");message.textContent="Cancel the order first before deleting it.";remove.closest(".order-page").classList.add("is-editing");}});host.addEventListener("submit",async event=>{const form=event.target.closest(".order-page-form");if(!form)return;event.preventDefault();const card=form.closest("[data-order-id]"),id=Number(card?.dataset.orderId),button=form.querySelector("button[type=submit]"),message=card.querySelector(".order-page-message");if(!id)return;button.disabled=true;message.textContent="";try{const response=await request("/api/admin/orders/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))}),data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Could not save this order.");message.textContent="Saved.";await render();window.refreshAll?.()}catch(error){message.textContent=error.message||"Could not save this order."}finally{button.disabled=false}});new MutationObserver(()=>{if(!loading&&!host.querySelector(".order-invoice-list,.order-page"))queueMicrotask(render)}).observe(host,{childList:true});}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe);else observe();
})();