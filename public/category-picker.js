(()=>{"use strict";
const escText=value=>String(value??"").trim();
let categoryRows=null;
function request(url){const options={credentials:"same-origin",cache:"no-store"};return (window.GearHubTenantAdmin?.fetch?window.GearHubTenantAdmin.fetch(url,options):fetch(url,options)).then(async response=>{if(!response.ok)throw new Error("Could not load categories.");return response.json();});}
async function categories(){if(!categoryRows)categoryRows=await request("/api/admin/categories");return Array.isArray(categoryRows)?categoryRows:[];}
function parentOf(rows,row){return rows.find(candidate=>escText(candidate.category_en).toLocaleLowerCase()===escText(row.parent_en).toLocaleLowerCase());}
function mainFor(rows,row){let current=row,guard=0;while(current?.parent_en&&guard++<8)current=parentOf(rows,current)||current;return current;}
function clear(node){while(node.firstChild)node.removeChild(node.firstChild);}
function button(label,className,onClick){const element=document.createElement("button");element.type="button";element.className=className;element.textContent=label;element.addEventListener("click",onClick);return element;}
function install(input){
 if(!input||input.dataset.categoryPickerReady)return;
 input.dataset.categoryPickerReady="true";input.readOnly=true;input.autocomplete="off";input.classList.add("category-picker-trigger");input.setAttribute("aria-haspopup","dialog");input.title="Select category";
 input.addEventListener("click",()=>open(input));input.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "||event.key==="ArrowDown"){event.preventDefault();open(input);}});
}
async function open(input){
 let rows;try{rows=await categories();}catch(error){alert(error.message);return;}
 const mainRows=rows.filter(row=>!escText(row.parent_en)&&escText(row.category_en));
 if(!mainRows.length){alert("Create a product category first.");return;}
 const existing=rows.find(row=>escText(row.category_en)===escText(input.value));
 let selectedMain=existing?mainFor(rows,existing):null,selected=existing||null,query="",expandedCategories=new Set();
 const backdrop=document.createElement("div");backdrop.className="category-picker-backdrop";backdrop.setAttribute("role","presentation");
 const modal=document.createElement("section");modal.className="category-picker-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Select Product Category");
 const head=document.createElement("div");head.className="category-picker-head";
 const copy=document.createElement("div");const title=document.createElement("h2");title.textContent="Select Product Category";const subtitle=document.createElement("p");subtitle.textContent="Choose a main category and subcategory for this product";copy.append(title,subtitle);
 const close=button("×","category-picker-close",dismiss);close.setAttribute("aria-label","Close category picker");head.append(copy,close);
 const search=document.createElement("input");search.className="category-picker-search";search.type="search";search.placeholder="Search category or subcategory…";search.setAttribute("aria-label","Search category or subcategory");
 const body=document.createElement("div");body.className="category-picker-body";const mainPane=document.createElement("div");mainPane.className="category-picker-main";const subPane=document.createElement("div");subPane.className="category-picker-sub";body.append(mainPane,subPane);
 const footer=document.createElement("div");footer.className="category-picker-footer";const cancel=button("Cancel","category-picker-cancel",dismiss);const confirm=button("Confirm Category","category-picker-confirm",()=>{if(!selected)return;input.value=escText(selected.category_en);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));const form=input.form;const my=form?.elements?.namedItem("categoryMy");if(my)my.value=escText(selected.category_my);dismiss();});footer.append(cancel,confirm);
 modal.append(head,search,body,footer);backdrop.append(modal);document.body.append(backdrop);
 function dismiss(){document.removeEventListener("keydown",onKey);backdrop.remove();}
 function onKey(event){if(event.key==="Escape")dismiss();}
 document.addEventListener("keydown",onKey);backdrop.addEventListener("click",event=>{if(event.target===backdrop)dismiss();});
 function choose(row){selected=row;const main=mainFor(rows,row);if(main)selectedMain=main;render();}
 function matching(row){const term=query.toLocaleLowerCase();return !term||[row.category_en,row.category_my,row.parent_en].some(value=>escText(value).toLocaleLowerCase().includes(term));}
 function render(){
  clear(mainPane);const mainHeading=document.createElement("h3");mainHeading.textContent="Main Categories";const mainList=document.createElement("div");mainList.className="category-picker-main-list";mainPane.append(mainHeading,mainList);
  mainRows.filter(matching).forEach(row=>{const item=button(escText(row.category_en),"",()=>{selectedMain=row;selected=null;render();});if(escText(row.category_en)===escText(selectedMain?.category_en))item.classList.add("active");const arrow=document.createElement("span");arrow.textContent="›";arrow.setAttribute("aria-hidden","true");item.append(arrow);mainList.append(item);});
  clear(subPane);const subHeading=document.createElement("h3");subHeading.textContent=escText(selectedMain?.category_en)||"Categories";const hint=document.createElement("p");hint.textContent=query?"Matching categories":selectedMain?"Select a subcategory":"Select a main category first";const grid=document.createElement("div");grid.className="category-picker-grid";subPane.append(subHeading,hint,grid);
  // Each nested category stays closed until its own row is clicked.
  const same=(a,b)=>escText(a).toLocaleLowerCase()===escText(b).toLocaleLowerCase();
  const key=row=>escText(row.category_en).toLocaleLowerCase();
  const childrenOf=row=>rows.filter(child=>escText(child.category_en)&&same(child.parent_en,row.category_en));
  const branch=(row,depth,seen)=>childrenOf(row).filter(child=>!seen.has(key(child))).flatMap(child=>{const childKey=key(child),hasChildren=childrenOf(child).length>0,nextSeen=new Set(seen);nextSeen.add(childKey);return [{row:child,depth,hasChildren},...(hasChildren&&expandedCategories.has(childKey)?branch(child,depth+1,nextSeen):[])];});
  const choices=query?rows.filter(matching).map(row=>({row,depth:1,hasChildren:childrenOf(row).length>0})):(selectedMain?branch(selectedMain,1,new Set([key(selectedMain)])):[]);
  const unique=[...new Map(choices.filter(entry=>escText(entry.row.category_en)).map(entry=>[key(entry.row),entry])).values()];
  if(!unique.length){const empty=document.createElement("p");empty.className="category-picker-empty";empty.textContent=selectedMain?"No category found.":"Choose a main category to see its subcategories.";grid.append(empty);}
  unique.forEach(({row,depth,hasChildren})=>{const item=button(escText(row.category_en),"category-picker-choice",()=>{if(hasChildren){const categoryKey=key(row);expandedCategories.has(categoryKey)?expandedCategories.delete(categoryKey):expandedCategories.add(categoryKey);choose(row);}else choose(row);});if(depth>1){const gap=(depth-1)*18;item.style.marginLeft=gap+"px";item.style.width="calc(100% - "+gap+"px)";item.style.gridColumn="1 / -1"}if(hasChildren){item.classList.add("has-children");const arrow=document.createElement("span");arrow.className="category-picker-branch-arrow";arrow.textContent=expandedCategories.has(key(row))?"⌄":"›";arrow.setAttribute("aria-hidden","true");item.append(arrow);}if(escText(row.category_en)===escText(selected?.category_en))item.classList.add("selected");const radio=document.createElement("span");radio.className="category-picker-radio";radio.setAttribute("aria-hidden","true");item.append(radio);grid.append(item);});
  confirm.disabled=!selected;
 }
 search.addEventListener("input",()=>{query=search.value.trim();render();});render();
}
function start(){document.querySelectorAll('input[name="categoryEn"]').forEach(install);}
new MutationObserver(start).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();