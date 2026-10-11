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
    });
  }

  function updateLanguageButtons() {
    document.querySelectorAll("[data-language-choice]").forEach(button => {
      const active = button.dataset.languageChoice === document.documentElement.lang;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
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

  async function clearAppCache() {
    if (!window.confirm(words("confirmClearCache"))) return;
    localStorage.removeItem("gh-offline-catalog");
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith("gearhub-shell-")).map(name => caches.delete(name)));
    } catch {}
    await updateStorageUsage();
    message("cacheCleared");
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

  document.querySelectorAll("[data-theme-choice]").forEach(button => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice)));
  document.querySelectorAll("[data-language-choice]").forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.languageChoice)));
  byId("lang").addEventListener("click", updateLanguageButtons);
  byId("offline-mode-toggle").addEventListener("change", event => {
    const enabled = event.currentTarget.checked;
    if (enabled) {
      localStorage.setItem("gh-offline-mode", "on");
      if (typeof saveOfflineCatalog === "function") saveOfflineCatalog();
      message("offlineEnabled");
    } else {
      localStorage.setItem("gh-offline-mode", "off");
      localStorage.removeItem("gh-offline-catalog");
      message("offlineDisabled");
    }
    updateStorageUsage();
  });
  byId("notifications-toggle").addEventListener("change", event => enableNotifications(event.currentTarget.checked));
  byId("clear-cache").addEventListener("click", clearAppCache);
  byId("about-app-toggle").addEventListener("click", () => {
    const details = byId("about-app-details");
    details.hidden = !details.hidden;
  });
  byId("payment-details-toggle").addEventListener("click", () => {
    const details = byId("payment-details-more");
    details.hidden = !details.hidden;
  });
  byId("copy-payment-account").addEventListener("click", async () => {
    const number = byId("payment-account-number").textContent.trim();
    if (!number || number === "—") return;
    try {
      await navigator.clipboard.writeText(number);
      message("copyDone");
    } catch {
      const input = document.createElement("textarea");
      input.value = number;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      message(copied ? "copyDone" : "copyDone", copied ? "" : number);
    }
  });
  window.addEventListener("gearhub:data-ready", updateStorageUsage);
  window.addEventListener("storage", updateLanguageButtons);
})();
