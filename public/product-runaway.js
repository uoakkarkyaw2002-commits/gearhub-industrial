// Add Product "runaway" button (owner's reference video): while required fields are empty the
// button will not stand still. It bolts out of its slot (a dashed outline, tied to it by a line),
// says how many fields are left, and slows down as they are filled. When every required field is
// filled it locks back into its slot. Enter in the form still submits as before.
(()=>{
 const form=document.getElementById("product-form"),button=document.getElementById("product-submit"),bar=button&&button.closest(".product-submit-bar");
 if(!form||!button||!bar)return;
 const tether=document.createElement("span");tether.className="rw-tether";tether.setAttribute("aria-hidden","true");
 const status=document.createElement("p");status.className="rw-status";status.setAttribute("role","status");
 bar.prepend(tether);bar.append(status);
 const names={sku:"SKU",categoryEn:"Category",nameEn:"English name",price:"Price",stock:"Stock"};
 const required=()=>[...form.querySelectorAll("[required]")].filter(el=>!el.disabled&&el.offsetParent!==null);
 const missing=()=>required().filter(el=>!el.checkValidity());
 let armed=false,side=1,offset=0;
 // Away from its slot the button is a pill 44% wide (CSS), so it can move 28% of the bar either way.
 const room=()=>bar.clientWidth*.28;
 function place(x){
  // x: button centre offset from the slot centre (px). 0 = locked in its slot.
  offset=x;const away=x!==0;bar.classList.toggle("rw-away",away);
  button.style.transform=away?"translateX("+x+"px)":"";
  const w=Math.abs(x);tether.style.width=w+"px";tether.style.left=x<0?"calc(50% - "+w+"px)":"50%";
 }
 function update(){
  const left=missing();
  for(const el of required()){const ok=el.checkValidity();el.classList.toggle("rw-ok",armed&&ok);el.classList.toggle("rw-missing",armed&&!ok)}
  if(!armed){status.textContent="";bar.classList.remove("rw-armed");return left}
  bar.classList.add("rw-armed");
  const list=left.map(el=>names[el.name]||el.name).join(", ");
  status.dataset.state=left.length?"wait":"ready";
  status.textContent=!left.length?"Locked in. Go on then.":left.length===1?"One to go — it is slowing down: "+list:left.length+" fields to fill before it stands still: "+list;
  if(!left.length)place(0);
  return left;
 }
 function bolt(towards){
  const left=update();if(!left.length)return false;
  // Fewer empty fields → a shorter jump, so it "slows down" as the form fills up.
  const reach=room()*Math.min(1,.45+.15*left.length);
  side=towards===undefined?-side:towards;place(side*reach);return true;
 }
 // Tap or click while fields are empty: it bolts instead of submitting.
 button.addEventListener("click",e=>{if(button.disabled)return;if(!missing().length){place(0);return}e.preventDefault();armed=true;bolt()},true);
 // Mouse: it runs from the pointer when it gets close (touch screens use the tap above).
 bar.addEventListener("pointermove",e=>{
  if(e.pointerType!=="mouse"||button.disabled||!missing().length)return;
  const r=button.getBoundingClientRect(),near=e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-30&&e.clientY<r.bottom+30;
  if(!near)return;armed=true;const centre=r.left+r.width/2;bolt(e.clientX<centre?1:-1);
 });
 form.addEventListener("input",()=>{if(armed){const left=update();if(left.length&&offset)place(Math.sign(offset)*room()*Math.min(1,.45+.15*left.length))}});
 form.addEventListener("change",()=>{if(armed)update()});
 form.addEventListener("reset",()=>setTimeout(()=>{armed=false;place(0);update()}));
 addEventListener("resize",()=>{if(!offset)return;const towards=Math.sign(offset);place(0);if(armed)bolt(towards)});
})();
