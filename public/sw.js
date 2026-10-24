const CACHE_NAME = "gearhub-shell-v85-1.1.144";
const SHELL = ["/skyshop-splash.css?v=20261022-solid-1","/skyshop-splash.js?v=20261022-solid-1","/images/skyshop-splash-phone.jpg?v=1","/images/skyshop-splash-pc.jpg?v=1","/category-browser.js?v=20261017-speed-1","/tenant-store.js?v=20261021-order-fast-1","/excel-map.js?v=20261024-speed-5","/excel-select.js?v=20261024-speed-2","/excel-auto-upload.js?v=20261023-auto-1","/excel-library.js?v=20261023-folder-1","/updates.js?v=20261023-update80-1","/desktop.css?v=20261023-pcnav-2","/","/style.css?v=20261024-excel-rows-1","/site-content.js?v=20261018-share-2","/store.js?v=20261022-percent-1","/liquid-nav.js?v=20261022-nav-drag-1","/card-tilt.js?v=20261023-tilt-1","/app-install.js?v=20261020-shopsw-1","/settings.js?v=20261022-solid-1","/back-nav.js?v=20261020-back-1","/dialogs.js?v=20261017-share-1","/footer.js?v=20261012-1","/images/hero-excavator.jpg","/app.webmanifest","/app-icon.png","/icons/icon.svg","/icons/apple-touch-icon.png","/qrcode.js?v=1.4.4"];
const ADMIN_CACHE="gearhub-admin-v1",IMAGE_CACHE="gearhub-img-v1",EXCEL_CACHE="gearhub-excel-v1";
const shopPath=pathname=>{const m=pathname.match(/^\/shops\/([a-z0-9-]+)(?:\/|$)/);return m?'/shops/'+m[1]+'/':null;};
const offlineCache=pathname=>'gearhub-offline-v2:'+ (shopPath(pathname)||'root');
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("gearhub-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const publicImage = url.pathname.startsWith("/api/platform/images/");
  // Excel files open offline. Each upload has its own address, so a saved file is kept and opens
  // from the phone; the shop's file list is fresh when online and the saved copy when offline.
  if (/^\/api\/platform\/spreadsheets\/[^/]+$/.test(url.pathname)) {
    event.respondWith(caches.open(EXCEL_CACHE).then(async cache => (await cache.match(request)) || fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })));
    return;
  }
  if (/^\/api\/platform\/store\/[^/]+\/spreadsheets$/.test(url.pathname)) {
    event.respondWith(caches.open(EXCEL_CACHE).then(cache => fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(async () => (await cache.match(request)) || Response.error())));
    return;
  }
  if (url.pathname.startsWith("/api/") && !publicImage) return;
  // Admin pages (GearHub and seller shops) open offline from the last copy; they hold no data
  // themselves — saved data lives on the device and is cleared on log out.
  if (request.mode === "navigate" && (url.pathname === "/admin.html" || /^\/shops\/[^/]+\/admin\/?$/.test(url.pathname))) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(ADMIN_CACHE).then(cache => cache.put(url.pathname, copy)); }
      return response;
    }).catch(async () => (await caches.open(ADMIN_CACHE)).match(url.pathname) || new Response("Offline. Open this page once with internet first.", {status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}})));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(url.pathname === "/" ? "/" : request.url, copy)); }
      if (response.ok || response.status < 500) return response;
      throw new Error("server restarting");
    }).catch(async () => (async()=>{const tenant=shopPath(url.pathname);if(tenant)return (await caches.open(offlineCache(url.pathname))).match(url.href).then(async saved=>saved||await (await caches.open(CACHE_NAME)).match(url.href)||new Response('This shop is unavailable offline. Connect to the internet to open it.',{status:503,headers:{'Content-Type':'text/plain'}}));return (await caches.open(offlineCache('/'))).match('/').then(saved=>saved||caches.match('/'));})()));
    return;
  }
  if(url.pathname==="/app.webmanifest"){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response}).catch(()=>caches.match(request)));return;}
  // The opening picture opens from the phone at once (its address changes when the picture does).
  if (url.pathname.startsWith("/images/skyshop-splash-") || /^\/splash-asset\/(?:pc|phone)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(saved => saved || fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(IMAGE_CACHE).then(cache => cache.put(request, copy)); }
      return response;
    })));
    return;
  }
  if (publicImage || /\.(?:png|jpe?g|webp|gif|avif)$/.test(url.pathname) || url.pathname.startsWith("/uploads/")) {
    // Photos seen once stay available offline; newer copies replace them when online.
    event.respondWith(fetch(request).then(response => {
      if (response.ok && response.type === "basic") { const copy = response.clone(); caches.open(IMAGE_CACHE).then(async cache => { await cache.put(request, copy); const keys = await cache.keys(); for (const key of keys.slice(0, Math.max(0, keys.length - 900))) await cache.delete(key); }); }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
    return;
  }
  if (/\.(?:css|js|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      // Copy before the page reads the body, otherwise the copy fails silently.
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
      if (response.ok) return response;
      return cachedAsset(request).then(saved => saved || response);
    }).catch(() => cachedAsset(request)));
  }
});
// While Render restarts during a deploy, a stylesheet or script can fail for a few seconds.
// Use a saved copy (even one with another ?v=) so the page never shows without its styles.
async function cachedAsset(request) {
  return (await caches.match(request)) || (await caches.match(request, {ignoreSearch: true}));
}

self.addEventListener("message", event => {
 if(event.data?.type === "APPLY_UPDATE"){self.skipWaiting();return;}
 if(event.data?.type !== "SAVE_OFFLINE") return;
 event.waitUntil((async () => {
  try {
   const clientUrl=new URL(event.source?.url||self.location.origin);
   const tenant=shopPath(clientUrl.pathname);
   const cache = await caches.open(offlineCache(clientUrl.pathname));
   const urls = [...new Set(event.data.urls || [])].filter(value => {
    const url = new URL(value,self.location.origin);
    return url.origin === self.location.origin && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/admin") && !/^\/shops\/[^/]+\/admin(?:\/|$)/.test(url.pathname) && (tenant ? (!url.pathname.startsWith('/shops/') || shopPath(url.pathname)===tenant) && url.pathname!=='/' : !url.pathname.startsWith('/shops/'));
   });
   let failures = 0;
   for(let start=0;start<urls.length;start+=6){
    await Promise.all(urls.slice(start,start+6).map(async url => {
     try {const response=await fetch(url,{cache:"reload"});if(!response.ok)throw new Error();await cache.put(url,response);}
     catch(_){if(!(await cache.match(url)))failures++;}
    }));
   }
   event.ports[0]?.postMessage({ok:failures===0,error:failures?"ပုံအချို့ သိမ်းမရသေးပါ။ Internet ချိတ်ပြီး Offline mode ကို ပြန်ဖွင့်ပေးပါ။":null});
  }catch(_){event.ports[0]?.postMessage({ok:false,error:"Offline သိမ်းမရပါ။ ဖုန်း storage နဲ့ internet ကို စစ်ပေးပါ။"});}
 })());
});

// New-order alerts from the server (GearHub or a seller shop admin). Every order is its
// own notification with sound, shown even when the phone is locked or the app is closed.
// If that admin is open on screen, the page also plays its order sound right away.
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "🔔 New order";
  const url = data.url || "/admin.html#orders-content";
  event.waitUntil((async () => {
    const path = new URL(url, self.location.origin).pathname;
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of open) if (new URL(client.url).pathname === path) client.postMessage({ type: "gearhub-order-alert", orderId: data.orderId ?? null, kind: data.kind || "order" });
    await self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/app-icon.png",
      badge: data.icon || "/app-icon.png",
      tag: data.tag || "gearhub-order-" + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200, 100, 200],
      data: { url }
    });
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin.html", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const same = list.find(c => new URL(c.url).pathname === target.pathname);
    if (same) return same.focus().then(c => (c && "navigate" in c ? c.navigate(target.href) : c)).catch(() => same.focus());
    return self.clients.openWindow(target.href);
  }));
});
