// 1.1.302 owner (Facebook picture): Settings place = person (Profile); Profile shows only the photo and name;
// the ☰ Menu at the top opens the old Settings.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Profile tab: person icon, photo + name only, ☰ Menu opens Settings, Back closes it',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),js=read('public/profile-menu.js'),css=read('public/profile-menu.css');
 for(const nav of ['mobile-bottom-nav','desktop-top-nav']){const part=html.slice(html.indexOf('<nav class="'+nav+'"'));const item=part.slice(part.indexOf('data-store-view="profile"'),part.indexOf('</button>',part.indexOf('data-store-view="profile"')));assert.match(item,/data-i18n="navProfile"/,nav);assert.doesNotMatch(item,/navSettings/,nav)}
 for(const tag of html.match(/\/profile-menu\.(?:js|css)\?v=[0-9.]+/g))assert.ok(sw.includes('"'+tag+'"'),tag+' in SHELL');
 assert.match(css,/#profile-view\.pm-home>:not\(\.profile-home\)\{display:none!important\}/,'only the photo and name until Menu');
 assert.match(js,/getElementById\('settings-profile-avatar'\)/,'same photo as the Settings profile card');
 assert.match(read('public/back-nav.js'),/\["profile-menu","profile-menu-close"\]/,'phone Back closes the menu');
});
