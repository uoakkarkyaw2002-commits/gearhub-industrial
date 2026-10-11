(() => {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {}), { once: true });
  }

  const card = document.getElementById("app-install-card");
  const button = document.getElementById("app-install-button");
  if (!card || !button) return;
  const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (installed) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  if (isIOS) {
    card.hidden = false;
  } else {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      card.hidden = false;
      button.hidden = false;
      document.getElementById("app-install-instructions").textContent = "Add GearHub to your device for a full-screen app experience.";
    });
    window.addEventListener("appinstalled", () => { card.hidden = true; installPrompt = null; });
    button.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    });
  }
})();
