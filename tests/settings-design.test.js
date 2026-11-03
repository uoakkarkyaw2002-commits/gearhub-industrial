const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('1.1.262: Settings in the owner design (separate cards, colour icons, owner-only Admin Dashboard pill)',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),js=read('public/settings-design.js'),css=read('public/settings-design.css');
 for(const tag of ['/settings-design.css?v=1.1.262','/settings-design.js?v=1.1.262']){assert.ok(html.includes(tag),tag);assert.ok(sw.includes('"'+tag+'"'),tag+' in SHELL')}
 assert.match(js,/if\(!mine\)return;/,'only the shop owner or GearHub owner gets the Admin Dashboard pill');
 assert.match(js,/mine=!!store\?\.id&&Number\(me\.shop\?\.id\)===Number\(store\.id\)/);
 assert.match(css,/#profile-view\.settings-new>\.settings-card>\.settings-row\{[^}]*border-radius:22px;background:#fff/);
 assert.doesNotMatch(css,/mobile-bottom-nav/,'the bottom navigation is not restyled');
});
test('1.1.262: Add to Home Screen also shows inside an installed app and copies the link; top picture unchanged',()=>{
 const app=read('public/app-install.js'),upd=read('public/updates.js'),css=read('public/settings-design.css');
 assert.doesNotMatch(app,/if\(action&&standalone\(\)\)action\.hidden=true;/);
 assert.doesNotMatch(upd,/home-screen-action'\)\?\.setAttribute\('hidden'/);
 assert.match(app,/if \(standalone\(\)\) \{\n\s+\/\/ Inside an installed app[\s\S]*navigator\.clipboard\.writeText\(link\)/);
 assert.doesNotMatch(css,/settings-profile-hero::(before|after)/,'navigation background stays as before');
});
