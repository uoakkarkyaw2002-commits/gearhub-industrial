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
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1); // Render runs behind a trusted reverse proxy.
const PORT = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === "production";
const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
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
 status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
`);
// Safe schema migration for existing deployments.
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
 const exists = db.prepare("SELECT id FROM admins WHERE username=?").get(username);
 if (!exists) {
   const hash = await bcrypt.hash(password, 12);
   db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(username, hash);
   console.log(`Created admin account "${username}". Change credentials through environment variables before production.`);
 }
}
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // Front-end uses inline JS/CSS; enable a tailored CSP before public deployment.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(session({
 secret: process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex"),
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: "lax", secure: production, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir, { fallthrough: false, maxAge: "1d" }));
app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));

function adminOnly(req, res, next) {
 if (!req.session.admin) return res.status(401).json({ error: "Admin login required" });
 next();
}
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

app.get("/api/config", (req,res) => res.json({
 bankName: process.env.BANK_NAME || "Configure BANK_NAME in .env",
 bankAccountName: process.env.BANK_ACCOUNT_NAME || "Configure BANK_ACCOUNT_NAME in .env",
 bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || "Configure BANK_ACCOUNT_NUMBER in .env",
 paymentInstructions: process.env.PAYMENT_INSTRUCTIONS || "Transfer the order total and enter your transaction reference."
}));
app.get("/api/products", (req,res) => {
 const rows = db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all();
 res.json(rows.map(publicProduct));
});
app.post("/api/orders", (req,res) => {
 const b = req.body || {};
 const name = cleanText(b.customerName,120), phone = cleanText(b.phone,40);
 const email = cleanText(b.email,160), address = cleanText(b.address,500);
 const language = b.language === "en" ? "en" : "my";
 const reference = cleanText(b.paymentReference,100);
 if (!name || !phone || !address) return res.status(400).json({error:"Name, phone and delivery address are required."});
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
    (order_code,customer_name,phone,email,address,language,items_json,subtotal,delivery_fee,total,payment_reference)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(code,name,phone,email,address,language,JSON.stringify(lineItems),subtotal,0,subtotal,reference);
   for (const item of lineItems) db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(item.quantity,item.productId);
   return { id:info.lastInsertRowid, orderCode:code, subtotal, total:subtotal, paymentStatus:"pending", status:"pending" };
  })();
  res.status(201).json({ message:"Order created. Transfer payment and wait for admin confirmation.", order:result });
 } catch (e) { res.status(400).json({error:e.message || "Could not create order."}); }
});
app.post("/api/admin/login", async (req,res) => {
 const username = cleanText(req.body?.username,100);
 const password = String(req.body?.password || "");
 const user = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
 if (!user || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Invalid username or password."});
 req.session.regenerate(err => {
  if (err) return res.status(500).json({error:"Could not create session."});
  req.session.admin = {id:user.id,username:user.username};
  res.json({ok:true,username:user.username});
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
 res.json(rows.map(o=>({...o,items:JSON.parse(o.items_json)})));
});
app.patch("/api/admin/orders/:id", adminOnly, (req,res) => {
 const id = Number(req.params.id);
 const status = cleanText(req.body?.status,30);
 const paymentStatus = cleanText(req.body?.paymentStatus,30);
 const note = cleanText(req.body?.adminNote,500);
 const allowedStatus = ["pending","processing","shipped","completed","cancelled"];
 const allowedPayment = ["pending","paid","rejected"];
 if (!Number.isInteger(id) || !allowedStatus.includes(status) || !allowedPayment.includes(paymentStatus))
  return res.status(400).json({error:"Invalid order update."});
 const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
 if (!order) return res.status(404).json({error:"Order not found."});
 try {
  db.transaction(() => {
   if (status === "cancelled" && order.status !== "cancelled") {
    for (const item of JSON.parse(order.items_json)) db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(item.quantity,item.productId);
   }
   db.prepare("UPDATE orders SET status=?,payment_status=?,admin_note=? WHERE id=?").run(status,paymentStatus,note,id);
  })();
  res.json({ok:true});
 } catch(e) { res.status(500).json({error:"Could not update order."}); }
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
 const active = b.active === false ? 0 : 1;
 const stock = b.stock === undefined ? null : Number(b.stock);
 if(!Number.isInteger(id) || (stock !== null && (!Number.isInteger(stock)||stock<0))) return res.status(400).json({error:"Invalid product update."});
 const exists=db.prepare("SELECT id FROM products WHERE id=?").get(id);
 if(!exists) return res.status(404).json({error:"Product not found."});
 if(stock===null) db.prepare("UPDATE products SET active=? WHERE id=?").run(active,id);
 else db.prepare("UPDATE products SET active=?,stock=? WHERE id=?").run(active,stock,id);
 res.json({ok:true});
});
app.get("/api/health", (req,res)=>res.json({ok:true}));
app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({error:"Unexpected server error."}); });

ensureAdmin().then(()=>app.listen(PORT,()=>console.log(`GearHub running at http://localhost:${PORT}`))).catch(err=>{console.error(err);process.exit(1);});
