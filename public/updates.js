(() => {
  const draftKey = "gh-update-draft:" + location.pathname;
  let registration,
    release,
    requested = false;
  function fields() {
    return [...document.querySelectorAll("input,textarea,select")].filter(
      (e) => (e.name || e.id) && e.type !== "password" && e.type !== "file",
    );
  }
  function saveDraft() {
    const entries = fields().map((e) => ({
      form: e.form?.id || "",
      name: e.name,
      id: e.id,
      type: e.type,
      value: e.value,
      checked: e.checked,
    }));
    sessionStorage.setItem(draftKey, JSON.stringify(entries));
  }
  function restore() {
    let entries;
    try {
      entries = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    } catch {
      return;
    }
    if (!entries) return;
    const remaining = [];
    for (const d of entries) {
      const form = d.form ? document.getElementById(d.form) : document;
      const e = [
        ...(form?.querySelectorAll("input,textarea,select") || []),
      ].find(
        (e) =>
          (d.name ? e.name === d.name : e.id === d.id) && e.type === d.type,
      );
      if (e) {
        e.value = d.value;
        if (e.type === "checkbox" || e.type === "radio") e.checked = d.checked;
      } else remaining.push(d);
    }
    if (remaining.length)
      sessionStorage.setItem(draftKey, JSON.stringify(remaining));
    else sessionStorage.removeItem(draftKey);
  }
  function blocked() {
    return (
      window.__gearhubCheckoutPending || window.__gearhubPlatformPending ||
      [...document.querySelectorAll("form button")].some(
        (e) => e.disabled && e.dataset.busy === "true",
      ) ||
      [...document.querySelectorAll("input[type=file]")].some(
        (e) => e.files?.length,
      )
    );
  }
  function banner() {
    if (!release) return;
    let box = document.getElementById("gearhub-update-banner");
    if (!box) {
      box = document.createElement("aside");
      box.id = "gearhub-update-banner";
      box.className = "update-banner";
      box.setAttribute("aria-live", "polite");
      Object.assign(box.style, {
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        zIndex: "60",
        maxWidth: "650px",
        margin: "auto",
        background: "#fff9e6",
        color: "#192820",
        padding: "14px",
        border: "2px solid #c39638",
        borderRadius: "14px",
        boxShadow: "0 5px 20px #0002",
      });
      document.body.append(box);
    }
    box.replaceChildren();
    const text = document.createElement("p");
    text.textContent = "Update " + release.version + " · " + release.notes;
    const button = document.createElement("button");
    button.textContent = "Update / အသစ်ကိုသုံးရန်";
    button.type = "button";
    button.onclick = () => apply();
    box.append(text, button);
  }
  async function check() {
    try {
      const r = await fetch("/api/app-release", { cache: "no-store" });
      if (!r.ok) return;
      release = await r.json();
      if (
        release.platformEnabled &&
        !document.querySelector("[data-platform-link]")
      ) {
        const nav = document.querySelector("header nav");
        if (nav) {
          const a = document.createElement("a");
          a.href = "/platform.html";
          a.dataset.platformLink = "true";
          a.textContent = "My shop";
          nav.append(a);
        }
      }
      const seen = localStorage.getItem("gh-app-version");
      if (!seen) localStorage.setItem("gh-app-version", release.version);
      if ((seen && seen !== release.version) || registration?.waiting) banner();
    } catch {}
  }
  async function apply() {
    const box = document.getElementById("gearhub-update-banner");
    if (blocked()) {
      if (box) {
        const p = document.createElement("p");
        p.textContent =
          "Finish the active action or clear the selected file before updating. လုပ်ဆောင်နေမှု/ရွေးထားသောဖိုင်ကို အရင်ပြီးစီးပါ။";
        box.append(p);
      }
      return false;
    }
    try {
      saveDraft();
      if (registration) {
        await registration.update();
        const installing = registration.installing;
        if (
          installing &&
          installing.state !== "installed" &&
          installing.state !== "activated"
        )
          await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(Error("Update timed out")),
              30000,
            );
            installing.addEventListener("statechange", () => {
              if (["installed", "activated"].includes(installing.state)) {
                clearTimeout(timer);
                resolve();
              } else if (installing.state === "redundant") {
                clearTimeout(timer);
                reject(Error("Update failed"));
              }
            });
          });
      }
      localStorage.setItem("gh-app-version", release?.version || "1.0.0");
      requested = true;
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "APPLY_UPDATE" });
        return true;
      }
      location.reload();
      return true;
    } catch {
      requested = false;
      return false;
    }
  }
  window.GearHubUpdates = { apply, restore, blocked, saveDraft };
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (requested) location.reload();
  });
  window.addEventListener("load", async () => {
    restore();
    if ("serviceWorker" in navigator && isSecureContext) {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        registration.addEventListener("updatefound", () => {
          registration.installing?.addEventListener("statechange", () => {
            if (registration.waiting) check();
          });
        });
      } catch {}
    }
    await check();
    setInterval(check, 60000);
  });
})();
