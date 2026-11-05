/* Work products are composed on the seller's profile using the existing shop APIs. */
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text={en:{title:'Add Product',save:'Save',saving:'Saving…',photos:'Choose photos',category:'Select category',newCategory:'New category…',newName:'New category name',loading:'Loading categories…',retry:'Try again',extra:'Additional category, icon, Myanmar name & Promotion (optional)',images:'Product Images',help:'JPG, PNG, WebP · Max 5 MB each',description:'Product description in English…',descriptionMy:'ပစ္စည်းအကြောင်း မြန်မာလို ရေးရန်…',limit:'Choose up to 200 photos, each no larger than 5 MB (JPG, PNG or WebP).',remove:'Remove photo',cover:'Cover',setCover:'Use as cover',error:'Could not save. Please try again.'},my:{title:'ပစ္စည်းအသစ်တင်ရန်',save:'သိမ်းမယ်',saving:'သိမ်းနေပါတယ်…',photos:'ဓာတ်ပုံရွေးရန်',category:'အမျိုးအစား ရွေးရန်',newCategory:'အမျိုးအစားအသစ်…',newName:'အမျိုးအစားအသစ် နာမည်',loading:'အမျိုးအစားများ ရှာနေပါတယ်…',retry:'ပြန်စမ်းရန်',extra:'နောက်ထပ် အမျိုးအစား၊ icon၊ မြန်မာနာမည်နှင့် Promotion',images:'ပစ္စည်းဓာတ်ပုံများ',help:'JPG, PNG, WebP · တစ်ပုံလျှင် 5 MB အထိ',description:'Product description in English…',descriptionMy:'ပစ္စည်းအကြောင်း မြန်မာလို ရေးရန်…',limit:'JPG၊ PNG၊ WebP ပုံ ၂၀၀ အထိ၊ တစ်ပုံလျှင် 5 MB အထိ ရွေးပါ။',remove:'ပုံဖယ်ရန်',cover:'မျက်နှာဖုံး',setCover:'မျက်နှာဖုံးထားရန်',error:'မသိမ်းနိုင်ပါ။ ပြန်စမ်းကြည့်ပါ။'}};
 window.GearHubWorkProduct={open:async({shopId,sheet,openSheet,call,afterSave})=>{
  if(!Number.isSafeInteger(shopId)||shopId<1)return;
  const t=k=>text[document.documentElement.lang==='my'?'my':'en'][k],base='/api/platform/shops/'+shopId;
  const input=(name,label,attrs='')=>'<label><span>'+label+'</span><input name="'+name+'" '+attrs+'></label>';
  openSheet('<form id="product-form" class="wp-form"><header class="wp-head"><h2>📦 '+t('title')+'</h2><button type="submit" class="wp-save">'+t('save')+'</button></header><p class="wp-status" role="status" tabindex="-1"></p><fieldset class="wp-fields" disabled><section class="wp-card wp-grid">'+
   input('sku','SKU <em>*</em>','required maxlength="80" placeholder="SKU (e.g. IND-001)"')+input('partNo','Part No / ပစ္စည်းနံပါတ်','maxlength="60" placeholder="Part number (e.g. 39C)"')+
   '<label><span>Category <em>*</em></span><select name="categoryId" required aria-label="Category"><option value="">'+t('category')+'</option></select></label>'+input('name','Product name (English) <em>*</em>','required maxlength="150" placeholder="Product name in English"')+
   '<label class="wp-new-category" hidden><span>'+t('newName')+' <em>*</em></span><input name="newCategory" maxlength="100"></label><details class="wp-extra"><summary><b>＋</b> '+t('extra')+'</summary><div class="wp-grid">'+input('categoryMy','Category (မြန်မာ)','maxlength="150"')+input('imageEmoji','Icon','maxlength="20" placeholder="⚙"')+input('nameMy','Product name (မြန်မာ)','maxlength="150"')+input('promotionPrice','Promotion (MMK)','type="number" min="1" max="9007199254740991" step="1"')+'</div></details></section>'+
   '<section class="wp-card wp-grid">'+input('price','Price (MMK) <em>*</em>','required type="number" min="0" max="9007199254740991" step="1" value="0"')+input('stock','Stock <em>*</em>','required type="number" min="0" max="9007199254740991" step="1" value="0"')+'</section>'+
   '<section class="wp-card"><div class="wp-images-head"><div><h3>'+t('images')+'</h3><small>'+t('help')+'</small></div><label class="product-upload-zone wp-upload">'+t('photos')+'<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div><div class="wp-thumbs"></div></section>'+
   '<section class="wp-card"><div class="wp-language" role="group" aria-label="Description language"><button type="button" data-wp-lang="description" aria-pressed="true">English</button><button type="button" data-wp-lang="descriptionMy" aria-pressed="false">မြန်မာ</button></div><textarea name="description" rows="5" maxlength="1000" aria-label="English description" placeholder="'+t('description')+'"></textarea><textarea name="descriptionMy" rows="5" maxlength="1000" aria-label="Myanmar description" placeholder="'+t('descriptionMy')+'" hidden></textarea></section></fieldset></form>');
  sheet.classList.add('profile-work-sheet');sheet.setAttribute('aria-label',t('title'));
  const form=sheet.querySelector('.wp-form'),fields=form.querySelector('fieldset'),save=form.querySelector('.wp-save'),status=form.querySelector('.wp-status'),close=sheet.querySelector('#profile-sheet-close');
  let photos=[],categories=[],busy=false,photoEditor=null,adapter=null;
  const previousAdapter=window.GearHubProductPhotos;
  const message=value=>{status.textContent=value||''};
  const renderPhotos=()=>{form.querySelector('.wp-thumbs').innerHTML=photos.map((p,i)=>'<figure><img src="'+esc(p.url)+'" alt="Photo '+(i+1)+'"><button type="button" data-wp-remove="'+i+'" aria-label="'+t('remove')+' '+(i+1)+'">×</button><button type="button" class="wp-cover" data-wp-cover="'+i+'" aria-pressed="'+(i===0)+'">'+t(i===0?'cover':'setCover')+'</button></figure>').join('')};
  adapter={list:()=>photos.map(p=>({url:p.url,label:p.file.name})),replace:(index,file)=>{if(busy||!photos[index])return;URL.revokeObjectURL(photos[index].url);photos[index]={file,url:URL.createObjectURL(file)};renderPhotos()}};
  window.GearHubProductPhotos=adapter;photoEditor=window.GearHubPhotoEditor?.mount(form);
  const guard=e=>{if(busy){e.preventDefault();if(e.type==='click'&&e.target===sheet)e.stopImmediatePropagation()}};
  sheet.addEventListener('cancel',guard);const backdropGuard=e=>{if(e.target===sheet)guard(e)};sheet.addEventListener('click',backdropGuard,true);
  sheet.addEventListener('close',()=>{photoEditor?.();photos.forEach(p=>URL.revokeObjectURL(p.url));sheet.classList.remove('profile-work-sheet');sheet.removeAttribute('aria-label');sheet.removeEventListener('cancel',guard);sheet.removeEventListener('click',backdropGuard,true);if(window.GearHubProductPhotos===adapter)window.GearHubProductPhotos=previousAdapter},{once:true});
  async function loadCategories(){
   save.disabled=true;message(t('loading'));
   try{categories=await call(base+'/categories');if(!form.isConnected)return;
    const byId=new Map(categories.map(c=>[Number(c.id),c]));
    const label=c=>{const names=[c.category_en],seen=new Set([c.id]);let parent=byId.get(Number(c.parent_id));while(parent&&!seen.has(parent.id)){seen.add(parent.id);names.unshift(parent.category_en);parent=byId.get(Number(parent.parent_id))}return names.join(' / ')};
    form.elements.categoryId.innerHTML='<option value="">'+t('category')+'</option>'+categories.map(c=>'<option value="'+Number(c.id)+'">'+esc(label(c))+'</option>').join('')+'<option value="new">'+t('newCategory')+'</option>';
    fields.disabled=false;save.disabled=false;message('');
   }catch(e){if(!form.isConnected)return;message(e.message);const retry=document.createElement('button');retry.type='button';retry.className='wp-retry';retry.textContent=t('retry');retry.onclick=()=>{retry.remove();loadCategories()};status.append(' ',retry)}
  }
  form.elements.categoryId.addEventListener('change',()=>{const isNew=form.elements.categoryId.value==='new';form.querySelector('.wp-new-category').hidden=!isNew;form.elements.newCategory.required=isNew});
  form.querySelector('input[type=file]').addEventListener('change',e=>{
   const files=Array.from(e.target.files);e.target.value='';if(photos.length+files.length>200||files.some(f=>f.size>5*1024*1024||!(/\.(jpe?g|png|webp)$/i.test(f.name)))){message(t('limit'));return}
   photos.push(...files.map(file=>({file,url:URL.createObjectURL(file)})));message('');renderPhotos();
  });
  form.addEventListener('click',e=>{
   const remove=e.target.closest('[data-wp-remove]'),cover=e.target.closest('[data-wp-cover]'),lang=e.target.closest('[data-wp-lang]');
   if(remove){const [p]=photos.splice(Number(remove.dataset.wpRemove),1);if(p)URL.revokeObjectURL(p.url);renderPhotos()}
   if(cover){photos.unshift(...photos.splice(Number(cover.dataset.wpCover),1));renderPhotos()}
   if(lang){for(const key of ['description','descriptionMy'])form.elements[key].hidden=key!==lang.dataset.wpLang;form.querySelectorAll('[data-wp-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b===lang)))}
  });
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy||fields.disabled||!form.reportValidity())return;
   const value=name=>form.elements[name].value.trim(),chosen=categories.find(c=>String(c.id)===value('categoryId'));
   const body={sku:value('sku'),partNo:value('partNo'),name:value('name'),category:chosen?.category_en||value('newCategory'),...(chosen?{categoryId:chosen.id}:{}),categoryMy:value('categoryMy'),nameMy:value('nameMy'),imageEmoji:value('imageEmoji'),price:Number(value('price')),stock:Number(value('stock')),promotionPrice:value('promotionPrice'),description:value('description'),descriptionMy:value('descriptionMy'),active:true};
   busy=true;fields.disabled=true;save.disabled=true;close.disabled=true;save.textContent=t('saving');message('');
   try{
    const ids=[];for(const photo of photos){if(!photo.id){const fd=new FormData();fd.append('file',photo.file);photo.id=(await call(base+'/files','POST',null,fd)).id}ids.push(photo.id)}
    await call(base+'/products','POST',{...body,imageId:ids[0]||null,imageIds:ids});
    busy=false;close.disabled=false;sheet.close();await afterSave();
   }catch(error){busy=false;fields.disabled=false;save.disabled=false;close.disabled=false;save.textContent=t('save');message(error.message||t('error'));status.focus()}
  });
  await loadCategories();
 }};
})();
