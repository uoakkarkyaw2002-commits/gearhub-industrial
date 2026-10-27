const {test}=require('node:test'),assert=require('node:assert/strict');const {render,login}=require('../public/shop-application');
const me={user:{email:'seller@example.test'},application:null,shop:null};
test('1.1.199 create form: only the required shop name and one Create your shop button, no steps or extra fields',()=>{const html=render(me);assert.match(html,/name="name" required/);assert.match(html,/Create your shop<\/button>/);assert.doesNotMatch(html,/application-progress|name="reason"|application-email|name="(?:slug|code|email)"/);});
test('received/pending is distinct from approved and makes no email-delivery claim',()=>{const html=render({...me,application:{name:'Fixture',status:'pending'}});assert.match(html,/Application received/);assert.match(html,/awaiting owner approval/);assert.match(html,/not open yet/);assert.match(html,/id="check-approval"/);assert.doesNotMatch(html,/Manage my shop|email.*sent|notified by email|Enter Code/);assert.match(html,/<li class="current" aria-current="step">/);});
test('approved card links to the scoped admin and uses actual subscription dates',()=>{const html=render({...me,shop:{name:'Fixture',slug:'fixture',starts_at:'2026-10-14T00:00:00Z',ends_at:'2026-12-14T00:00:00Z'}});assert.match(html,/href="\/shops\/fixture\/admin"/);assert.match(html,/14\/10\/2026/);assert.match(html,/14\/12\/2026/);assert.doesNotMatch(html,/id="apply"|id="check-approval"/);});
test('untrusted application text stays escaped and rejected requests can be resubmitted without the old note',()=>{const html=render({...me,user:{email:'" onfocus="bad()'},application:{status:'rejected',name:'<script>bad()</script>',reason:'</textarea><img onerror=bad()>',decision_note:'<b>no</b>'}});assert.doesNotMatch(html,/Application rejected/);assert.match(html,/id="apply"/);assert.match(html,/value="&lt;script&gt;bad\(\)&lt;\/script&gt;"/);assert.doesNotMatch(html,/<script>|<img onerror|<b>no<\/b>/);});
test('login CTA reflects actual OAuth readiness',()=>{assert.match(login(true),/id="google-login"/);assert.doesNotMatch(login(true),/ disabled/);assert.match(login(false),/disabled/);});
test('visitor sign-in matches the approved glass card without a review or approval step',()=>{
 const html=login(true);
 assert.match(html,/glass-signin-card/);assert.match(html,/role="dialog" aria-modal="true" aria-labelledby="signin-title" tabindex="-1"/);
 assert.doesNotMatch(html,/application-progress|Review|Approved|request your shop|စောင့်ဆိုင်း/);
 for(const text of ['Start your own shop','Sign in with Google to create your shop.','Your own shop','Your name, your logo','Add products','Photos, prices and stock','Receive orders','Orders and payment receipts','Sign in, name your shop and get started.'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/<li>/g)||[]).length,3);assert.equal((html.match(/<button /g)||[]).length,1);
});
test('visitor motion respects reduced motion and the new artwork and assets are cached consistently',()=>{
 const fs=require('node:fs'),path=require('node:path'),read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
 const css=read('signin.css'),html=read('platform.html'),sw=read('sw.js'),script=read('platform.js');
 assert.match(css,/body\.visitor\.signin-open #account \.glass-signin-card\{[^}]*animation:signin-float-in 1400ms/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{body\.visitor\.signin-open #account \.glass-signin-card\{animation:none\}\}/);
 assert.match(css,/body\.visitor\.signin-open #account\{[^}]*backdrop-filter:none/,'the whole scene is not blurred');
 assert.match(css,/body\.visitor>\.signin-scene/,'new background is confined to the visitor view');
 assert.match(script,/if\(!me\.user&&!me\.isOwner&&scene&&!scene\.getAttribute\('src'\)\)scene\.src=scene\.dataset\.src/,'owner pages do not load the visitor artwork');
 for(const asset of ['signin.css','platform.js','shop-application.js','images/signin-scene.webp']){
  const tag=html.match(new RegExp('/'+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=[^" ]+'))?.[0];
  assert.ok(tag,asset+' is loaded');assert.ok(sw.includes('"'+tag+'"'),asset+' offline version matches');
 }
});
