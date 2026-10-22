// Phone bottom nav, "liquid" style (owner's video): the open tab's icon rises into a bubble that
// sits in a notch of the bar; tapping another tab slides the bubble and the notch to it.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function fixture(){
 const props={},classes=new Set(['mobile-bottom-nav']);let observer;
 const cls=set=>({add:(...c)=>c.forEach(x=>set.add(x)),remove:(...c)=>c.forEach(x=>set.delete(x)),contains:c=>set.has(c),toggle:(c,on)=>on?set.add(c):set.delete(c)});
 const items=[0,1,2,3,4].map(i=>{const own=new Set(['bottom-nav-item',...(i===0?['active']:[])]);return{hidden:false,offsetLeft:4+i*73,offsetWidth:73,offsetTop:10,classList:cls(own),own,querySelector:()=>({offsetTop:9,offsetHeight:44})}});
 const bubble={className:'',setAttribute(){},offsetTop:-27,offsetHeight:58};
 const nav={classList:cls(classes),style:{setProperty:(k,v)=>props[k]=v},prepend(){},querySelectorAll:()=>items};
 const ctx={document:{querySelector:()=>nav,createElement:()=>bubble,fonts:null},MutationObserver:class{constructor(f){observer=f}observe(){}},addEventListener(){},setTimeout:f=>f()};
 vm.runInNewContext(read('liquid-nav.js'),ctx);
 return{props,classes,items,move:i=>{items.forEach((it,k)=>it.classList.toggle('active',k===i));observer()}};
}

test('the bubble follows the open tab and the icon is lifted into it',()=>{
 const f=fixture();
 assert.ok(f.classes.has('liquid'));assert.equal(f.props['--liquid-x'],'40.5px');assert.equal(f.props['--liquid-lift'],'-39px');
 assert.ok(!f.classes.has('liquid-instant'),'only the first placement jumps');
 f.move(3);assert.equal(f.props['--liquid-x'],'259.5px','tapping Cart-position tab slides the bubble there');
 f.items[1].hidden=true;f.move(1);assert.ok(f.classes.has('liquid-none'),'no bubble when the open tab is hidden');
});

test('phone-only styles: notch mask, raised bubble, sliding transition, labels only for the open tab',()=>{
 const css=read('style.css'),tail=css.slice(css.indexOf('/* Phone bottom navigation, "liquid" style'));
 assert.match(tail,/@property --liquid-x\{syntax:"<length>"/);
 assert.match(tail,/@media\(max-width:850px\)\{\n \.mobile-bottom-nav\.liquid\{/);
 assert.match(tail,/\.mobile-bottom-nav\.liquid::before\{[^}]*mask:radial-gradient\(circle 37px at var\(--liquid-x\) 0/);
 assert.match(tail,/\.liquid-nav-bubble\{[^}]*transform:translateX\(calc\(var\(--liquid-x\) - 29px\)\)/);
 assert.match(tail,/\.bottom-nav-item\.active>span\{transform:translateY\(var\(--liquid-lift,-30px\)\)/);
 assert.match(tail,/\.bottom-nav-item\.active>small\{opacity:1/);
 assert.match(read('index.html'),/<script src="\/store\.js\?v=[^"]+"><\/script><script src="\/liquid-nav\.js\?v=20261022-liquid-4"><\/script>/);
 assert.match(read('sw.js'),/"\/liquid-nav\.js\?v=20261022-liquid-4"/);
});

test('owner picture: floating rounded bar, smooth notch, white bubble, bold black label; icon colours unchanged',()=>{
 const css=read('style.css'),tail=css.slice(css.indexOf("/* Owner's picture: the bar floats"));
 assert.match(tail,/\.mobile-bottom-nav\.liquid\{left:12px!important;right:12px!important;bottom:max\(12px,env\(safe-area-inset-bottom\)\)!important/);
 assert.match(tail,/::before\{border-radius:24px;-webkit-mask:url\("data:image\/svg\+xml[^)]*"\) no-repeat calc\(var\(--liquid-x\) - 70px\) 0\/140px 40px/);
 assert.match(tail,/\.liquid-nav-bubble\{background:#fff;/);
 assert.match(tail,/\.bottom-nav-item\.active>small\{color:#111;font-weight:800\}/);
 assert.doesNotMatch(read('liquid-nav.js'),/nav-line/,'no replacement icons');
});
