const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { createPlatform } = require("../lib/platform");
const { createOrderPush } = require("../lib/order-push");
const { originGuard } = require("../lib/security");
const model = require("../lib/platform-model");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
test("Google approval, tenant isolation, owner roles, quotas, subscriptions and orders", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gearhub-platform-test-"));
  const db = new Database(path.join(root, "gearhub.sqlite"));
  db.pragma("foreign_keys=ON");
  db.exec(
    "CREATE TABLE products(id INTEGER,stock INTEGER);INSERT INTO products VALUES(99,12);CREATE TABLE orders(id INTEGER);INSERT INTO orders VALUES(99)",
  );
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "Platform-test-secret-123456789",
      resave: false,
      saveUninitialized: false,
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  const appliedNotices = [];
  const pushed = [];
  const orderPush = createOrderPush({ db, subject: "https://shop.test", sender: { generateVAPIDKeys: () => ({ publicKey: "BPub" + "x".repeat(80), privateKey: "priv" }), sendNotification: async (sub, payload) => { pushed.push({ endpoint: sub.endpoint, ...JSON.parse(payload) }); } } });
  app.use("/api", originGuard(base));
  app.use(
    "/api/platform",
    createPlatform({
      db,
      dataDir: root,
      publicOrigin: base,
      orderPush,
      notifyApplication: (details) => appliedNotices.push(details),
      env: {
        PLATFORM_OWNER_EMAIL: "owner@gmail.com",
        GOOGLE_CLIENT_ID: "fixture",
      },
      identityProvider: async (code, nonce) => ({
        sub: code,
        email: code + "@gmail.com",
        email_verified: code !== "unverified",
        name: code,
        nonce: code === "badnonce" ? "wrong" : nonce,
      }),
    }),
  );
  // Most of this file tests the owner's manual approval (used once the shop limit is full), so new shops
  // start with no free places; the auto-open test below raises the limit.
  db.prepare("INSERT INTO platform_signup(id,max_shops,storage_mb) VALUES(1,0,100) ON CONFLICT(id) DO UPDATE SET max_shops=0").run();
  t.after(async () => {
    await new Promise((r) => server.close(r));
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  class Client {
    constructor() {
      this.cookie = "";
      this.csrf = "";
    }
    async call(p, method = "GET", body, extra = {}) {
      const h = { Origin: base, "X-CSRF-Token": this.csrf, ...extra };
      if (this.cookie) h.Cookie = this.cookie;
      if (body && !(body instanceof FormData)) {
        h["Content-Type"] = "application/json";
        body = JSON.stringify(body);
      }
      const r = await fetch(base + "/api/platform" + p, {
        method,
        headers: h,
        body,
        redirect: "manual",
      });
      const c = r.headers.get("set-cookie");
      if (c) this.cookie = c.split(";")[0];
      const data = r.status === 302 ? null : await r.json();
      return { status: r.status, data, location:r.headers.get("location") };
    }
    async me() {
      const r = await this.call("/me");
      if (r.data.csrfToken) this.csrf = r.data.csrfToken;
      return r.data;
    }
    async login(name) {
      await this.me();
      const start = await this.call("/auth/start", "POST", {});
      const state = new URL(start.data.url).searchParams.get("state");
      const result = await this.call(
        "/auth/callback?code=" + name + "&state=" + state,
      );
      if (result.status === 302) await this.me();
      return result;
    }
  }
  const owner = new Client(),
    a = new Client(),
    b = new Client(),
    buyer = new Client();
  let aid, bid, pa, pb, order, receipt;
  await t.test(
    "callback rejects wrong state, replay, unverified mail and nonce; login creates no shop",
    async () => {
      const c = new Client();
      await c.me();
      assert.equal(
        (await c.call("/auth/callback?code=a&state=wrong")).status,
        400,
      );
      assert.equal((await c.login("badnonce")).status, 400);
      assert.equal((await c.login("unverified")).status, 400);
      assert.equal((await owner.login("owner")).status, 302);
      assert.equal((await a.login("alice")).status, 302);
      assert.equal((await b.login("bob")).status, 302);
      assert.equal((await a.me()).shop, null);
      assert.equal((await a.call("/shops/2")).status, 404);
      assert.equal((await a.call("/owner")).status, 403);
      assert.equal(
        (await a.call("/owner/release", "POST", { version: "2.0.0" })).status,
        403,
      );
    },
  );
  await t.test("name-only applications allocate unique URLs; approval retries preserve one shop and trial", async () => {
    const first = new Client(), second = new Client();
    await first.login("simplea"); await second.login("simpleb");
    assert.equal((await first.call("/applications","POST",{name:"Same shop"})).status,201);
    assert.equal((await second.call("/applications","POST",{name:"Same shop"})).status,201);
    const one=(await first.me()).application,two=(await second.me()).application;
    assert.notEqual(one.slug,two.slug);
    assert.equal((await first.me()).shop,null);
    assert.equal((await first.call("/store/"+one.slug)).status,404);
    assert.equal((await first.call("/owner/applications/"+one.id,"PATCH",{status:"approved"})).status,403);
    const responses=await Promise.all([1,2,3].map(()=>owner.call("/owner/applications/"+one.id,"PATCH",{status:"approved"})));
    assert.ok(responses.every(r=>r.status===200));
    const shop=(await first.me()).shop;
    assert.equal(shop.ends_at,model.addCalendarMonths(shop.starts_at,2));
    assert.equal(shop.limits.storageLimit,100*1024*1024,'a shop the owner approves gets the "MB per new shop" setting');
    assert.equal(db.prepare("SELECT COUNT(*) n FROM platform_shops WHERE owner_id=?").get(shop.owner_id).n,1);
    assert.equal((await owner.call("/owner/applications/"+one.id,"PATCH",{status:"approved"})).status,200);
    assert.equal((await first.me()).shop.starts_at,shop.starts_at);
    assert.equal((await second.call("/shops/"+shop.id)).status,404);
    assert.deepEqual((await first.call("/store/"+shop.slug)).data.products,[]);
    assert.deepEqual(JSON.parse(db.prepare("SELECT settings FROM platform_shops WHERE id=?").get(shop.id).settings),{});
  });
  await t.test(
    "pending/rejected applications never open shops; owner approval is explicit",
    async () => {
      assert.equal(
        (
          await a.call("/applications", "POST", {
            name: "Alice store",
            slug: "alice-store",
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await b.call("/applications", "POST", {
            name: "Bob store",
            slug: "bob-store",
          })
        ).status,
        201,
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.ok(appliedNotices.some((n) => n.name === "Alice store" && n.email === "alice@gmail.com" && /\/platform\.html$/.test(n.origin + "/platform.html")), "GearHub is told about the new application");
      const list = (await owner.call("/owner")).data;
      const ar = list.applications.find((x) => x.name === "Alice store"),
        br = list.applications.find((x) => x.name === "Bob store");
      assert.equal((await a.me()).application.status, "pending");
      assert.equal((await a.me()).shop, null);
      assert.equal(
        (
          await a.call("/owner/applications/" + ar.id, "PATCH", {
            status: "approved",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await owner.call("/owner/applications/" + br.id, "PATCH", {
            status: "rejected",
            note: "Review details",
          })
        ).status,
        200,
      );
      assert.equal((await b.me()).application.status, "rejected");
      assert.equal((await b.me()).shop, null);
      assert.equal(
        (
          await b.call("/applications", "POST", {
            name: "Bob store",
            slug: "bob-store",
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await owner.call("/owner/applications/" + ar.id, "PATCH", {
            status: "approved",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await owner.call("/owner/applications/" + br.id, "PATCH", {
            status: "approved",
          })
        ).status,
        200,
      );
      aid = (await a.me()).shop.id;
      bid = (await b.me()).shop.id;
      assert.notEqual(aid, bid);
    const trial=(await a.me()).shop;assert.equal(trial.subscription_status,'trial');assert.ok(trial.starts_at);assert.equal(trial.ends_at,model.addCalendarMonths(trial.starts_at,2));
    assert.equal((await owner.call('/owner/applications/'+ar.id,'PATCH',{status:'approved'})).status,200);

    },
  );
  await t.test("shared admin metadata stays scoped, validates photos and categories, and survives migration replay",async()=>{
    const endpoint='/shops/'+aid;
    assert.equal((await a.login('alice')).location,'/shops/alice-store/admin');
    assert.equal((await b.call(endpoint+'/export')).status,404);
    assert.equal((await a.call(endpoint+'/export')).data.shop.slug,'alice-store');
    assert.equal((await b.call(endpoint+'/categories')).status,404);
    assert.equal((await b.call(endpoint+'/appearance','PUT',{})).status,404);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[{category_en:'Tools',category_my:'Tools'},{category_en:'Parts',category_my:'Parts',parent_en:'Tools'}]})).status,200);
    const cats=(await a.call(endpoint+'/categories')).data;
    assert.equal(cats[1].parent_id,cats[0].id);
    assert.deepEqual((await b.call('/shops/'+bid+'/categories')).data,[]);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[{category_en:'Same'},{category_en:'same'}]})).status,400);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[{category_en:'Cycle',parent_en:'Cycle'}]})).status,400);
    const categorySnapshot=()=>JSON.stringify(['products','orders','platform_products','platform_orders'].map(table=>db.prepare('SELECT * FROM '+table+' ORDER BY id').all()));
    const initialCategoryRows=(await a.call(endpoint+'/categories')).data,originalCategoryData=categorySnapshot();
    const withEmpty=(await a.call(endpoint+'/categories','PUT',{categories:[...initialCategoryRows,{category_en:'Empty deletion fixture'}]})).data.categories;
    assert(withEmpty.some(c=>c.category_en==='Empty deletion fixture'));
    const deleted=await a.call(endpoint+'/categories','PUT',{categories:withEmpty.filter(c=>c.category_en!=='Empty deletion fixture')});assert.equal(deleted.status,200);assert(!(await a.call(endpoint+'/categories')).data.some(c=>c.category_en==='Empty deletion fixture'));
    assert.equal(categorySnapshot(),originalCategoryData);
    const appearance={brandName:'Only Alice',siteTitle:'Alice',colors:{brand:'#123456',accent:'#123456',page:'#ffffff',hero:'#123456'},translations:{en:{heroTitle:'Alice only'},my:{}},layout:{hero:{enabled:true,padding:30}}};
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,200);
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.brandName,'Only Alice');
    // A blank name/title/logo must never be stored, so the shop never falls back to GearHub's brand.
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,brandName:'  ',siteTitle:'',logoUrl:''})).status,200);
    const blankSaved=(await a.call('/store/alice-store')).data.settings.appearance;
    assert.equal('brandName' in blankSaved,false);assert.equal('siteTitle' in blankSaved,false);assert.equal('logoUrl' in blankSaved,false);
    const shown=(await a.call(endpoint+'/appearance')).data;assert.equal(shown.brandName,'Alice store');assert.equal(shown.siteTitle,'Alice store');
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,200);
    // Owner 1.1.201: only GearHub sets a seller shop's navigation picture; the seller's save keeps GearHub's.
    db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,ready) VALUES('navpic1',?,'image','image/jpeg',10,'navpic1.jpg',1)").run(aid);
    const navPic={...appearance,navigationBackgroundUrl:'/api/platform/images/navpic1'};
    assert.equal((await a.call(endpoint+'/appearance','PUT',navPic)).status,200);
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.navigationBackgroundUrl,'','the seller cannot set it');
    assert.equal((await owner.call(endpoint+'/appearance','PUT',navPic)).status,200);
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.navigationBackgroundUrl,'/api/platform/images/navpic1','GearHub can');
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,200);
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.navigationBackgroundUrl,'/api/platform/images/navpic1','a seller save keeps GearHub\'s picture');
    assert.equal((await owner.call(endpoint+'/appearance','PUT',appearance)).status,200);db.prepare("DELETE FROM platform_files WHERE id='navpic1'").run();
    const ownerSet={storageBytes:5*1024**3,endsAt:'2027-02-14T23:59:59+06:30'};
    assert.equal((await owner.call('/owner/shops/'+aid,'PATCH',ownerSet)).status,200);
    const service=(await a.call('/store/alice-store')).data.service;
    assert.equal(service.storageLimit,ownerSet.storageBytes,'shop app shows owner-assigned storage');
    assert.equal(Date.parse(service.endsAt),Date.parse(ownerSet.endsAt),'shop app shows owner-assigned expiry');
    assert.equal((await b.call('/store/bob-store')).data.settings.appearance,undefined);
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,logoUrl:'/uploads/other.jpg'})).status,400);
    const file=new FormData();file.append('file',new Blob([png],{type:'image/png'}),'photo.png');
    const own=(await a.call(endpoint+'/files','POST',file)).data.id;
    const other=new FormData();other.append('file',new Blob([png],{type:'image/png'}),'photo.png');
    const foreign=(await b.call('/shops/'+bid+'/files','POST',other)).data.id;
    const categoryWithBanner=(await a.call(endpoint+'/categories','PUT',{categories:initialCategoryRows.map(category=>category.category_en==='Tools'?{...category,bannerUrl:'/api/platform/images/'+own}:category)})).data.categories;
    assert.equal(categoryWithBanner.find(category=>category.category_en==='Tools').bannerUrl,'/api/platform/images/'+own);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:categoryWithBanner.map(category=>category.category_en==='Tools'?{...category,bannerUrl:'/api/platform/images/'+foreign}:category)})).status,400);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:initialCategoryRows})).status,200);
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,logoUrl:'/api/platform/images/'+foreign})).status,400);
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,logoUrl:'/api/platform/images/'+own})).status,200);
    const rowsSnapshot=()=>JSON.stringify(['products','orders','platform_products','platform_orders'].map(table=>db.prepare('SELECT * FROM '+table+' ORDER BY id').all()));
    const beforeBanner=rowsSnapshot(),otherSettings=db.prepare('SELECT settings FROM platform_shops WHERE id=?').get(bid).settings;
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,categoryBannerUrl:'/api/platform/images/'+foreign})).status,400);
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,categoryBannerUrl:'/api/platform/images/'+own})).status,200);
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.categoryBannerUrl,'/api/platform/images/'+own);
    // Large photos are served as a smaller cached WebP copy; small ones as uploaded.
    const big=await require('sharp')(require('node:crypto').randomBytes(400*400*3),{raw:{width:400,height:400,channels:3}}).png().toBuffer();
    assert.ok(big.length>200*1024,'fixture is a large photo');
    const bigForm=new FormData();bigForm.append('file',new Blob([big],{type:'image/png'}),'big.png');
    const bigId=(await a.call(endpoint+'/files','POST',bigForm)).data.id;
    const served=await fetch(base+'/api/platform/images/'+bigId);
    assert.equal(served.headers.get('content-type'),'image/webp');
    assert.match(served.headers.get('cache-control'),/immutable/);
    assert.ok((await served.arrayBuffer()).byteLength<big.length,'optimized copy is smaller');
    const small=await fetch(base+'/api/platform/images/'+own);
    assert.equal(small.headers.get('content-type'),'image/png');
    assert.equal((await a.call(endpoint+'/files/'+bigId,'DELETE')).status,200);
    assert.equal((await fetch(base+'/api/platform/images/'+bigId)).status,404);
    assert.equal((await a.call(endpoint+'/files/'+own,'DELETE')).status,409);
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,200); // older form must preserve banner
    assert.equal((await a.call('/store/alice-store')).data.settings.appearance.categoryBannerUrl,'/api/platform/images/'+own);
    assert.equal(db.prepare('SELECT settings FROM platform_shops WHERE id=?').get(bid).settings,otherSettings);
    assert.equal(rowsSnapshot(),beforeBanner,'banner changes preserve all legacy/tenant product and order records');
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,categoryBannerUrl:''})).status,200);
    assert.equal((await a.call(endpoint+'/appearance','PUT',{...appearance,logoUrl:'/api/platform/images/'+own})).status,200);

    assert.equal((await a.call(endpoint+'/files/'+own,'DELETE')).status,409);
    assert.equal((await a.call(endpoint+'/products','POST',{name:'Photo test',sku:'PHOTO',stock:1,price:10,imageIds:[foreign]})).status,400);
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,200);
    assert.equal((await a.call(endpoint+'/files/'+own,'DELETE')).status,200);
    assert.equal((await b.call('/shops/'+bid+'/files/'+foreign,'DELETE')).status,200);
    const before=db.prepare('SELECT settings FROM platform_shops WHERE id=?').get(aid).settings;
    model.migrate(db);model.migrate(db);assert.equal(db.prepare('SELECT settings FROM platform_shops WHERE id=?').get(aid).settings,before);
    assert.equal(db.prepare('SELECT stock FROM products WHERE id=99').get().stock,12);
    db.prepare("UPDATE platform_shops SET ends_at='2000-01-01' WHERE id=?").run(aid);
    assert.equal((await a.call(endpoint+'/appearance','PUT',appearance)).status,403);
    assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[]})).status,403);
    assert.equal((await a.call(endpoint+'/appearance')).status,200);
    db.prepare('UPDATE platform_shops SET ends_at=? WHERE id=?').run(model.addCalendarMonths(new Date().toISOString(),2),aid);
  });
  await t.test('tenant three-level editor and product trash/restore enforce ownership, references, quota and stable data',async()=>{
    const endpoint='/shops/'+aid,original=(await a.call(endpoint+'/categories')).data;let id;const orders=JSON.stringify(db.prepare('SELECT * FROM platform_orders ORDER BY id').all());
    try{
      const rows=[...original,{category_en:'TREE-MAIN-FIX'},{category_en:'TREE-SUB-FIX',parent_en:'TREE-MAIN-FIX'},{category_en:'TREE-CHILD-FIX',parent_en:'TREE-SUB-FIX'}];
      const saved=await a.call(endpoint+'/categories','PUT',{categories:rows});assert.equal(saved.status,200);const tree=saved.data.categories,child=tree.find(c=>c.category_en==='TREE-CHILD-FIX'),sub=tree.find(c=>c.category_en==='TREE-SUB-FIX');assert.equal(child.parent_id,sub.id);
      assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[...tree,{category_en:'BAD-DEPTH',parent_en:child.category_en}]})).status,400);
      assert.equal((await a.call(endpoint+'/categories','PUT',{categories:tree.map(c=>c.id===child.id?{...c,parent_id:999999}:c)})).status,400);
      assert.equal((await a.call(endpoint+'/products','POST',{name:'Fixture only',sku:'TREE-TRASH-FIX',partNo:' PN-TREE-1 ',category:child.category_en.toLowerCase(),stock:3,price:111})).status,200);id=(await a.call(endpoint)).data.products.find(p=>p.sku==='TREE-TRASH-FIX').id;assert.equal(JSON.parse((await a.call('/store/alice-store')).data.products.find(p=>p.id===id).details).partNo,'PN-TREE-1');const before=db.prepare('SELECT * FROM platform_products WHERE id=?').get(id);assert.equal((await a.call(endpoint+'/categories')).data.find(c=>c.id===child.id).product_count,1);
      assert.equal((await b.call(endpoint+'/products/'+id+'/trash','POST',{})).status,404);
      assert.equal((await a.call(endpoint+'/products/'+id+'/trash','POST',{})).status,200);assert(!(await a.call('/store/alice-store')).data.products.some(p=>p.id===id));
      assert.equal((await a.call(endpoint+'/products/'+id,'PATCH',{name:'Bad edit',sku:'TREE-TRASH-FIX',expectedStock:3,stock:3,price:111})).status,409);
      assert.equal((await a.call(endpoint+'/products/'+id+'/restore','POST',{})).status,200);assert.deepEqual(db.prepare('SELECT * FROM platform_products WHERE id=?').get(id),before);
      assert.equal((await a.call(endpoint+'/categories','PUT',{categories:tree.filter(c=>c.id!==child.id)})).status,409);assert.equal((await a.call(endpoint+'/categories','PUT',{categories:tree.filter(c=>c.id!==sub.id)})).status,400);
      const renamed=await a.call(endpoint+'/categories','PUT',{categories:tree.map(c=>c.id===child.id?{...c,category_en:'TREE-RENAMED-FIX'}:c)});assert.equal(renamed.status,200);assert.equal(renamed.data.categories.find(c=>c.id===child.id).parent_id,sub.id);assert.equal(db.prepare('SELECT category FROM platform_products WHERE id=?').get(id).category,'TREE-RENAMED-FIX');assert.equal(JSON.stringify(db.prepare('SELECT * FROM platform_orders ORDER BY id').all()),orders);
      assert.equal((await a.call(endpoint+'/products/'+id+'/delete-permanently','POST',{confirmPermanent:true})).status,409);await a.call(endpoint+'/products/'+id+'/trash','POST',{});assert.equal((await b.call(endpoint+'/products/'+id+'/delete-permanently','POST',{confirmPermanent:true})).status,404);assert.equal((await a.call(endpoint+'/products/'+id+'/delete-permanently','POST',{})).status,400);assert.equal((await a.call(endpoint+'/products/'+id+'/delete-permanently','POST',{confirmPermanent:true})).status,200);assert.equal(db.prepare('SELECT id FROM platform_products WHERE id=?').get(id),undefined);
    }finally{if(id)db.prepare('DELETE FROM platform_products WHERE id=?').run(id);assert.equal((await a.call(endpoint+'/categories','PUT',{categories:original})).status,200);}
  });
  await t.test('a subcategory name may repeat under another main category and each keeps its own products',async()=>{
    const endpoint='/shops/'+aid,original=(await a.call(endpoint+'/categories')).data;let id;
    try{
      let saved=await a.call(endpoint+'/categories','PUT',{categories:[...original,{category_en:'DUP-ELECTRIC'},{category_en:'DUP-SWING'},{category_en:'Sany',parent_en:'DUP-ELECTRIC'}]});assert.equal(saved.status,200);
      const tree=saved.data.categories,swing=tree.find(c=>c.category_en==='DUP-SWING'),first=tree.find(c=>c.category_en==='Sany');
      assert.equal((await a.call(endpoint+'/products','POST',{name:'Dup fixture',sku:'DUP-FIX',category:'Sany',stock:1,price:10})).status,200);id=(await a.call(endpoint)).data.products.find(p=>p.sku==='DUP-FIX').id;
      // The owner's case: "Sany" again under another main category saves, and the existing product stays put.
      saved=await a.call(endpoint+'/categories','PUT',{categories:[...tree,{category_en:'Sany',parent_en:'DUP-SWING',parent_id:swing.id}]});assert.equal(saved.status,200);
      const second=saved.data.categories.find(c=>c.category_en==='Sany'&&c.parent_id===swing.id);assert.ok(second&&second.id!==first.id);
      assert.equal(saved.data.categories.find(c=>c.id===first.id).product_count,1);assert.equal(second.product_count,0);
      assert.equal(JSON.parse(db.prepare('SELECT details FROM platform_products WHERE id=?').get(id).details).categoryId,first.id);
      assert.equal((await a.call(endpoint+'/categories','PUT',{categories:[...saved.data.categories,{category_en:'sany',parent_en:'DUP-SWING',parent_id:swing.id}]})).status,400,'never twice under one main category');
      // Moving the product to the second "Sany" by ID, then renaming the first, leaves the product where it is.
      assert.equal((await a.call(endpoint+'/products/'+id,'PATCH',{name:'Dup fixture',sku:'DUP-FIX',category:'Sany',categoryId:second.id,stock:1,expectedStock:1,price:10})).status,200);
      const cats=(await a.call(endpoint+'/categories')).data;assert.equal(cats.find(c=>c.id===second.id).product_count,1);assert.equal(cats.find(c=>c.id===first.id).product_count,0);
      assert.equal((await a.call(endpoint+'/categories','PUT',{categories:cats.map(c=>c.id===first.id?{...c,category_en:'SANY OLD'}:c)})).status,200);
      assert.equal(db.prepare('SELECT category FROM platform_products WHERE id=?').get(id).category,'Sany');
    }finally{if(id)db.prepare('DELETE FROM platform_products WHERE id=?').run(id);assert.equal((await a.call(endpoint+'/categories','PUT',{categories:original})).status,200);}
  });
  await t.test(
    "each shop scopes settings/products and cannot read or mutate another shop",
    async () => {
      assert.equal(
        (
          await a.call("/shops/" + aid, "PATCH", {
            name: "Alice store",
            phone: "fixture",
            bankName: "Fixture",
            bankAccountName: "Fixture",
            bankAccountNumber: "Fixture",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await b.call("/shops/" + bid, "PATCH", {
            bankName: "Fixture",
            bankAccountName: "Fixture",
            bankAccountNumber: "Fixture",
          })
        ).status,
        200,
      );
      for (const [client, id, name] of [
        [a, aid, "A"],
        [b, bid, "B"],
      ])
        assert.equal(
          (
            await client.call("/shops/" + id + "/products", "POST", {
              name,
              sku: "SAME-SKU",
              category: "Parts",
              price: 100,
              stock: 3,
              shop_id: aid,
            })
          ).status,
          200,
        );
      const categoryEndpoint='/shops/'+aid+'/categories';
      const populatedCategories=(await a.call(categoryEndpoint)).data;
      const usedCategory=populatedCategories.find(c=>c.product_count>0);
      assert.ok(usedCategory,'created product must have a populated category');
      const beforeDelete=JSON.stringify(db.prepare('SELECT * FROM platform_products ORDER BY id').all());
      const deniedDelete=await a.call(categoryEndpoint,'PUT',{categories:populatedCategories.filter(c=>c.id!==usedCategory.id)});
      assert.equal(deniedDelete.status,409);
      assert.match(deniedDelete.data.error,/choose another category/);
      assert.deepEqual((await a.call(categoryEndpoint)).data,populatedCategories);
      assert.equal(JSON.stringify(db.prepare('SELECT * FROM platform_products ORDER BY id').all()),beforeDelete);
      pa = (await a.call("/shops/" + aid)).data.products[0].id;
      pb = (await b.call("/shops/" + bid)).data.products[0].id;
      assert.equal((await a.call("/shops/" + bid)).status, 404);
      assert.equal(
        (await a.call("/shops/" + bid, "PATCH", { name: "hacked" })).status,
        404,
      );
      assert.equal(
        (
          await a.call("/shops/" + aid + "/products/" + pb, "PATCH", {
            name: "hack",
            sku: "SAME",
            stock: 3,
            expectedStock: 3,
            price: 1,
          })
        ).status,
        404,
      );
      assert.equal(
        db.prepare("SELECT name FROM platform_products WHERE id=?").get(pb)
          .name,
        "B",
      );
    },
  );
  function fileForm() {
    const f = new FormData();
    f.set("file", new Blob([png], { type: "image/png" }), "fixture.png");
    return f;
  }
  await t.test(
    "quota enforced server-side under simultaneous uploads; lowering quota deletes nothing",
    async () => {
      await owner.call("/owner/shops/" + aid, "PATCH", {
        storageBytes: png.length * 2,
      });
      const r = await Promise.all([
        a.call("/shops/" + aid + "/files", "POST", fileForm()),
        a.call("/shops/" + aid + "/files", "POST", fileForm()),
        a.call("/shops/" + aid + "/files", "POST", fileForm()),
      ]);
      assert.deepEqual(r.map((x) => x.status).sort(), [201, 201, 413]);
      const s = (await a.call("/shops/" + aid)).data;
      assert.equal(s.limits.usedBytes, png.length * 2);
      await owner.call("/owner/shops/" + aid, "PATCH", { storageBytes: 0 });
      assert.equal(
        (await a.call("/shops/" + aid + "/files", "POST", fileForm())).status,
        413,
      );
      assert.equal((await a.call("/shops/" + aid)).data.files.length, 2);
      assert.equal(
        (await b.call("/shops/" + bid, "PATCH", { logoId: s.files[0].id }))
          .status,
        400,
      );
      await owner.call("/owner/shops/" + aid, "PATCH", { storageBytes: 10000 });
    },
  );
  function orderForm(id, q = 2) {
    const f = fileForm();
    f.set("items", JSON.stringify([{ id, quantity: q, price: 1 }]));
    f.set("customer", "Fixture");
    f.set("phone", "fixture");
    f.set("address", "fixture");
    return f;
  }
  await t.test(
    "public checkout uses server prices, rejects cross-shop products, retries once and keeps receipts private",
    async () => {
      await buyer.me();
      const before = (await b.call("/shops/" + bid)).data.limits.usedBytes;
      assert.equal(
        (
          await buyer.call("/store/bob-store/orders", "POST", orderForm(pa), {
            "Idempotency-Key": cryptoKey(),
          })
        ).status,
        409,
      );
      assert.equal(
        (await b.call("/shops/" + bid)).data.limits.usedBytes,
        before,
      );
      const key = cryptoKey();
      const r = await Promise.all([
        buyer.call("/store/bob-store/orders", "POST", orderForm(pb), {
          "Idempotency-Key": key,
        }),
        buyer.call("/store/bob-store/orders", "POST", orderForm(pb), {
          "Idempotency-Key": key,
        }),
      ]);
      assert.deepEqual(r.map((x) => x.status).sort(), [200, 201]);
      assert.equal(r[0].data.id, r[1].data.id);
      assert.equal(r[0].data.total, 200);
      order = r[0].data.id;
      assert.equal(
        db.prepare("SELECT stock FROM platform_products WHERE id=?").get(pb)
          .stock,
        1,
      );
      assert.equal(
        (
          await buyer.call(
            "/store/bob-store/orders",
            "POST",
            orderForm(pb, 1),
            { "Idempotency-Key": key },
          )
        ).status,
        409,
      );
      // A valid promotion price is what the customer pays; 0 or missing is ignored.
      db.prepare("UPDATE platform_products SET details=json_set(COALESCE(details,'{}'),'$.promotionPrice',0) WHERE id=?").run(pb);
      db.prepare("UPDATE platform_products SET stock=stock+2 WHERE id=?").run(pb);
      // Order alerts: Bob's phone subscribes for Bob's shop only; Alice cannot touch it.
      const phone = { endpoint: "https://push.example.test/bob-phone-1", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } };
      assert.equal((await a.call("/shops/" + bid + "/push/subscribe", "POST", { subscription: phone })).status, 404);
      assert.equal((await b.call("/shops/" + bid + "/push/subscribe", "POST", { subscription: { endpoint: "http://insecure" } })).status, 400);
      const sub = await b.call("/shops/" + bid + "/push/subscribe", "POST", { subscription: phone });
      assert.equal(sub.status, 200);assert.equal(sub.data.count, 1);
      assert.equal((await b.call("/shops/" + bid + "/push?endpoint=" + encodeURIComponent(phone.endpoint))).data.subscribed, true);
      assert.equal((await a.call("/shops/" + aid + "/push?endpoint=" + encodeURIComponent(phone.endpoint))).data.subscribed, false);
      pushed.length = 0;
      const noPromo = await buyer.call("/store/bob-store/orders", "POST", orderForm(pb, 1), { "Idempotency-Key": cryptoKey() });
      assert.equal(noPromo.data.total, 100);
      db.prepare("UPDATE platform_products SET details=json_set(details,'$.promotionPrice',60) WHERE id=?").run(pb);
      const promo = await buyer.call("/store/bob-store/orders", "POST", orderForm(pb, 1), { "Idempotency-Key": cryptoKey() });
      assert.equal(promo.data.total, 60);
      // Each new order reached Bob's phone, with Bob's shop link and icon (never GearHub's).
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(pushed.length, 2);
      assert.equal(pushed[0].endpoint, phone.endpoint);
      assert.match(pushed[0].title, /အော်ဒါအသစ်/);assert.match(pushed[0].body, /100 Ks/);assert.match(pushed[1].body, /60 Ks/);
      assert.equal(pushed[0].url, "/shops/bob-store/admin#orders-content");
      assert.equal(pushed[0].icon, "/shops/bob-store/app-icon-192.png");
      const test = await b.call("/shops/" + bid + "/push/test", "POST", {});
      assert.equal(test.data.sent, 1);
      assert.equal((await b.call("/shops/" + bid + "/push/unsubscribe", "POST", { endpoint: phone.endpoint })).data.count, 0);
      db.prepare("UPDATE platform_products SET details=json_remove(details,'$.promotionPrice') WHERE id=?").run(pb);
      // Delete: any order moves to "deleted" (restorable), only by its own shop; deleting it
      // again removes it and its receipt photo for good. A pending order returns its stock.
      const promoRow = db.prepare("SELECT items,receipt_id FROM platform_orders WHERE id=?").get(promo.data.id);
      const promoItem = JSON.parse(promoRow.items)[0];
      const stockOf = () => db.prepare("SELECT stock FROM platform_products WHERE id=?").get(promoItem.productId).stock;
      const stockBefore = stockOf(), oid = promo.data.id, orderRow = () => db.prepare("SELECT status,details FROM platform_orders WHERE id=?").get(oid);
      assert.equal((await a.call("/shops/" + bid + "/orders/" + oid, "DELETE")).status, 404);
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "DELETE")).status, 200);
      assert.equal(orderRow().status, "deleted");assert.equal(JSON.parse(orderRow().details).deleted_from, "pending");
      assert.equal(stockOf(), stockBefore + promoItem.quantity, "a pending order's stock comes back");
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", { status: "confirmed", paymentStatus: "paid" })).status, 409, "restore it first");
      assert.equal((await a.call("/shops/" + bid + "/orders/" + oid, "PATCH", { restore: true })).status, 404);
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", { restore: true })).status, 200);
      assert.equal(orderRow().status, "pending");assert.equal(stockOf(), stockBefore, "restore takes the stock again");
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", { restore: true })).status, 409);
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "DELETE")).status, 200);
      assert.equal((await b.call("/shops/" + bid + "/orders/" + oid, "DELETE")).data.permanent, true);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM platform_orders WHERE id=?").get(oid).n, 0);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM platform_files WHERE id=?").get(promoRow.receipt_id).n, 0);
      db.prepare("UPDATE platform_products SET stock=? WHERE id=?").run(stockBefore, promoItem.productId); // later checks expect the old stock
      db.prepare("UPDATE platform_orders SET status='cancelled' WHERE id=?").run(noPromo.data.id);
      const cancelledStock = db.prepare("SELECT stock FROM platform_products WHERE id=?").get(JSON.parse(db.prepare("SELECT items FROM platform_orders WHERE id=?").get(noPromo.data.id).items)[0].productId).stock;
      assert.equal((await b.call("/shops/" + bid + "/orders/" + noPromo.data.id, "DELETE")).status, 200);
      assert.equal(db.prepare("SELECT stock FROM platform_products WHERE id=?").get(JSON.parse(db.prepare("SELECT items FROM platform_orders WHERE id=?").get(noPromo.data.id).items)[0].productId).stock, cancelledStock, "a cancelled order already returned its stock");
      assert.equal((await b.call("/shops/" + bid + "/trash", "DELETE")).data.deleted, 1);
      db.prepare("DELETE FROM platform_orders WHERE id IN (?,?)").run(noPromo.data.id, promo.data.id);
      const s = (await b.call("/shops/" + bid)).data;
      receipt = s.orders[0].receipt_id;
      assert.equal(
        (await a.call("/shops/" + aid + "/receipts/" + receipt)).status,
        400,
      );
      assert.equal(
        (await buyer.call("/shops/" + bid + "/receipts/" + receipt)).status,
        401,
      );
      assert.equal((await buyer.call("/images/" + receipt)).status, 404);
      const privateResponse = await fetch(
        base + "/api/platform/shops/" + bid + "/receipts/" + receipt,
        { headers: { Cookie: b.cookie } },
      );
      assert.equal(privateResponse.status, 200);
      assert.equal(
        (
          await a.call("/shops/" + aid + "/orders/" + order, "PATCH", {
            status: "cancelled",
            paymentStatus: "pending",
          })
        ).status,
        404,
      );
    },
  );
  await t.test(
    "cancellation once, stale edits and insufficient reopening are atomic",
    async () => {
      assert.equal(
        (
          await b.call("/shops/" + bid + "/products/" + pb, "PATCH", {
            sku: "SAME-SKU",
            name: "B",
            price: 100,
            stock: 10,
            expectedStock: 3,
          })
        ).status,
        409,
      );
      for (let n = 0; n < 2; n++)
        assert.equal(
          (
            await b.call("/shops/" + bid + "/orders/" + order, "PATCH", {
              status: "cancelled",
              paymentStatus: "pending",
            })
          ).status,
          200,
        );
      assert.equal(
        db.prepare("SELECT stock FROM platform_products WHERE id=?").get(pb)
          .stock,
        3,
      );
      await b.call("/shops/" + bid + "/products/" + pb, "PATCH", {
        sku: "SAME-SKU",
        name: "B",
        price: 100,
        stock: 0,
        expectedStock: 3,
      });
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + order, "PATCH", {
            status: "pending",
            paymentStatus: "pending",
          })
        ).status,
        409,
      );
      assert.equal(
        db.prepare("SELECT status FROM platform_orders WHERE id=?").get(order)
          .status,
        "cancelled",
      );
    },
  );
  await t.test(
    "expiry/permissions/suspension gate writes and selling while preserving reads/data",
    async () => {
      await owner.call("/owner/shops/" + bid, "PATCH", {
        startsAt: "2019-01-01", endsAt: "2020-01-01",
      });
      assert.equal((await b.call("/shops/" + bid)).status, 200);
      assert.equal(
        (await b.call("/shops/" + bid + "/products", "POST", { name: "new" }))
          .status,
        403,
      );
      assert.equal((await buyer.call("/store/bob-store")).status, 404);
      assert.equal(
        db
          .prepare("SELECT COUNT(*) n FROM platform_orders WHERE shop_id=?")
          .get(bid).n,
        1,
      );
      await owner.call("/owner/shops/" + bid, "PATCH", { endsAt: null });
      const plan = await owner.call("/owner/plans", "POST", {
        name: "Read only",
        storageBytes: 10000,
        productLimit: 10,
        permissions: {},
      });
      await owner.call("/owner/shops/" + bid, "PATCH", {
        planId: plan.data.id,
      });
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + order, "PATCH", {
            status: "pending",
            paymentStatus: "pending",
          })
        ).status,
        403,
      );
      await owner.call("/owner/shops/" + bid, "PATCH", {
        planId: 1,
        status: "suspended",
      });
      assert.equal((await buyer.call("/store/bob-store")).status, 404);
      await owner.call("/owner/shops/" + bid, "PATCH", { status: "active" });
      const uid = (await b.me()).user.id;
      await owner.call("/owner/users/" + uid, "PATCH", { status: "suspended" });
      assert.equal((await b.call("/shops/" + bid)).status, 403);
      assert.equal((await buyer.call("/store/bob-store")).status, 404);
      await owner.call("/owner/users/" + uid, "PATCH", { status: "active" });
      assert.equal((await b.call("/shops/" + bid)).status, 200);
    },
  );
  await t.test('owner records shop payments, optionally extends service, and sellers cannot see or add them',async()=>{
    const before=(await b.me()).shop;
    assert.equal((await b.call('/owner/shops/'+bid+'/payments','POST',{amount:5000,months:1,method:'KBZPay'})).status,403);
    assert.equal((await owner.call('/owner/shops/'+bid+'/payments','POST',{amount:5000,months:1,method:'Bitcoin'})).status,400);
    assert.equal((await owner.call('/owner/shops/'+bid+'/payments','POST',{amount:-1,months:1,method:'Cash'})).status,400);
    assert.equal((await owner.call('/owner/shops/'+bid+'/payments','POST',{amount:5000,months:30,method:'Cash'})).status,400);
    assert.equal((await owner.call('/owner/shops/999999/payments','POST',{amount:5000,months:0,method:'Cash'})).status,404);
    const paid=await owner.call('/owner/shops/'+bid+'/payments','POST',{amount:15000,months:1,method:'KBZPay',note:'Txn 123\nline2'});
    assert.equal(paid.status,201);assert.equal(paid.data.payment.amount,15000);assert.equal(paid.data.payment.note,'Txn 123 line2');
    const base=before.ends_at&&Date.parse(before.ends_at)>Date.now()?before.ends_at:null;
    if(base)assert.equal(paid.data.endsAt,model.addCalendarMonths(base,1));else assert.ok(Date.parse(paid.data.endsAt)>Date.now()+27*86400000);
    const noExtend=await owner.call('/owner/shops/'+bid+'/payments','POST',{amount:2000,months:0,method:'Cash',paidAt:'2026-01-05T00:00:00+06:30'});
    assert.equal(noExtend.status,201);assert.equal(noExtend.data.endsAt,undefined);assert.equal((await b.me()).shop.ends_at,paid.data.endsAt);
    const list=(await owner.call('/owner')).data;assert.deepEqual(list.payments.filter(p=>p.shop_id===bid).map(p=>p.amount),[15000,2000]);assert.ok(list.paymentMethods.includes('WavePay'));
    assert.ok(!JSON.stringify((await b.me()).shop).includes('15000'));assert.equal((await b.call('/owner')).status,403);
    assert.equal((await b.call('/owner/payments/'+noExtend.data.payment.id,'DELETE')).status,403);
    assert.equal((await owner.call('/owner/payments/'+noExtend.data.payment.id,'DELETE')).status,200);
    assert.equal((await owner.call('/owner/payments/'+noExtend.data.payment.id,'DELETE')).status,404);
  });
  await t.test('only the GearHub owner can edit the policies page text',async()=>{
    const current=(await owner.call('/owner')).data.policies;assert.equal(current.custom,false);assert.ok(current.sections.terms.body.length>100);
    assert.equal((await b.call('/owner/policies','PUT',{reset:true})).status,403);
    const r=await owner.call('/owner/policies','PUT',{phone:'09-123456',email:'',sections:{...current.sections,intro:{...current.sections.intro,title:'GearHub rules'}}});
    assert.equal(r.status,200);assert.equal(r.data.custom,true);assert.equal(r.data.sections.intro.title,'GearHub rules');
    assert.equal((await owner.call('/owner/policies','PUT',{email:'bad',sections:current.sections})).status,400);
    assert.equal((await owner.call('/owner/policies','PUT',{reset:true})).data.custom,false);
  });
  await t.test('applying opens the shop at once while the owner\'s shop limit allows it, with the owner\'s MB',async()=>{
    const shops=()=>db.prepare("SELECT COUNT(*) n FROM platform_shops WHERE legacy=0").get().n,first=new Client(),second=new Client();
    assert.equal((await b.call('/owner/signup','PUT',{maxShops:99,storageMb:5})).status,403,'only the owner sets the limits');
    assert.equal((await owner.call('/owner/signup','PUT',{maxShops:-1,storageMb:100})).status,400);
    assert.equal((await owner.call('/owner/signup','PUT',{maxShops:10,storageMb:0})).status,400);
    const set=await owner.call('/owner/signup','PUT',{maxShops:shops()+1,storageMb:120});assert.equal(set.status,200);assert.equal(set.data.signup.storageMb,120);
    assert.deepEqual((await owner.call('/owner')).data.signup,{maxShops:shops()+1,storageMb:120,shops:shops()});
    await first.login('autoopen1');await second.login('autoopen2');
    const opened=await first.call('/applications','POST',{name:'Auto open shop'});assert.equal(opened.status,201);assert.equal(opened.data.status,'approved');
    const shop=(await first.me()).shop;assert.ok(shop,'no owner approval needed');assert.equal(shop.subscription_status,'trial');assert.equal(shop.ends_at,model.addCalendarMonths(shop.starts_at,2));
    assert.equal(shop.limits.storageLimit,120*1024*1024);assert.equal((await first.me()).application.status,'approved');
    assert.equal(appliedNotices.at(-1).opened,true,'GearHub is still told about the new shop');
    // The limit is now reached: the next application waits for the owner, as before.
    const waiting=await second.call('/applications','POST',{name:'Over the limit'});assert.equal(waiting.data.status,'pending');assert.equal((await second.me()).shop,null);
    assert.equal((await owner.call('/owner/applications/'+(await second.me()).application.id,'PATCH',{status:'approved'})).status,200);assert.ok((await second.me()).shop);
    assert.equal((await owner.call('/owner/signup','PUT',{maxShops:0,storageMb:100})).status,200);
  });
  await t.test('the owner deletes a test shop at once, also one that used Excel auto-upload',async()=>{
    const seller=new Client();await seller.login('deleteme');
    await seller.call('/applications','POST',{name:'Delete me shop'});
    await owner.call('/owner/applications/'+(await seller.me()).application.id,'PATCH',{status:'approved'});
    const shop=(await seller.me()).shop;assert.ok(shop);
    db.prepare("INSERT INTO platform_upload_keys(shop_id,key_hash) VALUES(?,?)").run(shop.id,'hash-'+shop.id);
    assert.equal((await seller.call('/owner/shops/'+shop.id,'DELETE',{confirmDelete:shop.slug})).status,403,'only the owner');
    const r=await owner.call('/owner/shops/'+shop.id,'DELETE',{confirmDelete:shop.slug});assert.equal(r.status,200,JSON.stringify(r.data));
    assert.equal(db.prepare('SELECT id FROM platform_shops WHERE id=?').get(shop.id),undefined);
    assert.equal(db.prepare('SELECT shop_id FROM platform_upload_keys WHERE shop_id=?').get(shop.id),undefined);
    assert.equal((await seller.me()).shop,null);
    // Owner 1.1.196: the same Google account applies again and its new shop opens at once.
    assert.equal((await owner.call('/owner/signup','PUT',{maxShops:99,storageMb:100})).status,200);
    const again=await seller.call('/applications','POST',{name:'Delete me shop'});
    assert.equal(again.status,201,JSON.stringify(again.data));assert.equal(again.data.status,'approved');assert.ok(again.data.slug);
    assert.equal((await seller.me()).shop.slug,again.data.slug);
    assert.equal((await owner.call('/owner/signup','PUT',{maxShops:0,storageMb:100})).status,200);
  });
  await t.test('only the GearHub owner can connect, sync or disconnect Google Drive backup',async()=>{
    for(const action of ['connect','sync','disconnect'])assert.equal((await b.call('/owner/drive/'+action,'POST',{})).status,403);
    assert.equal((await owner.call('/owner/drive/connect','POST',{})).status,503,'no Google sign-in in this test server');
  });
  await t.test('only the GearHub owner sets the opening screen (seconds, pictures, sound) every shop shows',async()=>{
    const goodPng=await require('sharp')({create:{width:8,height:8,channels:3,background:'#3366ff'}}).png().toBuffer();
    const first=(await owner.call('/owner')).data.splash;assert.equal(first.seconds,3);assert.equal(first.pc,false);assert.equal(first.sound,'');
    assert.equal((await b.call('/owner/splash','PUT',{seconds:5})).status,403);
    const pic=new FormData();pic.append('file',new Blob([goodPng],{type:'image/png'}),'a.png');assert.equal((await b.call('/owner/splash/pc','POST',pic)).status,403);
    assert.equal((await b.call('/owner/splash/pc','DELETE')).status,403);
    for(const bad of [-1,11,'x',''])assert.equal((await owner.call('/owner/splash','PUT',{seconds:bad})).status,400,'seconds '+bad);
    assert.equal((await owner.call('/owner/splash','PUT',{seconds:5})).data.seconds,5);
    const up=new FormData();up.append('file',new Blob([goodPng],{type:'image/png'}),'mine.png');
    const saved=await owner.call('/owner/splash/pc','POST',up);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.pc,true);assert.equal(saved.data.phone,false);
    const notPicture=new FormData();notPicture.append('file',new Blob([Buffer.from('this is not a picture at all')],{type:'image/png'}),'x.png');assert.equal((await owner.call('/owner/splash/phone','POST',notPicture)).status,400);
    const notSound=new FormData();notSound.append('file',new Blob([Buffer.from('this is not a sound file at all')],{type:'audio/mpeg'}),'x.mp3');assert.equal((await owner.call('/owner/splash/sound','POST',notSound)).status,400);
    const wav=Buffer.concat([Buffer.from('RIFF'),Buffer.from([36,0,0,0]),Buffer.from('WAVEfmt '),Buffer.alloc(24)]);const snd=new FormData();snd.append('file',new Blob([wav],{type:'audio/wav'}),'ding.wav');
    const withSound=await owner.call('/owner/splash/sound','POST',snd);assert.equal(withSound.status,200,JSON.stringify(withSound.data));assert.equal(withSound.data.sound,'wav');
    // 0 seconds = no opening screen at all.
    assert.equal((await owner.call('/owner/splash','PUT',{seconds:0})).data.seconds,0,'0 = no opening screen');
    await owner.call('/owner/splash','PUT',{seconds:3});
    assert.equal((await owner.call('/owner/splash/pc','DELETE')).data.pc,false);assert.equal((await owner.call('/owner/splash/sound','DELETE')).data.sound,'');assert.equal((await owner.call('/owner')).data.splash.seconds,3);
  });
  await t.test('only the GearHub owner changes the skyshopmm.com background (picture + moving SVG)',async()=>{
    const png=await require('sharp')({create:{width:16,height:9,channels:3,background:'#ff9933'}}).png().toBuffer();
    assert.deepEqual((({picture,layer})=>({picture,layer}))((await owner.call('/owner')).data.scene),{picture:false,layer:false});
    const pic=()=>{const f=new FormData();f.append('file',new Blob([png],{type:'image/png'}),'bg.png');return f};
    const svg=()=>{const f=new FormData();f.append('file',new Blob(['<svg viewBox="0 0 10 10"><script>x()</script><circle r="2"/></svg>'],{type:'image/svg+xml'}),'birds.svg');return f};
    assert.equal((await b.call('/owner/scene/picture','POST',pic())).status,403);
    assert.equal((await b.call('/owner/scene/layer','DELETE')).status,403);
    const saved=await owner.call('/owner/scene/picture','POST',pic());assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.picture,true);
    const layer=await owner.call('/owner/scene/layer','POST',svg());assert.equal(layer.status,200,JSON.stringify(layer.data));assert.equal(layer.data.layer,true);
    const kept=fs.readFileSync(path.join(root,'platform-media','scene','layer.svg'),'utf8');assert.ok(!kept.includes('script'),kept);
    const notSvg=new FormData();notSvg.append('file',new Blob(['hello'],{type:'image/svg+xml'}),'x.svg');assert.equal((await owner.call('/owner/scene/layer','POST',notSvg)).status,400);
    const phone=new FormData();phone.append('file',new Blob([png],{type:'image/png'}),'phone.png');assert.equal((await owner.call('/owner/scene/phone','POST',phone)).data.phone,true);
    assert.equal((await b.call('/owner/scene/phone','DELETE')).status,403);assert.equal((await owner.call('/owner/scene/phone','DELETE')).data.phone,false);
    assert.equal((await owner.call('/owner/scene/layer','DELETE')).data.layer,false);assert.equal((await owner.call('/owner/scene/picture','DELETE')).data.picture,false);
  });
  await t.test('owner extension adds calendar months and cannot be used by sellers',async()=>{await owner.call('/owner/shops/'+bid,'PATCH',{endsAt:'2099-01-31T00:00:00.000Z'});const before=(await b.me()).shop;assert.equal((await b.call('/owner/shops/'+bid+'/extend','POST',{months:2})).status,403);const r=await owner.call('/owner/shops/'+bid+'/extend','POST',{months:2});assert.equal(r.status,200);assert.equal(r.data.startsAt,before.starts_at);assert.equal(r.data.endsAt,model.addCalendarMonths(before.ends_at,2));assert.equal((await owner.call('/owner/shops/'+bid+'/extend','POST',{months:0})).status,400);assert.equal((await owner.call('/owner/shops/'+bid+'/extend','POST',{months:2})).status,200);});
  await t.test(
    "multi-product reopen rollback and shipped/completed cancellation preserve stock",
    async () => {
      await b.call("/shops/" + bid + "/products/" + pb, "PATCH", {
        sku: "SAME-SKU",
        name: "B",
        price: 100,
        stock: 3,
        expectedStock: 0,
      });
      await b.call("/shops/" + bid + "/products", "POST", {
        sku: "SECOND",
        name: "Second",
        price: 50,
        stock: 1,
      });
      const second = (await b.call("/shops/" + bid)).data.products.find(
        (p) => p.sku === "SECOND",
      ).id;
      const f = orderForm(pb, 1);
      f.set(
        "items",
        JSON.stringify([
          { id: pb, quantity: 1 },
          { id: second, quantity: 1 },
        ]),
      );
      const made = await buyer.call("/store/bob-store/orders", "POST", f, {
        "Idempotency-Key": cryptoKey(),
      });
      assert.equal(made.status, 201);
      const oid = made.data.id;
      await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
        status: "cancelled",
        paymentStatus: "pending",
      });
      await b.call("/shops/" + bid + "/products/" + second, "PATCH", {
        sku: "SECOND",
        name: "Second",
        price: 50,
        stock: 0,
        expectedStock: 1,
      });
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
            status: "confirmed",
            paymentStatus: "paid",
          })
        ).status,
        409,
      );
      assert.equal(
        db.prepare("SELECT stock FROM platform_products WHERE id=?").get(pb)
          .stock,
        3,
      );
      await b.call("/shops/" + bid + "/products/" + second, "PATCH", {
        sku: "SECOND",
        name: "Second",
        price: 50,
        stock: 1,
        expectedStock: 0,
      });
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
            status: "confirmed",
            paymentStatus: "paid",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
            status: "shipped",
            paymentStatus: "paid",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
            status: "cancelled",
            paymentStatus: "paid",
          })
        ).status,
        409,
      );
      await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
        status: "completed",
        paymentStatus: "paid",
      });
      assert.equal(
        (
          await b.call("/shops/" + bid + "/orders/" + oid, "PATCH", {
            status: "pending",
            paymentStatus: "paid",
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "invalid image never consumes quota and owner subject binding cannot be replaced",
    async () => {
      const before = (await a.call("/shops/" + aid)).data.limits.usedBytes;
      const f = new FormData();
      f.set(
        "file",
        new Blob(["not an image"], { type: "image/png" }),
        "fake.png",
      );
      assert.equal(
        (await a.call("/shops/" + aid + "/files", "POST", f)).status,
        400,
      );
      assert.equal(
        (await a.call("/shops/" + aid)).data.limits.usedBytes,
        before,
      );
      const impostor = model.identity(
        db,
        {
          sub: "other-owner-subject",
          email: "owner@gmail.com",
          email_verified: true,
        },
        "owner@gmail.com",
      );
      assert.equal(model.isOwner(db, impostor, "owner@gmail.com"), false);
    },
  );
  await t.test(
    "release is owner-only and matches deployed version; existing GearHub rows survive repeat migration",
    async () => {
      assert.equal((await owner.call("/owner/release","POST",{version:"9.9.9",notes:"Undeployed"})).status,409);
      assert.equal(
        (
          await owner.call("/owner/release", "POST", {
            version: require("../package.json").version,
            notes: "Fixture update",
          })
        ).status,
        200,
      );
      assert.equal((await a.me()).release.version, require("../package.json").version);
      model.migrate(db);
      assert.equal(
        db.prepare("SELECT stock FROM products WHERE id=99").get().stock,
        12,
      );
      assert.equal(db.prepare("SELECT COUNT(*) n FROM orders").get().n, 1);
      assert.equal(
        db.prepare("SELECT COUNT(*) n FROM platform_shops WHERE legacy=1").get()
          .n,
        1,
      );
    },
  );
  function cryptoKey() {
    return require("node:crypto").randomUUID();
  }
});
