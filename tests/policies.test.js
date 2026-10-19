const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Database=require('better-sqlite3');
const policies=require('../lib/policies');
const pub=f=>fs.readFileSync(path.join(__dirname,'..','public',f),'utf8');
const memDb=()=>{const db=new Database(':memory:');db.exec('CREATE TABLE platform_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');return db;};
test('default policies page has Terms, Privacy, Delivery, Seller rules and contact, with no scripts',()=>{
 const html=policies.render(policies.load(memDb()));
 for(const id of ['terms','privacy','delivery','seller','contact'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/name="viewport"/);assert.match(html,/09-766472432/);assert.match(html,/href="tel:\+959766472432"/);assert.match(html,/အခမဲ့/);
 assert.ok(!/<script/i.test(html),'static page needs no JavaScript (CSP script-src self)');
});
test('works without the platform tables (main store only)',()=>{const db=new Database(':memory:');assert.equal(policies.load(db).custom,false);assert.match(policies.render(policies.load(db)),/id="terms"/);});
test('owner edits are saved, dated, escaped and can be restored to the original',()=>{
 const db=memDb(),start=policies.load(db);
 const sections=structuredClone(start.sections);
 sections.terms={title:'Terms <b>x</b>',subtitle:'Sub',body:'## Rules / Rules EN\n- one <script>alert(1)</script> / two\n\n**Bold** text\n> note line'};
 sections.delivery={title:'',subtitle:'',body:''};
 const saved=policies.save(db,{phone:'09 111 222',email:'shop@example.com',sections});
 assert.equal(saved.custom,true);assert.match(saved.updated,/^\d{4}-\d{2}-\d{2}$/);
 const html=policies.render(policies.load(db));
 assert.ok(!html.includes('<script>alert'));assert.match(html,/&lt;script&gt;/);assert.match(html,/Terms &lt;b&gt;x&lt;\/b&gt;/);
 assert.match(html,/<h3>Rules \/ Rules EN<\/h3>/);assert.match(html,/<strong>Bold<\/strong>/);assert.match(html,/class="note"/);
 assert.ok(!/id="delivery"/.test(html),'empty sections are hidden');assert.match(html,/mailto:shop@example\.com/);
 assert.throws(()=>policies.save(db,{email:'not an email',sections}),/valid email/);
 assert.throws(()=>policies.save(db,{sections:{...sections,privacy:{title:'',body:'text'}}}),/needs a title/);
 assert.equal(policies.save(db,{reset:true}).custom,false);assert.match(policies.render(policies.load(db)),/09-766472432/);
});
test('Myanmar text keeps the English part after " / " in grey',()=>{
 assert.match(policies.body('- မူးယစ်ဆေးဝါး / Illegal drugs'),/မူးယစ်ဆေးဝါး \/ <span class="en">Illegal drugs<\/span>/);
 assert.match(policies.body('English only line'),/<p class="en">/);
 assert.ok(!/span class="en"/.test(policies.body('KBZPay / WavePay / ဘဏ်')),'no grey part when the tail is Myanmar');
});
test('every store footer and the seller application link to the policies; server renders the page',()=>{
 const index=pub('index.html');
 for(const anchor of ['#terms','#privacy','#seller'])assert.ok(index.includes('href="/policies.html'+anchor+'"'),anchor);
 assert.match(pub('shop-application.js'),/href="\/policies\.html#seller"/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8'),/app\.get\("\/policies\.html"/);
 assert.match(pub('platform.js'),/api\("\/owner\/policies", "PUT"/);
});
test('old placeholder policy URLs redirect to the approved page and the store no longer says owner review required',()=>{
 for(const [name,anchor] of [['index',''],['terms','#terms'],['privacy','#privacy'],['returns','#delivery'],['shipping','#delivery'],['warranty','#delivery']]){
  const html=pub('policies/'+name+'.html');assert.match(html,new RegExp('http-equiv="refresh" content="0;url=/policies\\.html'+anchor+'"'),name);assert.ok(!/Owner review required/.test(html),name);
 }
 const index=pub('index.html');assert.ok(!/Owner review required/.test(index));assert.match(index,/<a href="\/policies\.html">/);
});
