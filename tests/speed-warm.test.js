const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
test('1.1.331: background preload and Settings → App speed (fastest vs now)',()=>{
 const js=read('speed-warm.js'),html=read('index.html'),sw=read('sw.js');
 for(const tag of ['/speed-warm.js?v=1.1.331','/speed-warm.css?v=1.1.331','/shops-feed.js?v=1.1.331','/net-speed.js?v=1.1.406','/profile-menu.js?v=1.1.331'])assert.ok(html.includes(tag)&&sw.includes('"'+tag+'"'),tag);
 assert.match(js,/saveData/,'no background download on Data saver');
 assert.match(js,/GearHubShops\?\.warm/);assert.match(js,/GearHubProfileWarm/);
 assert.match(read('shops-feed.js'),/warm\(\) \{/);assert.match(read('profile-menu.js'),/window\.GearHubProfileWarm=/);
 assert.match(read('net-speed.js'),/window\.GearHubNetSpeed=\{last:null,test:sample,label\}/);
 assert.match(js,/id='app-speed-action'/);
});
