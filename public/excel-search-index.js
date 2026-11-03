/* Sparse, reusable search text. The worker receives text only, never viewer styles or shop access. */
(()=>{
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function build(sheet){
  const rows=new Map();let n=0;
  for(const [key,cell] of sheet.cells){
   const [r,c]=key.split(',').map(Number),text=String(cell.text??'').trim();
   if(r<=sheet.maxR&&c<=sheet.maxC&&sheet.widths?.[c]!==0&&text){
    if(!rows.has(r))rows.set(r,[]);rows.get(r).push(text.toLocaleLowerCase());
   }
   if(++n%2000===0)await pause();
  }
  const ordered=[...rows].sort((a,b)=>a[0]-b[0]);
  const head=ordered.find(([,texts])=>texts.length>=2)?.[0]??0;
  return{head,rows:ordered.filter(([r])=>r>head&&sheet.heights?.[r]!==0)};
 }
 async function match(rows,query,limit=200){
  const needle=query.trim().toLocaleLowerCase(),hits=[];let n=0;
  if(!needle)return hits;
  for(const [r,texts] of rows){
   if(texts.some(text=>text.includes(needle))){hits.push(r);if(hits.length>=limit)break}
   if(++n%2000===0)await pause();
  }
  return hits;
 }
 if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope){
  let rows=[];
  self.onmessage=async({data})=>{
   if(data.rows){rows=data.rows;return}
   self.postMessage({id:data.id,hits:await match(rows,data.query,data.limit)});
  };
  return;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={build,match};return}
 const indexes=new WeakMap();
 window.GearHubExcelIndex={
  async forSheet(sheet){
   if(!indexes.has(sheet))indexes.set(sheet,(async()=>{
    const index=await build(sheet);let worker=null,id=0;const pending=new Map();
    const stop=()=>{worker?.terminate();worker=null;for(const task of pending.values())task();pending.clear()};
    try{
     worker=new Worker('/excel-search-index.js?v=1.1.267');
     worker.onmessage=({data})=>pending.get(data.id)?.(data.hits);
     worker.onerror=event=>{event.preventDefault();stop()};
     worker.postMessage({rows:index.rows});
    }catch{stop()}
    return{head:index.head,dispose:stop,search:query=>{
     if(!worker)return match(index.rows,query);
     return new Promise(resolve=>{
      const key=++id,timer=setTimeout(stop,3000);
      pending.set(key,hits=>{clearTimeout(timer);pending.delete(key);resolve(hits??match(index.rows,query))});
      try{worker.postMessage({id:key,query,limit:200})}catch{stop()}
     });
    }};
   })().catch(error=>{indexes.delete(sheet);throw error}));
   return indexes.get(sheet);
  }
 };
})();
