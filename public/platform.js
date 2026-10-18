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
  // Survives the re-render that follows every save.
  const view = { tab: "all", q: "", status: "all", plan: "all" };
  async function owner() {
    const v = await api("/owner");
    const M = window.GearHubSellerManager;
    const sellerShops = v.shops.filter((s) => !s.legacy);
    const apps = (status) => v.applications.filter((a) => a.status === status);
    const ownerFor = (shop) => v.users.find((u) => u.id === shop.owner_id) || {};
    const planName = (shop) => v.plans.find((p) => p.id === shop.plan_id)?.name || "Basic";
    const states = new Map(sellerShops.map((s) => [s.id, M.state(s)]));
    const count = (...wanted) => sellerShops.filter((s) => wanted.includes(states.get(s.id))).length;
    const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired", suspended: "Suspended", scheduled: "Scheduled" };
    const tabs = [
      ["all", "All Shops", sellerShops.length],
      ["pending", "Pending Approval", apps("pending").length],
      ["active", "Active", count("active", "expiring")],
      ["expiring", "Expiring soon", count("expiring")],
      ["expired", "Expired", count("expired")],
      ["rejected", "Rejected", apps("rejected").length],
    ];
    const row = (s) => {
      const u = ownerFor(s), st = states.get(s.id), percent = M.usagePercent(s.limits);
      return `<tr data-shop-row="${s.id}" data-state="${st}" data-plan="${esc(planName(s))}"><td class="td-shop"><strong>${esc(s.name)}</strong><small>#SHP${String(s.id).padStart(4, "0")} · /shops/${esc(s.slug)}</small></td><td class="td-owner">${esc(u.name || "—")}<small>${esc(u.email || "")}</small></td><td class="td-plan"><span class="plan-badge">${esc(planName(s))}</span></td><td class="td-storage"><strong>${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)}</strong><i class="quota${percent >= 90 ? " full" : ""}"><b style="width:${percent}%"></b></i></td><td class="td-expiry">${esc(M.yangonDate(s.ends_at) || "—")}<small>${esc(M.expiryLabel(s.ends_at))}</small></td><td class="td-status"><span class="shop-state ${st}">${stateLabel[st]}</span></td><td class="td-actions shop-actions"><button type="button" data-view-shop="${esc(s.slug)}">View</button><button type="button" data-manage-shop="${s.id}">Manage</button></td></tr>`;
    };
    const appRow = (a) =>
      `<form id="a-${a.id}" class="application-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.email)} · /shops/${esc(a.slug)}</small>${a.reason ? `<small>${esc(a.reason)}</small>` : ""}${a.decision_note ? `<small>Note: ${esc(a.decision_note)}</small>` : ""}</div>${a.status === "pending" ? `<button name="status" value="approved">✓ Approve</button><button name="status" value="rejected" class="reject">× Reject</button>` : ""}</form>`;
    const planForm = (p) =>
      `<form id="plan-${p.id}" class="plan-card">${p.id === "new" ? "<h4>＋ New plan / Plan အသစ်</h4>" : ""}${field("name", "Plan name", p.name)}${storageFields(p.storage_bytes)}${field("productLimit", "Active product limit", p.product_limit, "number")}<div class="permission-checks">${["products", "orders", "uploads", "selling"].map((k) => `<label><input type="checkbox" name="${k}" ${p.permissions[k] ? "checked" : ""}> ${k}</label>`).join("")}</div><button>${p.id === "new" ? "Create plan" : "Save plan"}</button></form>`;
    $("owner").innerHTML = `<section class="seller-manager" aria-label="Manage Seller Shops">
      <div class="seller-manager-head"><div class="manager-title"><span>🏪</span><div><h2>Manage Seller Shops</h2><p>View, approve sellers and manage their subscriptions.</p></div></div><button type="button" id="new-shop" class="manager-new">＋ New Shop</button></div>
      <div class="shop-tabs" role="tablist">${tabs.map(([id, label, n]) => `<button type="button" role="tab" data-shop-filter="${id}" aria-selected="${view.tab === id}" class="${view.tab === id ? "selected" : ""}${id === "expiring" && n ? " warn" : ""}">${label} (${n})</button>`).join("")}</div>
      <div id="shop-list-view"><div class="shop-toolbar"><label class="shop-search">⌕<input id="shop-search" placeholder="Search shop name, owner, email…" value="${esc(view.q)}"></label><select id="shop-status-filter" aria-label="Status">${[["all", "All Status"], ["active", "Active"], ["expiring", "Expiring soon"], ["expired", "Expired"], ["suspended", "Suspended"], ["scheduled", "Scheduled"]].map(([val, label]) => `<option value="${val}" ${view.status === val ? "selected" : ""}>${label}</option>`).join("")}</select><select id="shop-plan-filter" aria-label="Plan"><option value="all">All Plans</option>${v.plans.map((p) => `<option value="${esc(p.name)}" ${view.plan === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="shop-table-wrap"><table class="shop-table"><thead><tr><th>Shop</th><th>Owner</th><th>Plan</th><th>Storage</th><th>Expiry date</th><th>Status</th><th>Action</th></tr></thead><tbody>${sellerShops.map(row).join("") || '<tr><td colspan="7" class="empty-shops">No seller shops yet. Approve an application to create one.</td></tr>'}<tr id="no-shop-match" hidden><td colspan="7" class="empty-shops">No shops match these filters. <button type="button" id="clear-shop-filters">Clear filters</button></td></tr></tbody></table></div>
      <div class="seller-panels"><article><span>🗓️</span><div><h3>Service Expiry Management</h3><p>${count("expiring")} expiring within ${M.EXPIRING_DAYS} days · ${count("expired")} expired.</p><button type="button" data-open-panel="expiry">Manage Expiry <b>›</b></button></div></article><article><span>🗄️</span><div><h3>Storage Management</h3><p>${sellerShops.filter((s) => M.usagePercent(s.limits) >= 90).length} shop(s) at 90% storage or more.</p><button type="button" data-open-panel="storage">Manage Storage <b>›</b></button></div></article></div></div>
      <section id="application-list-view" class="application-queue" hidden><h3 id="application-heading"></h3><div data-app-list="pending">${apps("pending").map(appRow).join("") || '<p class="muted">No pending seller application.</p>'}</div><div data-app-list="rejected">${apps("rejected").map(appRow).join("") || '<p class="muted">No rejected application.</p>'}<p class="muted">Rejected sellers can submit a new application from their own account.</p></div></section>
      <div id="shop-management-panel" class="shop-management-panel" hidden></div>
      <details class="owner-settings"><summary>Plans <small>manual, no automatic billing</small></summary><div class="plan-grid">${[...v.plans, { id: "new", permissions: {}, storage_bytes: 52428800, product_limit: 100 }].map(planForm).join("")}</div></details>
      <details class="owner-settings"><summary>Users <small>${v.users.length}</small></summary>${v.users.map((u) => `<form id="u-${u.id}" class="user-row"><div><strong>${esc(u.name || u.email)}</strong><small>${esc(u.email)}</small></div>${select("status", "Status", ["active", "suspended"], u.status)}<button>Save</button></form>`).join("")}</details>
      <details class="owner-settings"><summary>In-app update announcement</summary><form id="release">${field("version", "Deployed version", v.release.version).replace("<input ", "<input readonly ")}${field("notes", "Update notes", v.release.notes)}<p class="muted">Updates install automatically when no checkout or file upload is in progress.</p><button>Publish</button></form></details>
    </section>`;

    const applyView = () => {
      const listTab = ["pending", "rejected"].includes(view.tab);
      $("shop-list-view").hidden = listTab;
      $("application-list-view").hidden = !listTab;
      $("application-heading").textContent = view.tab === "pending" ? "Pending approval" : "Rejected applications";
      document.querySelectorAll("[data-app-list]").forEach((el) => (el.hidden = el.dataset.appList !== view.tab));
      let shown = 0;
      document.querySelectorAll("[data-shop-row]").forEach((tr) => {
        tr.hidden = !M.matches({ text: tr.textContent, state: tr.dataset.state, plan: tr.dataset.plan }, view);
        if (!tr.hidden) shown++;
      });
      $("no-shop-match").hidden = shown > 0 || !sellerShops.length;
    };
    const selectTab = (id) => {
      view.tab = id;
      view.status = "all";
      $("shop-status-filter").value = "all";
      document.querySelectorAll("[data-shop-filter]").forEach((t) => {
        t.classList.toggle("selected", t.dataset.shopFilter === id);
        t.setAttribute("aria-selected", t.dataset.shopFilter === id);
      });
      applyView();
    };
    document.querySelectorAll("[data-shop-filter]").forEach((t) => (t.onclick = () => selectTab(t.dataset.shopFilter)));
    $("shop-search").oninput = (e) => { view.q = e.target.value; applyView(); };
    $("shop-status-filter").onchange = (e) => { view.status = e.target.value; applyView(); };
    $("shop-plan-filter").onchange = (e) => { view.plan = e.target.value; applyView(); };
    $("clear-shop-filters").onclick = () => {
      Object.assign(view, { q: "", status: "all", plan: "all" });
      $("shop-search").value = "";
      $("shop-plan-filter").value = "all";
      selectTab("all");
    };
    $("new-shop").onclick = () => {
      selectTab("pending");
      msg("New shops start as an application. Approve a pending application. / ဆိုင်အသစ်များကို လျှောက်လွှာမှ approve လုပ်ပါ။");
    };
    applyView();

    const panel = $("shop-management-panel");
    const closePanel = () => { panel.hidden = true; panel.innerHTML = ""; };
    panel.onclick = (e) => { if (e.target === panel) closePanel(); };
    document.onkeydown = (e) => { if (e.key === "Escape" && !panel.hidden) closePanel(); };
    const openDialog = (label, html) => {
      panel.hidden = false;
      panel.innerHTML = `<div class="manage-dialog" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button type="button" class="dialog-close" aria-label="Close">×</button>${html}</div>`;
      panel.querySelector(".dialog-close").onclick = closePanel;
      panel.querySelector(".dialog-close").focus();
    };
    const run = async (button, work, done) => {
      button.disabled = true;
      button.dataset.busy = "true";
      try { await work(); msg(done); await load(); }
      catch (e) { msg(e.message); button.disabled = false; delete button.dataset.busy; }
    };
    const extend = (s, months, button) => {
      if (!confirm(`Extend ${s.name} by ${months} calendar month(s)? No charge is made.`)) return;
      run(button, () => api("/owner/shops/" + s.id + "/extend", "POST", { months }), "သက်တမ်းတိုးပြီးပါပြီ / Service extended");
    };
    const monthOptions = [1, 2, 3, 6, 12].map((m) => `<option value="${m}" ${m === 2 ? "selected" : ""}>${m} month${m > 1 ? "s" : ""}</option>`).join("");
    const showManager = (shopId) => {
      const s = sellerShops.find((x) => x.id === Number(shopId));
      if (!s) return;
      const u = ownerFor(s), override = storage.display(s.storage_override), st = states.get(s.id);
      const initialStart = M.yangonDate(s.starts_at), initialEnd = M.yangonDate(s.ends_at);
      openDialog("Manage " + s.name, `<div class="manage-shop-summary"><span>🏪</span><div><h3>${esc(s.name)} <span class="shop-state ${st}">${stateLabel[st]}</span></h3><p>${esc(u.name || "")} · ${esc(u.email || "")}</p><small>/shops/${esc(s.slug)} · ${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)} · ${esc(M.expiryLabel(s.ends_at))}</small></div></div><form id="manage-shop-${s.id}"><div class="manage-fields"><label>Shop status<select name="status">${["active", "suspended"].map((x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Subscription<select name="subscriptionStatus">${["trial", "active", "sponsored", "inactive", "expired"].map((x) => `<option ${x === s.subscription_status ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Plan<select name="planId">${v.plans.map((p) => `<option value="${p.id}" ${p.id === s.plan_id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><label>Storage override (blank = plan)<input name="storageAmount" type="number" min="0" step="any" value="${esc(override.amount)}"></label><label>Unit<select name="storageUnit">${["MB", "GB"].map((x) => `<option ${override.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Start date (Myanmar)<input name="startsAt" type="date" value="${initialStart}"></label><label>Expiry date (Myanmar)<input name="endsAt" type="date" value="${initialEnd}"></label></div><div class="manage-dialog-actions"><button>Save changes</button><span class="extend-group"><select id="extend-months" aria-label="Extend by">${monthOptions}</select><button type="button" data-modal-extend>Extend</button></span><a class="manage-link" href="/shops/${esc(s.slug)}/admin" target="_blank" rel="noopener">Open seller admin ↗</a><button type="button" class="danger" data-modal-delete>Delete shop</button></div></form>`);
      form("manage-shop-" + s.id, (d) => {
        const body = { status: d.status, subscriptionStatus: d.subscriptionStatus, planId: Number(d.planId), storageBytes: storage.bytes(d.storageAmount, d.storageUnit, true) };
        // Resend dates only when edited so saving other fields keeps the exact stored time.
        if (d.startsAt !== initialStart) body.startsAt = M.fromYangonDate(d.startsAt, false);
        if (d.endsAt !== initialEnd) body.endsAt = M.fromYangonDate(d.endsAt, true);
        return api("/owner/shops/" + s.id, "PATCH", body);
      });
      panel.querySelector("[data-modal-extend]").onclick = (e) => extend(s, Number($("extend-months").value), e.currentTarget);
      panel.querySelector("[data-modal-delete]").onclick = (e) => {
        if (prompt("Type the exact shop URL to permanently delete this shop:", "") !== s.slug) return;
        run(e.currentTarget, () => api("/owner/shops/" + s.id, "DELETE", { confirmDelete: s.slug }), "ဆိုင်ဖျက်ပြီးပါပြီ / Shop deleted");
      };
    };
    const showOverview = (kind) => {
      if (!sellerShops.length) return msg("Manage a seller after approving an application.");
      const expiry = kind === "expiry";
      const sorted = [...sellerShops].sort(expiry
        ? (a, b) => (Date.parse(a.ends_at) || Infinity) - (Date.parse(b.ends_at) || Infinity)
        : (a, b) => M.usagePercent(b.limits) - M.usagePercent(a.limits));
      openDialog(expiry ? "Service expiry" : "Storage", `<h3>${expiry ? "🗓️ Service expiry — soonest first" : "🗄️ Storage — fullest first"}</h3><div class="overview-list">${sorted.map((s) => {
        const st = states.get(s.id), percent = M.usagePercent(s.limits);
        const detail = expiry
          ? `${esc(M.yangonDate(s.ends_at) || "—")} · ${esc(M.expiryLabel(s.ends_at))}`
          : `${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)} (${percent}%)<i class="quota${percent >= 90 ? " full" : ""}"><b style="width:${percent}%"></b></i>`;
        return `<div class="overview-row"><div><strong>${esc(s.name)}</strong> <span class="shop-state ${st}">${stateLabel[st]}</span><small>${detail}</small></div>${expiry ? `<button type="button" data-quick-extend="${s.id}">+2 months</button>` : ""}<button type="button" data-overview-manage="${s.id}">${expiry ? "Manage" : "Change storage"}</button></div>`;
      }).join("")}</div>`);
      panel.querySelectorAll("[data-quick-extend]").forEach((b) => (b.onclick = () => extend(sellerShops.find((s) => s.id === Number(b.dataset.quickExtend)), 2, b)));
      panel.querySelectorAll("[data-overview-manage]").forEach((b) => (b.onclick = () => showManager(b.dataset.overviewManage)));
    };
    document.querySelectorAll("[data-manage-shop]").forEach((b) => (b.onclick = () => showManager(b.dataset.manageShop)));
    document.querySelectorAll("[data-view-shop]").forEach((b) => (b.onclick = () => window.open("/shops/" + encodeURIComponent(b.dataset.viewShop), "_blank", "noopener")));
    document.querySelectorAll("[data-open-panel]").forEach((b) => (b.onclick = () => showOverview(b.dataset.openPanel)));

    for (const a of apps("pending"))
      form("a-" + a.id, (d) => {
        if (d.status === "rejected" && !confirm(`Reject ${a.name}?`)) throw Error("Cancelled.");
        return api("/owner/applications/" + a.id, "PATCH", d);
      });
    for (const u of v.users)
      form("u-" + u.id, (d) => api("/owner/users/" + u.id, "PATCH", d));
    for (const p of [...v.plans, { id: "new" }])
      form("plan-" + p.id, (d) =>
        api("/owner/plans" + (p.id === "new" ? "" : "/" + p.id), p.id === "new" ? "POST" : "PATCH", {
          name: d.name,
          storageBytes: storage.bytes(d.storageAmount, d.storageUnit),
          productLimit: Number(d.productLimit),
          permissions: Object.fromEntries(["products", "orders", "uploads", "selling"].map((k) => [k, d[k] === "on"])),
        }),
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
