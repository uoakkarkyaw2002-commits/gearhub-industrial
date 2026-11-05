const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('1.1.329: press and drag along the phone bottom bar shows the pill under the finger again',()=>{
 const css=read('fb-nav.css'),html=read('index.html'),sw=read('sw.js');
 assert.match(css,/\.mobile-bottom-nav\.liquid\{touch-action:none\}/);
 assert.match(css,/\.liquid-dragging \.liquid-nav-bubble\{display:block!important/);
 assert.match(css,/\.liquid-dragging\{transition:none!important\}/);
 assert.ok(html.includes('/fb-nav.css?v=1.1.329')&&sw.includes('"/fb-nav.css?v=1.1.329"'));
 const js=read('liquid-nav.js');
 assert.match(js,/pointermove/);assert.match(js,/target\.click\(\)/);
});
