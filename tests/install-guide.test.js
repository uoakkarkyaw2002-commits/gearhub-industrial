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

test('1.1.196: a seller who already has a shop goes into it; the owner has one-tap Google Sign in',()=>{
 const platform=read('public/platform.js'),css=read('public/platform.css');
 assert.match(platform,/if\(Date\.now\(\)-last>60000\)\{[^\n]*location\.replace\("\/shops\/"\+encodeURIComponent\(me\.shop\.slug\)\+"\/admin"/,'at most once a minute, so it cannot loop');
 assert.match(platform,/me\.isOwner \? '<a class="owner-google-signin" href="\/platform\.html\?visitor">Skyshop<\/a>'/,'1.1.197: the owner opens the new-seller page');
 assert.match(platform,/if \(new URLSearchParams\(location\.search\)\.has\("visitor"\)\) me = \{ \.\.\.me, user: null, isOwner: false, shop: null, application: null \};/);
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
