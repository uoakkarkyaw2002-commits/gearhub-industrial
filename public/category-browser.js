/* Read-only catalogue projection. Never mutates category/product records. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GearHubCategories=api;})(typeof window==='object'?window:globalThis,()=>{
 function model(products,categories,{selected='',query='',sort='featured',stockOnly=false}={}){
  const normalized=v=>String(v||'').trim().toLowerCase();
  const all=categories.map(c=>({...c})),known=new Set(all.map(c=>normalized(c.category_en)));
  for(const p of products)if(!known.has(normalized(p.category_en))){known.add(normalized(p.category_en));all.push({id:'product-category:'+p.category_en,category_en:p.category_en||'',category_my:p.category_my||p.category_en||'',parent_id:null});}
  const find=value=>all.find(c=>String(c.id)===String(value)||c.category_en===value);
  const kids=c=>all.filter(x=>String(x.parent_id)===String(c?.id));
  function names(c,seen=new Set()){if(!c||seen.has(String(c.id)))return [];seen.add(String(c.id));return [normalized(c.category_en),...kids(c).flatMap(x=>names(x,seen))];}
  const records=c=>{const n=new Set(names(c));return products.filter(p=>n.has(normalized(p.category_en)));};
  const count=c=>records(c).length,current=(selected?find(selected):null)||all.find(c=>!c.parent_id)||all[0]||null,parent=current?.parent_id?find(current.parent_id):current;
  const q=normalized(query),matches=c=>[c.category_en,c.category_my].some(v=>normalized(v).includes(q));
  const mains=all.filter(c=>!c.parent_id||!find(c.parent_id));
  const visibleMains=mains.filter(c=>!q||matches(c)||names(c).some(n=>all.some(x=>normalized(x.category_en)===n&&matches(x)))||records(c).some(p=>[p.name_en,p.name_my,p.sku].some(v=>normalized(v).includes(q))));
  const children=(current?kids(current):mains).filter(c=>!q||matches(c)||records(c).some(p=>[p.name_en,p.name_my,p.sku].some(v=>normalized(v).includes(q))));
  const matchingCategoryNames=new Set(all.filter(matches).flatMap(c=>names(c)));
  let matching=(current?records(current):products.slice()).filter(p=>(!stockOnly||Number(p.stock)>0)&&(!q||[p.name_en,p.name_my,p.sku,p.category_en,p.category_my].some(v=>normalized(v).includes(q))||matchingCategoryNames.has(normalized(p.category_en))||!!(current&&matches(current))));
  if(sort==='low')matching.sort((a,b)=>a.price-b.price);if(sort==='high')matching.sort((a,b)=>b.price-a.price);
  return {all,mains,visibleMains,current,parent,children,matching,count,kids,detail:!!current&&!kids(current).length};
 }
 return {model};
});
