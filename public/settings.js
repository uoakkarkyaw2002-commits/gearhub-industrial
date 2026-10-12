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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#101a14" : "#183426");
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
    const supported = "Notification" in window && "serviceWorker" in navigator;
    input.disabled = !supported;
    input.checked = supported && localStorage.getItem("gh-notifications") === "on" && Notification.permission === "granted";
    if (!supported) help.textContent = words("notificationUnsupported");
    else if (Notification.permission === "denied") help.textContent = words("notificationDenied");
    else help.textContent = words("notificationsHelp");
  }

  const formatBytes = bytes => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  async function updateStorageUsage() {
    const label = byId("storage-usage"), meter = byId("storage-meter-fill");
    if (!label || !meter) return;
    try {
      const response = await fetch("/api/storage", { cache: "no-store" });
      if (!response.ok) throw new Error("Storage endpoint unavailable");
      const { usedBytes = 0, capacityBytes = 0, availableBytes = 0 } = await response.json();
      const used = formatBytes(usedBytes), capacity = formatBytes(capacityBytes), available = formatBytes(availableBytes);
      label.textContent = words("storageUsageLabel").replace("{used}", used).replace("{available}", available).replace("{capacity}", capacity);
      meter.style.width = `${capacityBytes ? Math.min(100, Math.max(2, usedBytes / capacityBytes * 100)) : 0}%`;
      meter.parentElement.setAttribute("aria-label", label.textContent);
    } catch {
      label.textContent = words("storageUnavailable");
      meter.style.width = "0%";
    }
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
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      updateNotificationSetting();
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("gh-notifications", "on");
      message("notificationEnabled");
    } else {
      localStorage.removeItem("gh-notifications");
      message("notificationDenied");
    }
    updateNotificationSetting();
  }

  applyTheme(savedTheme);
  updateLanguageButtons();
  updateNotificationSetting();
  updateStorageUsage();
  byId("offline-mode-toggle").checked = localStorage.getItem("gh-offline-mode") === "on";

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
  byId("lang").addEventListener("click", updateLanguageButtons);
  function showDownloadStatus(state) {
    const help = byId("auto-download-help");
    if (!help) return;
    const enabled = localStorage.getItem("gh-offline-mode") === "on";
    const status = !enabled ? "autoDownloadHelp" : ({downloading:"autoDownloadSaving",ready:"autoDownloadReady",waiting:"autoDownloadWaiting",retry:"autoDownloadRetry"}[state] || "autoDownloadHelp");
    help.dataset.i18n = status;
    help.textContent = words(status);
  }
  showDownloadStatus(localStorage.getItem("gh-offline-downloaded-at") ? "ready" : "waiting");
  window.addEventListener("gearhub:auto-download", event => showDownloadStatus(event.detail.state));
  byId("offline-mode-toggle").addEventListener("change", async event => {
    const input = event.currentTarget, enabled = input.checked;
    input.disabled = true;
    await new Promise(resolve => setTimeout(resolve, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260));
    localStorage.setItem("gh-offline-mode", enabled ? "on" : "off");
    input.disabled = false;
    if (enabled) {
      showDownloadStatus(navigator.onLine ? "downloading" : "waiting");
      try { await saveOfflineCatalog(); }
      catch { message("", words("autoDownloadRetry")); }
    } else {
      showDownloadStatus("off");
      message("", words("autoDownloadOff"));
    }
  });
  byId("notifications-toggle").addEventListener("change", event => enableNotifications(event.currentTarget.checked));
  byId("about-app-toggle").addEventListener("click", () => {
    const details = byId("about-app-details");
    details.hidden = !details.hidden;
  });
  window.addEventListener("gearhub:data-ready", updateStorageUsage);
  window.addEventListener("storage", updateLanguageButtons);
})();
