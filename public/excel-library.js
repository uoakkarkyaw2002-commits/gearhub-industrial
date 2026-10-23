(() => {
 const open=document.getElementById('excel-library-open'),modal=document.getElementById('excel-library-modal');
 if(!open||!modal)return;
 const close=document.getElementById('excel-library-close'),form=document.getElementById('excel-upload-form'),input=document.getElementById('excel-upload-input'),list=document.getElementById('excel-library-list'),status=document.getElementById('excel-library-status');
 const match=location.pathname.match(/^\/shops\/([^/]+)\/?$/); const slug=match&&decodeURIComponent(match[1]); let owner=null;
 const show=(message,error=false)=>{status.textContent=message||'';status.classList.toggle('error',error)};
 const bytes=value=>value<1024?value+' B':value<1024*1024?(value/1024).toFixed(1)+' KB':(value/1024/1024).toFixed(1)+' MB';
 const render=files=>{list.replaceChildren();if(!files.length){list.textContent='No Excel files uploaded yet.';return} for(const file of files){const row=document.createElement('div');row.className='excel-file-row';const details=document.createElement('div'),name=document.createElement('div'),meta=document.createElement('small'),link=document.createElement('a');name.className='excel-file-name';name.textContent=file.name;meta.className='excel-file-meta';meta.textContent=bytes(file.bytes);link.className='excel-file-open';link.type='button';link.dataset.excelPreview=file.url;link.dataset.excelName=file.name;link.textContent='View';details.append(name,meta);row.append(details,link);list.append(row)}};
 async function load(){if(!slug){show('Excel files are available in a shop page.',true);return}show('Loading…');try{const response=await fetch('/api/platform/store/'+encodeURIComponent(slug)+'/spreadsheets');const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load Excel files.');render(body.files||[]);show('')}catch(error){show(error.message,true)}}
 async function ownerAccess(){if(!slug)return;try{const response=await fetch('/api/platform/me');const body=await response.json();if(body.shop?.slug===slug){owner={id:body.shop.id,csrfToken:body.csrfToken};form.hidden=false;autoState()}else if(body.isOwner){/* GearHub controls every shop: the platform owner may upload to any of them. */const listing=await (await fetch('/api/platform/owner')).json().catch(()=>({}));const shop=(listing.shops||[]).find(item=>item.slug===slug&&!item.legacy);if(shop){owner={id:shop.id,csrfToken:body.csrfToken};form.hidden=false;autoState()}}}catch{}}
 // Phones have no top-bar Excel icon: Settings opens the same panel (seller shops only).
 const settingsOpen=document.getElementById('excel-settings-open');if(settingsOpen&&slug){settingsOpen.hidden=false;settingsOpen.addEventListener('click',()=>open.click())}
 open.addEventListener('click',async()=>{modal.hidden=false;modal.classList.add('open');await Promise.all([load(),ownerAccess()])});
 const dismiss=()=>{modal.hidden=true;modal.classList.remove('open');show('')};close.addEventListener('click',dismiss);modal.addEventListener('click',event=>{if(event.target===modal)dismiss()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)dismiss()});
 // Every uploaded Excel file is saved on the phone by itself (no button), so it opens offline.
 // Files no longer in the shop are removed from the phone.
 async function keepOffline(){
  if(!slug||!('caches' in window)||navigator.onLine===false)return;
  try{
   const response=await fetch('/api/platform/store/'+encodeURIComponent(slug)+'/spreadsheets');if(!response.ok)return;
   const files=(await response.json()).files||[],cache=await caches.open('gearhub-excel-v1'),keep=new Set(files.map(file=>new URL(file.url,location.origin).href));
   for(const request of await cache.keys())if(/\/api\/platform\/spreadsheets\//.test(request.url)&&!keep.has(request.url))await cache.delete(request);
   for(const url of keep)if(!(await cache.match(url))){const file=await fetch(url);if(file.ok)await cache.put(url,file)}
  }catch{}
 }
 const later=()=>setTimeout(keepOffline,3000);
 if(document.readyState==='complete')later();else addEventListener('load',later,{once:true});
 addEventListener('online',keepOffline);
 // Auto upload from the shop's Windows PC: make a new upload key and download the program with it.
 const auto=document.getElementById('excel-auto-upload'),autoGet=document.getElementById('excel-auto-upload-get'),autoInfo=document.getElementById('excel-auto-upload-state');
 async function autoState(){
  if(!auto||!owner)return;auto.hidden=false;
  try{const state=await (await fetch('/api/platform/shops/'+owner.id+'/upload-key')).json();autoInfo.textContent=state.exists?(state.lastUsedAt?'PC last uploaded: '+state.lastUsedAt+' (UTC)':'PC program made '+state.createdAt+' (UTC); no upload yet.'):'Not set up yet.'}catch{}
 }
 autoGet?.addEventListener('click',async()=>{
  if(!owner||!window.GearHubExcelAutoUpload)return;
  if(autoInfo.textContent&&!/Not set up/.test(autoInfo.textContent)&&!confirm('A new download stops the old PC program. Continue? / အသစ်ထုတ်ရင် PC ပေါ်က အဟောင်း ရပ်သွားပါမယ်။'))return;
  try{
   const response=await fetch('/api/platform/shops/'+owner.id+'/upload-key',{method:'POST',headers:{'X-CSRF-Token':owner.csrfToken}});const body=await response.json();if(!response.ok)throw Error(body.error||'Could not make the upload key.');
   const file=new Blob([window.GearHubExcelAutoUpload.build({key:body.key,origin:location.origin,shop:body.shop.name})],{type:'application/octet-stream'});
   const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download='SkyShop-Excel-AutoUpload-'+body.shop.slug+'.bat';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),5000);
   show('Downloaded. Open it on the Windows PC and choose the Excel file.');autoState();
  }catch(error){show(error.message,true)}
 });
 form.addEventListener('submit',async event=>{event.preventDefault();if(!owner||!input.files?.[0])return;show('Uploading…');const data=new FormData();data.append('file',input.files[0]);try{const response=await fetch('/api/platform/shops/'+owner.id+'/spreadsheets',{method:'POST',headers:{'X-CSRF-Token':owner.csrfToken},body:data});const body=await response.json();if(!response.ok)throw Error(body.error||'Upload failed.');input.value='';show('Uploaded.');await load();keepOffline()}catch(error){show(error.message,true)}});
})();
