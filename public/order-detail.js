/* One order card combines customer, products, payment, status and notes. */
(function(){
 const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&quot;","'":"&#39;"}[char]));
 const money=value=>new Intl.NumberFormat("en-US").format(Number(value)||0)+" Ks";
 const stamp=value=>{if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?esc(value):date.toLocaleString("en-GB",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})};
 const statusLabel=value=>({pending:"Pending",confirmed:"Confirmed",processing:"Processing",shipped:"Shipped",completed:"Completed",cancelled:"Cancelled",paid:"Paid",rejected:"Rejected"})[value]||String(value||"—");
 const receiptFor=order=>window.GearHubTenantAdmin?.receipt(order)||"/api/admin/orders/"+encodeURIComponent(order.id)+"/receipt";
 async function request(url,options={}) {
  if(typeof window.adminFetch==="function")return window.adminFetch(url,options);
  return fetch(url,{...options,credentials:"same-origin"});
 }
 function options(values,current){return values.map(value=>'<option value="'+value+'" '+(value===current?"selected":"")+">"+statusLabel(value)+"</option>").join("")}
 function itemMarkup(item,index){
  const quantity=Number(item.quantity)||0,unit=Number(item.unitPrice)||0,total=Number(item.lineTotal)||unit*quantity;
  return '<li class="order-detail-item"><div class="order-detail-item-icon" aria-hidden="true">⚙</div><div class="order-detail-item-copy"><b>'+esc((index+1)+". "+(item.nameEn||item.name_en||"Product"))+'</b><small>SKU: '+esc(item.sku||"—")+'</small><small>Part No: '+esc(item.partNo||item.sku||"—")+'</small></div><div class="order-detail-quantity"><small>Qty</small><b>'+quantity+'</b><small>Unit: '+money(unit)+'</small></div><div class="order-detail-line-total"><small>Amount</small><b>'+money(total)+'</b></div></li>';
 }
 function card(order){
  const receipt=order.hasReceipt?'<a class="order-detail-receipt" href="'+esc(receiptFor(order))+'" target="_blank" rel="noopener">▤ View payment receipt</a>':'<span class="order-detail-no-receipt">No payment receipt uploaded</span>';
  const itemCount=(order.items||[]).reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
  return '<article class="order-detail-card" data-order-detail-id="'+Number(order.id)+'">'
   +'<header class="order-detail-header"><div><small>Order detail</small><h3>'+esc(order.order_code||("Order #"+order.id))+'</h3></div><span class="order-detail-badge status-'+esc(order.status)+'">'+esc(statusLabel(order.status))+'</span></header>'
   +'<section class="order-detail-customer"><div><span aria-hidden="true">●</span><b>'+esc(order.customer_name||"—")+'</b></div><div><span aria-hidden="true">☎</span><a href="tel:'+esc(order.phone||"")+'">'+esc(order.phone||"—")+'</a></div><div><span aria-hidden="true">⌖</span><p>'+esc(order.address||"—")+'</p></div><dl><div><dt>Order date</dt><dd>'+stamp(order.created_at)+'</dd></div><div><dt>Order status</dt><dd><span class="order-detail-inline-badge">'+esc(statusLabel(order.status))+'</span></dd></div><div><dt>Payment</dt><dd><span class="order-detail-inline-badge">'+esc(statusLabel(order.payment_status))+'</span></dd></div><div><dt>Confirm date</dt><dd>'+esc(order.confirmation_date||"—")+'</dd></div></dl></section>'
   +'<section class="order-detail-items"><div class="order-detail-section-title"><h4>Items <span>('+itemCount+')</span></h4><span>🛒 '+itemCount+'</span></div><ol>'+((order.items||[]).map(itemMarkup).join("")||'<li class="order-detail-empty">No items found.</li>')+'</ol><div class="order-detail-total"><span>Total items <b>'+itemCount+'</b></span><strong>Total amount <b>'+money(order.total)+'</b></strong></div></section>'
   +'<section class="order-detail-payment"><h4>Payment information</h4><dl><div><dt>Payment method</dt><dd>'+esc(order.payment_method||"—")+'</dd></div><div><dt>Reference</dt><dd>'+esc(order.payment_reference||"—")+'</dd></div><div><dt>Payment date</dt><dd>'+stamp(order.created_at)+'</dd></div></dl>'+receipt+'</section>'
   +'<form class="order-detail-update"><h4>Order & payment status</h4><label>Order status<select name="status">'+options(["pending","confirmed","processing","shipped","completed","cancelled"],order.status)+'</select></label><label>Payment<select name="paymentStatus">'+options(["pending","paid","rejected"],order.payment_status)+'</select></label><label>Confirm date<input name="confirmationDate" type="date" value="'+esc(order.confirmation_date||"")+'"></label><label class="order-detail-note">Admin note<input name="adminNote" maxlength="500" value="'+esc(order.admin_note||"")+'" placeholder="Admin note"></label><button type="submit" class="primary">Save changes</button><p class="order-detail-message" role="status"></p></form>'
   +'</article>';
 }
 let inFlight=false;
 async function render(){
  const host=document.getElementById("orders-table");if(!host||inFlight||host.querySelector(".order-detail-list"))return;
  inFlight=true;
  try{
   const response=await request("/api/admin/orders");if(!response.ok)return;
   const orders=await response.json();
   host.innerHTML='<div class="order-detail-list">'+(orders.length?orders.map(card).join(""):'<p class="order-detail-empty">No orders yet.</p>')+'</div>';
  }catch{}finally{inFlight=false}
 }
 function observe(){
  const host=document.getElementById("orders-table");if(!host)return;
  new MutationObserver(()=>{if(!host.querySelector(".order-detail-list"))queueMicrotask(render)}).observe(host,{childList:true});
  render();
  host.addEventListener("submit",async event=>{
   const form=event.target.closest(".order-detail-update");if(!form)return;
   event.preventDefault();const card=form.closest("[data-order-detail-id]"),id=Number(card?.dataset.orderDetailId);if(!id)return;
   const button=form.querySelector("button[type=submit]"),message=form.querySelector(".order-detail-message");
   button.disabled=true;message.textContent="";
   try{
    const payload=Object.fromEntries(new FormData(form));
    const response=await request("/api/admin/orders/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Could not save this order.");
    message.textContent="Saved.";await render();
    window.refreshAll?.();
   }catch(error){message.textContent=error.message||"Could not save this order."}finally{button.disabled=false}
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe);else observe();
})();