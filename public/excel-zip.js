/* Read only the ZIP members the viewer needs. Existing spreadsheet URLs support HTTP Range.
   A full/offline response or a server without Range support uses the same reader. */
(()=>{
 async function open(url,fetcher=fetch){
  let full=null,total=0;
  async function request(range){
   let response=await fetcher(url,{headers:{Range:range}});
   if(!response.ok)throw Error('Could not load this workbook.');
   const buffer=await response.arrayBuffer();
   if(response.status===200){full=buffer;total=buffer.byteLength;return{buffer,start:0}}
   const part=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range')||'');
   if(response.status!==206||!part||+part[2]-+part[1]+1!==buffer.byteLength)throw Error('Invalid workbook range.');
   total=+part[3];return{buffer,start:+part[1]};
  }
  async function range(start,end){
   if(full)return full.slice(start,end+1);
   try{
    const part=await request('bytes='+start+'-'+end);
    if(full)return full.slice(start,end+1);
    if(part.start!==start||part.buffer.byteLength!==end-start+1)throw Error('Incomplete workbook range.');
    return part.buffer;
   }catch{
    const response=await fetcher(url);if(!response.ok)throw Error('Could not load this workbook.');
    full=await response.arrayBuffer();return full.slice(start,end+1);
   }
  }
  let tail;
  try{tail=await request('bytes=-65557')}catch{
   const response=await fetcher(url);if(!response.ok)throw Error('Could not load this workbook.');
   full=await response.arrayBuffer();total=full.byteLength;tail={buffer:full,start:0};
  }
  const endView=new DataView(tail.buffer);let end=-1;
  for(let i=tail.buffer.byteLength-22;i>=0;i--)if(endView.getUint32(i,true)===0x06054b50&&i+22+endView.getUint16(i+20,true)===tail.buffer.byteLength){end=i;break}
  if(end<0)throw Error('Cannot read this workbook.');
  const count=endView.getUint16(end+10,true),size=endView.getUint32(end+12,true),offset=endView.getUint32(end+16,true);
  if(offset+size>total||count===65535)throw Error('Unsupported workbook directory.');
  const directory=offset>=tail.start?tail.buffer.slice(offset-tail.start,offset-tail.start+size):await range(offset,offset+size-1);
  const view=new DataView(directory),files=new Map(),ordered=[];let p=0;
  for(let n=0;n<count;n++){
   if(p+46>directory.byteLength||view.getUint32(p,true)!==0x02014b50)throw Error('Cannot read this workbook.');
   const length=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
   const name=new TextDecoder().decode(new Uint8Array(directory,p+46,length)),file={method:view.getUint16(p+10,true),size:view.getUint32(p+20,true),offset:view.getUint32(p+42,true)};
   files.set(name,file);ordered.push(file);p+=46+length+extra+comment;
  }
  ordered.sort((a,b)=>a.offset-b.offset).forEach((file,i)=>{file.end=(ordered[i+1]?.offset??offset)-1});
  return async(name,binary)=>{
   const file=files.get(name.replace(/^\//,''));if(!file)return null;
   const buffer=await range(file.offset,file.end),v=new DataView(buffer);
   if(v.getUint32(0,true)!==0x04034b50)throw Error('Invalid workbook member.');
   const start=30+v.getUint16(26,true)+v.getUint16(28,true),bytes=new Uint8Array(buffer,start,file.size);
   if(file.method===0)return binary?new Blob([bytes]):new TextDecoder().decode(bytes);
   if(file.method!==8)throw Error('Unsupported workbook compression.');
   const response=new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
   return binary?response.blob():response.text();
  };
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={open};else window.GearHubExcelZip={open};
})();
