(() => {
 const open=document.getElementById('excel-library-open'),modal=document.getElementById('excel-library-modal');
 if(!open||!modal)return;
 const close=document.getElementById('excel-library-close'),form=document.getElementById('excel-upload-form'),input=document.getElementById('excel-upload-input'),list=document.getElementById('excel-library-list'),status=document.getElementById('excel-library-status');
 const chosenName=form.querySelector('.excel-upload-name');
 const updateChosenName=()=>{if(chosenName)chosenName.textContent=input.files?.[0]?.name||'no file selected'};
 input.addEventListener('change',updateChosenName);
 const match=location.pathname.match(/^\/shops\/([^/]+)\/?$/); const slug=match&&decodeURIComponent(match[1]); let owner=null;
 const show=(message,error=false)=>{status.textContent=message||'';status.classList.toggle('error',error)};
 const bytes=value=>value<1024?value+' B':value<1024*1024?(value/1024).toFixed(1)+' KB':(value/1024/1024).toFixed(1)+' MB';
 const excelIcon='<svg class="excel-file-icon" viewBox="0 0 64 64" aria-hidden="true"><path fill="#e8f0eb" d="M25 5h24l10 10v42H25z"/><path fill="#b7d3c0" d="M49 5v10h10"/><path fill="#21a366" d="M29 17h25v36H29z"/><path fill="#107c41" d="M29 35h25v18H29z"/><path fill="none" stroke="#d8f0e2" stroke-width="2" d="M34 23h15M34 29h15M34 35h15M34 41h15M34 47h15M41 20v29"/><path fill="#185c37" d="M7 16 34 11v44L7 50z"/><path fill="#fff" d="m13 25 5-.5 3.5 7 3.4-7.8 5-.5-5.7 11.3 6 11.5-5.2-.5-3.7-7.7-3.5 7-4.9-.5 5.8-10.4z"/></svg>';
 const render=files=>{list.replaceChildren();if(!files.length){list.textContent='No Excel files uploaded yet.';return} for(const file of files){const row=document.createElement('button');row.className='excel-file-row';row.type='button';row.dataset.excelPreview=file.url;row.dataset.excelName=file.name;row.setAttribute('aria-label','Open '+file.name);row.innerHTML=excelIcon;const details=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');details.className='excel-file-details';name.className='excel-file-name';name.textContent=file.name;meta.className='excel-file-meta';meta.textContent=bytes(file.bytes);details.append(name,meta);row.append(details);list.append(row)}};
 async function load(){if(!slug){show('Excel files are available in a shop page.',true);return}show('Loading…');try{const response=await fetch('/api/platform/store/'+encodeURIComponent(slug)+'/spreadsheets');const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load Excel files.');render(body.files||[]);show('')}catch(error){show(error.message,true)}}
 async function ownerAccess(){if(!slug)return;try{const response=await fetch('/api/platform/me');const body=await response.json();if(body.shop?.slug===slug){owner={id:body.shop.id,csrfToken:body.csrfToken};form.hidden=false;autoState()}else if(body.isOwner){/* GearHub controls every shop: the platform owner may upload to any of them. */const listing=await (await fetch('/api/platform/owner')).json().catch(()=>({}));const shop=(listing.shops||[]).find(item=>item.slug===slug&&!item.legacy);if(shop){owner={id:shop.id,csrfToken:body.csrfToken};form.hidden=false;autoState()}}}catch{}}
 // Excel files open only from the folder button beside the search bar (seller shops only).
 open.hidden=!slug;
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
 // Both downloads use the shop's existing upload-key permissions and replacement flow.
 const auto=document.getElementById('excel-auto-upload'),autoInfo=document.getElementById('excel-auto-upload-state');
 async function autoState(){
  if(!auto||!owner)return;auto.hidden=false;
  try{const state=await (await fetch('/api/platform/shops/'+owner.id+'/upload-key')).json();autoInfo.textContent=state.exists?(state.lastUsedAt?'PC last uploaded: '+state.lastUsedAt+' (UTC)':'PC program made '+state.createdAt+' (UTC); no upload yet.'):'Not set up yet.'}catch{}
 }
 auto?.querySelectorAll('[data-auto-upload-os]').forEach(button=>button.addEventListener('click',async()=>{
  if(!owner||!window.GearHubExcelAutoUpload)return;
  if(autoInfo.textContent&&!/Not set up/.test(autoInfo.textContent)&&!confirm('A new download stops the old computer program. Continue? / အသစ်ထုတ်ရင် ကွန်ပျူတာပေါ်က အဟောင်း ရပ်သွားပါမယ်။'))return;
  const mac=button.dataset.autoUploadOs==='mac';button.disabled=true;
  try{
   const response=await fetch('/api/platform/shops/'+owner.id+'/upload-key',{method:'POST',headers:{'X-CSRF-Token':owner.csrfToken}});const body=await response.json();if(!response.ok)throw Error(body.error||'Could not make the upload key.');
   const options={key:body.key,origin:location.origin,shop:body.shop.name,slug:body.shop.slug};
   const file=new Blob([mac?window.GearHubExcelAutoUpload.macArchive(options):window.GearHubExcelAutoUpload.build(options)],{type:mac?'application/zip':'application/octet-stream'});
   const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download='SkyShop-Excel-AutoUpload-'+body.shop.slug+(mac?'.zip':'.bat');document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),5000);
   show(mac?'Downloaded. Unzip it on your Mac, open the .command file and choose the Excel file.':'Downloaded. Open it on the Windows PC and choose the Excel file.');autoState();
  }catch(error){show(error.message,true)}finally{button.disabled=false}
 }));
 form.addEventListener('submit',async event=>{event.preventDefault();if(!owner||!input.files?.[0])return;show('Uploading…');const data=new FormData();data.append('file',input.files[0]);try{const response=await fetch('/api/platform/shops/'+owner.id+'/spreadsheets',{method:'POST',headers:{'X-CSRF-Token':owner.csrfToken},body:data});const body=await response.json();if(!response.ok)throw Error(body.error||'Upload failed.');input.value='';updateChosenName();show('Uploaded.');await load();keepOffline()}catch(error){show(error.message,true)}});
})();
