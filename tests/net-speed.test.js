// Network speed under the shop logo: measured (iPhone Safari does not report it), green / yellow / red.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('the shop measures its real speed and shows a coloured wifi icon under the logo',()=>{
 const js=read('net-speed.js'),css=read('style.css'),index=read('index.html'),sw=read('sw.js');
 assert.match(js,/document\.querySelector\('\.home-profile-banner \.settings-profile-avatar'\)/);
 assert.match(js,/const GOOD=1024\*1024,NORMAL=200\*1024;/);
 assert.match(js,/const SAMPLE='\/speed-test\.bin',READ_MS=1500;/,'a plain file: no server work, no compression');
 assert.match(js,/fetch\(SAMPLE\+'\?speed='\+Date\.now\(\),\{cache:'no-store'/,'a fresh download each time, never a cached copy');
 assert.match(js,/if\(!start\)\{start=now;first=value\.byteLength;continue\}/,'timed from the first byte, so a far server is not counted as slow');
 assert.match(js,/if\(now-start>=READ_MS\)\{stop\.abort\(\);break\}/,'stops after 1.5 s');
 assert.match(js,/setInterval\(measure,180000\)/);
 const bin=fs.statSync(path.join(__dirname,'..','public','speed-test.bin'));assert.equal(bin.size,1048576);
 const swFetch=sw.slice(sw.indexOf('addEventListener("fetch"'));assert.doesNotMatch(swFetch,/\.bin|speed-test/,'the app cache never keeps the speed file');
 assert.match(js,/if\(busy\|\|document\.hidden\)return;/,'no measuring while the app is in the background');
 assert.match(css,/\.net-speed\[data-level="good"\]\{color:#34c759\}\.net-speed\[data-level="normal"\]\{color:#ffcc00\}\.net-speed\[data-level="low"\]\{color:#ff3b30\}/);
 assert.match(index,/<script src="\/net-speed\.js\?v=20261027-net-speed-3"><\/script>/);
 assert.match(sw,/"\/net-speed\.js\?v=20261027-net-speed-3"/);
});
test('phones: logo and name sit higher and the speed is under the logo with a gap (owner mock-up)',()=>{
 const css=read('style.css');
 assert.match(css,/\.home-profile-banner \.settings-profile-avatar,\.home-profile-banner \.settings-profile-copy\{transform:translateY\(-12px\)\}/);
 assert.match(css,/\.settings-profile-avatar>\.net-speed\{top:calc\(100% \+ 5px\)\}/);
});
