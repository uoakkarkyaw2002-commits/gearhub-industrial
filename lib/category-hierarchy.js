// Shared request validation. Parent names refer only to the submitted shop's category set.
// sameNameUnderOtherParents (seller shops, owner's request): "Sany" may be under two different main
// categories; names stay unique among the categories of one parent. Parents are then found by ID
// (a parent given only by a name that two categories share must be a main category).
const key=v=>String(v||'').trim().toLowerCase();
function validateHierarchy(rows,{sameNameUnderOtherParents=false}={}){
 const byName=new Map(),byId=new Map();
 for(const row of rows){
  if(!key(row.category_en)||!sameNameUnderOtherParents&&byName.has(key(row.category_en)))throw Error('Category names must be unique.');
  byName.set(key(row.category_en),[...(byName.get(key(row.category_en))||[]),row]);
  if(row.id!=null){if(!Number.isSafeInteger(row.id)||row.id<1||byId.has(row.id))throw Error('Invalid or duplicate category ID. Reload before editing.');byId.set(row.id,row);}
 }
 const parentOf=new Map();
 for(const row of rows){
  let parent=null;
  if(row.parent_id!=null){parent=byId.get(Number(row.parent_id));if(!parent||row.parent_en&&key(parent.category_en)!==key(row.parent_en))throw Error('Choose a parent from this shop’s categories.');}
  else if(row.parent_en){
   const named=byName.get(key(row.parent_en))||[],mains=named.filter(p=>!p.parent_en&&p.parent_id==null);
   if(!named.length)throw Error('The parent category is missing. Move or remove its children first.');
   if(named.length>1&&mains.length!==1)throw Error('Two categories are called "'+row.parent_en+'". Choose the parent category again.');
   parent=named.length>1?mains[0]:named[0];
  }
  if(parent){row.parent_en=parent.category_en;if(sameNameUnderOtherParents&&parent.id!=null)row.parent_id=parent.id;}
  parentOf.set(row,parent);
 }
 if(sameNameUnderOtherParents){const siblings=new Map();for(const row of rows){const names=siblings.get(parentOf.get(row))||new Set();if(names.has(key(row.category_en)))throw Error('Two categories in the same place are called "'+row.category_en+'". Use another name.');names.add(key(row.category_en));siblings.set(parentOf.get(row),names);}}
 function depth(row,seen=new Set()) {if(seen.has(row))throw Error('A category cannot be its own ancestor. Remove the cycle.');seen.add(row);const d=parentOf.get(row)?depth(parentOf.get(row),seen)+1:1;if(d>3)throw Error('Use Main → Subcategory → Child subcategory (maximum three levels).');return d;}
 rows.forEach(row=>depth(row));return rows;
}
// The category a product belongs to: its saved category ID while that category still has the
// product's category name; otherwise (older products, a renamed or deleted category) the first
// category with that name.
function categoryOf(product,categories){
 const name=key(product.category),saved=product.categoryId!=null&&categories.find(c=>Number(c.id)===Number(product.categoryId));
 return saved&&key(saved.category_en)===name?saved:categories.find(c=>key(c.category_en)===name)||null;
}
module.exports={validateHierarchy,categoryOf};
