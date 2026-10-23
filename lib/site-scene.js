// Background of skyshopmm.com (platform.html), set by the GearHub owner: a picture and, on top of it,
// an optional moving SVG layer (e.g. flying birds). Kept in platform_meta ("site-scene") and
// <dataDir>/platform-media/scene/. Without uploads the built-in drawing is used.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const KEY='site-scene',DEFAULTS={rev:'0',picture:false,layer:false};
const MAX_SVG=1.5*1024*1024;
const dirOf=dataDir=>path.resolve(dataDir,'platform-media','scene');
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e};
function load(db){try{const row=db.prepare('SELECT value FROM platform_meta WHERE key=?').get(KEY);return {...DEFAULTS,...(row?JSON.parse(row.value):{})};}catch{return {...DEFAULTS};}}
function save(db,settings){
 db.exec('CREATE TABLE IF NOT EXISTS platform_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const next={...DEFAULTS,...settings,rev:String(Date.now())};
 db.prepare('INSERT INTO platform_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(KEY,JSON.stringify(next));
 return next;
}
// The moving layer is shown as a picture, but anyone can also open its address directly, so
// everything that could run code is removed (scripts, event attributes, embedded HTML, outside links).
function cleanSvg(buffer){
 if(!buffer||buffer.length>MAX_SVG)fail(400,'The SVG must be 1.5 MB or smaller.');
 let text=buffer.toString('utf8').replace(/^﻿/,'');
 if(!/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text))fail(400,'Upload an SVG file (it must start with <svg>).');
 text=text
  .replace(/<!DOCTYPE[^>]*>/gi,'')
  .replace(/<script[\s\S]*?<\/script\s*>/gi,'').replace(/<script[^>]*\/>/gi,'')
  .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi,'')
  .replace(/<(iframe|embed|object|audio|video)[\s\S]*?(?:<\/\1\s*>|\/>)/gi,'')
  .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'')
  .replace(/\s(?:xlink:)?href\s*=\s*(["'])(?!#|data:image\/(?:png|jpe?g|webp|gif);)[^"']*\1/gi,'');
 if(/<script|javascript:|<foreignObject|\son[a-z]+\s*=/i.test(text))fail(400,'This SVG contains code that is not allowed.');
 return Buffer.from(text,'utf8');
}
function remove(dataDir,name){fs.rmSync(path.join(dirOf(dataDir),name),{force:true});}
async function saveFile(db,dataDir,kind,buffer){
 const dir=dirOf(dataDir);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const current=load(db);
 if(kind==='picture'){
  let out;try{out=await sharp(buffer,{limitInputPixels:40e6}).rotate().resize({width:2600,height:2600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85,mozjpeg:true}).toBuffer();}
  catch{fail(400,'Upload a JPG, PNG or WebP picture.');}
  fs.writeFileSync(path.join(dir,'picture.jpg'),out);return save(db,{...current,picture:true});
 }
 if(kind==='layer'){fs.writeFileSync(path.join(dir,'layer.svg'),cleanSvg(buffer));return save(db,{...current,layer:true});}
 fail(404,'Unknown item.');
}
function reset(db,dataDir,kind){
 const current=load(db);
 if(kind==='picture'){remove(dataDir,'picture.jpg');return save(db,{...current,picture:false});}
 if(kind==='layer'){remove(dataDir,'layer.svg');return save(db,{...current,layer:false});}
 fail(404,'Unknown item.');
}
module.exports={load,save,saveFile,reset,dirOf,cleanSvg};
