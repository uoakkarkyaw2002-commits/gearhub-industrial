// The category editor picks a parent with the same picker as Add Product (no native select).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('parent category uses the Add Product category picker',()=>{
 const admin=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),picker=fs.readFileSync(path.join(__dirname,'..','public','category-picker.js'),'utf8');
 assert.doesNotMatch(admin,/<select data-category-value="parent_en"/,'the native dropdown is gone');
 assert.match(admin,/<input readonly class="category-picker-trigger" aria-haspopup="dialog" data-category-command="pick-parent"/);
 assert.match(admin,/window\.GearHubCategoryPicker\?\.open\(\{rows:categoryRows,value:c\.parent_en,allowed:row=>choices\.has\(row\),allowNone:true,mainSelectable:true/);
 assert.match(picker,/window\.GearHubCategoryPicker=\{open:openPicker,/);
 assert.match(picker,/Main category \(no parent\)/);
 assert.match(picker,/selected=mainSelectable\?row:null/,'Add Product still needs a subcategory click');
});

test('product category stays required: the picker input is not read-only (owner saved a product with no category)',()=>{
 const picker=fs.readFileSync(path.join(__dirname,'..','public','category-picker.js'),'utf8');
 assert.doesNotMatch(picker,/input\.readOnly=true/,'browsers skip "required" on read-only fields');
 assert.match(picker,/input\.inputMode="none";for\(const type of \["beforeinput","paste","drop"\]\)input\.addEventListener\(type,event=>event\.preventDefault\(\)\);/);
});
