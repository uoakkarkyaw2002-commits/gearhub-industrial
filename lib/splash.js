// The picture, sound and length of the opening screen every seller shop shows (SkyShopMM).
// The platform owner sets them; everything is kept in platform_meta ("splash") and
// <dataDir>/platform-media/splash/.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const KEY='splash',DEFAULTS={seconds:3,rev:'0',pc:false,phone:false,sound:''};
const SOUND_TYPES={mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg'};
const dirOf=dataDir=>path.resolve(dataDir,'platform-media','splash');
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e};
function load(db){try{const row=db.prepare('SELECT value FROM platform_meta WHERE key=?').get(KEY);return {...DEFAULTS,...(row?JSON.parse(row.value):{})};}catch{return {...DEFAULTS};}}
function save(db,settings){
 db.exec('CREATE TABLE IF NOT EXISTS platform_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const next={...DEFAULTS,...settings,rev:String(Date.now())};
 db.prepare('INSERT INTO platform_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(KEY,JSON.stringify(next));
 return next;
}
function secondsOf(value){const n=Number(value);if(value===''||value==null||!Number.isFinite(n)||n<0||n>10)fail(400,'Choose 0 to 10 seconds (0 = no opening picture).');return Math.round(n*10)/10;}
function soundType(buf){
 if(!buf||buf.length<16)return '';
 const text=(a,b)=>buf.toString('latin1',a,b);
 if(text(0,3)==='ID3'||(buf[0]===0xFF&&(buf[1]&0xE0)===0xE0))return 'mp3';
 if(text(4,8)==='ftyp')return 'm4a';
 if(text(0,4)==='RIFF'&&text(8,12)==='WAVE')return 'wav';
 if(text(0,4)==='OggS')return 'ogg';
 return '';
}
function remove(dataDir,name){fs.rmSync(path.join(dirOf(dataDir),name),{force:true});}
async function saveFile(db,dataDir,kind,buffer){
 const dir=dirOf(dataDir);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const current=load(db);
 if(kind==='pc'||kind==='phone'){
  let out;try{out=await sharp(buffer,{limitInputPixels:40e6}).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).jpeg({quality:84,mozjpeg:true}).toBuffer();}
  catch{fail(400,'Upload a JPG, PNG or WebP picture.');}
  fs.writeFileSync(path.join(dir,kind+'.jpg'),out);return save(db,{...current,[kind]:true});
 }
 if(kind==='sound'){
  const ext=soundType(buffer);if(!ext)fail(400,'Upload an MP3, M4A, WAV or OGG sound.');
  for(const e of Object.keys(SOUND_TYPES))remove(dataDir,'sound.'+e);
  fs.writeFileSync(path.join(dir,'sound.'+ext),buffer);return save(db,{...current,sound:ext});
 }
 fail(404,'Unknown item.');
}
function reset(db,dataDir,kind){
 const current=load(db);
 if(kind==='pc'||kind==='phone'){remove(dataDir,kind+'.jpg');return save(db,{...current,[kind]:false});}
 if(kind==='sound'){for(const e of Object.keys(SOUND_TYPES))remove(dataDir,'sound.'+e);return save(db,{...current,sound:''});}
 fail(404,'Unknown item.');
}
module.exports={load,save,secondsOf,saveFile,reset,dirOf,SOUND_TYPES,soundType};
