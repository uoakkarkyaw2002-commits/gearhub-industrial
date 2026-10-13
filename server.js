require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const {passwordError, csrfToken, validToken, originGuard} = require("./lib/security");
const {createBackupService} = require("./lib/backups");
const {createNotifications} = require("./lib/notifications");
const {runtimeConfig,validateStorage}=require("./lib/config");
const {logError}=require("./lib/logging");
const {writeBackupManifest}=require("./lib/backup-manifest");

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY === "false" ? false : 1); // Render runs behind a trusted reverse proxy.
const PORT = Number(process.env.PORT || 3000);
const settings=runtimeConfig();
const {production,publicOrigin,dataDir,uploadDir,receiptDir}=settings;
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex");
const sessionCookieName = production ? "__Host-gearhub.sid" : "gearhub.sid";
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(receiptDir, { recursive: true });
validateStorage(settings);
const imageStorage = multer.diskStorage({
 destination: (_req, _file, cb) => cb(null, uploadDir),
 filename: (_req, file, cb) => {
  const ext = ({ "image/jpeg":".jpg", "image/png":".png", "image/webp":".webp", "image/gif":".gif", "image/avif":".avif" })[file.mimetype];
  cb(null, crypto.randomBytes(16).toString("hex") + ext);
 }
});
const imageUpload = multer({
 storage: imageStorage,
 limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 20, parts: 30, fieldSize: 16 * 1024 },
 fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp","image/gif","image/avif"].includes(file.mimetype))
});
const receiptUpload = multer({
 storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, receiptDir),
  filename: (_req, file, cb) => {
   const ext = ({"image/jpeg":".jpg","image/png":".png","image/webp":".webp"})[file.mimetype];
   cb(null, crypto.randomBytes(20).toString("hex") + ext);
  }
 }),
 limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12, fieldSize: 64 * 1024 },
 fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp"].includes(file.mimetype))
});

const db = new Database(path.join(dataDir, "gearhub.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = FULL");
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sku TEXT UNIQUE NOT NULL, name_my TEXT NOT NULL, name_en TEXT NOT NULL,
 category_my TEXT NOT NULL, category_en TEXT NOT NULL,
 description_my TEXT NOT NULL DEFAULT '', description_en TEXT NOT NULL DEFAULT '',
 price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
 unit TEXT NOT NULL DEFAULT 'ခု / unit', image_emoji TEXT NOT NULL DEFAULT '⚙️',
 image_urls TEXT NOT NULL DEFAULT '[]',
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 category_en TEXT NOT NULL COLLATE NOCASE UNIQUE,
 category_my TEXT NOT NULL,
 icon TEXT NOT NULL DEFAULT '',
 parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_code TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '', address TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'my',
 items_json TEXT NOT NULL, subtotal INTEGER NOT NULL, delivery_fee INTEGER NOT NULL DEFAULT 0,
 total INTEGER NOT NULL, payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
 payment_reference TEXT NOT NULL DEFAULT '', payment_status TEXT NOT NULL DEFAULT 'pending',
 receipt_path TEXT NOT NULL DEFAULT '',
 confirmation_date TEXT NOT NULL DEFAULT '',
 invoice_no TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
`);
if (!db.prepare("PRAGMA table_info(categories)").all().some(column => column.name === "parent_id")) {
 db.exec("ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL");
}
// Safe schema migration for existing deployments.
if (!db.prepare("PRAGMA table_info(admins)").all().some(c => c.name === "auth_version")) db.exec("ALTER TABLE admins ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1");
const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!orderColumns.includes("receipt_path")) db.exec("ALTER TABLE orders ADD COLUMN receipt_path TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes("confirmation_date")) db.exec("ALTER TABLE orders ADD COLUMN confirmation_date TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes("invoice_no")) db.exec("ALTER TABLE orders ADD COLUMN invoice_no TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes("request_key")) db.exec("ALTER TABLE orders ADD COLUMN request_key TEXT");
if (!orderColumns.includes("request_hash")) db.exec("ALTER TABLE orders ADD COLUMN request_hash TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request_key ON orders(request_key) WHERE request_key IS NOT NULL");
const confirmedWithoutInvoice = db.prepare("SELECT id FROM orders WHERE status='confirmed' AND invoice_no='' ORDER BY CASE WHEN confirmation_date='' THEN created_at ELSE confirmation_date END ASC, id ASC").all();
const nextInvoiceNumber = () => {
 const rows = db.prepare("SELECT invoice_no FROM orders WHERE invoice_no LIKE 'INV-%'").all();
 return rows.reduce((max,row)=>Math.max(max,Number(String(row.invoice_no).slice(4))||0),0)+1;
};
for (const row of confirmedWithoutInvoice) db.prepare("UPDATE orders SET invoice_no=? WHERE id=?").run("INV-"+nextInvoiceNumber(),row.id);
const productColumns = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
if (!productColumns.includes("image_urls")) db.exec("ALTER TABLE products ADD COLUMN image_urls TEXT NOT NULL DEFAULT '[]'");
const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (!count && (!production || process.env.SEED_DEMO === "true")) {
 const seed = [
  ["IND-PMP-001","Industrial Water Pump","စက်မှုသုံး ရေစုပ်စက်","Industrial Equipment","စက်မှုသုံးပစ္စည်း","Heavy-duty water pump for industrial water transfer.","စက်ရုံနှင့် လုပ်ငန်းသုံး ရေရွှေ့ပြောင်းမှုအတွက် အကြမ်းခံ ရေစုပ်စက်။",485000,12,"💧"],
  ["IND-MTR-002","3-Phase Electric Motor","သုံးဖေ့စ် လျှပ်စစ်မော်တာ","Motors & Drives","မော်တာနှင့် Drive","Industrial 3-phase electric motor. Confirm voltage and power rating before ordering.","စက်မှုသုံး သုံးဖေ့စ်မော်တာ။ မမှာယူမီ ဗို့အားနှင့် ပါဝါအချက်အလက်ကို အတည်ပြုပါ။",850000,8,"⚙️"],
  ["IND-CMP-003","Air Compressor 50L","လေဖိအားပေးစက် 50L","Pneumatics","လေဖိအားစနစ်","Workshop compressor for pneumatic tools and general use.","လေဖိအားသုံး ကိရိယာများအတွက် အလုပ်ရုံသုံး ကွန်ပရက်ဆာ။",675000,5,"🛠️"],
  ["IND-WLD-004","Inverter Welding Machine","အင်ဗာတာ ဂဟေဆော်စက်","Workshop Tools","အလုပ်ရုံသုံးကိရိယာ","Portable inverter welder. Check included accessories and duty cycle.","သယ်ဆောင်ရလွယ်ကူသော အင်ဗာတာ ဂဟေဆော်စက်။ ပါဝင်ပစ္စည်းများကို စစ်ဆေးပါ။",320000,15,"🔩"],
  ["IND-GEN-005","Diesel Generator 5kVA","ဒီဇယ်မီးစက် 5kVA","Power Equipment","ဓာတ်အားပစ္စည်း","Backup power generator for small sites; confirm local voltage and frequency.","လုပ်ငန်းခွင်အတွက် အရန်မီးစက်။ ဗို့အားနှင့် ကြိမ်နှုန်းကို အတည်ပြုပါ။",2450000,3,"🔋"],
  ["IND-SAF-006","Industrial Safety Kit","လုပ်ငန်းခွင် လုံခြုံရေးပစ္စည်းအစုံ","Safety Equipment","လုံခြုံရေးပစ္စည်း","Basic PPE bundle; verify sizes and certifications for your workplace.","အခြေခံ လုပ်ငန်းခွင်ကာကွယ်ရေးပစ္စည်းအစုံ။ အရွယ်အစားနှင့် စံချိန်စံညွှန်းကို စစ်ဆေးပါ။",95000,30,"🦺"],
  ["IND-BRG-007","Bearing Set","ဘယ်ရင်အစုံ","Machine Parts","စက်အပိုပစ္စည်း","Replacement bearing set. Match dimensions and model number before purchase.","အစားထိုး ဘယ်ရင်အစုံ။ မဝယ်မီ အရွယ်အစားနှင့် မော်ဒယ်ကို ကိုက်ညီစစ်ဆေးပါ။",42000,40,"🔧"],
  ["IND-PRS-008","Hydraulic Pressure Gauge","ဟိုက်ဒရောလစ် ဖိအားတိုင်းကိရိယာ","Machine Parts","စက်အပိုပစ္စည်း","Pressure gauge for compatible hydraulic systems; check range and connection.","ကိုက်ညီသော ဟိုက်ဒရောလစ်စနစ်များအတွက် ဖိအားတိုင်းကိရိယာ။ Range နှင့် ချိတ်ဆက်မှုကို စစ်ဆေးပါ။",68000,18,"⏱️"]
 ];
 const ins = db.prepare(`INSERT INTO products
 (sku,name_en,name_my,category_en,category_my,description_en,description_my,price,stock,image_emoji)
 VALUES (?,?,?,?,?,?,?,?,?,?)`);
 const tx = db.transaction(rows => rows.forEach(r => ins.run(r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9])));
 tx(seed);
}
// Keep a customizable category list while migrating categories already stored on products.
const seedCategory = db.prepare("INSERT OR IGNORE INTO categories(category_en,category_my,icon,sort_order) VALUES(?,?,?,?)");
const knownCategoryNames = new Set();
for (const product of db.prepare("SELECT category_en,category_my FROM products WHERE active=1 ORDER BY id ASC").all()) {
 const key = String(product.category_en || "").trim().toLocaleLowerCase();
 if (!key || knownCategoryNames.has(key)) continue;
 knownCategoryNames.add(key);
 seedCategory.run(cleanText(product.category_en,100),cleanText(product.category_my,100)||cleanText(product.category_en,100),"",knownCategoryNames.size-1);
}
async function ensureAdmin() {
 const username = (process.env.ADMIN_USERNAME || "admin").trim();
 const password = process.env.ADMIN_PASSWORD || "";
 const exists = db.prepare("SELECT id,password_hash FROM admins WHERE username=?").get(username);
 if (exists) return;
 if (!password) {
  if (production) throw new Error("Set ADMIN_PASSWORD before creating the initial admin account.");
  return;
 }
 if (!exists) {
   if (passwordError(password) || password.includes("ChangeThis")) throw new Error(passwordError(password) || "Set a unique initial ADMIN_PASSWORD.");
   const hash = await bcrypt.hash(password, 12);
   db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(username, hash);
   console.log("Created the initial admin account.");
 }
}
app.disable("x-powered-by");
app.use((req,res,next)=>{
 const requestId=crypto.randomUUID(),started=Date.now();res.set("X-Request-ID",requestId);
 res.on("finish",()=>{if(res.statusCode>=400||process.env.REQUEST_LOGS==="true") console.log(JSON.stringify({event:"http_response",requestId,method:req.method,route:req.route?.path||"unmatched",status:res.statusCode,durationMs:Date.now()-started}));});next();
});
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:","https:"],fontSrc:["'self'","data:","https:"],connectSrc:["'self'"],formAction:["'self'"],baseUri:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use("/api", originGuard(publicOrigin));
// Persist sessions in the same SQLite database as the shop data. This avoids
// express-session's in-memory store, which loses sessions on every restart.
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
 sid TEXT PRIMARY KEY,
 sess TEXT NOT NULL,
 expired_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired_at);
CREATE TABLE IF NOT EXISTS password_reset_codes (
 id INTEGER PRIMARY KEY CHECK(id=1),
 code_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS site_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 settings_json TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
class SQLiteSessionStore extends session.Store {
 get(sid, callback) {
  try {
   const row = db.prepare("SELECT sess, expired_at FROM sessions WHERE sid=?").get(sid);
   if (!row) return callback(null, null);
   if (row.expired_at <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE sid=?").run(sid);
    return callback(null, null);
   }
   callback(null, JSON.parse(row.sess));
  } catch (err) { callback(err); }
 }
 set(sid, sess, callback = () => {}) {
  try {
   const expires = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 8 * 60 * 60 * 1000;
   db.prepare("INSERT INTO sessions(sid,sess,expired_at) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expired_at=excluded.expired_at")
    .run(sid, JSON.stringify(sess), expires);
   callback(null);
  } catch (err) { callback(err); }
 }
 destroy(sid, callback = () => {}) {
  try { db.prepare("DELETE FROM sessions WHERE sid=?").run(sid); callback(null); }
  catch (err) { callback(err); }
 }
 touch(sid, sess, callback = () => {}) {
  try {
   const expires = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 8 * 60 * 60 * 1000;
   db.prepare("UPDATE sessions SET expired_at=? WHERE sid=?").run(expires, sid);
   callback(null);
  } catch (err) { callback(err); }
 }
}
const sessionStore = new SQLiteSessionStore();
app.use(session({
 store: sessionStore,
 name: sessionCookieName,
 secret: sessionSecret,
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: "lax", secure: production, path: "/", maxAge: 1000 * 60 * 60 * 8 }
}));
// Opt-in development migration; legacy tables/routes remain unchanged.
if(process.env.PLATFORM_ENABLED==='true'){
 const {createPlatform}=require('./lib/platform');
 app.use('/api/platform',createPlatform({db,dataDir,publicOrigin}));
 app.get('/shops/:slug', (req,res)=>req.params.slug==='gearhub'?res.redirect('/'):res.sendFile(path.join(__dirname,'public','platform-shop.html')));
}
app.get('/api/app-release', (_req,res)=>{
 res.set('Cache-Control','no-store');
 const enabled=process.env.PLATFORM_ENABLED==='true';
 res.json({... (enabled?require('./lib/platform-model').release(db):{version:'1.0.0',notes:'GearHub web app'}),platformEnabled:enabled});
});
// Periodically prune expired sessions without requiring an external service.
setInterval(() => {
 try { db.prepare("DELETE FROM sessions WHERE expired_at <= ?").run(Date.now()); }
 catch (err) { logError("session_cleanup_failure",err); }
}, 60 * 60 * 1000).unref();
// Admin HTML and scripts must always revalidate so a cached search form cannot
// keep submitting the page and send an administrator back through login.
app.get("/admin.html", (req, res) => {
 res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
 res.setHeader("Pragma", "no-cache");
 res.setHeader("Expires", "0");
 res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
 res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.use(express.static(path.join(__dirname, "public"), { setHeaders(res, filePath) {
 if (path.basename(filePath) === "admin.js") {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
 }
} }));
app.use("/uploads", express.static(uploadDir, { fallthrough: false, maxAge: "1d" }));
// Report storage for the filesystem that actually holds the database and uploads.
// The API returns byte counts only; it never exposes server paths or file names.
app.get("/api/storage", async (_req, res) => {
 res.setHeader("Cache-Control", "no-store");
 try {
  let appDataBytes = 0;
  const pending = [dataDir];
  while (pending.length) {
   const current = pending.pop();
   let entries;
   try { entries = await fs.promises.readdir(current, { withFileTypes: true }); }
   catch (err) { if (err.code === "ENOENT") continue; throw err; }
   for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) pending.push(fullPath);
    else if (entry.isFile()) appDataBytes += (await fs.promises.stat(fullPath)).size;
   }
  }
  const disk = await fs.promises.statfs(dataDir);
  const diskCapacityBytes = Number(disk.blocks) * Number(disk.bsize);
  const diskAvailableBytes = Number(disk.bavail) * Number(disk.bsize);
  res.json({ usedBytes: appDataBytes, capacityBytes: diskCapacityBytes, availableBytes: diskAvailableBytes });
 } catch (err) {
  logError("storage_lookup_failure",err);
  res.status(503).json({ error: "Storage information is temporarily unavailable." });
 }
});
app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false }));
app.use("/api/orders", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
// Keep private admin responses out of browser and intermediary caches, and
// reject mutations unless they came from this exact site origin.
app.use("/api/admin", (req, res, next) => {
 res.setHeader("Cache-Control", "no-store, private");
 res.setHeader("Pragma", "no-cache");
 if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && !validToken(req.session.csrfToken, req.get("x-csrf-token"))) {
  return res.status(403).json({error:"Security token expired or missing. Reload and try again.",code:"CSRF_INVALID"});
 }
 next();
});

app.get("/api/admin/csrf", (req,res) => res.json({csrfToken:csrfToken(req)}));
function adminOnly(req, res, next) {
 if (!req.session.admin) return res.status(401).json({ error: "Admin login required" });
 const user=db.prepare("SELECT auth_version FROM admins WHERE id=?").get(req.session.admin.id);
 if (!user || user.auth_version !== req.session.admin.authVersion) return req.session.destroy(() => res.status(401).json({error:"Session expired. Sign in again."}));
 next();
}

app.get("/api/admin/backup", rateLimit({ windowMs: 60 * 1000, limit: 2, standardHeaders: true, legacyHeaders: false }), adminOnly, async (req, res) => {
 let tempRoot;

 const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

 try {
  tempRoot=await fs.promises.mkdtemp(path.join(os.tmpdir(), "gearhub-backup-"));
  const stageDir=path.join(tempRoot,"gearhub-backup");
  const archivePath=path.join(tempRoot,`gearhub-backup-${timestamp}.tar.gz`);
  await fs.promises.mkdir(stageDir, { recursive: true });
  // Use SQLite's online backup API so committed WAL data is included consistently.
  await db.backup(path.join(stageDir, "gearhub.sqlite"));
  await fs.promises.cp(uploadDir, path.join(stageDir, "uploads"), { recursive: true, force: true });
  await fs.promises.cp(receiptDir, path.join(stageDir, "receipts"), { recursive: true, force: true });
  const platformMedia=path.join(dataDir,"platform-media");if(fs.existsSync(platformMedia))await fs.promises.cp(platformMedia,path.join(stageDir,"platform-media"),{recursive:true});
  await writeBackupManifest(stageDir);
  await execFileAsync("tar", ["-czf", archivePath, "-C", tempRoot, "gearhub-backup"], { timeout: 120000 });
  res.setHeader("Cache-Control", "no-store, private");
  res.download(archivePath, path.basename(archivePath), async err => {
   if(tempRoot)await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
   if (err && !res.headersSent) res.status(500).json({ error: "Could not download the backup archive." });
  });
 } catch (err) {
  logError("backup_export_failure",err);
  if(tempRoot)await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  if (!res.headersSent) res.status(500).json({ error: "Could not create backup archive. Check service logs." });
 }
});
app.post("/api/admin/uploads", adminOnly, (req,res,next) => imageUpload.array("images",10)(req,res,err => {
 if (err) return res.status(400).json({error:err.message || "Could not upload images."});
 if (!req.files || !req.files.length) return res.status(400).json({error:"Choose at least one image file."});
 Promise.all(req.files.map(hasValidImageSignature)).then(valid => {
  if (valid.some(value => !value)) {
   return Promise.all(req.files.map(file => fs.promises.unlink(file.path).catch(() => {})))
    .then(() => res.status(400).json({error:"The uploaded file content is not a supported image."}));
  }
  res.status(201).json({ imageUrls: req.files.map(file => "/uploads/" + file.filename) });
 }).catch(async err => {
  await Promise.all(req.files.map(file => fs.promises.unlink(file.path).catch(() => {})));
  next(err);
 });
}));
async function hasValidImageSignature(file) {
 const handle = await fs.promises.open(file.path, "r");
 try {
  const buffer = Buffer.alloc(16);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
  if (file.mimetype === "image/jpeg") return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (file.mimetype === "image/png") return bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (file.mimetype === "image/webp") return bytesRead >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (file.mimetype === "image/gif") return bytesRead >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
  if (file.mimetype === "image/avif") return bytesRead >= 12 && buffer.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis", "mif1"].includes(buffer.toString("ascii", 8, 12));
  return false;
 } finally { await handle.close(); }
}
function cleanText(v, max=500) { return String(v ?? "").trim().slice(0, max); }
function ensureProductCategory(nameEn,nameMy) {
 const english=cleanText(nameEn,100),myanmar=cleanText(nameMy,100);
 if(!english||!myanmar)return;
 db.prepare("INSERT OR IGNORE INTO categories(category_en,category_my,icon,sort_order) VALUES(?,?,?,?)")
  .run(english,myanmar,"",db.prepare("SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM categories").get().next);
}
function getCategories(activeOnly=false) {
 const filter=activeOnly?"AND p.active=1":"";
 return db.prepare(`SELECT c.id,c.category_en,c.category_my,c.icon,c.parent_id,c.sort_order,
  parent.category_en AS parent_en,parent.category_my AS parent_my,COUNT(p.id) AS product_count
  FROM categories c LEFT JOIN categories parent ON parent.id=c.parent_id
  LEFT JOIN products p ON p.category_en=c.category_en ${filter}
  GROUP BY c.id ORDER BY c.sort_order ASC,c.id ASC`).all();
}
function publicProduct(p) {
 let imageUrls = [];
 try { imageUrls = JSON.parse(p.image_urls || "[]"); } catch {}
 return { ...p, imageUrls: Array.isArray(imageUrls) ? imageUrls.slice(0,10) : [], active: Boolean(p.active) };
}
function cleanImageUrls(value) {
 const input = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
 return [...new Set(input.map(v => cleanText(v, 1000)).filter(v => /^\/(?:demo|sample)-images\/[a-z-]+\.svg$/i.test(v) || /^https:\/\//i.test(v) || /^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif|avif)$/i.test(v)))].slice(0,10);
}


function orderProductCover(urls,index){
 const selected=Number(index);
 if(Number.isInteger(selected)&&selected>0&&selected<urls.length){const cover=urls.splice(selected,1)[0];urls.unshift(cover)}
 return urls;
}
function driveFileId(value){
 try{const url=new URL(String(value));if(url.protocol!=="https:"||url.hostname!=="drive.google.com")return null;
 const id=url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]||url.searchParams.get("id");
 return /^[a-zA-Z0-9_-]{10,200}$/.test(id||"")?id:null}catch{return null}
}
app.post("/api/admin/import-drive-images",adminOnly,async(req,res)=>{
 const links=req.body?.links;
 if(!Array.isArray(links)||!links.length||links.length>10||links.some(link=>!driveFileId(link)))return res.status(400).json({error:"Add valid Google Drive file links (up to 10)."});
 const saved=[];
 try{
  for(const link of links){
   const id=driveFileId(link),original=new URL(link);
   let url=new URL("https://drive.google.com/uc");url.searchParams.set("export","download");url.searchParams.set("id",id);
   if(original.searchParams.get("resourcekey"))url.searchParams.set("resourcekey",original.searchParams.get("resourcekey"));
   let response;
   for(let hop=0;hop<5;hop++){
    const allowed=url.protocol==="https:"&&["drive.google.com","drive.usercontent.google.com","lh3.googleusercontent.com","lh4.googleusercontent.com","lh5.googleusercontent.com","lh6.googleusercontent.com"].includes(url.hostname)&&!url.username&&!url.password&&!url.port;
    if(!allowed)throw new Error("Google Drive returned an unsupported download address.");
    response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(15000)});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get("location");if(!location)throw new Error("Drive download redirect failed.");await response.body?.cancel();url=new URL(location,url);continue}break;
   }
   if(!response?.ok||!response.body)throw new Error("Cannot download this Drive image. Allow Anyone with the link and enable downloads.");
   if(Number(response.headers.get("content-length"))>5*1024*1024){await response.body.cancel();throw new Error("Each Drive image must be under 5 MB.");}
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>5*1024*1024)throw new Error("Each Drive image must be under 5 MB.");chunks.push(Buffer.from(chunk))}
   const buffer=Buffer.concat(chunks);
   let type="",ext="";
   if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255){type="image/jpeg";ext=".jpg"}
   else if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type="image/png";ext=".png"}
   else if(buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP"){type="image/webp";ext=".webp"}
   else if(["GIF87a","GIF89a"].includes(buffer.toString("ascii",0,6))){type="image/gif";ext=".gif"}
   if(!type)throw new Error("Drive link is not a downloadable JPG, PNG, WebP or GIF image. Check sharing and download permission.");
   const filename=crypto.randomBytes(16).toString("hex")+ext,filePath=path.join(uploadDir,filename);
   await fs.promises.writeFile(filePath,buffer);saved.push({path:filePath,url:"/uploads/"+filename});
  }
  res.status(201).json({imageUrls:saved.map(file=>file.url)});
 }catch(error){await Promise.all(saved.map(file=>fs.promises.unlink(file.path).catch(()=>{})));res.status(400).json({error:error.message||"Could not import Drive images."})}
});

const defaultSiteSettings = () => ({
 siteTitle: "GearHub Industrial | စက်မှုသုံးပစ္စည်းများ",
 brandName: "gearhub.", brandTagline: "INDUSTRIAL", heroIcon: "⚙️", logoUrl: "", appIconUrl: "", navigationBackgroundUrl: "", wallpaperUrl: "", heroImageUrl: "/images/hero-excavator.jpg",
 colors: { brand: "#183426", accent: "#b7f36b", page: "#f5f7f1", hero: "#183426" },
 payment: {
  bankName: process.env.BANK_NAME || "KPay",
  bankAccountName: process.env.BANK_ACCOUNT_NAME || "",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
  paymentInstructions: process.env.PAYMENT_INSTRUCTIONS || "KPay သို့ ငွေလွှဲပြီး ငွေလွှဲပြေစာကို upload လုပ်ပေးပါ။"
 },
 translations: { my: {}, en: {} },
 layout: defaultSiteLayout()
});
const siteLayoutDefaults = {
 announcement: {padding:9,radius:0}, navigation:{padding:17,radius:0}, hero:{padding:0,radius:26},
 catalog:{padding:0,radius:0}, productCards:{padding:13,radius:17}, highlights:{padding:23,radius:16},
 footer:{padding:34,radius:0}, cart:{padding:23,radius:0}, checkout:{padding:24,radius:19}, gallery:{padding:20,radius:20}
};
function defaultSiteLayout() {
 return Object.fromEntries(Object.entries(siteLayoutDefaults).map(([key,values]) => [key, {
  enabled:false, padding:values.padding, margin:0, borderWidth:0, borderColor:"#e0e7dd", borderStyle:"solid",
  borderRadius:values.radius, backgroundColor:"", textColor:"", shadow:"keep"
 }]));
}
function normalizeSiteLayout(input, fallback=defaultSiteLayout()) {
 const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
 const result = {};
 for (const [key, defaults] of Object.entries(defaultSiteLayout())) {
  const value = source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) ? source[key] : {};
  const previous = fallback[key] || defaults;
  const number = (name,min,max) => {
   const parsed = Number(value[name]);
   return Number.isFinite(parsed) ? Math.min(max,Math.max(min,Math.round(parsed))) : previous[name];
  };
  const safeColor = (name,allowEmpty=false) => {
   const color = String(value[name] ?? previous[name] ?? "");
   return allowEmpty && color === "" ? "" : (/^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : previous[name]);
  };
  const borderStyle = ["none","solid","dashed","dotted"].includes(value.borderStyle) ? value.borderStyle : previous.borderStyle;
  const shadow = ["keep","none","soft","strong"].includes(value.shadow) ? value.shadow : previous.shadow;
  result[key] = {
   enabled:value.enabled === true,
   padding:number("padding",0,120), margin:number("margin",0,160), borderWidth:number("borderWidth",0,12),
   borderColor:safeColor("borderColor"), borderStyle, borderRadius:number("borderRadius",0,100),
   backgroundColor:safeColor("backgroundColor",true), textColor:safeColor("textColor",true), shadow
  };
 }
 return result;
}
function getSiteSettings() {
 let saved = {};
 try { saved = JSON.parse(db.prepare("SELECT settings_json FROM site_settings WHERE id=1").get()?.settings_json || "{}"); } catch {}
 const defaults = defaultSiteSettings();
 return {
  ...defaults, ...saved,
  colors: { ...defaults.colors, ...(saved.colors || {}) },
  payment: { ...defaults.payment, ...(saved.payment || {}) },
  translations: { my: { ...(saved.translations?.my || {}) }, en: { ...(saved.translations?.en || {}) } },
  layout: normalizeSiteLayout(saved.layout, defaults.layout)
 };
}
function cleanSiteImageUrl(value) {
 const input = cleanText(value, 1000);
 if (!input) return "";
 if (input === "/images/hero-excavator.jpg") return input;
 if (/^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif|avif)$/i.test(input)) return input;
 try {
  const url = new URL(input);
  if (url.protocol === "https:") return url.href;
 } catch {}
 return null;
}
app.get("/app.webmanifest", (_req,res) => {
 const site=getSiteSettings();
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"public/manifest.webmanifest"),"utf8"));
 manifest.name=site.brandName||manifest.name;
 manifest.short_name=(site.brandName||manifest.short_name).slice(0,30);
 if(site.appIconUrl)manifest.icons=[{src:site.appIconUrl,sizes:"512x512",purpose:"any"}];
 res.set("Cache-Control","no-cache").type("application/manifest+json").json(manifest);
});
app.get("/app-icon.png", (_req,res) => {
 const icon=getSiteSettings().appIconUrl;
 res.set("Cache-Control","no-cache");
 if(icon)return res.redirect(302,icon);
 res.sendFile(path.join(__dirname,"public/icons/apple-touch-icon.png"));
});
app.get("/api/admin/site-settings", adminOnly, (_req,res) => res.json(getSiteSettings()));
app.put("/api/admin/site-settings", adminOnly, (req,res) => {
 const body = req.body || {}, previous = getSiteSettings();
 const appIconUrl = cleanSiteImageUrl(body.appIconUrl ?? previous.appIconUrl), navigationBackgroundUrl = cleanSiteImageUrl(body.navigationBackgroundUrl ?? previous.navigationBackgroundUrl);
 const logoUrl = cleanSiteImageUrl(body.logoUrl), wallpaperUrl = cleanSiteImageUrl(body.wallpaperUrl), heroImageUrl = cleanSiteImageUrl(body.heroImageUrl);
 if (appIconUrl === null || navigationBackgroundUrl === null || logoUrl === null || wallpaperUrl === null || heroImageUrl === null) return res.status(400).json({error:"Logo and background image URLs must be HTTPS or an uploaded image."});
 const color = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : null;
 const colors = {};
 for (const key of ["brand","accent","page","hero"]) {
  colors[key] = color(body.colors?.[key]);
  if (!colors[key]) return res.status(400).json({error:"Choose valid colors for every color setting."});
 }
 const translations = { my: {}, en: {} };
 for (const language of ["my","en"]) {
  const entries = Object.entries(body.translations?.[language] || {});
  if (entries.length > 300) return res.status(400).json({error:"Too many frontend text fields."});
  for (const [key,value] of entries) {
   if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(key) || typeof value !== "string" || value.length > 1000)
    return res.status(400).json({error:"Frontend text fields must be plain text under 1,000 characters."});
   translations[language][key] = value.trim();
  }
 }
 const payment = {};
 for (const [key,max] of [["bankName",120],["bankAccountName",160],["bankAccountNumber",100],["paymentInstructions",1000]]) {
  if (body.payment?.[key] !== undefined && typeof body.payment[key] !== "string") return res.status(400).json({error:"Payment settings must be text."});
  payment[key] = cleanText(body.payment?.[key] ?? previous.payment[key], max);
 }
 const settings = {
  siteTitle: cleanText(body.siteTitle ?? previous.siteTitle, 160),
  brandName: cleanText(body.brandName ?? previous.brandName, 80),
  brandTagline: cleanText(body.brandTagline ?? previous.brandTagline, 120),
  heroIcon: cleanText(body.heroIcon ?? previous.heroIcon, 12) || "⚙️",
  logoUrl, appIconUrl, navigationBackgroundUrl, wallpaperUrl, heroImageUrl, colors, payment, translations,
  layout:normalizeSiteLayout(body.layout ?? previous.layout, previous.layout)
 };
 db.prepare(`INSERT INTO site_settings(id,settings_json,updated_at) VALUES(1,?,CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,updated_at=CURRENT_TIMESTAMP`).run(JSON.stringify(settings));
 res.json({ok:true,settings:getSiteSettings()});
});
app.get("/api/config", (req,res) => {
 const site = getSiteSettings();
 res.json({ ...site.payment, site });
});
app.get("/api/products", (req,res) => {
 const rows = db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all();
 res.json(rows.map(publicProduct));
});
app.get("/api/categories", (_req,res) => res.json(getCategories(true)));
app.post("/api/orders", (req,res) => receiptUpload.single("receipt")(req,res,async err => {
 if (err) {
  if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
  return res.status(400).json({error:err.message || "Could not upload payment receipt."});
 }
 const reject = message => {
  if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
  return res.status(400).json({error:message});
 };
 const b = req.body || {};
 if (typeof b.items === "string") { try { b.items = JSON.parse(b.items); } catch { return reject("Invalid cart data."); } }
 const name = cleanText(b.customerName,120), phone = cleanText(b.phone,40);
 const email = cleanText(b.email,160), address = cleanText(b.address,500);
 const language = b.language === "en" ? "en" : "my";
 const reference = cleanText(b.paymentReference,100);
 if (!name || !phone || !address) return reject("Name, phone and delivery address are required.");
 if (!req.file) return reject("Please upload your payment receipt image (JPG, PNG or WebP, max 5 MB).");
 if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50 || b.items.some(item => !item || typeof item !== "object")) return reject("Your cart is empty or invalid.");
 let validReceipt = false;
 try { validReceipt = await hasValidImageSignature(req.file); } catch {}
 if (!validReceipt) return reject("The uploaded receipt is not a valid JPG, PNG or WebP image.");
 const requestKey = req.get("idempotency-key");
 if (requestKey && !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) return reject("Invalid order request key.");
 const ids = b.items.map(x => Number(x.id));
 if (ids.some(id => !Number.isSafeInteger(id) || id < 1)) return reject("Invalid product.");
 const qtyMap = new Map();
 for (const item of b.items) {
   const qty = Number(item.quantity);
   if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return reject("Invalid quantity.");
   qtyMap.set(Number(item.id), (qtyMap.get(Number(item.id)) || 0) + qty);
 }
 try {
  const requestHash = crypto.createHash("sha256").update(JSON.stringify({name,phone,email,address,language,reference,items:[...qtyMap.entries()].sort((a,b)=>a[0]-b[0])})).update(await fs.promises.readFile(req.file.path)).digest("hex");
  const result = db.transaction(() => {
   if (requestKey) {
    const saved=db.prepare("SELECT * FROM orders WHERE request_key=?").get(requestKey);
    if (saved) {
     if (saved.request_hash !== requestHash) {const error=new Error("Order request key already used for different details.");error.status=409;throw error;}
     return {id:saved.id,orderCode:saved.order_code,subtotal:saved.subtotal,total:saved.total,paymentStatus:saved.payment_status,status:saved.status,replayed:true};
    }
   }
   const lineItems = [];
   let subtotal = 0;
   for (const [id, quantity] of qtyMap.entries()) {
    if (quantity > 1000) throw new Error("Invalid quantity.");
    const p = db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(id);
    if (!p) throw new Error("A product is unavailable. Please refresh your cart.");
    if (p.stock < quantity) throw new Error(`Not enough stock for ${p.name_en}. Available: ${p.stock}`);
    const lineTotal = p.price * quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) throw new Error("Order total is too large.");
    subtotal += lineTotal;
    lineItems.push({ productId:p.id, sku:p.sku, nameEn:p.name_en, nameMy:p.name_my, unitPrice:p.price, quantity, lineTotal });
   }
   const code = "GH-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
   const info = db.prepare(`INSERT INTO orders
    (order_code,customer_name,phone,email,address,language,items_json,subtotal,delivery_fee,total,payment_reference,receipt_path,request_key,request_hash)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(code,name,phone,email,address,language,JSON.stringify(lineItems),subtotal,0,subtotal,reference,req.file.filename,requestKey||null,requestHash);
   for (const item of lineItems) { const change=db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=? AND active=1").run(item.quantity,item.productId,item.quantity); if(change.changes!==1)throw new Error("Stock changed. Refresh your cart."); }
   return { id:info.lastInsertRowid, orderCode:code, subtotal, total:subtotal, paymentStatus:"pending", status:"pending" };
  }).immediate();
  if (result.replayed) await fs.promises.unlink(req.file.path).catch(()=>{});
  res.status(result.replayed ? 200 : 201).json({ message:"Order created. Transfer payment and wait for admin confirmation.", order:result });
 } catch (e) { if (req.file) fs.promises.unlink(req.file.path).catch(() => {}); res.status(e.status||400).json({error:e.message || "Could not create order."}); }
}));
const resetRequestLimit = rateLimit({windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false});
const resetVerifyLimit = rateLimit({windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false});
function mailTransport() {
 if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) throw new Error("Gmail mail settings are not configured.");
 return nodemailer.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user:process.env.SMTP_USER,pass:String(process.env.SMTP_APP_PASSWORD).replace(/\s+/g,"")}});
}
app.post("/api/admin/password-reset/request", resetRequestLimit, async (req,res) => {
 try {
  const email = cleanText(process.env.PASSWORD_RESET_EMAIL,160).toLowerCase();
  if (!email || !process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) return res.status(503).json({error:"Password reset email is not configured yet."});
  const previous=db.prepare("SELECT created_at FROM password_reset_codes WHERE id=1").get();
  if(previous && Date.now()-previous.created_at<60000) return res.status(429).json({error:"Wait one minute before requesting another reset code."});
  const code = String(crypto.randomInt(0,1000000)).padStart(6,"0");
  const codeHash = crypto.createHmac("sha256",sessionSecret).update(code).digest("hex");
  db.prepare("INSERT INTO password_reset_codes(id,code_hash,expires_at,attempts,created_at) VALUES(1,?,?,0,?) ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at").run(codeHash,Date.now()+10*60*1000,Date.now());
  const transport = mailTransport();
  await transport.sendMail({from:process.env.SMTP_USER,to:email,subject:"GearHub Admin password reset code",text:`Your GearHub Admin password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,html:`<p>Your GearHub Admin password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>`});
  res.json({ok:true,message:"If password reset is configured, a verification code has been sent to the recovery email."});
 } catch(err) { logError("password_reset_mail_failure",err); res.status(503).json({error:"Could not send the verification email. Check SMTP settings and service logs."}); }
});
app.post("/api/admin/password-reset/verify", resetVerifyLimit, async (req,res) => {
 const code=String(req.body?.code||"").trim(), password=String(req.body?.newPassword||"");
 if (!/^\d{6}$/.test(code)) return res.status(400).json({error:"Enter the 6-digit verification code."});
 const validationError=passwordError(password);
 if (validationError) return res.status(400).json({error:validationError});
 const row=db.prepare("SELECT * FROM password_reset_codes WHERE id=1").get();
 if (!row || row.expires_at<Date.now() || row.attempts>=8) { db.prepare("DELETE FROM password_reset_codes WHERE id=1").run(); return res.status(400).json({error:"Code expired. Request a new code."}); }
 const supplied=crypto.createHmac("sha256",sessionSecret).update(code).digest("hex");
 if (!crypto.timingSafeEqual(Buffer.from(supplied,"hex"),Buffer.from(row.code_hash,"hex"))) {
  const attempts=row.attempts+1;
  if(attempts>=8) db.prepare("DELETE FROM password_reset_codes WHERE id=1").run();
  else db.prepare("UPDATE password_reset_codes SET attempts=? WHERE id=1").run(attempts);
  return res.status(400).json({error:"Invalid verification code."});
 }
 try {
  const username=(process.env.ADMIN_USERNAME||"admin").trim();
  const user=db.prepare("SELECT id FROM admins WHERE username=?").get(username);
  if(!user) return res.status(400).json({error:"Admin account not found."});
  const hash=await bcrypt.hash(password,12);
  db.transaction(() => {
   const current=db.prepare("SELECT * FROM password_reset_codes WHERE id=1").get();
   if(!current || current.code_hash!==row.code_hash || current.created_at!==row.created_at || current.expires_at<=Date.now() || current.attempts>=8) {const error=new Error("Reset code expired or already used.");error.status=400;throw error;}
   db.prepare("UPDATE admins SET password_hash=?,auth_version=auth_version+1 WHERE id=?").run(hash,user.id);
   db.prepare("DELETE FROM password_reset_codes WHERE id=1").run();
   db.prepare("DELETE FROM sessions").run();
  }).immediate();
  req.session.destroy(err => {
   if (err) logError("reset_session_destroy_failure",err);
   res.clearCookie(sessionCookieName,{path:"/",secure:production,httpOnly:true,sameSite:"lax"});
   res.json({ok:true,message:"Password updated. Please sign in with your new password."});
  });
 } catch(err) { logError("password_reset_failure",err); res.status(err.status||500).json({error:err.status?err.message:"Could not update password."}); }
});
app.post("/api/admin/login", async (req,res) => {
 const username = (process.env.ADMIN_USERNAME||"admin").trim();
 const password = String(req.body?.password || "");
 if (!password || Buffer.byteLength(password,"utf8") > 72 || password.includes("\0")) return res.status(401).json({error:"Invalid password."});
 const user = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
 if (!user || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Invalid password."});
 req.session.regenerate(err => {
  if (err) return res.status(500).json({error:"Could not create session."});
  const current=db.prepare("SELECT password_hash,auth_version FROM admins WHERE id=?").get(user.id);
  if (!current || current.password_hash!==user.password_hash) return req.session.destroy(() => res.status(401).json({error:"Password changed. Sign in again."}));
  req.session.admin = {id:user.id,username:user.username,authVersion:current.auth_version};
  const token=csrfToken(req);
  req.session.save(saveErr => {
   if (saveErr) {
    logError("session_save_failure",saveErr);
    return res.status(500).json({error:"Could not save admin session. Please try again."});
   }
   res.setHeader("Cache-Control","no-store");
   res.json({ok:true,username:user.username,csrfToken:token});
  });
 });
});
app.get("/api/admin/me", adminOnly, (req,res) => res.json({authenticated:true,username:req.session.admin.username}));
app.post("/api/admin/logout", (req,res) => req.session.destroy(() => { res.clearCookie(sessionCookieName,{path:"/",secure:production,httpOnly:true,sameSite:"lax"}); res.json({ok:true}); }));
app.get("/api/admin/summary", adminOnly, (req,res) => {
 const sales = db.prepare("SELECT COALESCE(SUM(total),0) AS value FROM orders WHERE payment_status='paid' AND status!='cancelled'").get().value;
 const orders = db.prepare("SELECT COUNT(*) AS value FROM orders").get().value;
 const pending = db.prepare("SELECT COUNT(*) AS value FROM orders WHERE status='pending'").get().value;
 const products = db.prepare("SELECT COUNT(*) AS value FROM products WHERE active=1").get().value;
 const lowStock = db.prepare("SELECT id,sku,name_en,name_my,stock FROM products WHERE active=1 AND stock<=5 ORDER BY stock ASC").all();
 res.json({sales,orders,pending,products,lowStock});
});
app.get("/api/admin/orders", adminOnly, (req,res) => {
 const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 200").all();
 res.json(rows.map(o=>{const {receipt_path,...safe}=o;return {...safe,hasReceipt:Boolean(receipt_path),items:JSON.parse(o.items_json)}}));
});
app.get("/api/admin/orders/:id/receipt", adminOnly, (req,res) => {
 const order = db.prepare("SELECT receipt_path FROM orders WHERE id=?").get(Number(req.params.id));
 if (!order || !order.receipt_path) return res.status(404).json({error:"No payment receipt uploaded for this order."});
 const file = path.join(receiptDir, path.basename(order.receipt_path));
 if (!fs.existsSync(file)) return res.status(404).json({error:"Receipt file not found."});
 res.setHeader("Cache-Control","no-store, private");
 res.sendFile(file);
});
app.patch("/api/admin/orders/:id", adminOnly, (req,res) => {
 const id = Number(req.params.id);
 const status = cleanText(req.body?.status,30);
 const paymentStatus = cleanText(req.body?.paymentStatus,30);
 const note = cleanText(req.body?.adminNote,500);
 const confirmationDate = cleanText(req.body?.confirmationDate,10);
 if (confirmationDate && (!/^\d{4}-\d{2}-\d{2}$/.test(confirmationDate)||Number.isNaN(Date.parse(confirmationDate))||new Date(confirmationDate).toISOString().slice(0,10)!==confirmationDate)) return res.status(400).json({error:"Invalid confirmation date."});
 const allowedStatus = ["pending","confirmed","processing","shipped","completed","cancelled"];
 const allowedPayment = ["pending","paid","rejected"];
 if (!Number.isInteger(id) || !allowedStatus.includes(status) || !allowedPayment.includes(paymentStatus))
  return res.status(400).json({error:"Invalid order update."});
 try {
  db.transaction(() => {
   const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
   if (!order) { const error=new Error("Order not found.");error.status=404;throw error; }
   if (["processing","shipped","completed"].includes(status) && paymentStatus!=="paid") throw new Error("Verify payment before fulfilling an order.");
   if (order.status==="completed" && status!=="completed") throw new Error("Completed orders cannot be reopened. Handle returns separately.");
   if (order.status==="shipped" && !["shipped","completed"].includes(status)) throw new Error("Shipped stock cannot be returned through cancellation. Handle returns separately.");
   if (status === "cancelled" && order.status !== "cancelled") {
    for (const item of JSON.parse(order.items_json)) {
     const product=db.prepare("SELECT stock FROM products WHERE id=?").get(item.productId);
     if (!product || !Number.isSafeInteger(product.stock+item.quantity) || product.stock+item.quantity>1000000000) throw new Error("Cannot restore stock for an unavailable product.");
     db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(item.quantity,item.productId);
    }
   } else if (order.status === "cancelled" && status !== "cancelled") {
    for (const item of JSON.parse(order.items_json)) {
     const result=db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=? AND active=1").run(item.quantity,item.productId,item.quantity);
     if (result.changes!==1) throw new Error("Not enough available stock to restore this order.");
    }
   }
   let invoiceNo = order.invoice_no || "";
   if (status === "confirmed" && !invoiceNo) invoiceNo = "INV-" + nextInvoiceNumber();
   db.prepare("UPDATE orders SET status=?,payment_status=?,admin_note=?,confirmation_date=?,invoice_no=? WHERE id=?").run(status,paymentStatus,note,confirmationDate,invoiceNo,id);
  }).immediate();
  res.json({ok:true});
 } catch(e) { res.status(e.status||400).json({error:e.message||"Could not update order."}); }
});
app.delete("/api/admin/orders/:id", adminOnly, (req,res) => {
 const id=Number(req.params.id); if(!Number.isInteger(id)) return res.status(400).json({error:"Invalid order."});
 const order=db.prepare("SELECT id,status FROM orders WHERE id=?").get(id);
 if(!order) return res.status(404).json({error:"Order not found."});
 if(order.status!=="cancelled") return res.status(400).json({error:"Only cancelled orders can be permanently deleted."});
 db.prepare("DELETE FROM orders WHERE id=?").run(id); res.json({ok:true});
});
app.delete("/api/admin/trash", adminOnly, (req,res) => {
 const result=db.prepare("DELETE FROM orders WHERE status='cancelled'").run(); res.json({ok:true,deleted:result.changes});
});
app.get("/api/admin/products", adminOnly, (req,res) => res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all().map(publicProduct)));
app.get("/api/admin/categories", adminOnly, (_req,res) => res.json(getCategories(false)));
app.put("/api/admin/categories", adminOnly, (req,res) => {
 const input=req.body?.categories;
 if(!Array.isArray(input)||input.length>200)return res.status(400).json({error:"Send a list of up to 200 categories."});
 const cleaned=[];const names=new Set();
 for(const row of input){
  if(!row||typeof row!=="object")return res.status(400).json({error:"A category entry is invalid."});
  const category_en=cleanText(row.category_en,100),category_my=cleanText(row.category_my,100),icon=cleanText(row.icon,12),parent_en=cleanText(row.parent_en,100);
  const key=category_en.toLocaleLowerCase();
  if(!category_en||!category_my)return res.status(400).json({error:"Each category needs an English and Myanmar name."});
  if(names.has(key))return res.status(400).json({error:"English category names must be unique."});
  names.add(key);cleaned.push({id:Number.isInteger(Number(row.id))&&Number(row.id)>0?Number(row.id):null,category_en,category_my,icon,parent_en});
 }
 const namesByKey=new Map(cleaned.map(row=>[row.category_en.toLocaleLowerCase(),row]));
 for(const row of cleaned)if(row.parent_en){const parent=namesByKey.get(row.parent_en.toLocaleLowerCase());if(!parent||parent.parent_en||parent.category_en.toLocaleLowerCase()===row.category_en.toLocaleLowerCase())return res.status(400).json({error:"Choose an existing main category as the parent. Categories can only be two levels deep."});}
 const save=db.transaction(rows=>{
  const existing=getCategories(false),idsByKey=new Map();
  rows.forEach(row=>{
   let current=(row.id&&db.prepare("SELECT * FROM categories WHERE id=?").get(row.id))||db.prepare("SELECT * FROM categories WHERE category_en=? COLLATE NOCASE").get(row.category_en);
   if(current){
    if(current.category_en!==row.category_en)db.prepare("UPDATE products SET category_en=?,category_my=? WHERE category_en=?").run(row.category_en,row.category_my,current.category_en);
    db.prepare("UPDATE categories SET category_en=?,category_my=?,icon=? WHERE id=?").run(row.category_en,row.category_my,row.icon,current.id);
    idsByKey.set(row.category_en.toLocaleLowerCase(),current.id);
   }else{const result=db.prepare("INSERT INTO categories(category_en,category_my,icon,parent_id,sort_order) VALUES(?,?,?,NULL,0)").run(row.category_en,row.category_my,row.icon);idsByKey.set(row.category_en.toLocaleLowerCase(),Number(result.lastInsertRowid));}
  });
  const orderByParent=new Map();
  rows.forEach(row=>{const id=idsByKey.get(row.category_en.toLocaleLowerCase()),parentId=row.parent_en?idsByKey.get(row.parent_en.toLocaleLowerCase()):null;const orderKey=parentId||0,index=orderByParent.get(orderKey)||0;db.prepare("UPDATE categories SET parent_id=?,sort_order=? WHERE id=?").run(parentId,index,id);orderByParent.set(orderKey,index+1)});
  const keep=new Set(idsByKey.values());
  const removed=existing.filter(category=>!keep.has(category.id));
  let fallback=null;
  for(const category of removed){
   const used=db.prepare("SELECT COUNT(*) AS n FROM products WHERE category_en=?").get(category.category_en).n;
   if(!used)continue;
   if(!fallback){
    const requested=rows.find(row=>row.category_en.toLocaleLowerCase()==="uncategorized"&&!row.parent_en);
    if(requested){fallback={id:idsByKey.get(requested.category_en.toLocaleLowerCase()),category_en:requested.category_en,category_my:requested.category_my};}
    else{
     let name="Uncategorized",number=2;
     const unavailable=new Set([...existing.map(c=>c.category_en),...rows.map(c=>c.category_en)].map(name=>name.toLocaleLowerCase()));
     while(unavailable.has(name.toLocaleLowerCase()))name="Uncategorized "+number++;
     const result=db.prepare("INSERT INTO categories(category_en,category_my,icon,parent_id,sort_order) VALUES(?,?,?,NULL,?)").run(name,"အမျိုးအစားမသတ်မှတ်ရသေး","",rows.filter(row=>!row.parent_en).length);
     fallback={id:Number(result.lastInsertRowid),category_en:name,category_my:"အမျိုးအစားမသတ်မှတ်ရသေး"};
    }
    keep.add(fallback.id);
   }
   db.prepare("UPDATE products SET category_en=?,category_my=? WHERE category_en=?").run(fallback.category_en,fallback.category_my,category.category_en);
  }
  // Remove children first so parent deletion remains valid with foreign keys enabled.
  removed.sort((left,right)=>Number(Boolean(right.parent_id))-Number(Boolean(left.parent_id)));
  for(const category of removed)db.prepare("DELETE FROM categories WHERE id=?").run(category.id);
 });
 try{save(cleaned);res.json({ok:true,categories:getCategories(false)});}catch(err){res.status(400).json({error:err.message||"Could not save categories. Check for duplicate names."});}
});
app.post("/api/admin/products", adminOnly, (req,res) => {
 const b=req.body||{};
 const sku=cleanText(b.sku,60), nameEn=cleanText(b.nameEn,160), nameMy=cleanText(b.nameMy,160)||nameEn;
 const categoryEn=cleanText(b.categoryEn,100), categoryMy=cleanText(b.categoryMy,100)||categoryEn;
 const descriptionEn=cleanText(b.descriptionEn,1000), descriptionMy=cleanText(b.descriptionMy,1000);
 const price=Number(b.price), stock=Number(b.stock), emoji=cleanText(b.emoji,8)||"⚙️";
 const imageUrls=orderProductCover(cleanImageUrls(b.imageUrls),b.coverIndex);
 if(!sku||!nameEn||!categoryEn||!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(stock)||stock<0||stock>1000000000)
  return res.status(400).json({error:"Fill required fields; price and stock must be valid non-negative integers."});
 try {
  const r=db.prepare(`INSERT INTO products(sku,name_en,name_my,category_en,category_my,description_en,description_my,price,stock,image_emoji,image_urls)
   VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(sku,nameEn,nameMy,categoryEn,categoryMy,descriptionEn,descriptionMy,price,stock,emoji,JSON.stringify(imageUrls));
  ensureProductCategory(categoryEn,categoryMy);
  res.status(201).json({id:r.lastInsertRowid});
 } catch(e) { res.status(400).json({error:"Could not add product. SKU may already exist."}); }
});
app.patch("/api/admin/products/:id", adminOnly, (req,res) => {
 const id=Number(req.params.id), b=req.body||{};
 const existing=db.prepare("SELECT * FROM products WHERE id=?").get(id);
 if(!Number.isInteger(id)||!existing) return res.status(404).json({error:"Product not found."});
 const sku=cleanText(b.sku ?? existing.sku,60), nameEn=cleanText(b.nameEn ?? existing.name_en,160), nameMy=cleanText(b.nameMy ?? existing.name_my,160)||nameEn;
 const categoryEn=cleanText(b.categoryEn ?? existing.category_en,100), categoryMy=cleanText(b.categoryMy ?? existing.category_my,100)||categoryEn;
 const descriptionEn=cleanText(b.descriptionEn ?? existing.description_en,1000), descriptionMy=cleanText(b.descriptionMy ?? existing.description_my,1000);
 const price=b.price===undefined?existing.price:Number(b.price), stock=b.stock===undefined?existing.stock:Number(b.stock);
 if(b.stock!==undefined && (b.expectedStock===undefined || Number(b.expectedStock)!==existing.stock)) return res.status(409).json({error:"Stock changed since this product was loaded. Refresh inventory before saving."});
 const emoji=cleanText(b.emoji ?? existing.image_emoji,8)||"⚙️";
 let oldImages=[];try{oldImages=JSON.parse(existing.image_urls||"[]")}catch{}
 const imageUrls=orderProductCover(b.imageUrls===undefined?cleanImageUrls(oldImages):cleanImageUrls(b.imageUrls),b.coverIndex);
 const active=b.active===undefined?existing.active:(b.active===false||b.active===0||b.active==="0"?0:1);
 if(!sku||!nameEn||!categoryEn||!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(stock)||stock<0||stock>1000000000) return res.status(400).json({error:"Fill required fields; price and stock must be valid non-negative integers."});
 try { db.prepare("UPDATE products SET sku=?,name_en=?,name_my=?,category_en=?,category_my=?,description_en=?,description_my=?,price=?,stock=?,image_emoji=?,image_urls=?,active=? WHERE id=?").run(sku,nameEn,nameMy,categoryEn,categoryMy,descriptionEn,descriptionMy,price,stock,emoji,JSON.stringify(imageUrls),active,id); ensureProductCategory(categoryEn,categoryMy); res.json({ok:true}); }
 catch(e){res.status(400).json({error:"Could not update product. SKU may already exist."});}
});


async function removeMachineryDemoProducts(){
 db.exec("CREATE TABLE IF NOT EXISTS catalog_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
 const key="remove-machinery-demo-v1";
 if(db.prepare("SELECT id FROM catalog_migrations WHERE id=?").get(key))return;
 const demoRows=db.prepare("SELECT * FROM products WHERE sku LIKE 'GH-DEMO-%' AND description_en LIKE 'Demo product for app testing.%'").all();
 if(demoRows.length){
  await fs.promises.writeFile(path.join(dataDir,"removed-demo-products-"+Date.now()+".json"),JSON.stringify({createdAt:new Date().toISOString(),products:demoRows},null,2),{mode:0o600});
 }
 db.transaction(()=>{
  db.prepare("DELETE FROM products WHERE sku LIKE 'GH-DEMO-%' AND description_en LIKE 'Demo product for app testing.%'").run();
  db.prepare("INSERT INTO catalog_migrations(id) VALUES(?)").run(key);
 })();
 console.log("Removed demo products:",demoRows.length);
}


const samplePartShapes={"engine":"<g fill=\"url(#metal)\" stroke=\"#758081\" stroke-width=\"2\"><rect x=\"52\" y=\"40\" width=\"30\" height=\"68\" rx=\"5\"/><rect x=\"92\" y=\"30\" width=\"30\" height=\"68\" rx=\"5\"/><rect x=\"131\" y=\"43\" width=\"30\" height=\"68\" rx=\"5\"/><ellipse cx=\"67\" cy=\"40\" rx=\"15\" ry=\"7\"/><ellipse cx=\"107\" cy=\"30\" rx=\"15\" ry=\"7\"/><ellipse cx=\"146\" cy=\"43\" rx=\"15\" ry=\"7\"/><ellipse cx=\"57\" cy=\"125\" rx=\"24\" ry=\"8\" fill=\"none\" stroke-width=\"5\"/><ellipse cx=\"110\" cy=\"128\" rx=\"25\" ry=\"8\" fill=\"none\" stroke-width=\"5\"/><ellipse cx=\"159\" cy=\"129\" rx=\"22\" ry=\"8\" fill=\"none\" stroke-width=\"5\"/></g>","hydraulic":"<g fill=\"url(#gold)\" stroke=\"#986611\" stroke-width=\"2\"><rect x=\"55\" y=\"65\" width=\"88\" height=\"58\" rx=\"13\"/><circle cx=\"62\" cy=\"88\" r=\"25\"/><circle cx=\"62\" cy=\"88\" r=\"12\" fill=\"url(#metal)\"/><path d=\"M110 67V43h24v29M145 75h26v31h-29\"/><rect x=\"85\" y=\"116\" width=\"45\" height=\"15\" rx=\"4\"/></g>","cooling":"<rect x=\"30\" y=\"48\" width=\"70\" height=\"80\" rx=\"5\" fill=\"url(#metal)\" stroke=\"#44595c\" stroke-width=\"4\"/><g stroke=\"#606f71\"><path d=\"M39 53v70m8-70v70m8-70v70m8-70v70m8-70v70m8-70v70m8-70v70\"/></g><circle cx=\"145\" cy=\"90\" r=\"36\" fill=\"#263c41\"/><g fill=\"#859796\"><path d=\"m144 87-5-31q24 2 24 15zM149 91l31 4q-7 20-22 17zM142 96l-9 29q-20-8-19-22zM139 91l-26-15q14-16 25-10z\"/></g><circle cx=\"145\" cy=\"90\" r=\"8\" fill=\"url(#metal)\"/>","head":"<path d=\"M38 70 140 45l30 25-100 34z\" fill=\"#9cacac\" stroke=\"#52696c\" stroke-width=\"3\"/><path d=\"m38 70 32 34v28l-32-30zM70 104l100-34v28l-100 34z\" fill=\"url(#metal)\" stroke=\"#52696c\" stroke-width=\"2\"/><g fill=\"#243c42\"><ellipse cx=\"69\" cy=\"73\" rx=\"10\" ry=\"6\"/><ellipse cx=\"99\" cy=\"66\" rx=\"10\" ry=\"6\"/><ellipse cx=\"129\" cy=\"59\" rx=\"10\" ry=\"6\"/></g><g stroke=\"#cbd6d5\" stroke-width=\"5\"><path d=\"m82 108 0 17m20-24v17m20-24v17m20-24v17\"/></g>","gasket":"<path d=\"M35 60h130v63H35z\" fill=\"#c3c6c2\" stroke=\"#677775\" stroke-width=\"3\"/><g fill=\"#f6f8f4\" stroke=\"#40544e\" stroke-width=\"4\"><circle cx=\"61\" cy=\"91\" r=\"16\"/><circle cx=\"101\" cy=\"91\" r=\"16\"/><circle cx=\"140\" cy=\"91\" r=\"16\"/></g><path d=\"M47 38h94v15H47zM57 136h80v7H57z\" fill=\"#bd883e\"/><g fill=\"#253f36\"><circle cx=\"43\" cy=\"68\" r=\"3\"/><circle cx=\"156\" cy=\"116\" r=\"3\"/></g>"};
app.get("/sample-images/:kind.svg",(req,res)=>{
 const shape=samplePartShapes[req.params.kind];if(!shape)return res.status(404).end();
 res.type("image/svg+xml").set("Cache-Control","public,max-age=86400").send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160"><defs><linearGradient id="metal" x2=".8" y2="1"><stop stop-color="#f5f8f8"/><stop offset=".45" stop-color="#a2b0b0"/><stop offset="1" stop-color="#53696a"/></linearGradient><linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#ffda49"/><stop offset="1" stop-color="#d58910"/></linearGradient></defs><ellipse cx="100" cy="140" rx="75" ry="8" fill="#1e392c" opacity=".10"/>'+shape+'</svg>');
});
async function addInitialEnginePartsStock(){
 if(production && process.env.SEED_DEMO !== "true") return;
 const key="initial-engine-parts-stock-v1";
 if(db.prepare("SELECT id FROM catalog_migrations WHERE id=?").get(key))return;
 const rows=[["GH-EO-6D102","Engine Overhaul Kit (6D102)","Engine Overhaul Kit",7500000,"engine","Compatible with Komatsu PC200-7"],["GH-CH-6D102","Cylinder Head Assy (6D102)","Cylinder Head",4200000,"head","Genuine / OEM quality"],["GH-PR-6D102","Piston & Ring Set (6D102)","Piston & Ring",850000,"engine","Standard size"],["GH-GK-6D102","Full Gasket Kit (6D102)","Gasket",620000,"gasket","Engine overhaul gasket set"],["GH-FP-6D102","Fuel Injection Pump (6D102)","Fuel System",12800000,"hydraulic","Denso style fuel injection pump"],["GH-WP-6D102","Water Pump (6D102)","Cooling System",1250000,"cooling","OEM quality water pump"]];
 const insert=db.prepare("INSERT OR IGNORE INTO products(sku,name_en,name_my,category_en,category_my,description_en,description_my,price,stock,image_emoji,image_urls,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)");
 db.transaction(()=>{
  for(const [sku,name,category,price,art,details] of [...rows].reverse()){
   const description=details+". Initial sample stock and price; edit in Admin before real sales.";
   insert.run(sku,name,name,category,category,description,description,price,10,"⚙️",JSON.stringify(["/sample-images/"+art+".svg"]));
   ensureProductCategory(category,category);
  }
  db.prepare("INSERT INTO catalog_migrations(id) VALUES(?)").run(key);
 })();
 console.log("Added six engine parts with initial stock of 10 each.");
}

const notifications=createNotifications({db,dataDir});
const backupService=createBackupService({db,dataDir,uploadDir,receiptDir,notifications});
app.get("/api/admin/operations", adminOnly, (_req,res)=>res.json({...backupService.status(),notifications:notifications.status()}));
app.post("/api/admin/backup/run", rateLimit({windowMs:60000,limit:2,standardHeaders:true,legacyHeaders:false}), adminOnly, async (_req,res,next)=>{try{res.json(await backupService.run())}catch(error){next(error)}});
app.get("/api/health", (_req,res)=>{
 res.set("Cache-Control","no-store");
 try {
  db.prepare("SELECT 1").get();
  const disk=fs.statfsSync(dataDir);const enoughSpace=disk.bavail*disk.bsize>100*1024*1024;
  res.status(enoughSpace?200:503).json({ok:enoughSpace});
 }
 catch { res.status(503).json({ok:false}); }
});
app.get("/api/health/notifications",(_req,res)=>{
 res.set("Cache-Control","no-store");const state=notifications.status();
 const healthy=Boolean(state.enabled&&state.configured&&state.lastSent&&!state.hasFailure);
 res.status(healthy?200:503).json({ok:healthy,configured:state.configured,enabled:state.enabled});
});
// Monitor backup failures separately so a remote storage outage cannot restart the shop.
app.get("/api/health/backups", (_req,res)=>{
 res.set("Cache-Control","no-store");
 const state=backupService.status();
 const fresh=state.last_success && Date.now()-Date.parse(state.last_success)<state.intervalHours*2*3600000;
 const offsiteFresh=!state.offsiteConfigured || (state.last_offsite_success && Date.now()-Date.parse(state.last_offsite_success)<state.intervalHours*2*3600000);
 const healthy=Boolean(fresh && offsiteFresh && !state.last_failure);
 res.status(healthy?200:503).json({ok:healthy});
});
app.use((err,req,res,next)=>{
 if(res.headersSent)return next(err);
 const status=err.type==="entity.too.large"?413:err.type==="entity.parse.failed"?400:500;
 if(status===500)notifications.alert("server-error","The storefront returned an internal server error. Request ID: "+res.getHeader("X-Request-ID")).catch(()=>{});
 console.error(JSON.stringify({event:"server_error",requestId:res.getHeader("X-Request-ID"),code:err.code||err.name,status}));
 res.status(status).json({error:status===400?"Invalid request data.":status===413?"Request is too large.":"Unexpected server error."});
});

let server;
ensureAdmin().then(removeMachineryDemoProducts).then(addInitialEnginePartsStock).then(()=>{
 notifications.start();
 backupService.start();
 server=app.listen(PORT,()=>console.log(`GearHub running at http://localhost:${PORT}`));
}).catch(err=>{logError("startup_failure",err);process.exit(1);});
function shutdown(){notifications.stop();backupService.stop();if(!server)return;const timeout=setTimeout(()=>process.exit(1),10000).unref();server.close(()=>{clearTimeout(timeout);db.close();process.exit(0)});}
process.once("SIGTERM",shutdown);process.once("SIGINT",shutdown);
