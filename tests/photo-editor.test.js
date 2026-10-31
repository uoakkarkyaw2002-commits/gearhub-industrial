// 1.1.227 owner: product photos show one row with "See more"; "Edit photo" turns, straightens, takes the
// background away (on our own server) and sets a new background colour.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('cover photos show one row and a See more button',()=>{
 const js=read('public/admin.js');
 assert.match(js,/function fitCoverRow\(\)\{/);
 assert.match(js,/o\.hidden=!coverOpen&&i>=perRow/);
 assert.match(js,/"See more \("\+\(options\.length-perRow\)\+"\) ▼"/);
});
test('Edit photo is loaded in the admin, cached offline, and puts the edited photo back',()=>{
 const html=read('public/admin.html'),sw=read('public/sw.js'),js=read('public/photo-editor.js'),admin=read('public/admin.js');
 for(const f of ['photo-editor.js','photo-editor.css']){const tag=html.match(new RegExp('/'+f.replace('.','\\.')+'\\?v=[^"]+'))?.[0];assert.ok(tag,f);assert.ok(sw.includes('"'+tag+'"'),f+' offline')}
 assert.match(js,/zone\.after\(open\)/,'beside Choose photos');
 assert.match(js,/fetch\('\/api\/tools\/remove-background'/);
 assert.match(js,/window\.GearHubProductPhotos\.replace\(state\.index,file\)/);
 assert.match(admin,/window\.GearHubProductPhotos=\{/);
});
test('background removal runs on our own server with the U2-Netp model, signed-in admins only',async()=>{
 const server=read('server.js');
 assert.match(server,/app\.post\("\/api\/tools\/remove-background"/);
 assert.match(server,/if \(!req\.session\.admin && !req\.session\.platformUser\) return res\.status\(401\)/);
 assert.match(server,/validToken\(req\.session\.csrfToken, req\.get\("x-csrf-token"\)\)/);
 assert.ok(fs.statSync(path.join(__dirname,'../models/u2netp.onnx')).size>4e6);
 const sharp=require('sharp'),{removeBackground}=require('../lib/bg-remove');
 const photo=await sharp({create:{width:200,height:200,channels:3,background:'#c9a36b'}}).composite([{input:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect x="60" y="40" width="80" height="120" rx="10" fill="#333"/></svg>')}]).jpeg().toBuffer();
 const png=await removeBackground(photo),meta=await sharp(png).metadata();
 assert.equal(meta.format,'png');assert.equal(meta.channels,4);
});
