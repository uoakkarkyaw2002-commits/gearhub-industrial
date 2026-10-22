// A pasted "… tokens truncated …" line once left an @media(max-width:850px) block open in
// style.css, so on PC the product cards lost their View photos / quantity / cart styles.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
// The @-rules that wrap the first rule matching `selector`.
function wrappers(selector){const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');const stack=[];let start=0;
 for(let i=0;i<clean.length;i++){const ch=clean[i];if(ch==='{'){const prelude=clean.slice(start,i).trim();if(prelude.startsWith(selector)&&!prelude.startsWith('@'))return stack.slice();stack.push(prelude);start=i+1;}else if(ch==='}'){stack.pop();start=i+1;}else if(ch===';'&&!stack.length)start=i+1;}
 return null;}

test('style.css has no pasted tool output and balanced braces',()=>{
 assert.doesNotMatch(css,/tokens truncated|Warning: truncated output|Total output lines:/);
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');assert.equal((clean.match(/\{/g)||[]).length,(clean.match(/\}/g)||[]).length);
});

test('product card buttons are styled on PC too (not inside a phone-only block)',()=>{
 for(const sel of ['.products .product .product-actions{','.products .product .view-photos{','.products .product .add{','.products .product .qty-stepper{']){
  const w=wrappers(sel.slice(0,-1));assert.ok(w,sel);assert.deepEqual(w.filter(x=>/max-width/.test(x)),[],sel+' must not be phone-only');
 }
});
