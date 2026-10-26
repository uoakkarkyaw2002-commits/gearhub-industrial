const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('uploaded workbook is one accessible button whose entire card opens the existing viewer',async()=>{
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.events={};this.classList={add(){},remove(){},toggle(){}};this.hidden=true;}
  append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attributes[k]=v}addEventListener(name,fn){this.events[name]=fn}querySelector(){return null}querySelectorAll(){return []}
 }
 const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)};
 const filename='OCT-2026 <Excavator>.xlsm',url='/api/platform/spreadsheets/fixture';
 const ctx={window:{},location:{pathname:'/shops/fixture/',origin:'https://shop.test'},document:{getElementById:get,createElement:tag=>new Element(tag),readyState:'loading',addEventListener(){}},addEventListener(){},fetch:async path=>({ok:true,json:async()=>path.endsWith('/spreadsheets')?{files:[{name:filename,url,bytes:3460300}]}:{}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/excel-library.js'),'utf8'),ctx);
 await get('excel-library-open').events.click();
 const row=get('excel-library-list').children[0];assert.equal(row.tagName,'BUTTON');assert.equal(row.type,'button');
 assert.equal(row.dataset.excelPreview,url);assert.equal(row.dataset.excelName,filename);assert.equal(row.attributes['aria-label'],'Open '+filename);
 assert.match(row.innerHTML,/<svg/);assert(!row.innerHTML.includes(filename),'filename is text, never HTML');
 assert.equal(row.children[0].children[0].textContent,filename);assert.equal(row.children[0].children[1].textContent,'3.3 MB');
 assert.equal(get('excel-upload-form').hidden,true,'visitors cannot upload');
});
