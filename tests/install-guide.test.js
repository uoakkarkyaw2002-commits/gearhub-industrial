// 1.1.195 owner: a new shop takes the seller straight into its admin, where a step-by-step helper shows
// how to put the shop admin on the Home Screen.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('a shop that opens at once sends the seller into its admin with the welcome helper',()=>{
 const platform=read('public/platform.js'),app=read('public/shop-application.js');
 assert.match(platform,/const r = await api\("\/applications", "POST", d\);\s*if \(r\.slug\) \{\s*location\.href = "\/shops\/" \+ encodeURIComponent\(r\.slug\) \+ "\/admin\?welcome=1";/);
 assert.doesNotMatch(app,/Your shop opens only after owner approval/);
});

test('the Home Screen helper is loaded in the admin, cached offline, and never opens inside the installed app',()=>{
 const admin=read('public/admin.html'),sw=read('public/sw.js'),js=read('public/install-guide.js');
 for(const asset of [...admin.matchAll(/\/install-guide\.(?:js|css)\?v=[^"]+/g)].map(m=>m[0]))assert.ok(sw.includes('"'+asset+'"'),asset+' is in the offline shell');
 assert.match(admin,/<script src="\/install-guide\.js\?v=[^"]+"><\/script>/);
 assert.match(js,/function open\(\)\{if\(standalone\(\)\)return;/);
 assert.match(js,/if\(ios&&iosOther\)return \[/,'apps other than Safari are sent to Safari first');
 assert.match(js,/if\(prompt\)return \[/,'Android and PC use the browser install prompt when there is one');
});

test('1.1.204: Home is the login card for everyone; a signed-in account gets one button into its own place',()=>{
 const platform=read('public/platform.js'),app=require('../public/shop-application.js'),css=read('public/platform.css'),server=read('lib/platform.js');
 assert.doesNotMatch(platform,/gh-into-shop/,'no automatic jump into a shop (owner: a POLESTAR phone always landed in POLESTAR)');
 const base={user:{email:'s@example.test'},application:null,shop:null,isOwner:false};
 assert.match(app.account({...base,shop:{slug:'pole star',name:'POLESTAR <b>'}}),/href="\/shops\/pole%20star\/admin"><svg[^]*POLESTAR &lt;b&gt; ဆိုင်ထဲ သွားမယ်/);
 assert.match(app.account(base),/href="\/platform\.html\?view=create"/);
 assert.match(app.account({...base,isOwner:true}),/href="\/platform\.html\?view=console">[^]*Owner console/);
 for(const html of [app.account(base),app.account({...base,isOwner:true})]){assert.match(html,/id="google-login">တခြား account နဲ့ ဝင်မယ်<\/button><button type="button" id="account-logout">Logout<\/button>/)}
 assert.match(server,/res\.redirect\(model\.isOwner\(db,u,ownerEmail\) \? '\/platform\.html\?view=console' : approved \? '\/shops\/'\+encodeURIComponent\(approved\.slug\)\+'\/admin' : '\/platform\.html\?view=create'\);/);
 assert.match(platform,/'<a class="owner-google-signin" href="\/platform\.html">Skyshop<\/a>'/);
 assert.match(css,/body\.onboarding:not\(\.visitor\) \.site-brand,body\.onboarding:not\(\.visitor\) \.site-nav a\{white-space:nowrap\}/);
});

test('1.1.198: the helper talks like a chat and every iPhone Safari step has a short looping video',()=>{
 const js=read('public/install-guide.js'),css=read('public/install-guide.css');
 assert.match(js,/const reply='<div class="ig-msg ig-me"><p>ပြီးပြီ ✓ \/ Done<\/p><\/div>';/);
 assert.match(js,/setTimeout\(\(\)=>\{if\(mine===typing\)end\(\)\},900\);/,'the robot types, then replies by itself');
 for(const scene of ['ios-share','ios-add','ios-confirm','home'])assert.ok(js.includes("scene:'"+scene+"'"),scene);
 for(const name of ['ig-f-share','ig-f-add','ig-f-confirm','ig-f-home'])assert.match(css,new RegExp('@keyframes '+name+'\\{'));
 assert.doesNotMatch(js,/<footer>/,'the admin page footer style must not paint the buttons');
});

test('1.1.213: the app is added from the shop Home page; the admin sends the seller there',()=>{
 const js=read('public/install-guide.js'),index=read('public/index.html'),sw=read('public/sw.js');
 assert.match(js,/location\.pathname\.match\(\/\^\\\/shops\\\/\(\[\^\/\]\+\)\\\/\(admin\\\/\?\)\?\$\/\)/);
 assert.match(js,/else if\(k==='next'&&inAdmin\)location\.href=homeUrl\+'\?install=1';/);
 assert.match(js,/if\(!inAdmin\)\{if\(asked&&!standalone\(\)\)/,'customers on the Home page never see it unless sent from the admin');
 for(const asset of [...index.matchAll(/\/install-guide\.(?:js|css)\?v=[^"]+/g)].map(m=>m[0]))assert.ok(sw.includes('"'+asset+'"'),asset+' is in the offline shell');
 assert.match(index,/<script src="\/install-guide\.js\?v=[^"]+"><\/script>/);
});
