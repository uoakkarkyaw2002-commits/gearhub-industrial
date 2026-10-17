(() => {
  const $ = (id) => document.getElementById(id);
  let csrf = "",
    me;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dateLabel=v=>v?new Date(v).toLocaleString('en-GB',{timeZone:'Asia/Yangon'})+' (Myanmar UTC+06:30)':'Not set';
  const field = (name, label, value = "", type = "text") =>
    `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
  const select = (name, label, values, current) =>
    `<label>${label}<select name="${name}">${values.map((v) => `<option ${v === current ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
  const storage = window.GearHubStorage;
  const storageFields = (bytes, optional=false) => {
    const v=storage.display(bytes);
    return `<label>${optional?'Storage override (blank = plan)':'Storage limit'}<input name="storageAmount" type="number" min="0" step="any" value="${v.amount}" ${optional?'':'required'}></label>${select('storageUnit','Unit',['MB','GB'],v.unit)}<p class="muted">1 MB = 1,048,576 bytes; 1 GB = 1,024 MB. Lowering a limit does not delete data.</p>`;
  };
  const msg = (t) => ($("message").textContent = t);
  let pendingWrites=0;
  async function api(url, method = "GET", body) {
    const headers = { "X-CSRF-Token": csrf };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const writes=method!=="GET";
    if(writes)window.__gearhubPlatformPending=++pendingWrites>0;
    try {
      const r = await fetch("/api/platform" + url, { method, headers, body });
      const v = await r.json();
      if (!r.ok) throw Error(v.error || "Request failed");
      return v;
    } finally {if(writes)window.__gearhubPlatformPending=--pendingWrites>0;}

  }
  function form(id, fn) {
    document.getElementById(id)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.submitter;
      b.disabled = true;
      b.dataset.busy = "true";
      try {
        const data=Object.fromEntries(new FormData(e.target));
        if(b.name)data[b.name]=b.value;
        await fn(data, e.target);
        msg("သိမ်းပြီးပါပြီ / Saved");
        await load();
      } catch (err) {
        msg(err.message);
      } finally {
        b.disabled = false;
        delete b.dataset.busy;
      }
    });
  }
  async function load() {
    me = await api("/me");
    csrf = me.csrfToken;
    document.body.classList.toggle("onboarding",!me.isOwner);
    $("logout").hidden = !me.user;
    $("account").hidden=!!me.user&&!me.isOwner;
    $("owner").innerHTML = "";
    $("shop").innerHTML = "";
    $("application").innerHTML = "";
    $("account").innerHTML = me.user
      ? `<p>${esc(me.user.name)} · ${esc(me.user.email)}</p>`
      : window.GearHubApplication.login(me.oauthReady);
    $("google-login")?.addEventListener("click", async () => {
      try {
        location.href = (await api("/auth/start", "POST", {})).url;
      } catch (e) {
        msg(e.message);
      }
    });
    if (!me.user) return;
    if (!me.shop && !me.isOwner) {
      $("application").innerHTML = window.GearHubApplication.render(me);
      $("application-message")?.addEventListener("input",e=>$("application-counter").textContent=e.target.value.length+" / 500");
      form("apply", (d) => api("/applications", "POST", d));
    } else if (me.shop) {
      if(me.isOwner)await shop(me.shop.id);
      else $("application").innerHTML=window.GearHubApplication.render(me);
    }
    $("check-approval")?.addEventListener("click",()=>load().catch(e=>msg(e.message)));
    if (me.isOwner) await owner();
    window.GearHubUpdates?.restore();
    if($("application-message"))$("application-counter").textContent=$("application-message").value.length+" / 500";
  }
  async function shop(id) {
    const s = await api("/shops/" + id),
      b = s.settings,
      l = s.limits;
    const images = s.files.filter((f) => f.kind === "image" && f.ready);
    const imageSelect = (current) =>
      `<label>Image/logo<select name="imageId"><option value="">No image</option>${images.map((f) => `<option value="${esc(f.id)}" ${f.id === current ? "selected" : ""}>${esc(f.id.slice(0, 8))} · ${f.bytes} bytes</option>`).join("")}</select></label>`;
    $("shop").innerHTML =
      `<h2>${esc(s.name)}</h2><a href="/shops/${esc(s.slug)}" target="_blank" rel="noopener">Open shop / ဆိုင်ကြည့်ရန် ↗</a><p>${esc(l.plan)} · ${esc(l.subscriptionState)} · ${esc(s.status)}</p><p>Storage ${storage.label(l.usedBytes)} / ${storage.label(l.storageLimit)}. Product/logo/receipt files count. Data is never deleted automatically.</p><p class="muted">Write permissions: ${esc(JSON.stringify(l.permissions))}. Starts: ${esc(dateLabel(s.starts_at))}. End: ${esc(s.ends_at?dateLabel(s.ends_at):"No expiry")}</p><a href="/shops/${esc(s.slug)}/admin">ဆိုင်စီမံရန် / Manage shop</a><form id="shop-settings"><h3>Shop information</h3>${field("name", "Name", s.name)}${["description", "phone", "email", "address", "bankName", "bankAccountName", "bankAccountNumber", "paymentInstructions"].map((k) => field(k, k, b[k])).join("")}${imageSelect(b.logoId)}<button>Save shop</button></form><form id="upload-image"><h3>Upload product/logo image</h3><label>JPG/PNG/WebP ≤5 MB<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required></label><button>Upload</button></form><div>${images.map((f) => `<span>${esc(f.id.slice(0, 8))} <button data-delete-file="${esc(f.id)}">Remove unused image</button></span>`).join("")}</div><form id="product-new"><h3>Add product / ပစ္စည်းတင်ရန်</h3>${productFields({})}${imageSelect("")}<button>Add product</button></form><h3>Products</h3>${s.products.length?"":"<p>ပထမပစ္စည်းကို အပေါ်က form မှ တင်ပါ။ / Add your first product above.</p>"}<div>${s.products.map((p) => `<form id="p-${p.id}">${productFields(p)}${imageSelect(p.image_id)}<button>Save product</button></form>`).join("")}</div><h3>Orders / အော်ဒါများ</h3>${s.orders.map((o) => `<article><strong>${esc(o.code)}</strong><p>${esc(o.customer)} · ${esc(o.phone)} · ${esc(o.address)}</p><p>${o.total} Ks · ${esc(o.invoice || "")}</p><p>${esc(o.items.map((i) => i.name + " × " + i.quantity).join(", "))}</p><a href="/api/platform/shops/${id}/receipts/${esc(o.receipt_id)}" target="_blank" rel="noopener">Private receipt</a><form id="o-${o.id}">${select("status", "Order status", ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"], o.status)}${select("paymentStatus", "Manually verified payment", ["pending", "paid", "rejected"], o.payment_status)}<button>Save order</button></form></article>`).join("")}`;
    function productFields(p) {
      return (
        field("name", "Product name", p.name) +
        field("sku", "SKU", p.sku) +
        field("category", "Category", p.category) +
        field("description", "Description", p.description) +
        field("price", "Price (Ks)", p.price ?? 0, "number") +
        field("stock", "Stock", p.stock ?? 0, "number") +
        `<label><input name="active" type="checkbox" ${p.active !== 0 ? "checked" : ""}> Active</label>`
      );
    }
    function payload(d) {
      return {
        ...d,
        price: Number(d.price),
        stock: Number(d.stock),
        active: d.active === "on",
      };
    }
    form("shop-settings", (d) => {
      d.logoId = d.imageId;
      delete d.imageId;
      return api("/shops/" + id, "PATCH", d);
    });
    form("upload-image", (_d, f) =>
      api("/shops/" + id + "/files", "POST", new FormData(f)),
    );
    form("product-new", (d) =>
      api("/shops/" + id + "/products", "POST", payload(d)),
    );
    for (const p of s.products)
      form("p-" + p.id, (d) =>
        api("/shops/" + id + "/products/" + p.id, "PATCH", {
          ...payload(d),
          expectedStock: p.stock,
        }),
      );
    for (const o of s.orders)
      form("o-" + o.id, (d) =>
        api("/shops/" + id + "/orders/" + o.id, "PATCH", d),
      );
    document.querySelectorAll("[data-delete-file]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await api(
              "/shops/" + id + "/files/" + b.dataset.deleteFile,
              "DELETE",
            );
            await load();
          } catch (e) {
            msg(e.message);
          }
        }),
    );
  }
  async function owner() {
    const v = await api("/owner");
    const sellerShops=v.shops.filter(s=>!s.legacy);
    const pending=v.applications.filter(a=>a.status==='pending').length;
    const active=sellerShops.filter(s=>s.status==='active'&&!['expired','inactive'].includes(s.subscription_status)).length;
    const expired=sellerShops.filter(s=>['expired','inactive'].includes(s.subscription_status)).length;
    const ownerFor=(shop)=>v.users.find(u=>u.id===shop.owner_id)||{};
    const state=(shop)=>['expired','inactive'].includes(shop.subscription_status)?'Expired':shop.status==='suspended'?'Suspended':'Active';
    const dateOnly=(value)=>value?new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Yangon'}):'—';
    const row=(s)=>{const u=ownerFor(s), used=s.limits.usedBytes, limit=s.limits.storageLimit, percent=Math.min(100,Math.round(used/Math.max(limit,1)*100));return `<tr data-shop-row="${s.id}" data-state="${state(s).toLowerCase()}"><td><strong>${esc(s.name)}</strong><small>#SHP${String(s.id).padStart(4,'0')} · /shops/${esc(s.slug)}</small></td><td>${esc(u.name||'—')}<small>${esc(u.email||'')}</small></td><td><span class="plan-badge">${esc(v.plans.find(p=>p.id===s.plan_id)?.name||'Basic')}</span></td><td><strong>${storage.label(used)} / ${storage.label(limit)}</strong><i class="quota"><b style="width:${percent}%"></b></i></td><td>${dateOnly(s.ends_at)}</td><td><span class="shop-state ${state(s).toLowerCase()}">${state(s)}</span></td><td class="shop-actions"><button type="button" data-view-shop="${esc(s.slug)}">View</button><button type="button" data-manage-shop="${s.id}">Manage</button></td></tr>`};
    $("owner").innerHTML=`<section class="seller-manager" aria-label="Manage Seller Shops">
      <div class="seller-manager-head"><a href="/platform.html" class="manager-back" aria-label="Back">←</a><div class="manager-title"><span>🏪</span><div><h2>Manage Seller Shops</h2><p>View, approve sellers and manage their subscriptions.</p></div></div><button type="button" id="new-shop" class="manager-new">＋ New Shop</button></div>
      <div class="shop-tabs"><button class="selected" data-shop-filter="all">All Shops (${sellerShops.length})</button><button data-shop-filter="pending">Pending Approval (${pending})</button><button data-shop-filter="active">Active (${active})</button><button data-shop-filter="expired">Expired (${expired})</button><button data-shop-filter="rejected">Rejected (${v.applications.filter(a=>a.status==='rejected').length})</button></div>
      <div class="shop-toolbar"><label class="shop-search">⌕<input id="shop-search" placeholder="Search shop name, owner, email…"></label><select id="shop-status-filter"><option value="all">All Status</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option></select><select id="shop-plan-filter"><option value="all">All Plans</option>${v.plans.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="shop-table-wrap"><table class="shop-table"><thead><tr><th>Shop</th><th>Owner</th><th>Plan</th><th>Storage</th><th>Expiry date</th><th>Status</th><th>Action</th></tr></thead><tbody>${sellerShops.map(row).join('')||'<tr><td colspan="7" class="empty-shops">No seller shops yet. Approve an application to create one.</td></tr>'}</tbody></table></div>
      <div class="seller-panels"><article><span>🗓️</span><div><h3>Service Expiry Management</h3><p>View and extend seller shops service plans.</p><button type="button" data-open-panel="expiry">Manage Expiry <b>›</b></button></div></article><article><span>🗄️</span><div><h3>Storage Management</h3><p>View and extend storage for seller shops.</p><button type="button" data-open-panel="storage">Manage Storage <b>›</b></button></div></article></div>
      <div id="shop-management-panel" class="shop-management-panel" hidden></div>
      <section class="application-queue"><h3>Pending approval</h3>${v.applications.filter(a=>a.status==='pending').map(a=>`<form id="a-${a.id}" class="application-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.email)} · /shops/${esc(a.slug)}</small>${a.reason?`<small>${esc(a.reason)}</small>`:''}</div><button name="status" value="approved">✓ Approve</button><button name="status" value="rejected" class="reject">× Reject</button></form>`).join('')||'<p class="muted">No pending seller application.</p>'}</section>
    </section>`;
    document.querySelectorAll('[data-extend-shop]').forEach(button=>button.onclick=async()=>{button.disabled=true;button.dataset.busy='true';try{await api('/owner/shops/'+button.dataset.extendShop+'/extend','POST',{months:2});msg('Extended without charging. သက်တမ်းတိုးပြီးပါပြီ။');await load();}catch(e){msg(e.message);}finally{button.disabled=false;delete button.dataset.busy;}});
    document.querySelectorAll('[data-delete-shop]').forEach(button=>button.onclick=async()=>{const slug=button.dataset.deleteSlug;if(prompt('Type the exact shop URL to permanently delete this shop:', '')!==slug)return;button.disabled=true;button.dataset.busy='true';try{await api('/owner/shops/'+button.dataset.deleteShop,'DELETE',{confirmDelete:slug});msg('Shop deleted. / ဆိုင်ဖျက်ပြီးပါပြီ။');await load();}catch(e){msg(e.message);}finally{button.disabled=false;delete button.dataset.busy;}});
    const panel=$("shop-management-panel");
    const showManager=(shopId, focus='all')=>{
      const s=v.shops.find(x=>x.id===Number(shopId)); if(!s||s.legacy)return;
      const u=ownerFor(s), planOptions=v.plans.map(p=>`<option value="${p.id}" ${p.id===s.plan_id?'selected':''}>${esc(p.name)}</option>`).join('');
      panel.hidden=false;
      panel.innerHTML=`<div class="manage-dialog" role="dialog" aria-modal="true" aria-label="Manage ${esc(s.name)}"><button type="button" class="dialog-close" aria-label="Close">×</button><div class="manage-shop-summary"><span>🏪</span><div><h3>${esc(s.name)}</h3><p>${esc(u.name||'')} · ${esc(u.email||'')}</p><small>/shops/${esc(s.slug)}</small></div></div><form id="manage-shop-${s.id}"><div class="manage-fields"><label>Shop status<select name="status"><option ${s.status==='active'?'selected':''}>active</option><option ${s.status==='suspended'?'selected':''}>suspended</option></select></label><label>Subscription<select name="subscriptionStatus">${['trial','active','sponsored','inactive','expired'].map(x=>`<option ${x===s.subscription_status?'selected':''}>${x}</option>`).join('')}</select></label><label>Plan<select name="planId">${planOptions}</select></label><label>Storage override (blank = plan)<input name="storageAmount" type="number" min="0" step="any" value="${esc(storage.display(s.storage_override).amount)}"></label><label>Unit<select name="storageUnit"><option ${storage.display(s.storage_override).unit==='MB'?'selected':''}>MB</option><option ${storage.display(s.storage_override).unit==='GB'?'selected':''}>GB</option></select></label><label>Start date<input name="startsAt" type="date" value="${s.starts_at?new Date(s.starts_at).toISOString().slice(0,10):''}"></label><label>Expiry date<input name="endsAt" type="date" value="${s.ends_at?new Date(s.ends_at).toISOString().slice(0,10):''}"></label></div><div class="manage-dialog-actions"><button>Save changes</button><button type="button" data-modal-extend="${s.id}">Extend 2 months</button><button type="button" class="danger" data-modal-delete="${s.id}" data-modal-slug="${esc(s.slug)}">Delete shop</button></div></form></div>`;
      panel.querySelector('.dialog-close').onclick=()=>panel.hidden=true;
      form('manage-shop-'+s.id,(d)=>api('/owner/shops/'+s.id,'PATCH',{...d,planId:Number(d.planId),storageBytes:storage.bytes(d.storageAmount,d.storageUnit,true),startsAt:d.startsAt||null,endsAt:d.endsAt||null}));
      panel.querySelector('[data-modal-extend]').onclick=async()=>{try{await api('/owner/shops/'+s.id+'/extend','POST',{months:2});msg('သက်တမ်းတိုးပြီးပါပြီ / Service extended');await load();}catch(e){msg(e.message)}};
      panel.querySelector('[data-modal-delete]').onclick=async()=>{if(prompt('Type the exact shop URL to permanently delete this shop:','')!==s.slug)return;try{await api('/owner/shops/'+s.id,'DELETE',{confirmDelete:s.slug});msg('ဆိုင်ဖျက်ပြီးပါပြီ / Shop deleted');await load();}catch(e){msg(e.message)}};
      panel.scrollIntoView({behavior:'smooth',block:'center'});
    };
    document.querySelectorAll('[data-manage-shop]').forEach(b=>b.onclick=()=>showManager(b.dataset.manageShop));
    document.querySelectorAll('[data-view-shop]').forEach(b=>b.onclick=()=>window.open('/shops/'+encodeURIComponent(b.dataset.viewShop),'_blank','noopener'));
    document.querySelectorAll('[data-open-panel]').forEach(b=>b.onclick=()=>{const first=v.shops.find(s=>!s.legacy);if(first)showManager(first,b.dataset.openPanel);else msg('Manage a seller after approving an application.');});
    $('new-shop').onclick=()=>{const queue=document.querySelector('.application-queue');queue?.scrollIntoView({behavior:'smooth',block:'center'});msg('New shops start as an application. Approve a pending application below.');};
    const filterRows=()=>{const q=$('shop-search').value.trim().toLowerCase(),state=$('shop-status-filter').value,plan=$('shop-plan-filter').value;document.querySelectorAll('[data-shop-row]').forEach(row=>{const matches=!q||row.textContent.toLowerCase().includes(q);const stateOk=state==='all'||row.dataset.state===state;const planOk=plan==='all'||row.children[2].textContent.trim()===plan;row.hidden=!(matches&&stateOk&&planOk);});};
    $('shop-search').oninput=filterRows;$('shop-status-filter').onchange=filterRows;$('shop-plan-filter').onchange=filterRows;
    document.querySelectorAll('[data-shop-filter]').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('[data-shop-filter]').forEach(x=>x.classList.remove('selected'));tab.classList.add('selected');const wanted=tab.dataset.shopFilter;if(wanted==='all'){$('shop-status-filter').value='all';filterRows();return}if(wanted==='pending'){document.querySelector('.application-queue')?.scrollIntoView({behavior:'smooth'});return}$('shop-status-filter').value=wanted;filterRows();});
    for (const a of v.applications)
      form("a-" + a.id, (d) => api("/owner/applications/" + a.id, "PATCH", d));
    for (const u of v.users)
      form("u-" + u.id, (d) => api("/owner/users/" + u.id, "PATCH", d));
    for (const s of v.shops.filter((s) => !s.legacy))
      form("s-" + s.id, (d) =>
        api("/owner/shops/" + s.id, "PATCH", {
          ...d,
          planId: Number(d.planId),
          storageBytes: storage.bytes(d.storageAmount,d.storageUnit,true),
        }),
      );
    for (const p of [...v.plans, { id: "new" }])
      form("plan-" + p.id, (d) =>
        api(
          "/owner/plans" + (p.id === "new" ? "" : "/" + p.id),
          p.id === "new" ? "POST" : "PATCH",
          {
            name: d.name,
            storageBytes: storage.bytes(d.storageAmount,d.storageUnit),
            productLimit: Number(d.productLimit),
            permissions: Object.fromEntries(
              ["products", "orders", "uploads", "selling"].map((k) => [
                k,
                d[k] === "on",
              ]),
            ),
          },
        ),
      );
    form("release", (d) => api("/owner/release", "POST", d));
  }
  $("logout").onclick = async () => {
    await api("/logout", "POST", {});
    location.reload();
  };
  setInterval(async()=>{if(document.hidden||!me?.application||me.application.status!=="pending"||me.shop||pendingWrites)return;try{const state=await api("/me");if(state.shop||state.application?.status!==me.application.status){window.GearHubUpdates?.saveDraft?.();await load();}}catch{}},15000);
  load().catch((e) => msg(e.message));
  window.platformRefresh = load;
})();
