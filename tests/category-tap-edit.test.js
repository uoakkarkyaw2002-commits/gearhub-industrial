// Phones: the category pencil is gone; tapping the category name opens its editor.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('tapping a category opens its editor; phones hide the pencil',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','admin.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','public','site-admin.css'),'utf8');
 assert.match(js,/const heading=!event\.target\.closest\("\[data-category-command\]"\)&&event\.target\.closest\("\.category-design-heading"\);/);
 assert.match(js,/heading\?heading\.querySelector\('\[data-category-command="edit"\]'\)/);
 assert.match(css,/@media\(max-width:600px\)\{\.category-design-actions \[data-category-command="edit"\]\{display:none!important\}\}/);
});
