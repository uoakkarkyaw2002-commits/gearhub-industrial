(() => {
  const byId = id => document.getElementById(id);
  const words = key => (window.GEARHUB_DEFAULT_TRANSLATIONS?.[document.documentElement.lang]?.[key]) || (window.GEARHUB_DEFAULT_TRANSLATIONS?.en?.[key]) || key;
  const message = (key, detail) => {
    const node = byId("settings-message");
    if (!node) return;
    node.textContent = detail || words(key);
    node.classList.add("visible");
    clearTimeout(message.timer);
    message.timer = setTimeout(() => node.classList.remove("visible"), 2800);
  };
  const savedTheme = localStorage.getItem("gh-theme") === "dark" ? "dark" : "light";

  function applyTheme(theme) {
    const mode = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = mode;
    // The installed app's title bar follows this colour: white in light mode, like the page header.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#101a14" : "#ffffff");
    localStorage.setItem("gh-theme", mode);
    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      const active = button.dataset.themeChoice === mode;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
      if(active)button.parentElement.dataset.selected=button===button.parentElement.lastElementChild?"right":"left";
    });
  }

  function updateLanguageButtons() {
    document.querySelectorAll("[data-language-choice]").forEach(button => {
      const active = button.dataset.languageChoice === document.documentElement.lang;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
      if(active)button.parentElement.dataset.selected=button===button.parentElement.lastElementChild?"right":"left";
    });
  }

  function updateNotificationSetting() {
    const input = byId("notifications-toggle");
    const help = byId("notifications-help");
    if (!input || !help) return;
    input.disabled = false;
    input.checked = localStorage.getItem("gh-notifications") === "on";
    help.removeAttribute('data-i18n');
    help.textContent = 'In-app alerts while open. Sound depends on browser/device settings. / App ဖွင့်ထားချိန် အသိပေးရန်';
  }

  const formatBytes = bytes => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  // Offline download beside Server storage: a ring with 1–100 % while saving, then ✓ Offline success.
  function renderOffline(state, percent) {
    const box = byId("offline-status"), text = byId("offline-status-text");
    if (!box || !text) return;
    box.hidden = localStorage.getItem("gh-offline-mode") === "off";
    box.dataset.state = state;
    const p = Math.max(1, Math.min(100, Math.round(percent || 0)));
    box.style.setProperty("--p", state === "downloading" ? p : 0);
    text.textContent = state === "downloading" ? p + "%" : state === "ready" ? "Offline success" : state === "retry" ? "Offline failed" : "Offline";
  }
  window.addEventListener("gearhub:auto-download", event => renderOffline(event.detail?.state, event.detail?.percent));
  renderOffline(localStorage.getItem("gh-offline-downloaded-at") ? "ready" : "idle");

  let storageData = null, serviceData = null;
  function renderStorageUsage() {
    const label = byId("storage-usage"), meter = byId("storage-meter-fill");
    if (!label || !meter) return;
    if (!storageData) {
      label.textContent = words("storageUnavailable");
      meter.style.width = "0%";
      return;
    }
    const { usedBytes = 0, capacityBytes = 0, availableBytes = 0, quota } = storageData;
    const used = formatBytes(usedBytes), capacity = formatBytes(capacityBytes), available = formatBytes(availableBytes);
    // Seller shops show the owner-assigned quota; the main store shows the server disk.
    label.textContent = words(quota ? "storageQuotaLabel" : "storageUsageLabel").replace("{used}", used).replace("{available}", available).replace("{capacity}", capacity);
    meter.style.width = `${capacityBytes ? Math.min(100, Math.max(2, usedBytes / capacityBytes * 100)) : 0}%`;
    meter.parentElement.setAttribute("aria-label", label.textContent);
  }
  async function updateStorageUsage() {
    try {
      const response = await (window.GearHubTenantStore ? window.GearHubTenantStore.fetch("/api/storage") : fetch("/api/storage", { cache: "no-store" }));
      if (!response.ok) throw new Error("Storage endpoint unavailable");
      storageData = await response.json();
    } catch {
      storageData = null;
    }
    renderStorageUsage();
  }

  // Only seller shops have an owner-managed expiry; the main store keeps its static row.
  function renderServiceExpiry() {
    const text = byId("service-expiry"), badge = byId("service-status");
    if (!serviceData || !text || !badge) return;
    text.removeAttribute("data-i18n");
    badge.removeAttribute("data-i18n");
    const { endsAt, state } = serviceData;
    const days = endsAt ? Math.ceil((Date.parse(endsAt) - Date.now()) / 864e5) : null;
    const date = endsAt ? new Date(endsAt).toLocaleDateString(document.documentElement.lang === "my" ? "my-MM" : "en-GB", { timeZone: "Asia/Yangon", day: "numeric", month: "short", year: "numeric" }) : "";
    if (!endsAt) text.textContent = words("expiryNotSet");
    else if (days < 0) text.textContent = words("expiryPast").replace("{date}", date);
    else text.textContent = words("expiryOn").replace("{date}", date).replace("{days}", days === 0 ? words("expiresToday") : words("daysLeft").replace("{n}", days));
    const status = state === "suspended" ? "serviceSuspended" : ["expired", "inactive"].includes(state) || days < 0 ? "serviceExpired" : state === "scheduled" ? "serviceScheduled" : days !== null && days <= 14 ? "serviceExpiring" : "serviceActive";
    badge.textContent = words(status);
    badge.dataset.state = status;
  }
  async function updateServiceExpiry() {
    if (!window.GearHubTenantStore) return;
    try {
      const response = await window.GearHubTenantStore.fetch("/api/service");
      if (response.ok) serviceData = await response.json();
    } catch {}
    renderServiceExpiry();
  }

  function setLanguage(language) {
    if (!(["my", "en"].includes(language))) return;
    if (language !== document.documentElement.lang) {
      document.getElementById("lang")?.click();
    }
    updateLanguageButtons();
  }

  async function enableNotifications(enabled) {
    if (!enabled) {
      localStorage.removeItem("gh-notifications");
      updateNotificationSetting();
      return;
    }
    localStorage.setItem("gh-notifications","on");
    // This preference enables foreground alerts; it is not a remote push subscription.
    Promise.resolve(window.GearHubUpdates?.enableSound?.()).finally(()=>window.GearHubUpdates?.check?.());
    message("notificationEnabled");
    updateNotificationSetting();
  }

  applyTheme(savedTheme);
  updateLanguageButtons();
  updateNotificationSetting();
  updateStorageUsage();
  updateServiceExpiry();
  if (!window.GearHubTenantStore && !byId("my-shops-action")) {
    const button = document.createElement("button");
    button.className = "settings-row settings-row-button";
    button.type = "button";
    button.id = "my-shops-action";
    button.innerHTML = '<span class="settings-icon" aria-hidden="true">🏪</span><span class="settings-copy"><strong>'+words("myShopsSetting")+'</strong><small>'+words("myShopsHelp")+'</small></span><span class="settings-chevron" aria-hidden="true">›</span>';
    byId("home-screen-action")?.before(button);
  }
  if (!window.GearHubTenantStore && !byId("create-shop-action")) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "settings-row settings-row-button create-shop-row";
    link.id = "create-shop-action";
    link.innerHTML = '<span class="settings-icon create-shop-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 4.6 4h14.8L21 9.5"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12.5V20h9"/><path d="M18 15v6M15 18h6"/></svg></span><span class="settings-copy"><strong>'+words("createShopSetting")+'</strong><small>'+words("createShopHelp")+'</small></span><span class="settings-chevron" aria-hidden="true">›</span>';
    byId("share-store-action")?.after(link);
  }

  const choiceTimers = new WeakMap();
  function animateChoice(button, apply) {
    const group = button.parentElement;
    clearTimeout(choiceTimers.get(group));
    group.dataset.selected = button === group.lastElementChild ? "right" : "left";
    group.setAttribute("aria-busy", "true");
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
    choiceTimers.set(group, setTimeout(() => { apply(); group.removeAttribute("aria-busy"); }, delay));
  }
  document.querySelectorAll("[data-theme-choice]").forEach(button => button.addEventListener("click", () => animateChoice(button, () => applyTheme(button.dataset.themeChoice))));
  document.querySelectorAll("[data-language-choice]").forEach(button => button.addEventListener("click", () => animateChoice(button, () => setLanguage(button.dataset.languageChoice))));
  byId("lang").addEventListener("click", () => {
    updateLanguageButtons();
    setTimeout(() => { renderStorageUsage(); renderServiceExpiry(); });
  });
  byId("notifications-toggle")?.addEventListener("change", event => enableNotifications(event.currentTarget.checked));
  byId("my-shops-action")?.addEventListener("click", () => {
    location.href = "/platform.html";
  });
  // Share My Store: QR code plus a copyable link to this shop's own address.
  function storeLink() {
    const path = window.GearHubTenantStore ? location.pathname.replace(/\/?$/, "/") : "/";
    return location.origin + path;
  }
  // The same sheet also shares GearHub's "Create new shop" page (QR, copy, save image).
  // The QR library (56 KB) loads only when a Share sheet opens, not with every page.
  let qrLoading;
  function loadQr() {
    if (typeof qrcode === "function") return Promise.resolve();
    return qrLoading ||= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/qrcode.js?v=1.4.4";
      script.onload = resolve;
      script.onerror = () => { qrLoading = null; script.remove(); reject(new Error("QR unavailable")); };
      document.head.append(script);
    });
  }
  async function openShare(options = {}) {
    const modal = byId("share-modal");
    if (!modal) return;
    try { await loadQr(); } catch { return; }
    const link = options.link || storeLink(), qr = qrcode(0, "M");
    qr.addData(link);
    qr.make();
    byId("share-qr").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
    byId("share-link").value = link;
    byId("share-store-name").textContent = options.name || document.querySelector(".footer-wordmark")?.textContent.trim() || document.title;
    const heading = modal.querySelector("h2"), hint = modal.querySelector(".share-hint");
    if (heading) heading.textContent = options.title || words("shareStoreSetting");
    if (hint) hint.textContent = options.hint || words("shareScanHint");
    byId("share-download").href = qr.createDataURL(10, 4);
    byId("share-download").setAttribute("download", options.file || "store-qr.gif");
    byId("share-native").hidden = !navigator.share;
    byId("share-copy").textContent = words("shareCopy");
    modal.classList.add("open");
  }
  async function copyLink() {
    const input = byId("share-link"), button = byId("share-copy");
    try { await navigator.clipboard.writeText(input.value); }
    catch { input.select(); document.execCommand("copy"); }
    button.textContent = words("shareCopied");
    clearTimeout(copyLink.timer);
    copyLink.timer = setTimeout(() => (button.textContent = words("shareCopy")), 2000);
  }
  byId("share-store-action")?.addEventListener("click", () => openShare());
  byId("create-shop-action")?.addEventListener("click", () => openShare({ link: location.origin + "/platform.html", title: words("createShopSetting"), name: words("createShopShareName"), hint: words("createShopShareHint"), file: "gearhub-new-shop-qr.gif" }));
  byId("share-close")?.addEventListener("click", () => byId("share-modal").classList.remove("open"));
  byId("share-modal")?.addEventListener("click", event => { if (event.target === event.currentTarget) event.currentTarget.classList.remove("open"); });
  byId("share-copy")?.addEventListener("click", copyLink);
  byId("share-native")?.addEventListener("click", () => navigator.share({ title: byId("share-store-name").textContent, url: byId("share-link").value }).catch(() => {}));
  // Refresh works like the browser's reload button; unsaved form drafts are kept. It shows the same
  // flower animation as an update, which finishes on the reloaded page.
  byId("app-refresh-action")?.addEventListener("click", () => {
    window.GearHubUpdates?.saveDraft?.();
    if (window.GearHubSplash?.showUpdating) { window.GearHubSplash.showUpdating(); setTimeout(() => location.reload(), 80); }
    else location.reload();
  });
  byId("about-app-toggle").addEventListener("click", () => {
    const details = byId("about-app-details");
    details.hidden = !details.hidden;
  });
  window.addEventListener("gearhub:data-ready", () => { updateStorageUsage(); updateServiceExpiry(); });
  window.addEventListener("storage", updateLanguageButtons);
})();
