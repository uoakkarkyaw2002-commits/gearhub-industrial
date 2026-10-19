// Fits an uploaded photo to the exact frame it is shown in (hero, banner, logo…),
// so the shop never shows a cut or stretched picture. "Fill" crops the edges and
// the seller can drag and zoom; "Whole" keeps the full picture on a soft blurred
// copy of itself (or white, for logos). Auto picks the better one for the shape.
(function(){
 const MAX_PREVIEW=720;
 function autoMode(image,width,height){const diff=Math.abs((image.width/image.height)/(width/height)-1);return diff<=0.15?"fill":"whole"}
 function draw(ctx,image,width,height,state,pad){
  ctx.clearRect(0,0,width,height);
  if(state.mode==="whole"){
   if(pad==="white"){ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height)}
   else{/* Blur: draw the cover crop tiny, then stretch it back up. */const small=document.createElement("canvas");small.width=Math.max(1,Math.round(width/28));small.height=Math.max(1,Math.round(height/28));const s=small.getContext("2d"),cover=Math.max(small.width/image.width,small.height/image.height);s.drawImage(image,(small.width-image.width*cover)/2,(small.height-image.height*cover)/2,image.width*cover,image.height*cover);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(small,0,0,width,height);ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(0,0,width,height)}
   const scale=Math.min(width/image.width,height/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(width-w)/2,(height-h)/2,w,h);return}
  const scale=Math.max(width/image.width,height/image.height)*state.zoom,w=image.width*scale,h=image.height*scale;
  ctx.imageSmoothingQuality="high";ctx.drawImage(image,(width-w)*state.x,(height-h)*state.y,w,h);
 }
 function render(image,{width,height,pad},state,type){
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;draw(canvas.getContext("2d"),image,width,height,state,pad);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare the photo.")),type,0.9));
 }
 function open(file,frame){
  return new Promise(async(resolve,reject)=>{
   let image;try{image=await createImageBitmap(file)}catch{resolve(file);return}
   const {width,height,label=""}=frame,state={mode:autoMode(image,width,height),zoom:1,x:.5,y:.5};
   const dialog=document.createElement("dialog");dialog.className="image-fit-dialog";
   dialog.innerHTML='<form method="dialog"><div class="image-fit-head"><strong>ပုံကို ဘောင်နဲ့ ကိုက်အောင်ချိန်မယ်</strong><small>Fit photo · '+label+' '+width+' × '+height+'</small></div>'
    +'<div class="image-fit-modes" role="group" aria-label="Fit"><button type="button" data-fit="auto">⚡ Auto</button><button type="button" data-fit="fill">✂ ဘောင်ပြည့် <small>(အစွန်းဖြတ်)</small></button><button type="button" data-fit="whole">🖼 ပုံအပြည့် <small>(မဖြတ်)</small></button></div>'
    +'<div class="image-fit-stage"><canvas aria-label="Preview"></canvas></div>'
    +'<p class="image-fit-hint"></p><label class="image-fit-zoom">ချဲ့ / Zoom <input type="range" min="1" max="3" step="0.01" value="1"></label>'
    +'<div class="image-fit-actions"><button type="button" class="secondary" data-fit-cancel>မလုပ်တော့</button><button type="button" class="primary" data-fit-use>✓ ဒီအတိုင်းသုံးမယ်</button></div></form>';
   document.body.append(dialog);
   const canvas=dialog.querySelector("canvas"),ratio=width/height,pw=Math.min(MAX_PREVIEW,width),ph=Math.round(pw/ratio);canvas.width=pw;canvas.height=ph;canvas.style.aspectRatio=width+" / "+height;
   const ctx=canvas.getContext("2d"),zoom=dialog.querySelector('input[type="range"]'),hint=dialog.querySelector(".image-fit-hint");
   const paint=()=>{draw(ctx,image,pw,ph,state,frame.pad);dialog.querySelectorAll("[data-fit]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.fit===state.mode)));zoom.closest("label").hidden=state.mode!=="fill";canvas.classList.toggle("draggable",state.mode==="fill");hint.textContent=state.mode==="fill"?"ပုံကို ဆွဲရွှေ့ပြီး ပေါ်စေချင်တဲ့နေရာ ချိန်ပါ / Drag to move":"ပုံတစ်ပုံလုံး ပေါ်ပါမယ် / The whole photo shows"};
   dialog.querySelector(".image-fit-modes").addEventListener("click",e=>{const b=e.target.closest("[data-fit]");if(!b)return;if(b.dataset.fit==="auto"){state.mode=autoMode(image,width,height);state.zoom=1;state.x=state.y=.5;zoom.value="1"}else state.mode=b.dataset.fit;paint()});
   zoom.addEventListener("input",()=>{state.zoom=Number(zoom.value)||1;paint()});
   let drag=null;
   canvas.addEventListener("pointerdown",e=>{if(state.mode!=="fill")return;drag={x:e.clientX,y:e.clientY,sx:state.x,sy:state.y};canvas.setPointerCapture(e.pointerId)});
   canvas.addEventListener("pointermove",e=>{if(!drag)return;const rect=canvas.getBoundingClientRect(),scale=Math.max(width/image.width,height/image.height)*state.zoom,overW=(image.width*scale-width)*rect.width/width,overH=(image.height*scale-height)*rect.height/height;
    if(overW>0.5)state.x=Math.min(1,Math.max(0,drag.sx-(e.clientX-drag.x)/overW));if(overH>0.5)state.y=Math.min(1,Math.max(0,drag.sy-(e.clientY-drag.y)/overH));paint()});
   const endDrag=()=>{drag=null};canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",endDrag);
   const finish=value=>{dialog.close();dialog.remove();image.close?.();resolve(value)};
   dialog.addEventListener("cancel",e=>{e.preventDefault();finish(null)});
   dialog.querySelector("[data-fit-cancel]").addEventListener("click",()=>finish(null));
   dialog.querySelector("[data-fit-use]").addEventListener("click",async()=>{try{const png=frame.pad==="white",blob=await render(image,frame,state,png?"image/png":"image/jpeg"),name=String(file.name||"photo").replace(/\.[^.]+$/,"")+"-"+width+"x"+height+(png?".png":".jpg");finish(new File([blob],name,{type:blob.type}))}catch(error){dialog.close();dialog.remove();reject(error)}});
   paint();dialog.showModal();
  });
 }
 window.GearHubImageFit={open,autoMode};
})();
