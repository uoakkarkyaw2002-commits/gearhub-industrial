/* 1.1.293 owner: the phone bottom bar is shown while nothing happens, slides away while the page is scrolled
   down, and slides back when it is scrolled up (or the finger stops for a moment, or the top is reached). */
(()=>{
 const nav=document.querySelector('.mobile-bottom-nav');if(!nav)return;
 const phone=matchMedia('(max-width:850px)');
 let last=scrollY,hidden=false,idle=0;
 const busy=()=>document.body.classList.contains('searching')||document.querySelector('.drawer.open,.modal.open,dialog[open],.user-show:not([hidden])');
 function set(hide){if(hide===hidden)return;hidden=hide;nav.classList.toggle('nav-away',hide);document.body.classList.toggle('nav-gone',hide);}
 function check(){
  const y=Math.max(0,scrollY),d=y-last;
  if(!phone.matches||y<80||busy())set(false);
  else if(d>6)set(true);
  else if(d<-6)set(false);
  if(Math.abs(d)>6||y<80)last=y;
  clearTimeout(idle);idle=setTimeout(()=>{set(false);last=Math.max(0,scrollY);},1200);
 }
 addEventListener('scroll',check,{passive:true});
 // A tap on the bar's area brings it back at once.
 addEventListener('pointerdown',e=>{if(hidden&&e.clientY>innerHeight-90)set(false);},{passive:true});
})();
