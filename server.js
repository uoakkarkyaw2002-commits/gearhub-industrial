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

const app = express();
app.set("trust proxy", 1); // Render runs behind a trusted reverse proxy.
const PORT = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === "production";
// Set DATA_DIR to a persistent disk mount (for example /var/data on Render).
// Keep the current paths as defaults until the persistent disk is attached and configured.
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(dataDir, "uploads");
const receiptDir = path.join(dataDir, "receipts");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(receiptDir, { recursive: true });
const imageStorage = multer.diskStorage({
 destination: (_req, _file, cb) => cb(null, uploadDir),
 filename: (_req, file, cb) => {
  const ext = ({ "image/jpeg":".jpg", "image/png":".png", "image/webp":".webp", "image/gif":".gif", "image/avif":".avif" })[file.mimetype];
  cb(null, crypto.randomBytes(16).toString("hex") + ext);
 }
});
const imageUpload = multer({
 storage: imageStorage,
 limits: { fileSize: 5 * 1024 * 1024, files: 10 },
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
 limits: { fileSize: 5 * 1024 * 1024, files: 1 },
 fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp"].includes(file.mimetype))
});

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn("WARNING: Set SESSION_SECRET to a random secret of at least 32 characters in .env");
}
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.includes("ChangeThis")) {
  console.warn("WARNING: Set a strong ADMIN_PASSWORD in .env before deployment.");
}

const db = new Database(path.join(dataDir, "gearhub.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
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
// Safe schema migration for existing deployments.
const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!orderColumns.includes("receipt_path")) db.exec("ALTER TABLE orders ADD COLUMN receipt_path TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes("confirmation_date")) db.exec("ALTER TABLE orders ADD COLUMN confirmation_date TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes("invoice_no")) db.exec("ALTER TABLE orders ADD COLUMN invoice_no TEXT NOT NULL DEFAULT ''");
const confirmedWithoutInvoice = db.prepare("SELECT id FROM orders WHERE status='confirmed' AND invoice_no='' ORDER BY CASE WHEN confirmation_date='' THEN created_at ELSE confirmation_date END ASC, id ASC").all();
const nextInvoiceNumber = () => {
 const rows = db.prepare("SELECT invoice_no FROM orders WHERE invoice_no LIKE 'INV-%'").all();
 return rows.reduce((max,row)=>Math.max(max,Number(String(row.invoice_no).slice(4))||0),0)+1;
};
for (const row of confirmedWithoutInvoice) db.prepare("UPDATE orders SET invoice_no=? WHERE id=?").run("INV-"+nextInvoiceNumber(),row.id);
const productColumns = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
if (!productColumns.includes("image_urls")) db.exec("ALTER TABLE products ADD COLUMN image_urls TEXT NOT NULL DEFAULT '[]'");
const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (!count) {
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
async function ensureAdmin() {
 const username = (process.env.ADMIN_USERNAME || "admin").trim();
 const password = process.env.ADMIN_PASSWORD || "";
 if (!password) return;
 const exists = db.prepare("SELECT id,password_hash FROM admins WHERE username=?").get(username);
 if (!exists) {
   const hash = await bcrypt.hash(password, 12);
   db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(username, hash);
   console.log(`Created admin account "${username}".`);
 }
}
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // Front-end uses inline JS/CSS; enable a tailored CSP before public deployment.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
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
 secret: process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex"),
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: "lax", secure: production, maxAge: 1000 * 60 * 60 * 8 }
}));
// Periodically prune expired sessions without requiring an external service.
setInterval(() => {
 try { db.prepare("DELETE FROM sessions WHERE expired_at <= ?").run(Date.now()); }
 catch (err) { console.error("Session cleanup failed:", err.message); }
}, 60 * 60 * 1000).unref();
// Admin HTML and scripts must always revalidate so a cached search form cannot
// keep submitting the page and send an administrator back through login.
app.get("/admin.html", (req, res) => {
 res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
 res.setHeader("Pragma", "no-cache");
 res.setHeader("Expires", "0");
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
app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use("/api/orders", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
// Reject cross-origin browser requests to admin mutation endpoints.
app.use("/api/admin", (req, res, next) => {
 if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
  const origin = req.get("origin");
  if (origin) {
   try {
    if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Cross-origin request blocked." });
   } catch { return res.status(403).json({ error: "Invalid request origin." }); }
  }
 }
 next();
});

function adminOnly(req, res, next) {
 if (!req.session.admin) return res.status(401).json({ error: "Admin login required" });
 next();
}

app.get("/api/admin/backup", adminOnly, async (req, res) => {
 const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gearhub-backup-"));
 const stageDir = path.join(tempRoot, "gearhub-backup");
 const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
 const archivePath = path.join(tempRoot, `gearhub-backup-${timestamp}.tar.gz`);
 try {
  await fs.promises.mkdir(stageDir, { recursive: true });
  // Use SQLite's online backup API so committed WAL data is included consistently.
  await db.backup(path.join(stageDir, "gearhub.sqlite"));
  await fs.promises.cp(uploadDir, path.join(stageDir, "uploads"), { recursive: true, force: true });
  await fs.promises.cp(receiptDir, path.join(stageDir, "receipts"), { recursive: true, force: true });
  await execFileAsync("tar", ["-czf", archivePath, "-C", tempRoot, "gearhub-backup"], { timeout: 120000 });
  res.setHeader("Cache-Control", "no-store, private");
  res.download(archivePath, path.basename(archivePath), async err => {
   await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
   if (err && !res.headersSent) res.status(500).json({ error: "Could not download the backup archive." });
  });
 } catch (err) {
  console.error("Backup export failed:", err.message);
  await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  if (!res.headersSent) res.status(500).json({ error: "Could not create backup archive. Check service logs." });
 }
});
app.post("/api/admin/uploads", adminOnly, (req,res,next) => imageUpload.array("images",10)(req,res,err => {
 if (err) return res.status(400).json({error:err.message || "Could not upload images."});
 if (!req.files || !req.files.length) return res.status(400).json({error:"Choose at least one image file."});
 res.status(201).json({ imageUrls: req.files.map(file => "/uploads/" + file.filename) });
}));
function cleanText(v, max=500) { return String(v ?? "").trim().slice(0, max); }
function publicProduct(p) {
 let imageUrls = [];
 try { imageUrls = JSON.parse(p.image_urls || "[]"); } catch {}
 return { ...p, imageUrls: Array.isArray(imageUrls) ? imageUrls.slice(0,10) : [], active: Boolean(p.active) };
}
function cleanImageUrls(value) {
 const input = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
 return [...new Set(input.map(v => cleanText(v, 1000)).filter(v => /^https?:\/\//i.test(v) || /^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif|avif)$/i.test(v)))].slice(0,10);
}

const defaultSiteSettings = () => ({
 siteTitle: "GearHub Industrial | စက်မှုသုံးပစ္စည်းများ",
 brandName: "gearhub.", brandTagline: "INDUSTRIAL", heroIcon: "⚙️", logoUrl: "", wallpaperUrl: "", heroImageUrl: "",
 colors: { brand: "#183426", accent: "#b7f36b", page: "#f5f7f1", hero: "#183426" },
 payment: {
  bankName: process.env.BANK_NAME || "KPay",
  bankAccountName: process.env.BANK_ACCOUNT_NAME || "U Oakkar Kyaw",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || "09-766 472 432",
  paymentInstructions: process.env.PAYMENT_INSTRUCTIONS || "KPay သို့ ငွေလွှဲပြီး ငွေလွှဲပြေစာကို upload လုပ်ပေးပါ။"
 },
 translations: { my: {}, en: {} }
});
function getSiteSettings() {
 let saved = {};
 try { saved = JSON.parse(db.prepare("SELECT settings_json FROM site_settings WHERE id=1").get()?.settings_json || "{}"); } catch {}
 const defaults = defaultSiteSettings();
 return {
  ...defaults, ...saved,
  colors: { ...defaults.colors, ...(saved.colors || {}) },
  payment: { ...defaults.payment, ...(saved.payment || {}) },
  translations: { my: { ...(saved.translations?.my || {}) }, en: { ...(saved.translations?.en || {}) } }
 };
}
function cleanSiteImageUrl(value) {
 const input = cleanText(value, 1000);
 if (!input) return "";
 if (/^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif|avif)$/i.test(input)) return input;
 try {
  const url = new URL(input);
  if (url.protocol === "https:") return url.href;
 } catch {}
 return null;
}
app.get("/api/admin/site-settings", adminOnly, (_req,res) => res.json(getSiteSettings()));
app.put("/api/admin/site-settings", adminOnly, (req,res) => {
 const body = req.body || {}, previous = getSiteSettings();
 const logoUrl = cleanSiteImageUrl(body.logoUrl), wallpaperUrl = cleanSiteImageUrl(body.wallpaperUrl), heroImageUrl = cleanSiteImageUrl(body.heroImageUrl);
 if (logoUrl === null || wallpaperUrl === null || heroImageUrl === null) return res.status(400).json({error:"Logo and background image URLs must be HTTPS or an uploaded image."});
 const color = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : null;
 const colors = {};
 for (const key of ["brand","accent","page","hero"]) {
  colors[key] = color(body.colors?.[key]);
  if (!colors[key]) return res.status(400).json({error:"Choose valid colors for every color setting."});
 }
 const translations = { my: {}, en: {} };
 for (const language of ["my","en"]) {
  const entries = Object.entries(body.translations?.[language] || {});
  if (entries.length > 100) return res.status(400).json({error:"Too many storefront text fields."});
  for (const [key,value] of entries) {
   if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(key) || typeof value !== "string" || value.length > 1000)
    return res.status(400).json({error:"Storefront text fields must be plain text under 1,000 characters."});
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
  logoUrl, wallpaperUrl, heroImageUrl, colors, payment, translations
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
app.post("/api/orders", (req,res) => receiptUpload.single("receipt")(req,res,err => {
 if (err) return res.status(400).json({error:err.message || "Could not upload payment receipt."});
 const b = req.body || {};
 if (typeof b.items === "string") { try { b.items = JSON.parse(b.items); } catch { return res.status(400).json({error:"Invalid cart data."}); } }
 const name = cleanText(b.customerName,120), phone = cleanText(b.phone,40);
 const email = cleanText(b.email,160), address = cleanText(b.address,500);
 const language = b.language === "en" ? "en" : "my";
 const reference = cleanText(b.paymentReference,100);
 if (!name || !phone || !address) return res.status(400).json({error:"Name, phone and delivery address are required."});
 if (!req.file) return res.status(400).json({error:"Please upload your payment receipt image (JPG, PNG or WebP, max 5 MB)."});
 if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return res.status(400).json({error:"Your cart is empty or invalid."});
 const ids = b.items.map(x => Number(x.id));
 if (ids.some(id => !Number.isInteger(id) || id < 1)) return res.status(400).json({error:"Invalid product."});
 const qtyMap = new Map();
 for (const item of b.items) {
   const qty = Number(item.quantity);
   if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return res.status(400).json({error:"Invalid quantity."});
   qtyMap.set(Number(item.id), (qtyMap.get(Number(item.id)) || 0) + qty);
 }
 try {
  const result = db.transaction(() => {
   const lineItems = [];
   let subtotal = 0;
   for (const [id, quantity] of qtyMap.entries()) {
    const p = db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(id);
    if (!p) throw new Error("A product is unavailable. Please refresh your cart.");
    if (p.stock < quantity) throw new Error(`Not enough stock for ${p.name_en}. Available: ${p.stock}`);
    subtotal += p.price * quantity;
    lineItems.push({ productId:p.id, sku:p.sku, nameEn:p.name_en, nameMy:p.name_my, unitPrice:p.price, quantity, lineTotal:p.price*quantity });
   }
   const code = "GH-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
   const info = db.prepare(`INSERT INTO orders
    (order_code,customer_name,phone,email,address,language,items_json,subtotal,delivery_fee,total,payment_reference,receipt_path)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(code,name,phone,email,address,language,JSON.stringify(lineItems),subtotal,0,subtotal,reference,req.file.filename);
   for (const item of lineItems) db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(item.quantity,item.productId);
   return { id:info.lastInsertRowid, orderCode:code, subtotal, total:subtotal, paymentStatus:"pending", status:"pending" };
  })();
  res.status(201).json({ message:"Order created. Transfer payment and wait for admin confirmation.", order:result });
 } catch (e) { if (req.file) fs.promises.unlink(req.file.path).catch(() => {}); res.status(400).json({error:e.message || "Could not create order."}); }
}));
const resetRequestLimit = rateLimit({windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false});
const resetVerifyLimit = rateLimit({windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false});
function mailTransport() {
 if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) throw new Error("Gmail mail settings are not configured.");
 return nodemailer.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user:process.env.SMTP_USER,pass:String(process.env.SMTP_APP_PASSWORD).replace(/\\s+/g,"")}});
}
app.post("/api/admin/password-reset/request", resetRequestLimit, async (req,res) => {
 try {
  const email = cleanText(process.env.PASSWORD_RESET_EMAIL,160).toLowerCase();
  if (!email || !process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) return res.status(503).json({error:"Password reset email is not configured yet."});
  const code = String(crypto.randomInt(0,1000000)).padStart(6,"0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  db.prepare("INSERT INTO password_reset_codes(id,code_hash,expires_at,attempts,created_at) VALUES(1,?,?,0,?) ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at").run(codeHash,Date.now()+10*60*1000,Date.now());
  const transport = mailTransport();
  await transport.sendMail({from:process.env.SMTP_USER,to:email,subject:"GearHub Admin password reset code",text:`Your GearHub Admin password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,html:`<p>Your GearHub Admin password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>`});
  res.json({ok:true,message:"If password reset is configured, a verification code has been sent to the recovery email."});
 } catch(err) { console.error("Password reset email failed:",err.message); res.status(503).json({error:"Could not send the verification email. Check SMTP settings and service logs."}); }
});
app.post("/api/admin/password-reset/verify", resetVerifyLimit, async (req,res) => {
 const code=cleanText(req.body?.code,6), password=String(req.body?.newPassword||"");
 if (!/^\d{6}$/.test(code)) return res.status(400).json({error:"Enter the 6-digit verification code."});
 if (password.length<12 || password.length>200) return res.status(400).json({error:"New password must be 12–200 characters long."});
 const row=db.prepare("SELECT * FROM password_reset_codes WHERE id=1").get();
 if (!row || row.expires_at<Date.now() || row.attempts>=8) { db.prepare("DELETE FROM password_reset_codes WHERE id=1").run(); return res.status(400).json({error:"Code expired. Request a new code."}); }
 const supplied=crypto.createHash("sha256").update(code).digest("hex");
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
  db.prepare("UPDATE admins SET password_hash=? WHERE id=?").run(hash,user.id);
  db.prepare("DELETE FROM password_reset_codes WHERE id=1").run();
  req.session.destroy(()=>{});
  res.json({ok:true,message:"Password updated. Please sign in with your new password."});
 } catch(err) { console.error("Password reset failed:",err.message); res.status(500).json({error:"Could not update password."}); }
});
app.post("/api/admin/login", async (req,res) => {
 const username = cleanText(req.body?.username,100);
 const password = String(req.body?.password || "");
 const user = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
 if (!user || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Invalid username or password."});
 req.session.regenerate(err => {
  if (err) return res.status(500).json({error:"Could not create session."});
  req.session.admin = {id:user.id,username:user.username};
  req.session.save(saveErr => {
   if (saveErr) {
    console.error("Admin session save failed:",saveErr.message);
    return res.status(500).json({error:"Could not save admin session. Please try again."});
   }
   res.setHeader("Cache-Control","no-store");
   res.json({ok:true,username:user.username});
  });
 });
});
app.get("/api/admin/me", (req,res) => req.session.admin ? res.json({authenticated:true,username:req.session.admin.username}) : res.status(401).json({authenticated:false}));
app.post("/api/admin/logout", (req,res) => req.session.destroy(() => { res.clearCookie("connect.sid"); res.json({ok:true}); }));
app.get("/api/admin/summary", adminOnly, (req,res) => {
 const sales = db.prepare("SELECT COALESCE(SUM(total),0) AS value FROM orders WHERE payment_status='paid'").get().value;
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
 if (confirmationDate && !/^\d{4}-\d{2}-\d{2}$/.test(confirmationDate)) return res.status(400).json({error:"Invalid confirmation date."});
 const allowedStatus = ["pending","confirmed","processing","shipped","completed","cancelled"];
 const allowedPayment = ["pending","paid","rejected"];
 if (!Number.isInteger(id) || !allowedStatus.includes(status) || !allowedPayment.includes(paymentStatus))
  return res.status(400).json({error:"Invalid order update."});
 const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
 if (!order) return res.status(404).json({error:"Order not found."});
 try {
  db.transaction(() => {
   if (status === "cancelled" && order.status !== "cancelled") {
    for (const item of JSON.parse(order.items_json)) db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(item.quantity,item.productId);
   } else if (order.status === "cancelled" && status !== "cancelled") { for (const item of JSON.parse(order.items_json)) db.prepare("UPDATE products SET stock=MAX(0,stock-?) WHERE id=?").run(item.quantity,item.productId); }
   let invoiceNo = order.invoice_no || "";
   if (status === "confirmed" && !invoiceNo) invoiceNo = "INV-" + nextInvoiceNumber();
   db.prepare("UPDATE orders SET status=?,payment_status=?,admin_note=?,confirmation_date=?,invoice_no=? WHERE id=?").run(status,paymentStatus,note,confirmationDate,invoiceNo,id);
  })();
  res.json({ok:true});
 } catch(e) { res.status(500).json({error:"Could not update order."}); }
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
app.post("/api/admin/products", adminOnly, (req,res) => {
 const b=req.body||{};
 const sku=cleanText(b.sku,60), nameEn=cleanText(b.nameEn,160), nameMy=cleanText(b.nameMy,160);
 const categoryEn=cleanText(b.categoryEn,100), categoryMy=cleanText(b.categoryMy,100);
 const descriptionEn=cleanText(b.descriptionEn,1000), descriptionMy=cleanText(b.descriptionMy,1000);
 const price=Number(b.price), stock=Number(b.stock), emoji=cleanText(b.emoji,8)||"⚙️";
 const imageUrls=cleanImageUrls(b.imageUrls);
 if(!sku||!nameEn||!nameMy||!categoryEn||!categoryMy||!Number.isSafeInteger(price)||price<0||!Number.isInteger(stock)||stock<0)
  return res.status(400).json({error:"Fill required fields; price and stock must be valid non-negative integers."});
 try {
  const r=db.prepare(`INSERT INTO products(sku,name_en,name_my,category_en,category_my,description_en,description_my,price,stock,image_emoji,image_urls)
   VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(sku,nameEn,nameMy,categoryEn,categoryMy,descriptionEn,descriptionMy,price,stock,emoji,JSON.stringify(imageUrls));
  res.status(201).json({id:r.lastInsertRowid});
 } catch(e) { res.status(400).json({error:"Could not add product. SKU may already exist."}); }
});
app.patch("/api/admin/products/:id", adminOnly, (req,res) => {
 const id=Number(req.params.id), b=req.body||{};
 const existing=db.prepare("SELECT * FROM products WHERE id=?").get(id);
 if(!Number.isInteger(id)||!existing) return res.status(404).json({error:"Product not found."});
 const sku=cleanText(b.sku ?? existing.sku,60), nameEn=cleanText(b.nameEn ?? existing.name_en,160), nameMy=cleanText(b.nameMy ?? existing.name_my,160);
 const categoryEn=cleanText(b.categoryEn ?? existing.category_en,100), categoryMy=cleanText(b.categoryMy ?? existing.category_my,100);
 const descriptionEn=cleanText(b.descriptionEn ?? existing.description_en,1000), descriptionMy=cleanText(b.descriptionMy ?? existing.description_my,1000);
 const price=b.price===undefined?existing.price:Number(b.price), stock=b.stock===undefined?existing.stock:Number(b.stock);
 const emoji=cleanText(b.emoji ?? existing.image_emoji,8)||"⚙️";
 let oldImages=[];try{oldImages=JSON.parse(existing.image_urls||"[]")}catch{}
 const imageUrls=b.imageUrls===undefined?cleanImageUrls(oldImages):cleanImageUrls(b.imageUrls);
 const active=b.active===undefined?existing.active:(b.active===false||b.active===0||b.active==="0"?0:1);
 if(!sku||!nameEn||!nameMy||!categoryEn||!categoryMy||!Number.isSafeInteger(price)||price<0||!Number.isInteger(stock)||stock<0) return res.status(400).json({error:"Fill required fields; price and stock must be valid non-negative integers."});
 try { db.prepare("UPDATE products SET sku=?,name_en=?,name_my=?,category_en=?,category_my=?,description_en=?,description_my=?,price=?,stock=?,image_emoji=?,image_urls=?,active=? WHERE id=?").run(sku,nameEn,nameMy,categoryEn,categoryMy,descriptionEn,descriptionMy,price,stock,emoji,JSON.stringify(imageUrls),active,id); res.json({ok:true}); }
 catch(e){res.status(400).json({error:"Could not update product. SKU may already exist."});}
});
app.get("/api/health", (req,res)=>res.json({ok:true}));
app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({error:"Unexpected server error."}); });

ensureAdmin().then(()=>app.listen(PORT,()=>console.log(`GearHub running at http://localhost:${PORT}`))).catch(err=>{console.error(err);process.exit(1);});
