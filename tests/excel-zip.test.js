const {test}=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {open}=require('../public/excel-zip');
function archive(comment=0){
 const locals=[],directory=[];let offset=0;
 for(const [name,text,method] of [['xl/workbook.xml','<book/>',8],['xl/worksheets/sheet1.xml','<sheet>seal 300426</sheet>',8],['unused.bin','x'.repeat(300000),0]]){
  const nameBytes=Buffer.from(name),raw=Buffer.from(text),data=method?zlib.deflateRawSync(raw):raw;
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(method,8);header.writeUInt32LE(data.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(nameBytes.length,26);
  const entry=Buffer.concat([header,nameBytes,data]);locals.push(entry);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(method,10);central.writeUInt32LE(data.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(nameBytes.length,28);central.writeUInt16LE(comment,32);central.writeUInt32LE(offset,42);directory.push(central,nameBytes,Buffer.alloc(comment));offset+=entry.length;
 }
 const entries=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(3,8);end.writeUInt16LE(3,10);end.writeUInt32LE(entries.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,entries,end]);
}
test('range ZIP reader fetches only requested members, including deflate, stored bytes and missing files',async()=>{
 const zip=archive();let transferred=0;
 const fetcher=async(_url,options)=>{
  const value=options.headers.Range,match=/bytes=(\d+)-(\d+)/.exec(value);
  const start=match?+match[1]:Math.max(0,zip.length-65557),end=match?+match[2]:zip.length-1;
  const bytes=zip.subarray(start,end+1);transferred+=bytes.length;
  return new Response(bytes,{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${zip.length}`}});
 };
 const read=await open('/workbook',fetcher);
 assert.equal(await read('xl/workbook.xml'),'<book/>');
 assert.equal(await read('/xl/worksheets/sheet1.xml'),'<sheet>seal 300426</sheet>');
 assert.equal(await read('absent.xml'),null);
 assert.ok(transferred<zip.length/3,'unused workbook content is not downloaded');
 assert.equal((await read('unused.bin',true)).size,300000);
});
test('Range ignored or offline full-cache responses still open every sheet',async()=>{
 const zip=archive();let requests=0;
 const read=await open('/workbook',async()=>{requests++;return new Response(zip)});
 assert.equal(await read('xl/workbook.xml'),'<book/>');
 assert.equal(await read('xl/worksheets/sheet1.xml'),'<sheet>seal 300426</sheet>');
 assert.equal(requests,1);
});
test('a directory larger than the initial tail is fetched separately',async()=>{
 const zip=archive(30000);let n=0;
 const read=await open('/large-directory',async(_url,options)=>{
  n++;const part=/bytes=(\d+)-(\d+)/.exec(options.headers.Range),start=part?+part[1]:zip.length-65557,end=part?+part[2]:zip.length-1;
  return new Response(zip.subarray(start,end+1),{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${zip.length}`}});
 });
 assert.equal(await read('xl/workbook.xml'),'<book/>');assert.equal(n,3);
});
test('a failed member range falls back to a complete download; invalid ZIP is rejected',async()=>{
 const zip=archive();let n=0;
 const read=await open('/workbook',async(_url,options)=>{
  if(++n===1){const start=zip.length-65557;return new Response(zip.subarray(start),{status:206,headers:{'Content-Range':`bytes ${start}-${zip.length-1}/${zip.length}`}})}
  if(options)throw Error('range unavailable');return new Response(zip);
 });
 assert.equal(await read('xl/workbook.xml'),'<book/>');assert.equal(n,3);
 await assert.rejects(open('/bad',async()=>new Response('not a zip')),/Cannot read/);
});
