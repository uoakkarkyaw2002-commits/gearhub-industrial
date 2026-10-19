// A seller shop must never show GearHub's name, logo or photos (they once mixed:
// "gearhub." and the GearHub excavator appeared inside the POLESTAR shop).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {sellerBranding}=require('../lib/tenant-install');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
// Visible text plus the labels people (and screen readers) see.
function visible(html){
 const body=html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,'');
 const labels=[...body.matchAll(/\b(?:aria-label|alt|title|placeholder)="([^"]*)"/g)].map(m=>m[1]);
 return [body.replace(/<[^>]*>/g,' '),...labels].join('\n');
}

test('seller page HTML shows the shop name and never GearHub',()=>{
 const page=sellerBranding(pub('index.html'),'POLESTAR <A>');
 const leftovers=visible(page).split('\n').filter(line=>/gear\s*hub/i.test(line));
 assert.deepEqual(leftovers,[]);
 assert.match(page,/data-site-brand-name>POLESTAR &lt;A&gt;</);assert.match(page,/<strong>POLESTAR &lt;A&gt;<\/strong>\./);
 assert.match(page,/class="gearhub-footer"/,'class names are untouched');assert.match(page,/name="gearhub-build-version"/,'meta names are untouched');
 assert.match(pub('index.html'),/data-site-brand-name>GearHub</,'GearHub itself keeps its own brand');
});

test('tenant config ignores blank appearance fields and rewrites copied GearHub text',async()=>{
 const snapshot={name:'POLESTAR',settings:{logoId:'logo-1',description:'Spare parts',appearance:{brandName:'',siteTitle:' ',logoUrl:'',heroImageUrl:'',translations:{en:{settingsEyebrow:'GEARHUB APP',footer:'Your trusted GearHub source'},my:{}}}},products:[],service:{}};
 const context={location:{pathname:'/shops/polestar/',origin:'https://example.test'},Response,URL,JSON,Object,Math,Set,Promise,Error,encodeURIComponent,decodeURIComponent,
  fetch:async()=>new Response(JSON.stringify(snapshot),{status:200,headers:{'content-type':'application/json'}}),
  document:{querySelectorAll:()=>[],querySelector:()=>null}};
 context.window=context;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/tenant-store.js'),'utf8'),context);
 const site=(await (await context.GearHubTenantStore.fetch('/api/config')).json()).site;
 assert.equal(site.brandName,'POLESTAR');assert.equal(site.siteTitle,'POLESTAR');
 assert.equal(site.logoUrl,'https://example.test/api/platform/images/logo-1');
 assert.equal(site.translations.en.settingsEyebrow,'POLESTAR APP');assert.equal(site.translations.en.footer,'Your trusted POLESTAR source');
});

test('storefront script never falls back to GearHub name or photos inside a seller shop',()=>{
 const store=pub('store.js');
 assert.match(store,/tenantStore\?ownName:\(site\.brandName\|\|"gearhub\."\)/);
 assert.match(store,/\(tenantStore\?"":"\/images\/hero-excavator\.jpg"\)/);
 assert.match(store,/profileAvatar\.alt=tenantStore\?ownName:/);
 assert.match(store,/if\(!tenantStore\)urls\.add\("\/images\/hero-excavator\.jpg"\)/);
});
