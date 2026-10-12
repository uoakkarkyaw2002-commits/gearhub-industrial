const {test}=require('node:test');const assert=require('node:assert/strict');
const {passwordError,validToken}=require('../lib/security');
test('passphrases use a minimum length and UTF-8 bcrypt byte limit',()=>{
 assert.ok(passwordError('123456'));assert.equal(passwordError('a strong passphrase for GearHub'), '');
 assert.ok(passwordError('မ'.repeat(25)));assert.ok(passwordError('a'.repeat(73)));assert.ok(passwordError('abcdefghijklmnop\0'));assert.equal(passwordError('a'.repeat(72)), '');
});
test('CSRF token matching rejects missing, malformed and different tokens',()=>{const token='a'.repeat(64);assert.equal(validToken(token,token),true);for(const actual of [undefined,'','a'.repeat(63),'b'.repeat(64),token+'a'])assert.equal(validToken(token,actual),false);});
const {spawnSync}=require('node:child_process');const path=require('node:path');
test('production starts only with an HTTPS origin and explicit durable storage',()=>{
 const run=extra=>spawnSync(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8',env:{...process.env,NODE_ENV:'production',PUBLIC_ORIGIN:'',DATA_DIR:'',SESSION_SECRET:'x'.repeat(48),...extra}});
 const missingOrigin=run({});assert.notEqual(missingOrigin.status,0);assert.match(missingOrigin.stderr,/PUBLIC_ORIGIN/);
 const missingDisk=run({PUBLIC_ORIGIN:'https://shop.example'});assert.notEqual(missingDisk.status,0);assert.match(missingDisk.stderr,/DATA_DIR/);
 const serverless=run({PUBLIC_ORIGIN:'https://shop.example',DATA_DIR:'/tmp/never-open-gearhub',VERCEL:'1'});assert.notEqual(serverless.status,0);assert.match(serverless.stderr,/Vercel/);
});
