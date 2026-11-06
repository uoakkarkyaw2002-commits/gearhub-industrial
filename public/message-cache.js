/* Small page-lifetime chat cache. Responses are never written to browser storage or the service worker. */
(function(root){
 function create(load,limit=24){
  const values=new Map(),pending=new Map();let generation=0;
  const peek=key=>values.get(key);
  const put=(key,value)=>{values.delete(key);values.set(key,value);while(values.size>limit)values.delete(values.keys().next().value);return value};
  const clear=()=>{generation++;values.clear();pending.clear()};
  const read=key=>{
   if(pending.has(key))return pending.get(key);
   const epoch=generation,before=peek(key);
   const promise=Promise.resolve().then(()=>load(key)).then(value=>{
    // A send or a session reset may have superseded this request.
    if(epoch===generation&&peek(key)===before)put(key,value);
    return epoch===generation?peek(key):null;
   }).catch(error=>{if(epoch===generation&&(error.status===401||error.status===403))clear();throw error}).finally(()=>{if(pending.get(key)===promise)pending.delete(key)});
   pending.set(key,promise);return promise;
  };
  return {peek,put,clear,load:read};
 }
 if(typeof module==='object'&&module.exports)module.exports=create;else root.GearHubMessageCache=create;
})(typeof window==='undefined'?null:window);
