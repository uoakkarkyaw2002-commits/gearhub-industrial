const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const publicFile=(name)=>fs.readFileSync(path.join(__dirname,'..','public',name),'utf8');

test('owner View opens the exact public shop in an in-console preview',()=>{
 const js=publicFile('platform.js'),css=publicFile('platform.css');
 assert.match(js,/const showStorePreview = \(slug\) =>/);
 assert.match(js,/src="\$\{url\}"/);
 assert.match(js,/href="\$\{url\}" target="_blank"/);
 assert.match(js,/data-view-shop\]\"\)\.forEach\(\(b\) => \(b\.onclick = \(\) => showStorePreview/);
 assert.match(css,/\.store-preview-dialog\{position:absolute;inset:0;max-width:none;height:100dvh/);
 assert.match(css,/\.store-preview-frame\{display:block;flex:1;min-height:0;width:100%;height:100%/);
});
