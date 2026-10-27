// The compact editor is phone-only. Move the existing controls (and their listeners),
// then put every node and label back when the viewport returns to desktop.
(()=>{
 const content=document.getElementById('product-form-content'),form=document.getElementById('product-form');
 if(!content||!form)return;
 const media=matchMedia('(max-width:800px)'),toolbar=content.querySelector('.product-editor-toolbar'),extra=form.querySelector('.product-extra-fields'),extraGrid=extra.querySelector('.product-field-grid');
 const restores=[],moved=new Set();let active=false,save;
 const svg=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const move=node=>{if(!node||moved.has(node))return;const marker=document.createComment('phone field home');node.before(marker);extraGrid.append(node);moved.add(node);restores.push(()=>{marker.replaceWith(node)});};
 const replace=(node,html)=>{if(!node)return;const old=node.innerHTML;node.innerHTML=html;restores.push(()=>{node.innerHTML=old});};
 const label=(name,text)=>{const node=form.elements.namedItem(name)?.closest('label')?.firstChild;if(node?.nodeType===Node.TEXT_NODE){const old=node.textContent;node.textContent=text;restores.push(()=>{node.textContent=old});}};
 const optionalFields=()=>{if(!active)return;move(form.elements.namedItem('nameMy')?.closest('label'));move(form.elements.namedItem('promotionPrice')?.closest('label'));move(form.elements.namedItem('imageUrls')?.closest('label'));move(form.elements.namedItem('active')?.closest('label'));move(document.getElementById('product-save-draft'));};
 const sync=()=>{
  document.body.classList.toggle('phone-product-open',active&&!content.classList.contains('hidden'));
  if(save)save.disabled=document.getElementById('product-submit').disabled;
  const cover=form.querySelector('.product-cover-picker');if(active&&cover)cover.classList.toggle('phone-cover-empty',!form.querySelector('.product-cover-option'));
 };
 function apply(){
  if(active)return;active=true;content.classList.add('phone-product-editor');
  save=document.createElement('button');save.type='submit';save.className='product-phone-save';save.setAttribute('form','product-form');save.innerHTML=svg('<path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-8h8v8"/>')+'<span>Save</span>';toolbar.append(save);
  label('nameEn','Product name (English) ');
  const part=form.elements.namedItem('partNo'),oldPlaceholder=part.placeholder;part.placeholder='Part number (e.g. 39C)';restores.push(()=>{part.placeholder=oldPlaceholder});
  replace(extra.querySelector('summary'),'<span class="product-extra-plus" aria-hidden="true">+</span><span>Additional category, icon, Myanmar name &amp; Promotion (optional)</span>'+svg('<path d="m7 10 5 5 5-5"/>'));
  const barcode=svg('<path d="M3 4v16M6 4v16M9 4v16M11 4v16M15 4v16M18 4v16M21 4v16"/>');
  for(const name of ['sku','partNo','categoryEn']){const wrap=form.elements.namedItem(name).closest('.product-input-wrap'),icon=document.createElement('span');icon.className='product-phone-field-icon';icon.innerHTML=name==='categoryEn'?svg('<path d="m7 10 5 5 5-5"/>'):barcode;wrap.append(icon);restores.push(()=>icon.remove());}
  const imageCard=form.querySelectorAll('.product-entry-card')[2];imageCard.classList.add('phone-product-images');
  replace(imageCard.querySelector('.product-card-heading>span'),svg('<path d="M4 3h16v18H4zM4 16l5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="7.5" r="1.5"/>'));
  replace(imageCard.querySelector('.upload-cloud'),svg('<path d="M7 17H5a4 4 0 0 1-.4-8A6 6 0 0 1 16 7a5 5 0 0 1 2 10h-1M12 21V10m-4 4 4-4 4 4"/>'));
  optionalFields();sync();
 }
 function restore(){
  if(!active)return;active=false;save.remove();save=null;
  for(const undo of restores.splice(0).reverse())undo();moved.clear();
  content.classList.remove('phone-product-editor');form.querySelector('.phone-product-images')?.classList.remove('phone-product-images');form.querySelector('.phone-cover-empty')?.classList.remove('phone-cover-empty');sync();
 }
 new MutationObserver(()=>{optionalFields();sync();}).observe(form,{childList:true,subtree:true});
 new MutationObserver(sync).observe(content,{attributes:true,attributeFilter:['class']});
 new MutationObserver(sync).observe(document.getElementById('product-submit'),{attributes:true,attributeFilter:['disabled']});
 media.addEventListener('change',()=>media.matches?apply():restore());if(media.matches)apply();
})();
