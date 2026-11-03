const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('1.1.262: Settings in the owner design (separate cards, colour icons, owner-only Admin Dashboard pill)',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),js=read('public/settings-design.js'),css=read('public/settings-design.css');
 for(const tag of ['/settings-design.css?v=1.1.268','/settings-design.js?v=1.1.263']){assert.ok(html.includes(tag),tag);assert.ok(sw.includes('"'+tag+'"'),tag+' in SHELL')}
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
 assert.doesNotMatch(css,/settings-profile-hero::(before|after)/,'no overlay layers on the picture');
});
test('1.1.263: Android ≤380px keeps the pills on the right; old saved subtitle replaced; GearHub rows get icons',()=>{
 const js=read('public/settings-design.js'),css=read('public/settings-design.css');
 assert.match(css,/@media\(max-width:380px\)\{[\s\S]*>\.settings-segment\{grid-column:3!important;grid-row:1!important/);
 assert.match(js,/const oldSub=\/payment \(details\|information\)/);
 assert.match(js,/row\.id==='create-shop-action'\)return 'newshop';if\(row\.id==='my-shops-action'\)return 'myshops'/);
});
test('1.1.266: Settings top picture is the green sky with clouds and a lime wave (Settings only)',()=>{
 const css=read('public/settings-design.css');
 assert.match(css,/#profile-view\.settings-new>\.settings-profile-hero\{min-height:124px;[^}]*url\("\/images\/settings-banner\.jpg\?v=1\.1\.268b"\) center bottom\/cover no-repeat #13792f!important\}/);
 assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname,'..','public','images','settings-banner.jpg')));
 for(const u of css.match(/data:image\/svg\+xml,[^"]*/g))assert.doesNotMatch(u,/#/,'# is encoded in data URLs');
});
