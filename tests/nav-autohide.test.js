// 1.1.293 owner: the phone bottom bar shows while nothing happens, hides while scrolling down, comes back on scroll up.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('scroll down hides the bar, scroll up / stop / top shows it, phones only',()=>{
 const classes=new Set(),listeners={},timers=[];
 const nav={classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),contains:c=>classes.has(c)}};
 const win={scrollY:0,innerHeight:800,matchMedia:()=>({matches:true}),addEventListener:(t,f)=>listeners[t]=f,setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{timers.length=0},
  document:{querySelector:s=>s==='.mobile-bottom-nav'?nav:null,body:{classList:{contains:()=>false,toggle:(c,on)=>on?classes.add(c):classes.delete(c)}}}};
 vm.runInNewContext(read('public/nav-autohide.js'),Object.assign(win,{window:win}));
 const to=y=>{win.scrollY=y;listeners.scroll();};
 to(200);to(400);assert.equal(classes.has('nav-away'),true,'scrolling down hides it');assert.equal(classes.has('nav-gone'),true,'the AI Assistant leaves with the bar (1.1.404)');
 to(360);assert.equal(classes.has('nav-away'),false,'scrolling up shows it');
 to(600);assert.equal(classes.has('nav-away'),true);
 timers.at(-1)();assert.equal(classes.has('nav-away'),false,'stopping shows it again');
 to(800);to(20);assert.equal(classes.has('nav-away'),false,'near the top it always shows');
 const css=read('public/style.css'),index=read('public/index.html'),sw=read('public/sw.js');
 assert.match(css,/\.mobile-bottom-nav\.nav-away\{transform:translate3d\(0,calc\(100% \+ 40px\),0\)!important\}/);
 assert.match(css,/\.mobile-bottom-nav\.liquid\{transition:--liquid-x \.5s cubic-bezier\(\.65,0,\.35,1\),transform \.34s/,'keeps the liquid bubble slide');
 const tag=index.match(/<script src="(\/nav-autohide\.js\?v=[^"]+)"><\/script>/)[1];assert.ok(sw.includes('"'+tag+'"'),'in the offline shell');
});
