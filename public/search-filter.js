/* 1.1.304 owner's picture: a filter button on the left of the shop search bar opens Product / Excel / Trash.
   Product searches the products only, Excel the shop's Excel file only (only when the shop has one), and
   Trash empties the search with the bin. The count and ˄ ˅ stay in the bar: in Product they go through the
   products that were found. */
(()=>{
 const input=document.getElementById('search'),bar=input?.closest('.mobile-search'),pill=input?.closest('.search-pill');
 if(!input||!bar||!pill)return;
 const KEY='gh-search-scope';
 // 1.1.328 owner: while shopping in another shop only Trash is offered (that shop's Excel files are not shown).
 const visiting=()=>document.body.classList.contains('visiting-shop');
 let scope=(()=>{try{return localStorage.getItem(KEY)==='excel'&&!visiting()?'excel':'product'}catch{return 'product'}})();
 const my=()=>document.documentElement.lang==='my';
 const hasExcel=()=>{const folder=document.getElementById('excel-library-open');return Boolean(folder&&!folder.hidden)};
 const wrap=document.createElement('div');wrap.className='search-filter';
 wrap.innerHTML='<button type="button" class="search-filter-button" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/></svg></button>'+
  '<div class="search-filter-menu" role="menu" hidden>'+
  // 1.1.304 owner: the Excel files folder (it was on the right of the bar) is the first item of this list.
  /* 1.1.402 owner: Scan (search by photo) is the first item of this list. */
  '<button type="button" role="menuitem" data-scope="scan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/></svg><span></span></button>'+
  '<button type="button" role="menuitem" data-scope="files"><svg class="search-filter-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.2c0-1.1.9-2 2-2h4.7l2 2.1h8.3c1.1 0 2 .9 2 2v.8H2.5z" fill="#1e8e3e" stroke="none"/><rect x="2.5" y="8.2" width="19" height="11.6" rx="2" fill="#5fb878" stroke="none"/></svg><span></span></button>'+
  '<button type="button" role="menuitemradio" data-scope="product"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8M7.8 6l8.4 4"/></svg><span></span><i aria-hidden="true"></i></button>'+
  '<button type="button" role="menuitemradio" data-scope="excel"><svg class="search-filter-excel" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="11" height="16" rx="1.6" fill="#1e7a3c" stroke="none"/><path d="m5.3 9 3.6 6m0-6-3.6 6" stroke="#fff" stroke-width="1.8"/><path d="M13.5 6.5h6a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-6M13.5 10h7.5M13.5 14h7.5M17 6.5v11" stroke="#1e7a3c"/></svg><span></span><i aria-hidden="true"></i></button>'+
  /* 1.1.380 owner: while visiting another shop, Category lives in this list (the bottom bar has only Profile and Home). */
  '<button type="button" role="menuitem" data-scope="category" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><span></span></button>'+
  '<button type="button" role="menuitem" data-scope="trash"><svg class="search-filter-trash" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg><span></span></button></div>';
 bar.insertBefore(wrap,bar.firstChild);
 const button=wrap.querySelector('.search-filter-button'),menu=wrap.querySelector('.search-filter-menu');
 function paint(){
  if(scope==='excel'&&!hasExcel())scope='product';
  document.body.classList.toggle('scope-product',scope==='product');document.body.classList.toggle('scope-excel',scope==='excel');
  const label={files:my()?'Excel ဖိုင်များ':'Excel files',product:my()?'ပစ္စည်း':'Product',excel:'Excel',trash:my()?'ရှာထားတာ ဖျက်မယ်':'Trash',category:my()?'Category':'Category',scan:my()?'ဓာတ်ပုံနဲ့ ရှာမယ်':'Scan'};
  menu.querySelectorAll('[data-scope]').forEach(b=>{b.querySelector('span').textContent=label[b.dataset.scope];if(b.getAttribute('role')==='menuitemradio'){const on=b.dataset.scope===scope;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))}});
  if(visiting())scope='product';
  menu.querySelector('[data-scope="excel"]').hidden=!hasExcel()||visiting();menu.querySelector('[data-scope="files"]').hidden=!hasExcel()||visiting();menu.querySelector('[data-scope="product"]').hidden=visiting();menu.querySelector('[data-scope="category"]').hidden=!visiting();menu.querySelector('[data-scope="scan"]').hidden=visiting()||!document.querySelector('.photo-scan-button');
  button.setAttribute('aria-label',my()?'ရှာမယ့်နေရာ ရွေးရန်':'Search in');
 }
 const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false')};
 button.addEventListener('click',()=>{paint();menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden))});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
 menu.addEventListener('click',e=>{
  const item=e.target.closest('[data-scope]');if(!item)return;close();
  if(item.dataset.scope==='scan'){document.querySelector('.photo-scan-button')?.click();return}
  if(item.dataset.scope==='category'){document.querySelector('.mobile-bottom-nav [data-store-view="category"]')?.click();return}
  if(item.dataset.scope==='files'){document.getElementById('excel-library-open')?.click();return}
  // 1.1.305 owner: the bin is no longer in the bar (it showed twice); Trash here empties the search.
  if(item.dataset.scope==='trash'){
   // 1.1.307 owner: the old bin animation — the bin opens in the bar and the typed letters jump into it.
   const bin=document.querySelector('.search-tools .search-clear');
   if(!bin||!input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));return}
   document.body.classList.add('bin-eating');requestAnimationFrame(()=>bin.click());
   const done=()=>{if(input.value&&!input.readOnly)return setTimeout(done,200);if(input.readOnly)return setTimeout(done,200);document.body.classList.remove('bin-eating')};setTimeout(done,600);
   return}
  scope=item.dataset.scope;try{localStorage.setItem(KEY,scope)}catch{}paint();
  // Run the same search again in the chosen place.
  if(input.value.trim())input.dispatchEvent(new Event('input',{bubbles:true}));
  count();
 });
 // Product: the number found and ˄ ˅ through the found products (Excel keeps its own count).
 let at=-1;
 const cards=()=>[...document.querySelectorAll('#products .product')].filter(c=>c.offsetParent!==null);
 function count(){
  if(scope!=='product'||!document.body.classList.contains('searching'))return;
  const counter=document.querySelector('.search-tools .search-count'),steps=[...document.querySelectorAll('.search-tools .search-step')];if(!counter)return;
  const n=cards().length;if(at>=n)at=-1;
  counter.textContent=at>=0?(at+1)+'/'+n:String(n);steps.forEach(s=>s.hidden=n<2);
 }
 document.addEventListener('click',e=>{
  const step=e.target.closest('.search-tools .search-step');if(!step||scope!=='product')return;
  e.stopImmediatePropagation();e.preventDefault();
  const list=cards();if(!list.length)return;
  at=(at+Number(step.dataset.excelStep)+list.length)%list.length;
  const card=list[at];card.scrollIntoView({behavior:'smooth',block:'center'});
  list.forEach(c=>c.classList.remove('search-hit'));card.classList.add('search-hit');setTimeout(()=>card.classList.remove('search-hit'),1600);
  count();
 },true);
 input.addEventListener('input',()=>{at=-1;setTimeout(count,250)});
 const products=document.getElementById('products');if(products)new MutationObserver(()=>setTimeout(count,0)).observe(products,{childList:true});
 const folder=document.getElementById('excel-library-open');if(folder)new MutationObserver(paint).observe(folder,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.GearHubSearchScope={get:()=>scope};
 paint();
})();
