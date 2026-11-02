// 1.1.249 owner: the number on the app icon (set by the service worker for each alert) is cleared when the app
// is opened or comes back on screen — the owner has now seen what arrived.
(()=>{
 const scope=location.origin+(location.pathname.match(/^\/shops\/[a-z0-9-]+\//)||["/"])[0];
 async function clear(){
  if(document.visibilityState==="hidden")return;
  try{if(navigator.clearAppBadge)await navigator.clearAppBadge()}catch{}
  try{if(window.caches){const c=await caches.open("gearhub-badge");await c.delete(scope+"__badge")}}catch{}
 }
 clear();
 document.addEventListener("visibilitychange",clear);
 addEventListener("focus",clear);
})();
