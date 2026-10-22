// PC only (owner's video): product cards tilt towards the mouse and the photo lifts forward.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');

function setup({pc=true}={}){
 const handlers={},props={},classes=new Set();
 const card={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},style:{setProperty:(k,v)=>props[k]=v,removeProperty:k=>delete props[k]},getBoundingClientRect:()=>({left:0,top:0,width:200,height:300}),contains:n=>n===card};
 const ctx={matchMedia:q=>({matches:q.includes('reduce')?false:pc}),document:{addEventListener:(n,f)=>handlers[n]=f},addEventListener(){}};
 vm.runInNewContext(read('card-tilt.js'),ctx);
 const move=(x,y,pointerType='mouse')=>handlers.pointermove({pointerType,clientX:x,clientY:y,target:{closest:()=>card}});
 return {handlers,props,classes,card,move};
}

test('PC mouse: the card tilts towards the pointer and resets when the mouse leaves',()=>{
 const t=setup();t.move(200,0);
 assert.ok(t.classes.has('is-tilting'));assert.equal(t.props['--tilt-x'],'6.00deg');assert.equal(t.props['--tilt-y'],'7.00deg');
 t.handlers.pointerout({relatedTarget:null});assert.ok(!t.classes.has('is-tilting'));assert.equal(t.props['--tilt-x'],undefined);
});

test('phones and touch never tilt',()=>{
 const phone=setup({pc:false});phone.move(200,0);assert.ok(!phone.classes.has('is-tilting'));
 const touch=setup();touch.move(200,0,'touch');assert.ok(!touch.classes.has('is-tilting'));
});

test('tilt styles live only in the PC hover media block; script is loaded and cached',()=>{
 const css=read('desktop.css');
 assert.match(css,/@media \(min-width:851px\) and \(hover:hover\) and \(pointer:fine\)\{\n \.products \.product\{position:relative;transform:perspective\(900px\)/);
 assert.match(css,/\.products \.product\.is-tilting\{transform:perspective\(900px\) rotateX\(var\(--tilt-x,0\)\) rotateY\(var\(--tilt-y,0\)\)/);
 assert.match(read('index.html'),/<script src="\/card-tilt\.js\?v=20261023-tilt-1"><\/script>/);
 assert.match(read('sw.js'),/"\/card-tilt\.js\?v=20261023-tilt-1"/);
});
