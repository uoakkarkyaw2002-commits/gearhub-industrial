const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build,match}=require('../public/excel-search-index');
const sheet=()=>({maxR:1000000,maxC:1000,widths:{2:0},heights:{5:0},cells:new Map([
 ['0,0',{text:'Title'}],['2,0',{text:'SKU'}],['2,1',{text:'Name'}],
 ['3,0',{text:'300426'}],['3,1',{text:'  Seal & Ring  '}],
 ['4,0',{text:'ABC'}],['4,1',{text:'DEF'}],['4,2',{text:'hidden seal'}],
 ['5,0',{text:'hidden seal'}],['6,0',{text:'300427'}],['6,1',{text:'SEAL'}]
])});
test('sparse index preserves header, hidden rows/columns, case and per-cell substring search',async()=>{
 const index=await build(sheet());assert.equal(index.head,2);
 assert.deepEqual(await match(index.rows,' seal '),[3,6]);
 assert.deepEqual(await match(index.rows,'0042'),[3,6]);
 assert.deepEqual(await match(index.rows,'ABCDEF'),[],'never joins neighbouring cells');
 assert.deepEqual(await match(index.rows,'absent'),[]);
 assert.deepEqual(await match(index.rows,''),[]);
});
test('index sorts sparse cells by row, caps results at 200 and yields on large sheets',async()=>{
 const s=sheet();s.heights={};s.cells=new Map([['0,0',{text:'Code'}],['0,1',{text:'Name'}]]);
 for(let r=3000;r>0;r--)s.cells.set(r+',0',{text:'seal '+r});
 let yielded=false;setTimeout(()=>{yielded=true},0);
 const index=await build(s);assert.equal(yielded,true);
 const hits=await match(index.rows,'seal');assert.equal(hits.length,200);assert.equal(hits[0],1);assert.equal(hits[199],200);
 assert.deepEqual(await match(index.rows,'seal 3000'),[3000]);
});
test('worker search agrees with fallback, shares its index and recovers from worker failure',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');let worker;
 class FakeWorker{
  constructor(){worker=this}
  postMessage(data){if(data.rows){this.rows=data.rows;return}this.last=data;queueMicrotask(async()=>{if(this.onmessage)this.onmessage({data:{id:data.id,hits:await match(this.rows,data.query,data.limit)}})})}
  terminate(){this.onmessage=null;this.terminated=true}
 }
 const ctx={window:{},Worker:FakeWorker,setTimeout,clearTimeout,queueMicrotask};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/excel-search-index'),'utf8'),ctx);
 const s=sheet(),index=await ctx.window.GearHubExcelIndex.forSheet(s);
 assert.equal(index,await ctx.window.GearHubExcelIndex.forSheet(s));
 assert.deepEqual(await index.search('seal'),[3,6]);
 const pending=index.search('300426');worker.onerror({preventDefault(){}});
 assert.deepEqual(Array.from(await pending),[3]);assert.equal(worker.terminated,true);
 assert.deepEqual(Array.from(await index.search('seal')),[3,6]);
});
