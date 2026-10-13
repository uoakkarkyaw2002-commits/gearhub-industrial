(() => {
  const $ = (id) => document.getElementById(id),
    slug = location.pathname.split("/").filter(Boolean)[1],
    key = "gh-shop-cart:" + slug;
  let shop,
    csrf,
    cart = {};
  try {
    cart = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {}
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
  const msg = (t) => ($("message").textContent = t);
  const persist = () => localStorage.setItem(key, JSON.stringify(cart));
  function render() {
    const q = $("shop-search").value.toLowerCase();
    $("shop-products").innerHTML = shop.products
      .filter((p) =>
        (p.name + " " + p.sku + " " + p.category).toLowerCase().includes(q),
      )
      .map(
        (p) =>
          `<article>${p.image_id ? `<img src="/api/platform/images/${esc(p.image_id)}" alt="${esc(p.name)}">` : ""}<h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><p>${p.price} Ks · Stock ${p.stock}</p><button data-add="${p.id}" ${p.stock ? "" : "disabled"}>Add to cart / ခြင်းထဲထည့်ရန်</button></article>`,
      )
      .join("");
    document.querySelectorAll("[data-add]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = shop.products.find((p) => p.id === Number(b.dataset.add));
          cart[p.id] = Math.min(p.stock, (cart[p.id] || 0) + 1);
          try {
            persist();
            drawCart();
          } catch {
            msg("Browser storage unavailable.");
          }
        }),
    );
    drawCart();
  }
  function drawCart() {
    let total = 0;
    $("shop-cart").innerHTML =
      Object.entries(cart)
        .filter(
          ([id, q]) => q > 0 && shop.products.some((p) => p.id === Number(id)),
        )
        .map(([id, q]) => {
          const p = shop.products.find((p) => p.id === Number(id));
          total += p.price * q;
          return `<div class="row"><span>${esc(p.name)} × ${q}</span><button data-remove="${id}" aria-label="Remove ${esc(p.name)}">Remove</button></div>`;
        })
        .join("") + `<strong>Total ${total} Ks</strong>`;
    document.querySelectorAll("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          delete cart[b.dataset.remove];
          persist();
          drawCart();
        }),
    );
  }
  async function load() {
    const m = await fetch("/api/platform/me").then((r) => r.json());
    csrf = m.csrfToken;
    const r = await fetch("/api/platform/store/" + encodeURIComponent(slug));
    shop = await r.json();
    if (!r.ok) throw Error(shop.error);
    if (shop.legacy) {
      location.replace("/");
      return;
    }
    $("shop-info").innerHTML =
      `${shop.settings.logoId ? `<img width="90" height="90" src="/api/platform/images/${esc(shop.settings.logoId)}" alt="Shop logo">` : ""}<h1>${esc(shop.name)}</h1><p>${esc(shop.settings.description || "")}</p><p>${esc(shop.settings.phone || "")} · ${esc(shop.settings.email || "")}</p><p>${esc(shop.settings.address || "")}</p>`;
    $("payment-info").textContent = [
      shop.settings.bankName,
      shop.settings.bankAccountName,
      shop.settings.bankAccountNumber,
      shop.settings.paymentInstructions,
    ]
      .filter(Boolean)
      .join(" · ");
    render();
    window.GearHubUpdates?.restore();
  }
  $("shop-search").oninput = () => render();
  const retryKey = "gh-shop-checkout:" + slug;
  $("shop-checkout").addEventListener("input", () => {
    if (!window.__gearhubCheckoutPending) sessionStorage.removeItem(retryKey);
  });
  $("shop-checkout").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.submitter;
    button.disabled = true;
    window.__gearhubCheckoutPending = true;
    try {
      persist();
      let retry = sessionStorage.getItem(retryKey);
      if (!retry) {
        retry = crypto.randomUUID();
        sessionStorage.setItem(retryKey, retry);
      }
      const body = new FormData(e.target);
      body.set(
        "items",
        JSON.stringify(
          Object.entries(cart)
            .filter(([, q]) => q > 0)
            .map(([id, quantity]) => ({ id: Number(id), quantity })),
        ),
      );
      const r = await fetch(
        "/api/platform/store/" + encodeURIComponent(slug) + "/orders",
        {
          method: "POST",
          headers: { "X-CSRF-Token": csrf, "Idempotency-Key": retry },
          body,
        },
      );
      const v = await r.json();
      if (!r.ok) throw Error(v.error);
      cart = {};
      persist();
      sessionStorage.removeItem(retryKey);
      e.target.reset();
      msg(
        "Order received: " + v.code + " · Payment awaits manual verification.",
      );
      await load();
    } catch (err) {
      msg(err.message);
    } finally {
      button.disabled = false;
      window.__gearhubCheckoutPending = false;
    }
  };
  load().catch((e) => msg(e.message));
})();
