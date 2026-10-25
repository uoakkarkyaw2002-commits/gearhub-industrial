/* Read-only catalogue projection. Never mutates category/product records. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GearHubCategories=api;})(typeof window==='object'?window:globalThis,()=>{
 function model(products,categories,{selected='',query='',sort='featured',stockOnly=false,directOnly=false}={}){
  const normalized=v=>String(v||'').trim().toLowerCase();
  const all=categories.map(c=>({...c})),known=new Set(all.map(c=>normalized(c.category_en)));
  for(const p of products)if(!known.has(normalized(p.category_en))){known.add(normalized(p.category_en));all.push({id:'product-category:'+p.category_en,category_en:p.category_en||'',category_my:p.category_my||p.category_en||'',parent_id:null});}
  const find=value=>all.find(c=>String(c.id)===String(value))||all.find(c=>c.category_en===value);
  const kids=c=>all.filter(x=>String(x.parent_id)===String(c?.id));
  // A category and everything under it, by ID (two categories may share a name under different mains).
  function tree(c,seen=new Set()){if(!c||seen.has(String(c.id)))return [];seen.add(String(c.id));return [c,...kids(c).flatMap(x=>tree(x,seen))];}
  const home=p=>categoryOf(p,all);
  const records=c=>{const ids=new Set(tree(c).map(x=>String(x.id)));return products.filter(p=>ids.has(String(home(p)?.id)));};
  const direct=c=>products.filter(p=>c&&home(p)===c);
  const count=c=>records(c).length,current=(selected?find(selected):null)||all.find(c=>!c.parent_id)||all[0]||null,parent=current?.parent_id?find(current.parent_id):current;
  const q=normalized(query),matches=c=>[c.category_en,c.category_my].some(v=>normalized(v).includes(q));
  const mains=all.filter(c=>!c.parent_id||!find(c.parent_id));
  const visibleMains=mains.filter(c=>!q||tree(c).some(matches)||records(c).some(p=>[p.name_en,p.name_my,p.sku].some(v=>normalized(v).includes(q))));
  const children=(current?kids(current):mains).filter(c=>!q||matches(c)||records(c).some(p=>[p.name_en,p.name_my,p.sku].some(v=>normalized(v).includes(q))));
  const matchingCategoryIds=new Set(all.filter(matches).flatMap(c=>tree(c)).map(c=>String(c.id)));
  const path=[];let ancestor=current;const visited=new Set();while(ancestor&&!visited.has(ancestor)){visited.add(ancestor);path.unshift(ancestor);ancestor=ancestor.parent_id?find(ancestor.parent_id):null;}
  let matching=(current?(directOnly?direct(current):records(current)):products.slice()).filter(p=>(!stockOnly||Number(p.stock)>0)&&(!q||[p.name_en,p.name_my,p.sku,p.category_en,p.category_my].some(v=>normalized(v).includes(q))||matchingCategoryIds.has(String(home(p)?.id))||!!(current&&matches(current))));
  if(sort==='low')matching.sort((a,b)=>a.price-b.price);if(sort==='high')matching.sort((a,b)=>b.price-a.price);
  return {all,mains,visibleMains,current,parent,children,matching,count,kids,direct,path,rootCategory:path[0]||null,detail:!!current&&!kids(current).length};
 }
 // The category a product belongs to: its category ID while that category still has the product's
 // category name, otherwise the first category with that name (same rule as the shop server).
 function categoryOf(p,categories){
  const name=String(p?.category_en||'').trim().toLowerCase(),key=c=>String(c.category_en||'').trim().toLowerCase();
  const saved=p?.category_id!=null&&categories.find(c=>String(c.id)===String(p.category_id));
  return saved&&key(saved)===name?saved:categories.find(c=>key(c)===name)||null;
 }
 function isReturnSwipe({dx,dy,elapsed}){return Number.isFinite(dx)&&Number.isFinite(dy)&&elapsed>=0&&elapsed<=700&&dx>=72&&dx>Math.abs(dy)*1.8;}
 return {model,isReturnSwipe,categoryOf};
});
