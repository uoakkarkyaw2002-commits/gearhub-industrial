// 1.1.200 owner: a browser tab of a shop app that is already on the Home Screen shows a bouncing "Open in app".
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('each shop app manifest names itself as the related app, so the browser can tell it is installed',()=>{
 const lib=read('lib/tenant-install.js');
 assert.match(lib,/related_applications:\[\{platform:'webapp',url:new URL\(i\.base\+'app\.webmanifest',publicOrigin\)\.href\}\]/);
 assert.match(lib,/related_applications:\[\{platform:'webapp',url:new URL\(i\.base\+'admin\.webmanifest',publicOrigin\)\.href\}\]/);
});

test('the pill shows only in a browser tab when the app is installed, and is loaded on shop and admin pages',()=>{
 const js=read('public/open-in-app.js'),admin=read('public/admin.html'),index=read('public/index.html'),sw=read('public/sw.js');
 assert.match(js,/if\(standalone\|\|typeof navigator\.getInstalledRelatedApps!=='function'/);
 assert.match(js,/getInstalledRelatedApps\(\)\.then\(apps=>\{if\(!apps\|\|!apps\.length\)return;show\(\)\}\)/);
 assert.match(js,/@keyframes open-in-app-bounce/);
 for(const page of [admin,index])assert.match(page,/<script src="\/open-in-app\.js\?v=([^"]+)"><\/script>/);
 const tag=index.match(/\/open-in-app\.js\?v=[^"]+/)[0];assert.ok(sw.includes('"'+tag+'"'),'offline shell has the same tag');
});
