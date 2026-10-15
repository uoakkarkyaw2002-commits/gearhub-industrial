// Shared request validation. Parent names refer only to the submitted shop's category set.
function validateHierarchy(rows){
 const key=v=>String(v||'').trim().toLowerCase(),byName=new Map(),byId=new Map();
 for(const row of rows){if(!key(row.category_en)||byName.has(key(row.category_en)))throw Error('Category names must be unique.');byName.set(key(row.category_en),row);if(row.id!=null){if(!Number.isSafeInteger(row.id)||row.id<1||byId.has(row.id))throw Error('Invalid or duplicate category ID. Reload before editing.');byId.set(row.id,row);}}
 for(const row of rows){
  if(row.parent_id!=null){const parent=byId.get(Number(row.parent_id));if(!parent||row.parent_en&&key(parent.category_en)!==key(row.parent_en))throw Error('Choose a parent from this shop’s categories.');if(!row.parent_en)row.parent_en=parent.category_en;}
  if(row.parent_en){const parent=byName.get(key(row.parent_en));if(!parent)throw Error('The parent category is missing. Move or remove its children first.');row.parent_en=parent.category_en;}
 }
 function depth(row,seen=new Set()) {if(seen.has(row))throw Error('A category cannot be its own ancestor. Remove the cycle.');seen.add(row);const d=row.parent_en?depth(byName.get(key(row.parent_en)),seen)+1:1;if(d>3)throw Error('Use Main → Subcategory → Child subcategory (maximum three levels).');return d;}
 rows.forEach(row=>depth(row));return rows;
}
module.exports={validateHierarchy};
