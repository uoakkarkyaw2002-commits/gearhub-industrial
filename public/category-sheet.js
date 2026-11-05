/* 1.1.323 owner: + Add → Category opens on the Profile (like Business): add, rename, move and delete the
   shop's categories with the existing shop-scoped categories API. Nothing opens Admin. */
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text={
  en:{title:'Categories',add:'New',none:'No categories yet. Press + New.',items:'items',edit:'Edit category',create:'New category',en:'Name (English)',my:'Name (မြန်မာ)',icon:'Icon',parent:'Inside',main:'— Main category —',save:'Save',saving:'Saving…',cancel:'Cancel',remove:'Delete',removeAsk:'Delete this category?',hasItems:'Move its products to another category before deleting.',hasKids:'Delete or move its subcategories first.',loading:'Loading…',retry:'Try again'},
  my:{title:'Category',add:'အသစ်',none:'Category မရှိသေးပါ။ + အသစ် ကို နှိပ်ပါ။',items:'ခု',edit:'Category ပြင်မယ်',create:'Category အသစ်',en:'နာမည် (English)',my:'နာမည် (မြန်မာ)',icon:'Icon',parent:'ဘယ်အောက်မှာလဲ',main:'— Main category —',save:'သိမ်းမယ်',saving:'သိမ်းနေပါတယ်…',cancel:'မလုပ်တော့ဘူး',remove:'ဖျက်မယ်',removeAsk:'ဒီ category ကို ဖျက်မလား?',hasItems:'ဖျက်ခင် ဒီထဲက ပစ္စည်းတွေကို တခြား category ကို အရင်ပြောင်းပါ။',hasKids:'အောက်က subcategory တွေကို အရင် ဖျက် (သို့) ရွှေ့ပါ။',loading:'ဖွင့်နေပါတယ်…',retry:'ပြန်ကြိုးစားမယ်'}
 };
 window.GearHubCategorySheet={open:async({shopId,sheet,openSheet,call,afterSave})=>{
  if(!Number.isSafeInteger(shopId)||shopId<1)return;
  const t=k=>text[document.documentElement.lang==='my'?'my':'en'][k],url='/api/platform/shops/'+shopId+'/categories';
  let list=[],busy=false;
  openSheet('<div class="wp-form cs-form"><header class="wp-head"><h2>🗂 '+t('title')+'</h2><button type="button" class="wp-save" data-cs="new">＋ '+t('add')+'</button></header><p class="wp-status" role="status" tabindex="-1"></p><div class="cs-body"></div></div>');
  sheet.classList.add('profile-work-sheet');sheet.setAttribute('aria-label',t('title'));
  sheet.addEventListener('close',()=>{sheet.classList.remove('profile-work-sheet');sheet.removeAttribute('aria-label')},{once:true});
  const root=sheet.querySelector('.cs-form'),body=root.querySelector('.cs-body'),status=root.querySelector('.wp-status');
  const say=v=>{status.textContent=v||''};
  const parentOf=c=>c.parent_id!=null?list.find(p=>Number(p.id)===Number(c.parent_id)):null;
  const kids=id=>list.filter(c=>Number(c.parent_id)===Number(id));
  const tree=(parent,depth)=>list.filter(c=>parent==null?parentOf(c)==null:Number(c.parent_id)===Number(parent)).flatMap(c=>[[c,depth],...tree(c.id,depth+1)]);
  function drawList(){
   const rows=tree(null,0);
   body.innerHTML=rows.length?'<ul class="cs-list">'+rows.map(([c,d])=>'<li><button type="button" class="cs-row" data-cs="edit" data-id="'+Number(c.id)+'" style="--cs-depth:'+d+'"><span class="cs-icon">'+esc(c.icon||(d?'↳':'🗂'))+'</span><span class="cs-name"><b>'+esc(c.category_en)+'</b>'+(c.category_my&&c.category_my!==c.category_en?'<small>'+esc(c.category_my)+'</small>':'')+'</span><span class="cs-count">'+Number(c.product_count||0)+' '+t('items')+'</span><span class="cs-chev" aria-hidden="true">›</span></button></li>').join('')+'</ul>':'<p class="cs-empty">'+t('none')+'</p>';
  }
  // Every category below c (it cannot be moved inside one of them).
  const below=id=>kids(id).flatMap(k=>[k.id,...below(k.id)]);
  const depthOf=c=>{let d=1,p=parentOf(c);while(p&&d<4){d++;p=parentOf(p)}return d};
  const height=id=>1+Math.max(0,...kids(id).map(k=>height(k.id)));
  function drawEdit(c){
   const blocked=c?new Set([Number(c.id),...below(c.id).map(Number)]):new Set();
   const options=tree(null,0).filter(([p])=>!blocked.has(Number(p.id))&&depthOf(p)+(c?height(c.id):1)<=3).map(([p,d])=>'<option value="'+Number(p.id)+'"'+(c&&Number(c.parent_id)===Number(p.id)?' selected':'')+'>'+'— '.repeat(d)+esc(p.category_en)+'</option>').join('');
   const field=(name,label,value,attrs)=>'<label><span>'+label+'</span><input name="'+name+'" value="'+esc(value||'')+'" '+attrs+'></label>';
   body.innerHTML='<form class="wp-card wp-grid cs-edit"><h3>'+t(c?'edit':'create')+'</h3>'+field('en',t('en')+' <em>*</em>',c?.category_en,'required maxlength="100"')+field('my',t('my'),c&&c.category_my!==c.category_en?c.category_my:'','maxlength="100"')+field('icon',t('icon'),c?.icon,'maxlength="12" placeholder="⚙"')+
    '<label><span>'+t('parent')+'</span><select name="parent"><option value="">'+t('main')+'</option>'+options+'</select></label>'+
    '<div class="cs-actions">'+(c?'<button type="button" class="cs-delete" data-cs="delete" data-id="'+Number(c.id)+'">'+t('remove')+'</button>':'')+'<button type="button" class="cs-cancel" data-cs="cancel">'+t('cancel')+'</button><button type="submit" class="wp-save">'+t('save')+'</button></div></form>';
   root.querySelector('.wp-head .wp-save').hidden=true;
   body.querySelector('input[name=en]').focus();
   body.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const f=e.target;if(!f.reportValidity())return;
    const v=n=>f.elements[n].value.trim(),row={...(c||{}),category_en:v('en'),category_my:v('my')||v('en'),icon:v('icon'),parent_id:v('parent')?Number(v('parent')):null};
    if(!c)delete row.id;
    save(c?list.map(x=>x===c?row:x):[...list,row]);
   });
  }
  // Sends the whole list (the API replaces it); parent names follow the parents' current names.
  async function save(rows){
   if(busy)return;busy=true;say(t('saving'));body.querySelectorAll('button,input,select').forEach(x=>x.disabled=true);
   const named=rows.map(r=>{const p=r.parent_id!=null?rows.find(x=>x.id!=null&&Number(x.id)===Number(r.parent_id)):null;const {product_count,...rest}=r;return {...rest,parent_en:p?p.category_en:'',parent_id:p?Number(p.id):null}});
   try{list=(await call(url,'PUT',{categories:named})).categories||[];busy=false;say('');root.querySelector('.wp-head .wp-save').hidden=false;drawList();await afterSave?.()}
   catch(e){busy=false;body.querySelectorAll('button,input,select').forEach(x=>x.disabled=false);say(e.message||'Error');status.focus()}
  }
  root.addEventListener('click',e=>{
   const b=e.target.closest('[data-cs]');if(!b||busy)return;
   const k=b.dataset.cs,c=list.find(x=>Number(x.id)===Number(b.dataset.id));
   if(k==='new'){say('');drawEdit(null)}
   if(k==='edit'&&c){say('');drawEdit(c)}
   if(k==='cancel'){say('');root.querySelector('.wp-head .wp-save').hidden=false;drawList()}
   if(k==='delete'&&c){
    if(kids(c.id).length)return say(t('hasKids'));
    if(c.product_count)return say(t('hasItems'));
    if(confirm(t('removeAsk')))save(list.filter(x=>x!==c));
   }
  });
  say(t('loading'));
  try{list=await call(url);say('');drawList()}
  catch(e){say(e.message);const r=document.createElement('button');r.type='button';r.className='wp-retry';r.textContent=t('retry');r.onclick=()=>{sheet.close();window.GearHubCategorySheet.open({shopId,sheet,openSheet,call,afterSave})};status.append(' ',r)}
 }};
})();
