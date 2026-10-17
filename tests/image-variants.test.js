const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const sharp=require('sharp');const {optimizedImage,variantPath}=require('../lib/image-variants');
test('large photos get one smaller WebP copy; small or unsupported files are left alone',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gearhub-variants-'));
  try{
    const big=path.join(dir,'big.png');await sharp(crypto.randomBytes(400*400*3),{raw:{width:400,height:400,channels:3}}).png().toFile(big);
    const bytes=fs.statSync(big).size;assert.ok(bytes>200*1024);
    const [a,b]=await Promise.all([optimizedImage(big,{bytes,mime:'image/png'}),optimizedImage(big,{bytes,mime:'image/png'})]);
    assert.equal(a,variantPath(big));assert.equal(b,a,'concurrent requests share one job');
    assert.ok(fs.statSync(a).size<bytes);assert.equal((await sharp(a).metadata()).format,'webp');
    assert.equal(await optimizedImage(big,{bytes,mime:'image/png'}),a,'existing copy is reused');
    assert.deepEqual(fs.readdirSync(dir).filter(f=>f.endsWith('.tmp')),[]);
    const small=path.join(dir,'small.png');await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toFile(small);
    assert.equal(await optimizedImage(small,{bytes:fs.statSync(small).size,mime:'image/png'}),null);
    assert.equal(await optimizedImage(big,{bytes,mime:'image/gif'}),null);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('GearHub /uploads and seller shop photos use the same optimizer',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8'),platform=fs.readFileSync(path.join(__dirname,'..','lib','platform.js'),'utf8');
  assert.match(server,/require\("\.\/lib\/image-variants"\)/);assert.match(server,/app\.get\("\/uploads\/:file"/);
  assert.match(platform,/require\("\.\/image-variants"\)/);assert.doesNotMatch(platform,/require\("sharp"\)/);
});
