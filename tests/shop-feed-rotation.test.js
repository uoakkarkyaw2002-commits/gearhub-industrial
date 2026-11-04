const {test} = require('node:test'), assert = require('node:assert/strict');
const express = require('express'), session = require('express-session'), Database = require('better-sqlite3');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const model = require('../lib/platform-model'), {createPlatform} = require('../lib/platform');

async function fixture(t, counts) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gh-feed-rotation-')),db=new Database(':memory:');model.migrate(db);
  const ids=[];
  for(let i=0;i<counts.length;i++){
    const id=i+10;
    db.prepare('INSERT INTO platform_users(id,google_sub,email,name) VALUES(?,?,?,?)').run(id,'user-'+id,id+'@example.test','Owner '+id);
    db.prepare("INSERT INTO platform_shops(id,owner_id,slug,name,plan_id,subscription_status) VALUES(?,?,?,?,1,'active')").run(id,id,'shop-'+id,'Shop '+id);
    for(let j=0;j<counts[i];j++)ids.push(Number(db.prepare('INSERT INTO platform_products(shop_id,sku,name,price,stock) VALUES(?,?,?,1000,5)').run(id,id+'-'+j,'Needle '+id+'-'+j).lastInsertRowid));
  }
  const app=express();app.use(express.json(),session({secret:'rotation-fixture-secret-'.repeat(3),resave:false,saveUninitialized:false}));
  app.use('/api/platform',createPlatform({db,dataDir:root,publicOrigin:'http://localhost',env:{}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(root,{recursive:true,force:true});});
  const get=async params=>{const r=await fetch(base+'/api/platform/feed?'+new URLSearchParams(params));return {status:r.status,...await r.json()};};
  return {db,ids,get};
}

test('mixed feed alternates shops with uneven bulk uploads, including across page boundaries, without missing posts',async t=>{
  const {db,ids,get}=await fixture(t,[15,9,45]);
  let page=await get({mode:'mixed'}),all=[...page.items];assert.equal(page.status,200);assert.equal(page.items.length,20);
  assert.deepEqual(page.items.slice(0,9).map(p=>p.shop.slug),['shop-10','shop-11','shop-12','shop-10','shop-11','shop-12','shop-10','shop-11','shop-12']);
  assert.match(page.nextBefore,/^m1\./);
  db.prepare('INSERT INTO platform_products(shop_id,sku,name,price,stock) VALUES(12,?,?,1000,5)').run('NEW','New upload during pagination');
  const after=await get({mode:'mixed',before:page.nextBefore});assert.equal(after.items[0].shop.slug,'shop-12','the next page continues the turn');
  page=after;all.push(...page.items);
  for(let pages=0;page.nextBefore&&pages<10;pages++){page=await get({mode:'mixed',before:page.nextBefore});assert.equal(page.status,200);all.push(...page.items);}
  assert.equal(page.nextBefore,null);
  assert.equal(new Set(all.map(p=>p.id)).size,ids.length);
  assert.deepEqual(all.map(p=>p.id).sort((a,b)=>a-b),ids,'a new upload cannot duplicate or skip existing posts');
  const remaining=new Map([['shop-10',15],['shop-11',9],['shop-12',45]]);let previous='';
  for(const p of all){if(p.shop.slug===previous)assert.equal([...remaining].some(([slug,count])=>slug!==previous&&count>0),false,'one shop repeats only after other shops are exhausted');remaining.set(p.shop.slug,remaining.get(p.shop.slug)-1);previous=p.shop.slug;}
  for(const slug of remaining.keys()){const own=all.filter(p=>p.shop.slug===slug).map(p=>p.id);assert.deepEqual(own,[...own].sort((a,b)=>b-a),'newest within each shop');}
  const newest=await get({});assert.equal(newest.items[0].name,'New upload during pagination');assert.ok(newest.items.every(p=>p.shop.slug==='shop-12'),'New Arrivals retains newest-first ordering');
});

test('more than a page of shops all get a turn, and a single shop still paginates',async t=>{
  const f=await fixture(t,Array(25).fill(2));let page=await f.get({mode:'mixed'}),all=[...page.items];
  assert.equal(new Set(page.items.map(p=>p.shop.slug)).size,20);
  for(let pages=0;page.nextBefore&&pages<5;pages++){page=await f.get({mode:'mixed',before:page.nextBefore});all.push(...page.items);}
  assert.deepEqual(all.slice(0,25).map(p=>p.shop.slug),Array.from({length:25},(_,i)=>'shop-'+(i+10)));
  assert.equal(all.length,50);assert.equal(new Set(all.map(p=>p.id)).size,50);assert.equal(page.nextBefore,null);
  page=await f.get({mode:'mixed',shops:'shop-10'});assert.equal(page.items.length,2);assert.equal(page.nextBefore,null);
});

test('mixed search and Following stay filtered; cursors cannot be reused with different filters',async t=>{
  const {get,db}=await fixture(t,[25,25,25]);
  const params={mode:'mixed',q:'needle',shops:'shop-10,shop-12'};
  const first=await get(params);assert.deepEqual(first.items.slice(0,4).map(p=>p.shop.slug),['shop-10','shop-12','shop-10','shop-12']);
  const next=await get({...params,before:first.nextBefore});assert.equal(next.status,200);assert.ok(next.items.every(p=>['shop-10','shop-12'].includes(p.shop.slug)));
  assert.equal((await get({...params,q:'different',before:first.nextBefore})).status,400);
  assert.equal((await get({...params,shops:'shop-11',before:first.nextBefore})).status,400);
  for(const before of ['1','m1.nope','m1.'+'a'.repeat(12001)])assert.equal((await get({mode:'mixed',before})).status,400);
  assert.equal((await get({before:first.nextBefore})).status,400,'legacy numeric cursors keep their validation');
  db.prepare("UPDATE platform_shops SET status='suspended' WHERE id=12").run();
  const hidden=await get({...params,before:first.nextBefore});assert.ok(hidden.items.every(p=>p.shop.slug==='shop-10'),'public availability is checked again on each page');
});
