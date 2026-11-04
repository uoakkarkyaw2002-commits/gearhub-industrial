/* 1.1.291 owner: "User show" beside + Add Product. The shop owner turns each product field on or off for
   visitors (SKU, Part No, price, stock, description) and chooses how many photos, from the first, they see.
   GearHub's admin saves to /api/admin/visitor-view; a seller shop's admin goes through GearHubTenantAdmin. */
(()=>{
 const add=document.getElementById('inventory-add-product');if(!add||typeof api!=='function')return;
 const fields=[['sku','SKU','SKU နံပါတ်'],['partNo','Part No','Part No နံပါတ်'],['price','Price','စျေးနှုန်း'],['stock','Stock','လက်ကျန်'],['description','Description','ပစ္စည်းအကြောင်း']];
 const button=document.createElement('button');button.type='button';button.id='inventory-user-show';button.className='secondary';
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>User show</span>';
 add.after(button);
 const sheet=document.createElement('div');sheet.className='user-show';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','user-show-title');
 sheet.innerHTML='<div class="user-show-card"><header><div><h2 id="user-show-title">User show</h2><p>ဆိုင်ကို လာကြည့်သူတွေ မြင်ရမယ့် အရာများ / What visitors see</p></div><button type="button" class="user-show-x" aria-label="Close">×</button></header>'
  +'<div class="user-show-list">'+fields.map(([k,en,my])=>'<label class="user-show-row"><span><b>'+en+'</b><small>'+my+'</small></span><input type="checkbox" class="user-show-switch" data-field="'+k+'"></label>').join('')
  +'<label class="user-show-row"><span><b>Photos</b><small>ပုံ ပထမကနေ ဘယ်နှစ်ပုံ ပြမလဲ</small></span><select id="user-show-photos"><option value="0">All / အားလုံး</option>'+Array.from({length:10},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('')+'</select></label></div>'
  +'<p class="user-show-note">ဆိုင်ရှင်ကတော့ အားလုံး မြင်ရပါတယ်။ / You always see everything.</p><p class="user-show-status" role="status" aria-live="polite"></p></div>';
 document.body.append(sheet);
 const status=sheet.querySelector('.user-show-status'),photos=sheet.querySelector('#user-show-photos');
 let view=null,saving=Promise.resolve();
 function render(){for(const input of sheet.querySelectorAll('[data-field]'))input.checked=view[input.dataset.field]!==false;photos.value=String(view.photos||0);}
 async function open(){sheet.hidden=false;document.body.classList.add('user-show-open');status.textContent='Loading… / ဖွင့်နေပါတယ်…';sheet.querySelector('.user-show-x').focus();
  try{view=await api('/api/admin/visitor-view');render();status.textContent='';}catch(e){status.textContent=e.message||'Could not load.';}}
 function close(){sheet.hidden=true;document.body.classList.remove('user-show-open');button.focus();}
 function save(change){if(!view)return;Object.assign(view,change);saving=saving.then(async()=>{status.textContent='Saving… / သိမ်းနေပါတယ်…';try{view=await api('/api/admin/visitor-view',{method:'PUT',body:JSON.stringify(change)});render();status.textContent='Saved ✓ / သိမ်းပြီးပါပြီ';}catch(e){status.textContent=e.message||'Could not save.';}});}
 button.addEventListener('click',open);
 sheet.querySelector('.user-show-x').addEventListener('click',close);
 sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
 sheet.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 sheet.addEventListener('change',e=>{const input=e.target.closest('[data-field]');if(input)save({[input.dataset.field]:input.checked});else if(e.target===photos)save({photos:Number(photos.value)});});
})();
