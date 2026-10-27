/* Free AI #5 (FREE_AI_PLAN.md): smarter shop search, in the phone itself (no server, no outside service).
   Every word typed must match a word of the product (name, SKU, part number, category) in any order,
   allowing small spelling mistakes; codes match without spaces or dashes ("k100-1858" → "K1001858A"). */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GearHubSmartSearch=api;})(typeof window==='object'?window:globalThis,()=>{
 const words=text=>String(text||'').toLowerCase().split(/[^0-9a-zက-႟]+/).filter(Boolean);
 const squash=text=>String(text||'').toLowerCase().replace(/[^0-9a-zက-႟]+/g,'');
 // Edit distance with an early stop (only small distances matter).
 function distance(a,b,limit){if(Math.abs(a.length-b.length)>limit)return limit+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];let best=i;for(let j=1;j<=b.length;j++){row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(row[j]<best)best=row[j];}if(best>limit)return limit+1;prev=row;}return prev[b.length];}
 // Short words must be exact; longer ones allow one mistake, very long ones two.
 const allowed=word=>word.length<=3?0:word.length<=7?1:2;
 function wordMatches(q,list){
  const limit=allowed(q);
  return list.some(w=>w.includes(q)||(w.length>q.length&&distance(q,w.slice(0,q.length),limit)<=limit)||distance(q,w,limit)<=limit);
 }
 function matches(text,query){
  const qs=words(query);if(!qs.length)return false;
  const list=words(text),codes=squash(text);
  // A code typed with spaces or dashes is compared without them.
  if(squash(query).length>=5&&codes.includes(squash(query)))return true;
  return qs.every(q=>wordMatches(q,list));
 }
 return {matches,distance};
});
