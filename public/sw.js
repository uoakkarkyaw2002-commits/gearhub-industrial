const CACHE_NAME = "gearhub-shell-v76-1.1.27";
const SHELL = ["/category-browser.js?v=20261017-speed-1","/tenant-store.js?v=20261018-card-1","/updates.js?v=20261018-refresh-1","/desktop.css?v=20261018-promo-2","/","/style.css?v=20261018-card-3","/site-content.js?v=20261018-refresh-1","/store.js?v=20261018-card-1","/app-install.js?v=20261018-refresh-1","/settings.js?v=20261018-refresh-1","/dialogs.js?v=20261017-share-1","/footer.js?v=20261012-1","/images/hero-excavator.jpg","/app.webmanifest","/app-icon.png","/icons/icon.svg","/icons/apple-touch-icon.png","/qrcode.js?v=1.4.4"];
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
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || /^\/shops\/[^/]+\/admin\/?$/.test(url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(url.pathname === "/" ? "/" : request.url, response.clone()));
      return response;
    }).catch(async () => (async()=>{const tenant=shopPath(url.pathname);if(tenant)return (await caches.open(offlineCache(url.pathname))).match(url.href).then(async saved=>saved||await (await caches.open(CACHE_NAME)).match(url.href)||new Response('This shop is unavailable offline. Connect to the internet to open it.',{status:503,headers:{'Content-Type':'text/plain'}}));return (await caches.open(offlineCache('/'))).match('/').then(saved=>saved||caches.match('/'));})()));
    return;
  }
  if(url.pathname==="/app.webmanifest"){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));return;}
  if (/\.(?:png|jpe?g|webp|gif|avif)$/.test(url.pathname) || url.pathname.startsWith("/uploads/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  if (/\.(?:css|js|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});

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
