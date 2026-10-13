const crypto = require("node:crypto");
const DEFAULT_PERMISSIONS = {
  products: true,
  orders: true,
  uploads: true,
  selling: true,
};
function migrate(db) {
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS platform_users(id INTEGER PRIMARY KEY,google_sub TEXT NOT NULL UNIQUE,email TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS platform_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS platform_plans(id INTEGER PRIMARY KEY,name TEXT NOT NULL,storage_bytes INTEGER NOT NULL CHECK(storage_bytes>=0),product_limit INTEGER NOT NULL CHECK(product_limit>=0),permissions TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS platform_applications(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL UNIQUE REFERENCES platform_users(id),name TEXT NOT NULL,slug TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',decision_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS platform_shops(id INTEGER PRIMARY KEY,owner_id INTEGER UNIQUE REFERENCES platform_users(id),slug TEXT NOT NULL UNIQUE,name TEXT NOT NULL,settings TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'active',plan_id INTEGER NOT NULL REFERENCES platform_plans(id),subscription_status TEXT NOT NULL DEFAULT 'sponsored',starts_at TEXT,ends_at TEXT,storage_override INTEGER CHECK(storage_override>=0),legacy INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS platform_products(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL REFERENCES platform_shops(id),sku TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',price INTEGER NOT NULL CHECK(price>=0),stock INTEGER NOT NULL CHECK(stock>=0),active INTEGER NOT NULL DEFAULT 1,image_id TEXT,UNIQUE(shop_id,sku));
 CREATE TABLE IF NOT EXISTS platform_files(id TEXT PRIMARY KEY,shop_id INTEGER NOT NULL REFERENCES platform_shops(id),kind TEXT NOT NULL,mime TEXT NOT NULL,bytes INTEGER NOT NULL CHECK(bytes>=0),filename TEXT NOT NULL,ready INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS platform_orders(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL REFERENCES platform_shops(id),code TEXT NOT NULL UNIQUE,invoice TEXT UNIQUE,customer TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL CHECK(total>=0),receipt_id TEXT NOT NULL REFERENCES platform_files(id),payment_reference TEXT NOT NULL DEFAULT '',payment_status TEXT NOT NULL DEFAULT 'pending',status TEXT NOT NULL DEFAULT 'pending',request_key TEXT NOT NULL,request_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(shop_id,request_key));
 CREATE INDEX IF NOT EXISTS platform_products_shop ON platform_products(shop_id);
 CREATE INDEX IF NOT EXISTS platform_orders_shop ON platform_orders(shop_id);`);
    db.prepare(
      "INSERT OR IGNORE INTO platform_plans(id,name,storage_bytes,product_limit,permissions) VALUES(1,?,?,?,?)",
    ).run(
      "Owner sponsored",
      50 * 1024 * 1024,
      100,
      JSON.stringify(DEFAULT_PERMISSIONS),
    );
    db.prepare(
      "INSERT OR IGNORE INTO platform_shops(id,slug,name,plan_id,legacy) VALUES(1,'gearhub','GearHub',1,1)",
    ).run();
    db.prepare(
      "INSERT OR IGNORE INTO platform_meta(key,value) VALUES('schema_version','1')",
    ).run();
  }).immediate();
}
function permissions(db, shop, now = Date.now()) {
  const plan = db
    .prepare("SELECT * FROM platform_plans WHERE id=?")
    .get(shop.plan_id);
  const usedBytes = db
    .prepare(
      "SELECT COALESCE(SUM(bytes),0) n FROM platform_files WHERE shop_id=?",
    )
    .get(shop.id).n;
  const starts = shop.starts_at ? Date.parse(shop.starts_at) : 0,
    ends = shop.ends_at ? Date.parse(shop.ends_at) : Infinity;
  const current =
    shop.status === "active" &&
    ["active", "sponsored", "trial"].includes(shop.subscription_status) &&
    now >= starts &&
    now < ends;
  const allowed = JSON.parse(plan.permissions);
  return {
    current,
    permissions: Object.fromEntries(
      Object.keys(DEFAULT_PERMISSIONS).map((k) => [
        k,
        current && allowed[k] === true,
      ]),
    ),
    storageLimit: shop.storage_override ?? plan.storage_bytes,
    usedBytes,
    productLimit: plan.product_limit,
    plan: plan.name,
  };
}
function identity(db, payload, ownerEmail) {
  if (
    !payload?.sub ||
    payload.email_verified !== true ||
    !payload.email ||
    (!payload.email.toLowerCase().endsWith("@gmail.com") && !payload.hd)
  )
    throw Error("Verified Google-managed account required.");
  const email = payload.email.toLowerCase();
  const user = db
    .transaction(() => {
      db.prepare(
        "INSERT INTO platform_users(google_sub,email,name) VALUES(?,?,?) ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email,name=excluded.name",
      ).run(payload.sub, email, String(payload.name || "").slice(0, 120));
      return db
        .prepare("SELECT * FROM platform_users WHERE google_sub=?")
        .get(payload.sub);
    })
    .immediate();
  if (ownerEmail && email === ownerEmail.toLowerCase())
    db.prepare(
      "INSERT OR IGNORE INTO platform_meta(key,value) VALUES('owner_sub',?)",
    ).run(payload.sub);
  return user;
}
function isOwner(db, user, email) {
  return Boolean(
    user &&
      user.status === "active" &&
      email &&
      user.email === email.toLowerCase() &&
      db.prepare("SELECT value FROM platform_meta WHERE key='owner_sub'").get()
        ?.value === user.google_sub,
  );
}
function release(db) {
  const row = db
    .prepare("SELECT value FROM platform_meta WHERE key='release'")
    .get();
  return row
    ? JSON.parse(row.value)
    : { version: "1.0.0", notes: "GearHub platform first version" };
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
module.exports = {
  migrate,
  permissions,
  identity,
  isOwner,
  release,
  hash,
  DEFAULT_PERMISSIONS,
};
