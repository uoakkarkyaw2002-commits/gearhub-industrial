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
  const msg = (t) => ($("message").textContent = t);
  async function api(url, method = "GET", body) {
    const headers = { "X-CSRF-Token": csrf };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const r = await fetch("/api/platform" + url, { method, headers, body });
    const v = await r.json();
    if (!r.ok) throw Error(v.error || "Request failed");
    return v;
  }
  function form(id, fn) {
    document.getElementById(id)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.submitter;
      b.disabled = true;
      b.dataset.busy = "true";
      try {
        await fn(Object.fromEntries(new FormData(e.target)), e.target);
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
    $("logout").hidden = !me.user;
    $("owner").innerHTML = "";
    $("shop").innerHTML = "";
    $("application").innerHTML = "";
    $("account").innerHTML = me.user
      ? `<p>${esc(me.user.name)} · ${esc(me.user.email)}</p>`
      : `<p>Google login ဝင်ပြီး ဆိုင်ဖွင့်ရန် လျှောက်ထားပါ။ Approval မရမချင်း ဆိုင်မဖွင့်ပါ။</p><button id="google-login" ${me.oauthReady ? "" : "disabled"}>Continue with Google</button><p class="muted">${me.oauthReady ? "" : "Owner must configure Google OAuth before login."}</p>`;
    $("google-login")?.addEventListener("click", async () => {
      try {
        location.href = (await api("/auth/start", "POST", {})).url;
      } catch (e) {
        msg(e.message);
      }
    });
    if (!me.user) return;
    if (!me.shop) {
      const a = me.application;
      $("application").innerHTML =
        `<h2>ဆိုင်လျှောက်လွှာ / Application</h2>${a ? `<p>Status: <strong>${esc(a.status)}</strong> · ${esc(a.decision_note)}</p>` : ""}${!a || a.status === "rejected" ? `<form id="apply">${field("name", "Shop name / ဆိုင်နာမည်")}${field("slug", "Shop URL / shops/your-name")}${field("reason", "About your shop")}<button>Apply / လျှောက်ထားရန်</button></form>` : ""}`;
      form("apply", (d) => api("/applications", "POST", d));
    } else await shop(me.shop.id);
    if (me.isOwner) await owner();
    window.GearHubUpdates?.restore();
  }
  async function shop(id) {
    const s = await api("/shops/" + id),
      b = s.settings,
      l = s.limits;
    const images = s.files.filter((f) => f.kind === "image" && f.ready);
    const imageSelect = (current) =>
      `<label>Image/logo<select name="imageId"><option value="">No image</option>${images.map((f) => `<option value="${esc(f.id)}" ${f.id === current ? "selected" : ""}>${esc(f.id.slice(0, 8))} · ${f.bytes} bytes</option>`).join("")}</select></label>`;
    $("shop").innerHTML =
      `<h2>${esc(s.name)}</h2><a href="/shops/${esc(s.slug)}" target="_blank" rel="noopener">Open shop / ဆိုင်ကြည့်ရန် ↗</a><p>${esc(l.plan)} · ${esc(l.subscriptionState)} · ${esc(s.status)}</p><p>Storage ${l.usedBytes} / ${l.storageLimit} bytes. Product/logo/receipt files count. Data is never deleted automatically.</p><p class="muted">Write permissions: ${esc(JSON.stringify(l.permissions))}. Starts: ${esc(dateLabel(s.starts_at))}. End: ${esc(s.ends_at?dateLabel(s.ends_at):"No expiry")}</p><form id="shop-settings"><h3>Shop information</h3>${field("name", "Name", s.name)}${["description", "phone", "email", "address", "bankName", "bankAccountName", "bankAccountNumber", "paymentInstructions"].map((k) => field(k, k, b[k])).join("")}${imageSelect(b.logoId)}<button>Save shop</button></form><form id="upload-image"><h3>Upload product/logo image</h3><label>JPG/PNG/WebP ≤5 MB<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required></label><button>Upload</button></form><div>${images.map((f) => `<span>${esc(f.id.slice(0, 8))} <button data-delete-file="${esc(f.id)}">Remove unused image</button></span>`).join("")}</div><form id="product-new"><h3>Add product / ပစ္စည်းတင်ရန်</h3>${productFields({})}${imageSelect("")}<button>Add product</button></form><h3>Products</h3><div>${s.products.map((p) => `<form id="p-${p.id}">${productFields(p)}${imageSelect(p.image_id)}<button>Save product</button></form>`).join("")}</div><h3>Orders / အော်ဒါများ</h3>${s.orders.map((o) => `<article><strong>${esc(o.code)}</strong><p>${esc(o.customer)} · ${esc(o.phone)} · ${esc(o.address)}</p><p>${o.total} Ks · ${esc(o.invoice || "")}</p><p>${esc(o.items.map((i) => i.name + " × " + i.quantity).join(", "))}</p><a href="/api/platform/shops/${id}/receipts/${esc(o.receipt_id)}" target="_blank" rel="noopener">Private receipt</a><form id="o-${o.id}">${select("status", "Order status", ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"], o.status)}${select("paymentStatus", "Manually verified payment", ["pending", "paid", "rejected"], o.payment_status)}<button>Save order</button></form></article>`).join("")}`;
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
    $("owner").innerHTML =
      `<h2>Platform Owner Dashboard</h2><h3>Applications</h3>${v.applications.map((a) => `<form id="a-${a.id}"><strong>${esc(a.name)} · ${esc(a.email)} · ${esc(a.status)}</strong>${select("status", "Decision", ["approved", "rejected"], "approved")}${field("note", "Decision note", a.decision_note)}<button ${a.status === "pending" ? "" : "disabled"}>Save decision</button></form>`).join("")}<h3>Users</h3>${v.users.map((u) => `<form id="u-${u.id}"><strong>${esc(u.email)}</strong>${select("status", "User status", ["active", "suspended"], u.status)}<button>Save user</button></form>`).join("")}<h3>Shops, storage and subscriptions</h3>${v.shops.map((s) => (s.legacy ? "<p>Existing GearHub preserved. Manage using the existing /admin.html account.</p>" : `<form id="s-${s.id}"><strong>${esc(s.name)} · ${esc(s.slug)}</strong><p>${s.limits.usedBytes} / ${s.limits.storageLimit} bytes · ${esc(s.limits.subscriptionState)}</p><p>Starts: ${esc(dateLabel(s.starts_at))} · End: ${esc(s.ends_at?dateLabel(s.ends_at):"No expiry")}</p>${select("status", "Shop status", ["active", "suspended"], s.status)}${select("subscriptionStatus", "Subscription", ["sponsored", "active", "trial", "inactive", "expired"], s.subscription_status)}<label>Plan<select name="planId">${v.plans.map((p) => `<option value="${p.id}" ${p.id === s.plan_id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>${field("storageBytes", "Storage override bytes (blank = plan)", s.storage_override ?? "", "number")}${field("startsAt", "Starts (ISO date)", s.starts_at)}${field("endsAt", "Expires (ISO date)", s.ends_at)}<button>Save subscription</button><button type="button" data-extend-shop="${s.id}">Extend 2 calendar months / ၂ လတိုးရန်</button></form>`)).join("")}<h3>Plans (manual, no automatic billing)</h3>${[...v.plans, { id: "new", permissions: {}, storage_bytes: 52428800, product_limit: 100 }].map((p) => `<form id="plan-${p.id}">${field("name", "Plan name", p.name)}${field("storageBytes", "Storage bytes", p.storage_bytes, "number")}${field("productLimit", "Active product limit", p.product_limit, "number")}${["products", "orders", "uploads", "selling"].map((k) => `<label><input type="checkbox" name="${k}" ${p.permissions[k] ? "checked" : ""}> ${k}</label>`).join("")}<button>${p.id === "new" ? "Create plan" : "Save plan"}</button></form>`).join("")}<form id="release"><h3>Publish in-app update announcement</h3>${field("version", "Version", v.release.version)}${field("notes", "Update notes", v.release.notes)}<p>Deploy reviewed shared code before announcing that version. No automatic billing/push service.</p><button>Publish</button></form>`;
    document.querySelectorAll('[data-extend-shop]').forEach(button=>button.onclick=async()=>{button.disabled=true;button.dataset.busy='true';try{await api('/owner/shops/'+button.dataset.extendShop+'/extend','POST',{months:2});msg('Extended without charging. သက်တမ်းတိုးပြီးပါပြီ။');await load();}catch(e){msg(e.message);}finally{button.disabled=false;delete button.dataset.busy;}});
    for (const a of v.applications)
      form("a-" + a.id, (d) => api("/owner/applications/" + a.id, "PATCH", d));
    for (const u of v.users)
      form("u-" + u.id, (d) => api("/owner/users/" + u.id, "PATCH", d));
    for (const s of v.shops.filter((s) => !s.legacy))
      form("s-" + s.id, (d) =>
        api("/owner/shops/" + s.id, "PATCH", {
          ...d,
          planId: Number(d.planId),
          storageBytes: d.storageBytes === "" ? null : Number(d.storageBytes),
        }),
      );
    for (const p of [...v.plans, { id: "new" }])
      form("plan-" + p.id, (d) =>
        api(
          "/owner/plans" + (p.id === "new" ? "" : "/" + p.id),
          p.id === "new" ? "POST" : "PATCH",
          {
            name: d.name,
            storageBytes: Number(d.storageBytes),
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
  load().catch((e) => msg(e.message));
  window.platformRefresh = load;
})();
