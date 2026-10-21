// Shows the opening picture once per app launch (a new tab or a Home Screen start), for 3 seconds.
// A reload or going back to the app later does not show it again.
(()=>{
 const el=document.getElementById("sky-splash");if(!el)return;
 const key="sky-splash:"+(location.pathname.split("/")[2]||"");
 let seen=false;try{seen=sessionStorage.getItem(key)==="1"}catch{}
 if(seen){el.remove();return}
 try{sessionStorage.setItem(key,"1")}catch{}
 setTimeout(()=>{el.classList.add("is-leaving");setTimeout(()=>el.remove(),550)},3000);
})();
