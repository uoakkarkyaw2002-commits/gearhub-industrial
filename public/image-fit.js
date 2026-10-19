// Manual photo framing for shop images. The seller always chooses the crop;
// there is no automatic or "whole image" mode.
(function(){
 const MAX_PREVIEW=720,MIN_ZOOM=.25,MAX_ZOOM=3;
 const clamp=value=>Math.min(1,Math.max(0,value));
 function draw(ctx,image,width,height,state,pad){
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle=pad==="white"?"#fff":"#f3f6f1";
  ctx.fillRect(0,0,width,height);
  const scale=Math.max(width/image.width,height/image.height)*state.zoom;
  const w=image.width*scale,h=image.height*scale;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(image,(width-w)*state.x,(height-h)*state.y,w,h);
 }
 function render(image,{width,height,pad},state,type){
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  draw(canvas.getContext("2d"),image,width,height,state,pad);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare the photo.")),type,0.9));
 }
 function open(file,frame){
  return new Promise(async(resolve,reject)=>{
   let image;try{image=await createImageBitmap(file)}catch{resolve(file);return}
   const {width,height,label=""}=frame,state={zoom:1,x:.5,y:.5};
   const dialog=document.createElement("dialog");dialog.className="image-fit-dialog";
   dialog.innerHTML='<form method="dialog"><div class="image-fit-head"><strong>ပုံကို ဘောင်နဲ့ ကိုက်အောင်ချိန်မယ်</strong><small>Crop photo · '+label+' '+width+' × '+height+'</small></div>'
    +'<div class="image-fit-stage"><canvas aria-label="Photo crop preview"></canvas></div>'
    +'<p class="image-fit-hint">ပုံကို ဆွဲရွှေ့ပြီး ပေါ်စေချင်တဲ့နေရာ ချိန်ပါ / Drag to move</p><label class="image-fit-zoom">ချဲ့ / Zoom <input type="range" min="'+MIN_ZOOM+'" max="'+MAX_ZOOM+'" step="0.01" value="1" aria-label="Zoom"></label>'
    +'<div class="image-fit-actions"><button type="button" class="secondary" data-fit-cancel>မလုပ်တော့</button><button type="button" class="primary" data-fit-use>✓ ဒီအတိုင်းသုံးမယ်</button></div></form>';
   document.body.append(dialog);
   const canvas=dialog.querySelector("canvas"),ratio=width/height,pw=Math.min(MAX_PREVIEW,width),ph=Math.round(pw/ratio);
   canvas.width=pw;canvas.height=ph;canvas.style.aspectRatio=width+" / "+height;
   const ctx=canvas.getContext("2d"),zoom=dialog.querySelector('input[type="range"]');
   const paint=()=>{draw(ctx,image,pw,ph,state,frame.pad);canvas.classList.add("draggable")};
   zoom.addEventListener("input",()=>{state.zoom=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,Number(zoom.value)||1));paint()});
   let drag=null;
   canvas.addEventListener("pointerdown",event=>{drag={x:event.clientX,y:event.clientY,sx:state.x,sy:state.y};canvas.setPointerCapture(event.pointerId)});
   canvas.addEventListener("pointermove",event=>{
    if(!drag)return;
    const rect=canvas.getBoundingClientRect(),scale=Math.max(width/image.width,height/image.height)*state.zoom;
    const imageWidth=image.width*scale,imageHeight=image.height*scale;
    const travelX=(width-imageWidth)*rect.width/width,travelY=(height-imageHeight)*rect.height/height;
    if(Math.abs(travelX)>.5)state.x=clamp(drag.sx+(event.clientX-drag.x)/travelX);
    if(Math.abs(travelY)>.5)state.y=clamp(drag.sy+(event.clientY-drag.y)/travelY);
    paint();
   });
   const endDrag=()=>{drag=null};canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",endDrag);
   const finish=value=>{dialog.close();dialog.remove();image.close?.();resolve(value)};
   dialog.addEventListener("cancel",event=>{event.preventDefault();finish(null)});
   dialog.querySelector("[data-fit-cancel]").addEventListener("click",()=>finish(null));
   dialog.querySelector("[data-fit-use]").addEventListener("click",async()=>{
    try{
     const png=frame.pad==="white",blob=await render(image,frame,state,png?"image/png":"image/jpeg");
     const name=String(file.name||"photo").replace(/\.[^.]+$/,"")+"-"+width+"x"+height+(png?".png":".jpg");
     finish(new File([blob],name,{type:blob.type}));
    }catch(error){dialog.close();dialog.remove();reject(error)}
   });
   paint();dialog.showModal();
  });
 }
 // Kept for callers that imported the old helper; every upload now starts in Crop mode.
 window.GearHubImageFit={open,autoMode:()=> "fill"};
})();