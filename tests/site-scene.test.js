// skyshopmm.com background uploads (GearHub owner): picture, moving SVG layer, or a zip with both.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const zlib=require('node:zlib');
const scene=require('../lib/site-scene');
test('SVG layer: code is removed, non-SVG files are refused',()=>{
 const out=scene.cleanSvg(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g onload="x()"><a href="javascript:y">a</a><use href="#bird"/></g><foreignObject><div>h</div></foreignObject></svg>')).toString();
 assert.ok(!/script|onload|javascript:|foreignObject/i.test(out),out);
 assert.match(out,/<use href="#bird"\/>/);
 assert.throws(()=>scene.cleanSvg(Buffer.from('<html><body>x</body></html>')),/must start with <svg>/);
});
test('picture and layer are saved and can be reset',async()=>{
 const Database=require('better-sqlite3'),db=new Database(':memory:'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-'));
 const png=await require('sharp')({create:{width:40,height:20,channels:3,background:'#f90'}}).png().toBuffer();
 assert.equal((await scene.saveFile(db,dir,'picture',png)).picture,true);
 assert.ok(fs.existsSync(path.join(scene.dirOf(dir),'picture.jpg')));
 assert.equal((await scene.saveFile(db,dir,'layer',Buffer.from('<svg viewBox="0 0 1 1"><circle r="1"/></svg>'))).layer,true);
 await assert.rejects(scene.saveFile(db,dir,'picture',Buffer.from('not a picture')),/JPG, PNG or WebP/);
 // Phones can have their own picture and layer.
 assert.equal((await scene.saveFile(db,dir,'phone',png)).phone,true);
 assert.equal((await scene.saveFile(db,dir,'phone-layer',Buffer.from('<svg><g/></svg>'))).phoneLayer,true);
 assert.ok(fs.existsSync(path.join(scene.dirOf(dir),'phone.jpg'))&&fs.existsSync(path.join(scene.dirOf(dir),'phone-layer.svg')));
 await assert.rejects(scene.saveFile(db,dir,'other',png),/Unknown item/);
 for(const kind of ['layer','picture','phone','phone-layer'])scene.reset(db,dir,kind);
 assert.deepEqual((({picture,layer,phone,phoneLayer})=>({picture,layer,phone,phoneLayer}))(scene.load(db)),{picture:false,layer:false,phone:false,phoneLayer:false});
 fs.rmSync(dir,{recursive:true,force:true});
});
test('the owner page opens a zip (stored and deflated files) like the one Codex sends',async()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','platform.js'),'utf8');
 const src=js.slice(js.indexOf('  async function unzipFiles(file)'),js.indexOf('  const field = (name, label'));
 const unzipFiles=new Function(src+';return unzipFiles')();
 // Build a small zip: background.jpg (stored), birds.svg (deflated), plus a macOS junk entry.
 const entries=[['background.jpg',Buffer.from('JPEGDATA'),0],['birds.svg',Buffer.from('<svg><g/></svg>'),8],['__MACOSX/._birds.svg',Buffer.from('x'),0]];
 const parts=[],central=[];let offset=0;
 for(const [name,data,method] of entries){
  const body=method?zlib.deflateRawSync(data):data,n=Buffer.from(name),local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(method,8);local.writeUInt32LE(body.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(n.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(method,10);c.writeUInt32LE(body.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  parts.push(local,n,body);central.push(c,n);offset+=30+n.length+body.length;
 }
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 const zip=Buffer.concat([...parts,cd,end]);
 const files=await unzipFiles({arrayBuffer:async()=>zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.length)});
 assert.deepEqual(files.map(f=>f.name),['background.jpg','birds.svg']);
 assert.equal(await (await files[0].read()).text(),'JPEGDATA');
 assert.equal(await (await files[1].read()).text(),'<svg><g/></svg>');
});
test('platform page shows the uploaded background (phone files on phones) with the moving layer on top',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','platform.html'),'utf8'),install=fs.readFileSync(path.join(__dirname,'..','lib','tenant-install.js'),'utf8');
 assert.match(html,/<picture class="sky-picture"><source media="\(max-width:600px\)" srcset="\/scene-asset\/phone" \/><img class="sky-scene" src="\/scene-asset\/picture" alt="" aria-hidden="true" \/><\/picture>/);
 assert.match(html,/<picture class="sky-picture"><source media="\(max-width:600px\)" srcset="\/scene-asset\/phone-layer" \/><img class="sky-layer" src="\/scene-asset\/layer" alt="" aria-hidden="true" \/><\/picture>/);
 // Phones fall back to the PC files; no picture = built-in drawing. Sent directly, never redirected.
 assert.match(install,/order=\{picture:\['picture'\],phone:\['phone','picture'\],layer:\['layer'\],'phone-layer':\['phone-layer','layer'\]\}/);
 assert.match(install,/file=path\.join\(publicDir,'images','platform-scene\.svg'\)/);
 assert.match(install,/else return res\.type\('image\/svg\+xml'\)\.send\('<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1" height="1"\/>'\);/);
 assert.match(install,/'Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"/);
});
test('a Codex single-HTML package (picture inside + inline SVG) is accepted, phones get a tall cut',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','platform.js'),'utf8');
 assert.match(js,/const page = !picture && !layer && files\.find\(\(f\) => \/\\\.html\?\$\/i\.test\(f\.name\)\);/);
 assert.match(js,/if \(page\) \(\{ picture, layer \} = await fromHtmlPackage\(await \(await page\.read\(\)\)\.text\(\), tall\)\);/);
 assert.match(js,/doc\.querySelector\('img\[src\^="data:image\/"\]'\)/);
 assert.match(js,/const w = img\.naturalWidth, h = img\.naturalHeight, cw = Math\.round\(h \* 9 \/ 16\);/);
 assert.match(js,/accept="\.zip,application\/zip,\.html,text\/html" data-scene-zip="\$\{side\}"/);
});
