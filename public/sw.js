const CACHE_NAME = "gearhub-shell-v39";
const SHELL = ["/", "/style.css?v=20261012-19", "/site-content.js?v=20261012-4", "/store.js?v=20261012-12", "/app-install.js?v=20261012-4", "/settings.js?v=20261012-3", "/app.webmanifest", "/app-icon.png", "/icons/icon.svg", "/icons/apple-touch-icon.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("gearhub-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put("/", response.clone()));
      return response;
    }).catch(async () => (await caches.open("gearhub-offline-v1")).match("/").then(saved => saved || caches.match("/"))));
    return;
  }
  if(url.pathname==="/app.webmanifest"){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));return;}
  if (/\.(?:png|jpe?g|webp|gif|avif)$/.test(url.pathname) || url.pathname.startsWith("/uploads/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  if (/\.(?:css|js|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});

self.addEventListener("message", event => {
 if(event.data?.type !== "SAVE_OFFLINE") return;
 event.waitUntil((async () => {
  try {
   const cache = await caches.open("gearhub-offline-v1");
   const urls = [...new Set(event.data.urls || [])].filter(value => {
    const url = new URL(value,self.location.origin);
    return url.origin === self.location.origin && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/admin");
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
