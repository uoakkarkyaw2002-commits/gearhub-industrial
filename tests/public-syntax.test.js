// Every browser script must at least parse: one missing ")" in admin.js once made the
// whole admin page dead (no login, GearHub brand left on seller admins).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
test('every public/*.js file parses',()=>{
 const dir=path.join(__dirname,'..','public');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.js')))assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(dir,name),'utf8'),{filename:name}),name);
});

test('category rows have no trash button; a left swipe asks and then deletes',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8');
 assert.doesNotMatch(js,/class="category-delete"/,'no visible trash button on a category row');
 assert.match(js,/data-category-command="remove"[^>]*hidden|hidden[^>]*data-category-command="remove"/,'the removal command stays for the swipe');
 assert.match(js,/touchstart[\s\S]*touchend[\s\S]*dx>-60[\s\S]*confirm\("ဒီ category ကို ဖျက်မှာ[\s\S]*requestSubmit\(\)/,'swipe left: ask, remove, save');
});

test('phones: product categories fill the screen width and the hidden command takes no space',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','site-admin.css'),'utf8');
 assert.match(css,/@media\(max-width:600px\)\{#category-manager-content\{padding:14px 0!important\}#category-manager-form\{margin:0 -4px\}/);
 assert.match(css,/\.category-design-actions button\[hidden\]\{display:none!important\}/);
});

test('the product category picker also offers the third level (subcategory under a subcategory)',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','category-picker.js'),'utf8');
 assert.match(js,/const branch=\(row,depth,seen\)=>/,'subcategories of subcategories are listed');
 assert.match(js,/depth<3\?branch\(child,depth\+1,seen\)/,'down to the third level');
 assert.match(js,/item\.style\.marginLeft=gap\+"px"/,'third-level choices are indented');
});

test('phones: the category picker fills the whole screen height (no empty strip above it)',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','public','category-picker.css'),'utf8');
 assert.match(css,/@media\(max-width:680px\)\{\.category-picker-modal\{height:100dvh;max-height:100dvh;border-radius:0\}/);
});
