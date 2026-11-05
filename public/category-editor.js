/* 1.1.326 owner: Profile → + Add → Category edits the categories right on the Profile, with the admin's own
   Product Categories (same rows, icons, editor, Select Parent Category picker, + Add Main Category,
   Save Categories, swipe left to delete). Ported from admin.js; it saves through the shop's categories API. */
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CATEGORY_PLANT='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M12 1.8c1.7 1.7 2.3 3.8 1.5 5.9-.4 1-1 1.7-1.5 2-.5-.3-1.1-1-1.5-2-.8-2.1-.2-4.2 1.5-5.9z"/><path d="M11.2 13.2c-1-2.7-3.5-4.2-6.7-3.8.7 2.9 3.2 4.6 6.7 3.8z"/><path d="M12.8 13.2c1-2.7 3.5-4.2 6.7-3.8-.7 2.9-3.2 4.6-6.7 3.8z"/><path d="M11.2 17.8c-1.2-2.3-3.6-3.4-6.3-2.7 1 2.4 3.4 3.5 6.3 2.7z"/><path d="M12.8 17.8c1.2-2.3 3.6-3.4 6.3-2.7-1 2.4-3.4 3.5-6.3 2.7z"/><rect x="11.2" y="8.5" width="1.6" height="14" rx=".8"/></g></svg>',CATEGORY_FOLDER='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4.2l2 2.2h6.8A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
 window.GearHubCategoryEditor={open:async({shopId,sheet,openSheet,call,afterSave})=>{
  if(!Number.isSafeInteger(shopId)||shopId<1)return;
  const url='/api/platform/shops/'+shopId+'/categories';
  let categoryRows=[],categorySequence=0,categorySaving=false,dirty=false;const categoryExpanded=new Set(),categoryEditing=new Set();
  openSheet('<div class="admin-section-content" id="category-manager-content"><div class="category-editor-toolbar"><button type="button" id="category-editor-back" aria-label="Back to profile">←</button><div><h2>Product Categories</h2><p>Manage main categories and subcategories</p></div></div><form id="category-manager-form"><div id="category-manager-rows" class="category-manager-rows"></div><button type="button" class="category-add-main" id="add-main-category">＋ Add Main Category</button><button type="submit" class="primary full" id="save-categories">Save Categories</button><p id="category-manager-message" role="status" aria-live="polite"></p></form></div>');
  sheet.classList.add('profile-work-sheet','profile-category-sheet');sheet.setAttribute('aria-label','Product Categories');
  const $=id=>sheet.querySelector('#'+id),root=$('category-manager-rows');
  const msg=(text,kind)=>{const m=$('category-manager-message');if(!m)return;m.textContent=text||'';m.className=kind||''};
  const toast=text=>window.toast?.(text);
  // Leaving with unsaved changes asks first (like the admin's draft guard).
  const guard=e=>{if(e.type==='cancel'&&sheet.querySelector('.category-picker-backdrop')){e.preventDefault();return}if(dirty&&!confirm('Leave without saving the categories?')){e.preventDefault();e.stopImmediatePropagation()}};
  sheet.addEventListener('cancel',guard);const closeX=sheet.querySelector('#profile-sheet-close');closeX?.addEventListener('click',guard,true);
  sheet.addEventListener('close',()=>{sheet.classList.remove('profile-work-sheet','profile-category-sheet');sheet.removeAttribute('aria-label');sheet.removeEventListener('cancel',guard);closeX?.removeEventListener('click',guard,true)},{once:true});
  function categoryParent(c){if(!c?.parent_en)return null;const named=categoryRows.filter(p=>p!==c&&p.category_en===c.parent_en);return categoryRows.find(p=>p!==c&&(c._parentKey&&p._key===c._parentKey||c.parent_id!=null&&p.id!=null&&String(p.id)===String(c.parent_id)))||named.find(p=>!p.parent_en)||named[0]||null;}
  function categoryChildren(category){return categoryRows.filter(row=>row!==category&&categoryParent(row)===category);}
  function categoryDepth(c,seen=new Set()){if(!c||seen.has(c))return 3;seen.add(c);return c.parent_en?categoryDepth(categoryParent(c),seen)+1:0;}
  function categoryTotal(c,seen=new Set()){if(seen.has(c))return 0;seen.add(c);return Number(c.product_count||0)+categoryChildren(c).reduce((sum,row)=>sum+categoryTotal(row,seen),0);}
  function expandCategoryParents(c){const seen=new Set();while(c?.parent_en&&!seen.has(c)){seen.add(c);c=categoryParent(c);if(c)categoryExpanded.add(c._key);}}
  function categoryParentChoices(c){return categoryRows.filter(p=>p!==c&&p.category_en&&categoryDepth(p)<2&&!function below(x){const visited=new Set();while(x?.parent_en&&!visited.has(x)){visited.add(x);x=categoryParent(x);if(x===c)return true;}return false;}(p));}
  function categoryRowMarkup(c,depth=0,seen=new Set()){
   if(seen.has(c))return '';seen=new Set(seen);seen.add(c);
   const key=esc(c._key),children=categoryChildren(c),expanded=categoryExpanded.has(c._key),editing=categoryEditing.has(c._key),count=categoryTotal(c);
   const bannerEditor=!depth?`<section class="category-banner-editor"><strong>Main category banner</strong><p>This image appears when customers open this main category. <small class="appearance-ratio">4:1 · 1600 × 400 · ထည့်ရင် ဘောင်နဲ့ကိုက်အောင် ချိန်ပေးမယ်</small></p><div class="category-banner-editor-row">${c.bannerUrl?`<img src="${esc(c.bannerUrl)}" alt="" class="category-banner-preview">`:'<span class="category-banner-empty">No banner selected</span>'}<label class="secondary category-banner-upload">Choose banner<input type="file" accept="image/jpeg,image/png,image/webp" data-category-banner-upload="${key}"></label>${c.bannerUrl?`<button type="button" class="secondary" data-category-command="remove-banner" data-category-key="${key}">Remove</button>`:''}</div></section>`:'';
   return `<article class="category-design-row ${depth?'category-child':'category-main'}" style="touch-action:pan-y" data-category-depth="${depth}" data-category-key="${key}"><div class="category-design-heading"><span class="category-tree-icon" aria-hidden="true">${depth?CATEGORY_FOLDER:CATEGORY_PLANT}</span><div class="category-design-copy"><h3>${esc(c.category_en||'New category')}</h3>${c.category_my&&c.category_my!==c.category_en?`<small class="category-admin-myanmar">${esc(c.category_my)}</small>`:''}<p>${['Main category','Subcategory','Child subcategory'][Math.min(depth,2)]} · ${count} products</p></div><div class="category-design-actions"><span class="category-count">${count} ${count===1?'product':'products'}</span><button type="button" class="category-chevron" data-category-command="expand" data-category-key="${key}" aria-expanded="${expanded}" aria-label="Expand or collapse ${esc(c.category_en||'category')}">${expanded?'⌄':'›'}</button><button type="button" data-category-command="edit" data-category-key="${key}" aria-label="Edit ${esc(c.category_en||'category')}">✎</button><button type="button" hidden data-category-command="remove" data-category-key="${key}" aria-hidden="true" tabindex="-1"></button></div></div><div class="category-edit-fields ${editing?'':'hidden'}"><div class="category-admin-fields"><label>English name<input data-category-value="category_en" data-category-key="${key}" maxlength="100" value="${esc(c.category_en)}"></label><label>မြန်မာအမည်<input data-category-value="category_my" data-category-key="${key}" maxlength="100" value="${esc(c.category_my)}"></label><label>Parent category<input readonly class="category-picker-trigger" aria-haspopup="dialog" data-category-command="pick-parent" data-category-key="${key}" value="${esc(c.parent_en||'Main category (no parent)')}"></label><label>Icon (optional)<input data-category-value="icon" data-category-key="${key}" maxlength="12" value="${esc(c.icon||'')}"></label></div>${bannerEditor}<div class="category-edit-actions"><button type="button" data-category-command="up" data-category-key="${key}">↑ Move up</button><button type="button" data-category-command="down" data-category-key="${key}">↓ Move down</button>${depth<2?`<button type="button" data-category-command="add-sub" data-category-key="${key}">＋ ${depth?'Child subcategory':'Subcategory'}</button>`:''}<button type="button" data-category-command="done" data-category-key="${key}">Done</button></div></div>${expanded?`<div class="category-design-children">${children.map(child=>categoryRowMarkup(child,depth+1,seen)).join('')}${depth<2?`<button type="button" class="category-add-sub" data-category-command="add-sub" data-category-key="${key}"><span class="category-add-plus" aria-hidden="true">+</span>Add ${depth?'Child subcategory':'Subcategory'}</button>`:''}</div>`:''}</article>`;
  }
  function render(rows){
   if(rows){categoryRows=rows.map(c=>({...c,_key:c._key||'category-'+(c.id||'new-'+(++categorySequence))}));for(const c of categoryRows)if(c.parent_en&&!c._parentKey)c._parentKey=categoryParent(c)?._key;}
   const parents=categoryRows.filter(c=>!c.parent_en);
   root.innerHTML=parents.map(c=>categoryRowMarkup(c,0)).join('');
   const orphans=categoryRows.filter(c=>c.parent_en&&!categoryParent(c));
   if(orphans.length)root.innerHTML+=orphans.map(c=>categoryRowMarkup(c,1)).join('');
  }
  function addCategory(parent){if(categorySaving)return;dirty=true;if(parent&&categoryDepth(parent)>=2){msg('Maximum three category levels.','error');return;}const c={_key:'new-'+(++categorySequence),category_en:'',category_my:'',parent_en:parent?.category_en||'',_parentKey:parent?._key,icon:'',product_count:0};categoryRows.push(c);categoryEditing.add(c._key);if(parent)categoryExpanded.add(parent._key);render();root.querySelector('[data-category-value="category_en"][data-category-key="'+c._key+'"]')?.focus();}
  $('add-main-category').addEventListener('click',()=>addCategory());
  $('category-editor-back').addEventListener('click',()=>sheet.querySelector('#profile-sheet-close')?.click());
  root.addEventListener('input',event=>{const input=event.target;if(!input.dataset.categoryValue)return;dirty=true;const c=categoryRows.find(row=>row._key===input.dataset.categoryKey);if(!c)return;const field=input.dataset.categoryValue,previous=c[field];c[field]=input.value;if(field==='category_en'&&previous)categoryChildren(c).forEach(row=>row.parent_en=c.category_en);});
  root.addEventListener('change',async event=>{
   if(event.target.dataset.categoryValue){expandCategoryParents(categoryRows.find(row=>row._key===event.target.dataset.categoryKey));render();return}
   // Each main category owns its banner; it stays in the draft until Save Categories.
   const input=event.target;if(!input.dataset.categoryBannerUpload||categorySaving)return;
   const category=categoryRows.find(row=>row._key===input.dataset.categoryBannerUpload),file=input.files?.[0];if(!category||!file)return;
   if(file.size>5*1024*1024||!/\.(jpe?g|png|webp)$/i.test(file.name)){msg('Choose a JPG, PNG or WebP photo up to 5 MB.','error');input.value='';return}
   input.disabled=true;msg('Uploading main category banner…','');
   try{const fd=new FormData();fd.append('file',file);const d=await call('/api/platform/shops/'+shopId+'/files','POST',null,fd);category.bannerUrl='/api/platform/images/'+d.id;dirty=true;msg('Banner uploaded. Save Categories to publish it.','success');render();}
   catch(error){msg(error.message||'Banner upload failed.','error');input.disabled=false;}
  });
  root.addEventListener('click',event=>{
   // Tapping the category name opens its editor (phones have no pencil button).
   const heading=!event.target.closest('[data-category-command]')&&event.target.closest('.category-design-heading');
   const button=heading?heading.querySelector('[data-category-command="edit"]'):event.target.closest('[data-category-command]');if(!button||categorySaving)return;const c=categoryRows.find(row=>row._key===button.dataset.categoryKey);if(!c)return;const action=button.dataset.categoryCommand;
   if(action==='expand'){categoryExpanded.has(c._key)?categoryExpanded.delete(c._key):categoryExpanded.add(c._key);}
   if(action==='edit'){categoryEditing.has(c._key)?categoryEditing.delete(c._key):categoryEditing.add(c._key);}
   if(action==='done'){if(!c.category_en.trim()){msg('Enter an English category name.','error');return;}categoryEditing.delete(c._key);}
   if(action==='add-sub'){if(!c.category_en.trim()){msg('Name the main category first.','error');return;}addCategory(c);return;}
   if(action==='pick-parent'){const choices=new Set(categoryParentChoices(c));window.GearHubCategoryPicker?.open({rows:categoryRows,value:c.parent_en,allowed:row=>choices.has(row),allowNone:true,mainSelectable:true,titleText:'Select Parent Category',subtitleText:'Choose where this category belongs',onPick:parent=>{if(parent===categoryParent(c))return;dirty=true;c.parent_en=parent?.category_en||'';c._parentKey=parent?._key;delete c.parent_id;expandCategoryParents(c);render();}});
    // The Profile sheet is a modal dialog (top layer), so the picker opens inside it to show above it.
    const picker=[...document.body.querySelectorAll(':scope>.category-picker-backdrop')].pop();if(picker)sheet.append(picker);return;}
   if(['remove-banner','remove','up','down'].includes(action))dirty=true;
   if(action==='remove-banner'){c.bannerUrl='';msg('Main category banner removed from the draft. Save Categories to apply.','');}
   if(action==='remove'){
    if(categoryChildren(c).length){msg('Remove subcategories first. အောက်အမျိုးအစားများကို အရင်ဖျက်ပါ။','error');return;}
    if(Number(c.product_count)>0){msg('This category contains products. Edit those products and choose another category before deleting. ပစ္စည်းများကို အခြားအမျိုးအစားသို့ အရင်ပြောင်းပါ။','error');return;}
    categoryRows=categoryRows.filter(row=>row._key!==c._key);msg('Empty category removed from the editor. Save Categories to apply. သိမ်းရန် Save Categories ကိုနှိပ်ပါ။','');
   }
   if(action==='up'||action==='down'){const peers=categoryRows.filter(row=>categoryParent(row)===categoryParent(c)),index=peers.indexOf(c),other=peers[index+(action==='up'?-1:1)];if(other){const a=categoryRows.indexOf(c),b=categoryRows.indexOf(other);[categoryRows[a],categoryRows[b]]=[categoryRows[b],categoryRows[a]];}}
   render();
  });
  // Swipe a category row to the left: ask, then delete it (no subcategories, no products) and save.
  let swipe;
  const endSwipe=()=>{if(swipe)swipe.row.style.transform='';swipe=null};
  const startSwipe=(target,x,y)=>{const row=target.closest?.('.category-design-row');if(!row||!root.contains(row)||target.closest('input,textarea,select,button,label,a'))return;swipe={row,x,y}};
  const moveSwipe=(x,y)=>{if(!swipe)return;const dx=x-swipe.x,dy=y-swipe.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){endSwipe();return}if(dx<0&&Math.abs(dx)>Math.abs(dy))swipe.row.style.transform='translateX('+Math.max(dx,-90)+'px)'};
  const finishSwipe=(x,y)=>{if(!swipe)return;const {row}=swipe,dx=x-swipe.x,dy=y-swipe.y;endSwipe();if(dx>-60||Math.abs(dy)>Math.abs(dx)/1.5)return;
   const key=row.dataset.categoryKey,name=row.querySelector('h3')?.textContent||'';if(!confirm('ဒီ category ကို ဖျက်မှာ သေချာပါသလား?\nDelete "'+name+'"?'))return;
   root.querySelector('[data-category-command="remove"][data-category-key="'+CSS.escape(key)+'"]')?.click();if(!categoryRows.some(r=>r._key===key))$('category-manager-form').requestSubmit();};
  root.addEventListener('touchstart',e=>{if(e.touches.length===1)startSwipe(e.target,e.touches[0].clientX,e.touches[0].clientY);else endSwipe()},{passive:true});
  root.addEventListener('touchmove',e=>{if(e.touches.length===1)moveSwipe(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
  root.addEventListener('touchend',e=>{const t=e.changedTouches[0];if(t)finishSwipe(t.clientX,t.clientY);else endSwipe()});
  root.addEventListener('touchcancel',endSwipe);
  root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)startSwipe(e.target,e.clientX,e.clientY)});
  root.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')moveSwipe(e.clientX,e.clientY)});
  root.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')finishSwipe(e.clientX,e.clientY)});
  $('category-manager-form').addEventListener('submit',async e=>{
   e.preventDefault();if(categorySaving)return;
   const unnamed=categoryRows.find(c=>!c.category_en.trim());if(unnamed){categoryEditing.add(unnamed._key);expandCategoryParents(unnamed);render();msg('Enter an English name for every category.','error');return;}
   const rows=categoryRows.map(c=>({id:Number(c.id)||undefined,category_en:c.category_en.trim(),category_my:String(c.category_my||'').trim()||c.category_en.trim(),icon:c.icon||'',parent_en:(c.parent_en||'').trim(),...(c.parent_en&&categoryParent(c)?.id?{parent_id:Number(categoryParent(c).id)}:{}),...(c.bannerUrl?{bannerUrl:c.bannerUrl}:{})}));
   const button=$('save-categories');categorySaving=true;button.disabled=true;msg('Saving categories…','');
   let result;try{result=await call(url,'PUT',{categories:rows});window.GearHubCategoryPicker?.reset?.();}catch(err){msg('Could not save categories: '+err.message,'error');toast(err.message);return;}finally{categorySaving=false;button.disabled=false;}
   dirty=false;categoryEditing.clear();render(result.categories);msg('Categories saved.','success');toast('Categories saved');afterSave?.().catch?.(()=>{});
  });
  msg('Loading categories…','');
  try{render(await call(url));msg('','')}catch(err){msg('Could not load categories: '+err.message,'error')}
 }};
})();
