/* 1.1.344 owner: keep what the phone remembers on the server too (signed-in people only; guests keep it on the phone).
   get(key) -> the saved value or null; put(key, value) saves it. Only a few keys are accepted by the server. */
(()=>{
 let csrf='',off=false;
 const url=k=>'/api/platform/userdata/'+encodeURIComponent(k);
 async function token(){if(!csrf)csrf=(await (await fetch('/api/platform/me',{cache:'no-store',credentials:'same-origin'})).json()).csrfToken||'';return csrf}
 async function get(key){
  if(off)return null;
  try{const r=await fetch(url(key),{cache:'no-store',credentials:'same-origin'});if(r.status===401){off=true;setTimeout(()=>{off=false},60000);return null}if(!r.ok)return null;return (await r.json()).value??null}catch{return null}
 }
 async function put(key,value){
  if(off)return false;
  try{
   const send=async()=>fetch(url(key),{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':await token()},body:JSON.stringify({value})});
   let r=await send();if(r.status===403){csrf='';r=await send()}
   if(r.status===401){off=true;setTimeout(()=>{off=false},60000)}
   return r.ok;
  }catch{return false}
 }
 window.GearHubUserData={get,put};
})();
