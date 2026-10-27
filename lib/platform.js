const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const splash = require("./splash");
const siteScene = require("./site-scene");
const { optimizedImage, variantPath, IMMUTABLE } = require("./image-variants");
const { salePrice } = require("./promotion");
const rateLimit = require("express-rate-limit");
const { OAuth2Client } = require("google-auth-library");
const { csrfToken, validToken } = require("./security");
const model = require("./platform-model");
const { allocateSlug } = require("./shop-slug");
const { orderMessage } = require("./order-push");
const policies = require("./policies");
const { createPhotoSearch } = require("./photo-search");
function createPlatform({
  db,
  dataDir,
  publicOrigin,
  env = process.env,
  identityProvider,
  notifyApplication,
  orderPush,
  drive,
}) {
  model.migrate(db);
  // Manual billing record: the owner notes each payment a shop makes (no card processing).
  db.exec("CREATE TABLE IF NOT EXISTS platform_payments(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL REFERENCES platform_shops(id),amount INTEGER NOT NULL CHECK(amount>=0),months INTEGER NOT NULL DEFAULT 0 CHECK(months>=0 AND months<=24),method TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',paid_at TEXT NOT NULL,created_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS idx_platform_payments_shop ON platform_payments(shop_id,paid_at)");
  // New shops (owner's request): a shop opens as soon as someone applies, while there are fewer seller shops
  // than the owner's limit; each new shop gets the owner's storage (MB). Over the limit the application
  // waits for the owner as before.
  db.exec("CREATE TABLE IF NOT EXISTS platform_signup(id INTEGER PRIMARY KEY CHECK(id=1),max_shops INTEGER NOT NULL DEFAULT 10,storage_mb INTEGER NOT NULL DEFAULT 100)");
  const signup = () => { const r = db.prepare("SELECT max_shops,storage_mb FROM platform_signup WHERE id=1").get(); return { maxShops: r ? r.max_shops : 10, storageMb: r ? r.storage_mb : 100 }; };
  const sellerShops = () => db.prepare("SELECT COUNT(*) n FROM platform_shops WHERE legacy=0").get().n;
  const PAYMENT_METHODS = ["KBZPay", "WavePay", "AYA Pay", "CB Pay", "Bank transfer", "Cash", "Other"];
  const router = express.Router();
  const ownerEmail = String(env.PLATFORM_OWNER_EMAIL || "")
    .trim()
    .toLowerCase();
  const origin = publicOrigin || "http://localhost:3000";
  const callback = origin + "/api/platform/auth/callback";
  const google = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    callback,
  );
  const oauthReady = Boolean(
    identityProvider || (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  );
  const media = path.join(dataDir, "platform-media");
  fs.mkdirSync(media, { recursive: true, mode: 0o700 });
  if(fs.lstatSync(media).isSymbolicLink())throw Error("Tenant media directory must not be a symlink.");
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldSize: 64 * 1024,
    },
  }).single("file");
  const spreadsheetUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4, fieldSize: 16 * 1024 },
  }).single("file");
  function spreadsheetMultipart(req, res, next) {
    spreadsheetUpload(req, res, error => error ? res.status(400).json({ error: "Upload one Excel file up to 10 MB." }) : next());
  }
  const text = (v, max = 200) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const fail = (status, message) => {
    const e = new Error(message);
    e.status = status;
    throw e;
  };
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve()
      .then(() => fn(req, res))
      .catch(next);
  function user(req) {
    const u = db
      .prepare("SELECT * FROM platform_users WHERE id=?")
      .get(req.session.platformUser || -1);
    if (!u) fail(401, "Google login required.");
    if (u.status !== "active")
      fail(403, "Your account is suspended. Contact the platform owner.");
    return u;
  }
  function owner(req) {
    const u = user(req);
    if (!model.isOwner(db, u, ownerEmail)) fail(403, "Platform owner only.");
    return u;
  }
  function shopFor(req, action) {
    const u = user(req);
    const shop = db
      .prepare("SELECT * FROM platform_shops WHERE id=? AND legacy=0")
      .get(Number(req.params.id));
    if (!shop || (shop.owner_id !== u.id && !model.isOwner(db, u, ownerEmail)))
      fail(404, "Shop not found.");
    const limits = model.permissions(db, shop);
    if (action && !limits.permissions[action])
      fail(
        403,
        "This shop or subscription does not allow this action. Existing data is preserved.",
      );
    return { shop, limits };
  }
  function publicShop(slug) {
    const s = db
      .prepare("SELECT * FROM platform_shops WHERE slug=? AND legacy=0")
      .get(slug);
    if (
      !s ||
      !model.permissions(db, s).permissions.selling ||
      db.prepare("SELECT status FROM platform_users WHERE id=?").get(s.owner_id)
        ?.status !== "active"
    )
      fail(404, "This shop is not available.");
    return s;
  }
  function integer(v, max = 1e9) {
    if (!Number.isSafeInteger(v) || v < 0 || v > max)
      fail(400, "Enter a valid non-negative number.");
    return v;
  }
  function asset(shop, id, kind) {
    if (!id) return null;
    const f = db
      .prepare(
        "SELECT * FROM platform_files WHERE id=? AND shop_id=? AND ready=1",
      )
      .get(id, shop.id);
    if (!f || f.kind !== kind) fail(400, "Invalid shop file.");
    return f;
  }
  function signature(b, m) {
    return (
      (m === "image/png" &&
        b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) ||
      (m === "image/jpeg" &&
        b.length >= 3 &&
        b[0] === 255 &&
        b[1] === 216 &&
        b[2] === 255) ||
      (m === "image/webp" &&
        b.length >= 12 &&
        b.toString("ascii", 0, 4) === "RIFF" &&
        b.toString("ascii", 8, 12) === "WEBP")
    );
  }
  function spreadsheetFile(file) {
    const name = path.basename(String(file?.originalname || "")).trim();
    const ext = name.toLowerCase().match(/\.(xlsx|xlsm|xls|csv)$/)?.[1];
    const mime = String(file?.mimetype || "").toLowerCase();
    const zip = file?.buffer?.subarray(0, 4).equals(Buffer.from([0x50,0x4b,0x03,0x04]));
    const legacy = file?.buffer?.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
    const csv = ext === "csv" && ["text/csv","application/csv","text/plain"].includes(mime) && file.buffer?.length;
    if (!ext || !(((ext === "xlsx" || ext === "xlsm") && zip) || (ext === "xls" && legacy) || csv)) fail(400, "Choose a valid .xlsx, .xlsm, .xls or .csv file.");
    // The stored type comes from the checked extension, never from the browser, so a file is
    // always served as a spreadsheet download type and never as a web page.
    const storedType = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12", xls: "application/vnd.ms-excel", csv: "text/csv" }[ext];
    return { extension: ext, mime: storedType, displayName: name.slice(0, 120).replace(/[\\/:*?"<>|]/g, "_") || "spreadsheet." + ext };
  }
  function saveFile(shop, file, kind, options = {}) {
    const spreadsheet = kind === "spreadsheet" ? spreadsheetFile(file) : null;
    const replaceSpreadsheets = kind === "spreadsheet" && options.replaceSpreadsheets;
    let replaced = [];
    if (!spreadsheet && (!file || !signature(file.buffer, file.mimetype)))
      fail(400, "Choose a valid JPG, PNG or WebP file, maximum 5 MB.");
    const disk = fs.statfsSync(media);
    if (disk.bavail * disk.bsize < file.size + 100 * 1024 * 1024)
      fail(507, "Platform disk is nearly full. Ask the platform owner for capacity.");
    const id = crypto.randomUUID(), name = id + (spreadsheet ? "." + spreadsheet.extension : { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" }[file.mimetype]);
    db.transaction(() => {
      const fresh = db.prepare("SELECT * FROM platform_shops WHERE id=?").get(shop.id), l = model.permissions(db, fresh);
      replaced = replaceSpreadsheets ? db.prepare("SELECT id,shop_id,filename,bytes FROM platform_files WHERE shop_id=? AND kind='spreadsheet'").all(shop.id) : [];
      const replacedBytes = replaced.reduce((total, item) => total + Number(item.bytes || 0), 0);
      if (!l.permissions.uploads || l.usedBytes - replacedBytes + file.size > l.storageLimit) fail(413, "Shop storage limit reached. Ask the platform owner for more storage; no existing files were deleted.");
      db.prepare("INSERT INTO platform_files(id,shop_id,kind,mime,bytes,filename,display_name) VALUES(?,?,?,?,?,?,?)").run(id, shop.id, kind, spreadsheet?.mime || file.mimetype, file.size, name, spreadsheet?.displayName || "");
    }).immediate();
    const dir = path.join(media, String(shop.id));
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(path.join(dir, name), file.buffer, { flag: "wx", mode: 0o600 });
      db.prepare("UPDATE platform_files SET ready=1 WHERE id=?").run(id);
      if (kind === "image") drive?.photoSaved();
      for (const old of replaced) {
        fs.rmSync(path.join(media, String(shop.id), old.filename), { force: true });
        db.prepare("DELETE FROM platform_files WHERE id=? AND shop_id=? AND kind='spreadsheet'").run(old.id, shop.id);
      }
    } catch (e) { db.prepare("DELETE FROM platform_files WHERE id=? AND shop_id=?").run(id, shop.id); throw e; }
    return id;
  }
  function discard(id) {
    const f = db.prepare("SELECT * FROM platform_files WHERE id=?").get(id);
    if (!f) return;
    fs.rmSync(path.join(media, String(f.shop_id), f.filename), { force: true });
    fs.rmSync(variantPath(path.join(media, String(f.shop_id), f.filename)), { force: true });
    db.prepare("DELETE FROM platform_files WHERE id=?").run(id);
  }
  function multipart(req, res, next) {
    upload(req, res, (e) =>
      e
        ? res
            .status(400)
            .json({ error: "Upload failed. Use one JPG/PNG/WebP up to 5 MB." })
        : next(),
    );
  }
  // Excel auto upload from the shop's own Windows PC (no browser, no login): the PC program sends
  // the shop's secret upload key. Only a hash of the key is stored; a new key replaces the old one.
  const keyHash = key => crypto.createHash("sha256").update(String(key)).digest("hex");
  function shopForKey(req) {
    const key = String(req.get("x-upload-key") || "");
    if (!/^ghk_[a-f0-9]{48}$/.test(key)) fail(401, "Upload key missing or wrong.");
    const row = db.prepare("SELECT shop_id FROM platform_upload_keys WHERE key_hash=?").get(keyHash(key));
    const shop = row && db.prepare("SELECT * FROM platform_shops WHERE id=? AND legacy=0").get(row.shop_id);
    if (!shop) fail(401, "Upload key missing or wrong.");
    if (!model.permissions(db, shop).permissions.uploads) fail(403, "This shop or subscription does not allow uploads.");
    return shop;
  }
  router.post(
    "/spreadsheets/auto-upload",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }),
    (req, res, next) => { try { req.autoUploadShop = shopForKey(req); next(); } catch (error) { next(error); } },
    spreadsheetMultipart,
    wrap((req, res) => {
      const shop = req.autoUploadShop, id = saveFile(shop, req.file, "spreadsheet", { replaceSpreadsheets: true });
      db.prepare("UPDATE platform_upload_keys SET last_used_at=CURRENT_TIMESTAMP WHERE shop_id=?").run(shop.id);
      res.status(201).json({ id });
    }),
  );
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store, private");
    next();
  });
  router.use((req, res, next) => {
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) &&
      !validToken(req.session.csrfToken, req.get("x-csrf-token"))
    )
      return res
        .status(403)
        .json({ error: "Reload the page: security token missing or expired." });
    next();
  });
  router.get(
    "/me",
    wrap((req, res) => {
      let u;
      try {
        u = user(req);
      } catch (e) {
        if (e.status !== 401) throw e;
      }
      const shop = u
        ? db.prepare("SELECT * FROM platform_shops WHERE owner_id=?").get(u.id)
        : null;
      res.json({
        user: u ? { id: u.id, email: u.email, name: u.name } : null,
        isOwner: model.isOwner(db, u, ownerEmail),
        application: u
          ? db
              .prepare("SELECT * FROM platform_applications WHERE user_id=?")
              .get(u.id) || null
          : null,
        shop: shop
          ? {
              ...shop,
              settings: JSON.parse(shop.settings),
              limits: model.permissions(db, shop),
            }
          : null,
        csrfToken: csrfToken(req),
        oauthReady,
        release: model.release(db),
      });
    }),
  );
  router.post(
    "/auth/start",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 15 }),
    wrap((req, res) => {
      if (!oauthReady)
        fail(503, "Google login needs platform owner OAuth configuration.");
      const state = crypto.randomBytes(32).toString("hex"),
        nonce = crypto.randomBytes(32).toString("hex");
      req.session.oauth = {
        state,
        nonce,
        expires: Date.now() + 10 * 60 * 1000,
      };
      const url = identityProvider?.authorizationUrl
        ? identityProvider.authorizationUrl(state)
        : google.generateAuthUrl({
            scope: ["openid", "email", "profile"],
            state,
            nonce,
            prompt: "select_account",
            access_type: "online",
          });
      req.session.save((e) =>
        e
          ? res.status(503).json({ error: "Login unavailable." })
          : res.json({ url }),
      );
    }),
  );
  router.get(
    "/auth/callback",
    wrap(async (req, res) => {
      const stored = req.session.oauth;
      delete req.session.oauth;
      if (
        !stored ||
        stored.expires < Date.now() ||
        !validToken(stored.state, req.query.state) ||
        !req.query.code
      )
        fail(400, "Google login expired or invalid. Try again.");
      // The owner connecting Google Drive comes back here too (same Google sign-in, Drive permission added).
      if (stored.drive) {
        owner(req);
        if (!drive) fail(503, "Google Drive backup is not available on this server.");
        const { tokens } = await google.getToken(String(req.query.code));
        const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
        drive.connect({ refreshToken: tokens.refresh_token, email: ticket.getPayload().email });
        await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
        return res.redirect("/platform.html?drive=connected#drive-settings");
      }
      await new Promise((resolve, reject) =>
        req.session.save((e) => (e ? reject(e) : resolve())),
      );
      let payload;
      if (identityProvider)
        payload = await identityProvider(req.query.code, stored.nonce);
      else {
        const { tokens } = await google.getToken(String(req.query.code));
        const ticket = await google.verifyIdToken({
          idToken: tokens.id_token,
          audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      }
      if (payload.nonce !== stored.nonce)
        fail(400, "Google login verification failed.");
      let u;
      try {
        u = model.identity(db, payload, ownerEmail);
      } catch {
        fail(400, "Use a verified Gmail or Google Workspace account.");
      }
      if (u.status !== "active") fail(403, "Account suspended.");
      await new Promise((resolve, reject) =>
        req.session.regenerate((e) => (e ? reject(e) : resolve())),
      );
      req.session.platformUser = u.id;
      await new Promise((resolve, reject) =>
        req.session.save((e) => (e ? reject(e) : resolve())),
      );
      const approved=db.prepare("SELECT slug FROM platform_shops WHERE owner_id=? AND legacy=0").get(u.id);
      res.redirect(approved && !model.isOwner(db,u,ownerEmail) ? '/shops/'+encodeURIComponent(approved.slug)+'/admin' : '/platform.html');
    }),
  );
  router.post(
    "/logout",
    wrap((req, res) => req.session.destroy(() => res.json({ ok: true }))),
  );
  router.post(
    "/applications",
    wrap((req, res) => {
      const u = user(req);
      if (
        db.prepare("SELECT id FROM platform_shops WHERE owner_id=?").get(u.id)
      )
        fail(409, "You already have a shop.");
      const name = text(req.body.name, 100);
      let slug = text(req.body.slug, 60).toLowerCase();
      if (!slug) slug = allocateSlug(db, name);
      if (
        !name ||
        !/^[a-z0-9][a-z0-9-]{2,49}$/.test(slug) ||
        ["gearhub", "admin", "api", "platform"].includes(slug)
      )
        fail(
          400,
          "Shop name and unique URL (3–50 lowercase letters/numbers/hyphens) required.",
        );
      let opened = null;
      db.transaction(() => {
        const current = db
          .prepare("SELECT status FROM platform_applications WHERE user_id=?")
          .get(u.id);
        if (current && current.status !== "rejected")
          fail(409, "Application already submitted.");
        db.prepare(
          "INSERT INTO platform_applications(user_id,name,slug,reason) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,slug=excluded.slug,reason=excluded.reason,status='pending',decision_note=''",
        ).run(u.id, name, slug, text(req.body.reason, 1000));
        // Open the shop at once while the owner's shop limit allows it.
        const limits = signup();
        if (db.prepare("SELECT status FROM platform_users WHERE id=?").get(u.id)?.status !== "active" || sellerShops() >= limits.maxShops) return;
        if (db.prepare("SELECT id FROM platform_shops WHERE slug=?").get(slug)) slug = allocateSlug(db, name);
        const openedAt = new Date().toISOString();
        db.prepare(
          "INSERT INTO platform_shops(owner_id,slug,name,plan_id,subscription_status,starts_at,ends_at,storage_override) VALUES(?,?,?,1,'trial',?,?,?)",
        ).run(u.id, slug, name, openedAt, model.addCalendarMonths(openedAt, 2), limits.storageMb * 1024 * 1024);
        db.prepare("UPDATE platform_applications SET slug=?,status='approved',decision_note='Opened automatically' WHERE user_id=?").run(slug, u.id);
        opened = slug;
      }).immediate();
      // Tell GearHub straight away; email trouble never blocks the applicant.
      Promise.resolve()
        .then(() => notifyApplication?.({ name, slug, email: u.email, reason: text(req.body.reason, 1000), origin, opened: Boolean(opened) }))
        .catch(() => {});
      res.status(201).json({ ok: true, status: opened ? "approved" : "pending", slug: opened });
    }),
  );
  router.get(
    "/owner",
    wrap((req, res) => {
      owner(req);
      res.json({
        users: db
          .prepare("SELECT id,email,name,status FROM platform_users")
          .all(),
        applications: db
          .prepare(
            "SELECT a.*,u.email FROM platform_applications a JOIN platform_users u ON u.id=a.user_id",
          )
          .all(),
        shops: db
          .prepare("SELECT * FROM platform_shops")
          .all()
          .map((s) => ({
            ...s,
            settings: JSON.parse(s.settings),
            limits: model.permissions(db, s),
          })),
        plans: db
          .prepare("SELECT * FROM platform_plans")
          .all()
          .map((p) => ({ ...p, permissions: JSON.parse(p.permissions) })),
        release: model.release(db),
        payments: db
          .prepare("SELECT * FROM platform_payments ORDER BY paid_at DESC,id DESC LIMIT 1000")
          .all(),
        paymentMethods: PAYMENT_METHODS,
        policies: policies.load(db),
        splash: splash.load(db),
        scene: siteScene.load(db),
        drive: drive ? drive.status() : null,
        signup: { ...signup(), shops: sellerShops() },
      });
    }),
  );
  router.patch(
    "/owner/users/:id",
    wrap((req, res) => {
      const u = owner(req);
      if (
        Number(req.params.id) === u.id ||
        !["active", "suspended"].includes(req.body.status)
      )
        fail(
          400,
          "Invalid user status. Owner cannot suspend their own account.",
        );
      const r = db
        .prepare("UPDATE platform_users SET status=? WHERE id=?")
        .run(req.body.status, Number(req.params.id));
      if (!r.changes) fail(404, "User not found.");
      res.json({ ok: true });
    }),
  );
  router.patch(
    "/owner/applications/:id",
    wrap((req, res) => {
      owner(req);
      db.transaction(() => {
        const a = db
          .prepare("SELECT * FROM platform_applications WHERE id=?")
          .get(Number(req.params.id));
        if (!a) fail(404, "Application not found.");
        if (a.status === "approved" && req.body.status === "approved") return;
        if (a.status !== "pending") fail(409, "Pending application not found.");
        if (req.body.status === "approved") {
          if (
            db
              .prepare("SELECT status FROM platform_users WHERE id=?")
              .get(a.user_id)?.status !== "active"
          )
            fail(409, "Reactivate user first.");
          if (
            db.prepare("SELECT id FROM platform_shops WHERE slug=?").get(a.slug)
          )
            {
              a.slug = allocateSlug(db, a.name);
              db.prepare("UPDATE platform_applications SET slug=? WHERE id=?").run(a.slug,a.id);
            }
          const approvedAt=new Date().toISOString();
          db.prepare(
            "INSERT INTO platform_shops(owner_id,slug,name,plan_id,subscription_status,starts_at,ends_at,storage_override) VALUES(?,?,?,1,'trial',?,?,?)",
          ).run(a.user_id, a.slug, a.name, approvedAt, model.addCalendarMonths(approvedAt,2), signup().storageMb * 1024 * 1024);
        } else if (req.body.status !== "rejected")
          fail(400, "Choose approved or rejected.");
        db.prepare(
          "UPDATE platform_applications SET status=?,decision_note=? WHERE id=?",
        ).run(req.body.status, text(req.body.note, 500), a.id);
      }).immediate();
      res.json({ ok: true });
    }),
  );
  router.patch(
    "/owner/shops/:id",
    wrap((req, res) => {
      owner(req);
      const s = db
        .prepare("SELECT * FROM platform_shops WHERE id=? AND legacy=0")
        .get(Number(req.params.id));
      if (!s) fail(404, "Shop not found.");
      const status = req.body.status ?? s.status,
        subscription = req.body.subscriptionStatus ?? s.subscription_status,
        planId = req.body.planId ?? s.plan_id;
      const quota =
        req.body.storageBytes === null
          ? null
          : req.body.storageBytes === undefined
            ? s.storage_override
            : integer(req.body.storageBytes, 10 * 1024 ** 3);
      if (
        !["active", "suspended"].includes(status) ||
        !["active", "trial", "sponsored", "inactive", "expired"].includes(
          subscription,
        ) ||
        !db.prepare("SELECT id FROM platform_plans WHERE id=?").get(planId)
      )
        fail(400, "Invalid subscription or shop status.");
      const date = (v, old) =>
        v === undefined
          ? old
          : v === null || v === ""
            ? null
            : Number.isFinite(Date.parse(v))
              ? new Date(v).toISOString()
              : fail(400, "Invalid date.");
      const start = date(req.body.startsAt, s.starts_at),
        end = date(req.body.endsAt, s.ends_at);
      if (start && end && Date.parse(end) <= Date.parse(start))
        fail(400, "End must be after start.");
      db.prepare(
        "UPDATE platform_shops SET status=?,subscription_status=?,plan_id=?,storage_override=?,starts_at=?,ends_at=? WHERE id=?",
      ).run(status, subscription, planId, quota, start, end, s.id);
      res.json({ ok: true });
    }),
  );
  // Extends from the current expiry (or today when already expired). Call inside a transaction.
  function extendShop(shop,months){
    const now=new Date().toISOString(),base=shop.ends_at&&Date.parse(shop.ends_at)>Date.parse(now)?shop.ends_at:now;
    const end=model.addCalendarMonths(base,months),status=['inactive','expired'].includes(shop.subscription_status)?'trial':shop.subscription_status;
    db.prepare('UPDATE platform_shops SET starts_at=?,ends_at=?,subscription_status=? WHERE id=?').run(shop.starts_at||now,end,status,shop.id);
    return {startsAt:shop.starts_at||now,endsAt:end,status};
  }
  const ownerShop=id=>{const shop=db.prepare('SELECT * FROM platform_shops WHERE id=? AND legacy=0').get(Number(id));if(!shop)fail(404,'Shop not found.');return shop;};
  // GearHub owner edits the public policies page text (/policies.html).
  router.put('/owner/policies',wrap((req,res)=>{owner(req);try{res.json(policies.save(db,req.body||{}));}catch(e){fail(e.status||400,e.message);}}));
  // Opening screen of every seller shop: length (0-10 s, 0 = none), picture for PC and phone, sound.
  const splashUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:6*1024*1024,files:1,fields:5}}).single('file');
  // Google Drive backup (owner): connect once with Google (Drive permission for the app's own files only),
  // copy photos now, or disconnect (files already in Drive stay there).
  router.post('/owner/drive/connect',wrap((req,res)=>{
    owner(req);
    if(!drive?.configured()||identityProvider)fail(503,"Google sign-in is not set up on this server.");
    const state=crypto.randomBytes(32).toString("hex");
    req.session.oauth={state,drive:true,expires:Date.now()+10*60*1000};
    const url=google.generateAuthUrl({scope:["openid","email",drive.SCOPE],state,access_type:"offline",prompt:"consent",include_granted_scopes:true});
    req.session.save(e=>e?res.status(503).json({error:"Could not start Google sign-in."}):res.json({url}));
  }));
  router.post('/owner/drive/sync',wrap((req,res)=>{owner(req);if(!drive?.connected())fail(409,"Connect Google Drive first.");drive.sweep();res.json({ok:true,drive:drive.status()});}));
  router.post('/owner/drive/disconnect',wrap((req,res)=>{owner(req);drive?.disconnect();res.json({ok:true,drive:drive?drive.status():null});}));
  router.put('/owner/signup',wrap((req,res)=>{
    owner(req);
    const maxShops=Number(req.body.maxShops),storageMb=Number(req.body.storageMb);
    if(!Number.isInteger(maxShops)||maxShops<0||maxShops>10000)fail(400,"Shop limit must be a whole number from 0 to 10000.");
    if(!Number.isInteger(storageMb)||storageMb<1||storageMb>10240)fail(400,"Storage must be a whole number of MB from 1 to 10240 (10 GB).");
    db.prepare("INSERT INTO platform_signup(id,max_shops,storage_mb) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET max_shops=excluded.max_shops,storage_mb=excluded.storage_mb").run(maxShops,storageMb);
    res.json({ok:true,signup:{...signup(),shops:sellerShops()}});
  }));
  router.put('/owner/splash',wrap((req,res)=>{owner(req);const current=splash.load(db);res.json(splash.save(db,{...current,seconds:splash.secondsOf(req.body?.seconds)}));}));
  router.post('/owner/splash/:kind',(req,res,next)=>{try{owner(req);next();}catch(e){next(e);}},(req,res,next)=>splashUpload(req,res,e=>e?res.status(400).json({error:'Upload failed. A picture or a sound up to 6 MB.'}):next()),
   wrap(async(req,res)=>{if(!req.file)fail(400,'Choose a file first.');res.json(await splash.saveFile(db,dataDir,req.params.kind,req.file.buffer));}));
  router.delete('/owner/splash/:kind',wrap((req,res)=>{owner(req);res.json(splash.reset(db,dataDir,req.params.kind));}));
  // skyshopmm.com background: a picture (JPG/PNG/WebP) and an optional moving SVG layer on top.
  const sceneUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:1,fields:5}}).single('file');
  router.post('/owner/scene/:kind',(req,res,next)=>{try{owner(req);next();}catch(e){next(e);}},(req,res,next)=>sceneUpload(req,res,e=>e?res.status(400).json({error:'Upload failed. A picture up to 12 MB or an SVG up to 1.5 MB.'}):next()),
   wrap(async(req,res)=>{if(!req.file)fail(400,'Choose a file first.');res.json(await siteScene.saveFile(db,dataDir,req.params.kind,req.file.buffer));}));
  router.delete('/owner/scene/:kind',wrap((req,res)=>{owner(req);res.json(siteScene.reset(db,dataDir,req.params.kind));}));
  router.post('/owner/shops/:id/extend',wrap((req,res)=>{
    owner(req);const months=integer(req.body.months??2,24);if(months<1)fail(400,'Choose 1–24 calendar months.');
    let updated;db.transaction(()=>{updated=extendShop(ownerShop(req.params.id),months);}).immediate();res.json(updated);
  }));
  router.post('/owner/shops/:id/payments',wrap((req,res)=>{
    owner(req);const b=req.body||{};
    const amount=integer(b.amount,1e10),months=integer(b.months??0,24);
    if(!PAYMENT_METHODS.includes(b.method))fail(400,'Choose how the shop paid.');
    const note=String(b.note??'').replace(/[\r\n\t]+/g,' ').trim().slice(0,200);
    let paidAt=new Date().toISOString();
    if(b.paidAt!=null&&b.paidAt!==''){const t=Date.parse(b.paidAt);if(Number.isNaN(t)||t>Date.now()+86400000)fail(400,'Enter a valid payment date.');paidAt=new Date(t).toISOString();}
    let result;db.transaction(()=>{
      const shop=ownerShop(req.params.id),now=new Date().toISOString();
      const id=db.prepare('INSERT INTO platform_payments(shop_id,amount,months,method,note,paid_at,created_at) VALUES(?,?,?,?,?,?,?)').run(shop.id,amount,months,b.method,note,paidAt,now).lastInsertRowid;
      result={payment:db.prepare('SELECT * FROM platform_payments WHERE id=?').get(id),...(months?extendShop(shop,months):{})};
    }).immediate();
    res.status(201).json(result);
  }));
  router.delete('/owner/payments/:id',wrap((req,res)=>{
    owner(req);const r=db.prepare('DELETE FROM platform_payments WHERE id=?').run(Number(req.params.id));
    if(!r.changes)fail(404,'Payment not found.');res.json({ok:true});
  }));
  router.delete('/owner/shops/:id',wrap((req,res)=>{
    owner(req);
    const id=Number(req.params.id),shop=db.prepare('SELECT * FROM platform_shops WHERE id=? AND legacy=0').get(id);
    if(!shop)fail(404,'Shop not found.');
    if(req.body?.confirmDelete!==shop.slug)fail(400,'Type the exact shop URL before deleting.');
    const directory=path.join(media,String(shop.id));
    db.transaction(()=>{
      db.prepare('DELETE FROM platform_payments WHERE shop_id=?').run(shop.id);
      db.prepare('DELETE FROM platform_orders WHERE shop_id=?').run(shop.id);
      db.prepare('DELETE FROM platform_products WHERE shop_id=?').run(shop.id);
      db.prepare('DELETE FROM platform_files WHERE shop_id=?').run(shop.id);
      // The Excel auto-upload key points at the shop, so it must go first (it blocked deleting a shop that used it).
      db.prepare('DELETE FROM platform_upload_keys WHERE shop_id=?').run(shop.id);
      if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_drive_photos'").get())db.prepare('DELETE FROM platform_drive_photos WHERE shop_id=?').run(shop.id);
      db.prepare('DELETE FROM platform_shops WHERE id=?').run(shop.id);
      db.prepare("UPDATE platform_applications SET status='rejected',decision_note='Removed by platform owner.' WHERE user_id=?").run(shop.owner_id);
    }).immediate();
    fs.rmSync(directory,{recursive:true,force:true});
    res.json({ok:true});
  }));
  router.post(
    "/owner/plans",
    wrap((req, res) => {
      owner(req);
      const p = req.body,
        name = text(p.name, 80);
      if (!name) fail(400, "Plan name required.");
      const perms = Object.fromEntries(
        Object.keys(model.DEFAULT_PERMISSIONS).map((k) => [
          k,
          p.permissions?.[k] === true,
        ]),
      );
      const id = db
        .prepare(
          "INSERT INTO platform_plans(name,storage_bytes,product_limit,permissions) VALUES(?,?,?,?)",
        )
        .run(
          name,
          integer(p.storageBytes, 10 * 1024 ** 3),
          p.productLimit === undefined ? 100000 : integer(p.productLimit, 100000),
          JSON.stringify(perms),
        ).lastInsertRowid;
      res.status(201).json({ id });
    }),
  );
  router.patch(
    "/owner/plans/:id",
    wrap((req, res) => {
      owner(req);
      const p = req.body;
      if (!text(p.name, 80)) fail(400, "Plan name required.");
      const perms = Object.fromEntries(
        Object.keys(model.DEFAULT_PERMISSIONS).map((k) => [
          k,
          p.permissions?.[k] === true,
        ]),
      );
      if (
        !db
          .prepare(
            "UPDATE platform_plans SET name=?,storage_bytes=?,product_limit=COALESCE(?,product_limit),permissions=? WHERE id=?",
          )
          .run(
            text(p.name, 80),
            integer(p.storageBytes, 10 * 1024 ** 3),
            p.productLimit === undefined ? null : integer(p.productLimit, 100000),
            JSON.stringify(perms),
            Number(req.params.id),
          ).changes
      )
        fail(404, "Plan not found.");
      res.json({ ok: true });
    }),
  );
  router.post(
    "/owner/release",
    wrap((req, res) => {
      owner(req);
      if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(req.body.version || ""))
        fail(400, "Use a version like 1.2.0.");
      if(req.body.version!==require('./app-release').deployedVersion)fail(409,'Announce only the currently deployed app version. Deploy reviewed code first.');
      const v = {
        version: req.body.version,
        notes: text(req.body.notes, 500),
        publishedAt: new Date().toISOString(),
      };
      db.prepare(
        "INSERT INTO platform_meta(key,value) VALUES('release',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      ).run(JSON.stringify(v));
      res.json(v);
    }),
  );
  require("./tenant-admin").install({router, db, shopFor, asset, wrap, fail, text});
  // Order alerts for the signed-in shop owner's phone (scope "shop:<id>", never shared between shops).
  if (orderPush) {
    router.get("/shops/:id/push", wrap((req, res) => { const { shop } = shopFor(req); res.json({ publicKey: orderPush.publicKey(), count: orderPush.count("shop:" + shop.id), subscribed: orderPush.has("shop:" + shop.id, req.query.endpoint), last: orderPush.lastResult("shop:" + shop.id) }); }));
    router.post("/shops/:id/push/subscribe", wrap((req, res) => { const { shop } = shopFor(req); orderPush.subscribe("shop:" + shop.id, req.body?.subscription); res.json({ ok: true, count: orderPush.count("shop:" + shop.id) }); }));
    router.post("/shops/:id/push/unsubscribe", wrap((req, res) => { const { shop } = shopFor(req); orderPush.unsubscribe("shop:" + shop.id, req.body?.endpoint); res.json({ ok: true, count: orderPush.count("shop:" + shop.id) }); }));
    router.post("/shops/:id/push/test", wrap(async (req, res) => { const { shop } = shopFor(req); res.json({ sent: await orderPush.notify("shop:" + shop.id, { title: "🔔 Test · " + shop.name, body: "Order alerts work on this phone / ဒီဖုန်းမှာ အော်ဒါသတိပေးချက် ရပါပြီ", url: "/shops/" + shop.slug + "/admin#orders-content", tag: "order-test-" + Date.now(), kind: "test", icon: "/shops/" + shop.slug + "/app-icon-192.png" }) }); }));
  }
  router.get(
    "/shops/:id",
    wrap((req, res) => {
      const { shop, limits } = shopFor(req);
      res.json({
        ...shop,
        settings: JSON.parse(shop.settings),
        limits,
        products: db
          .prepare(
            "SELECT * FROM platform_products WHERE shop_id=? ORDER BY id DESC",
          )
          .all(shop.id),
        orders: db
          .prepare(
            "SELECT * FROM platform_orders WHERE shop_id=? ORDER BY id DESC",
          )
          .all(shop.id)
          .map((o) => ({ ...o, items: JSON.parse(o.items) })),
        files: db
          .prepare(
            "SELECT id,kind,bytes,ready FROM platform_files WHERE shop_id=?",
          )
          .all(shop.id),
      });
    }),
  );
  router.patch(
    "/shops/:id",
    wrap((req, res) => {
      const { shop } = shopFor(req, "products");
      const allowed = [
        "description",
        "phone",
        "email",
        "address",
        "bankName",
        "bankAccountName",
        "bankAccountNumber",
        "paymentInstructions",
        "logoId",
      ];
      const settings = JSON.parse(shop.settings);
      for (const key of allowed)
        if (req.body[key] !== undefined)
          settings[key] = text(
            req.body[key],
            key === "description" || key === "paymentInstructions" ? 1000 : 200,
          );
      if (settings.logoId) asset(shop, settings.logoId, "image");
      const name = text(req.body.name, 100) || shop.name;
      db.prepare("UPDATE platform_shops SET name=?,settings=? WHERE id=?").run(
        name,
        JSON.stringify(settings),
        shop.id,
      );
      res.json({ ok: true });
    }),
  );
  router.post(
    "/shops/:id/files",
    (req, res, next) => {
      try {
        shopFor(req, "uploads");
        next();
      } catch (e) {
        next(e);
      }
    },
    multipart,
    wrap((req, res) => {
      const { shop } = shopFor(req, "uploads");
      res.status(201).json({ id: saveFile(shop, req.file, "image") });
    }),
  );
  router.delete(
    "/shops/:id/files/:file",
    wrap((req, res) => {
      const { shop } = shopFor(req);
      const f = asset(shop, req.params.file, "image");
      const used =
        db
          .prepare(
            "SELECT COUNT(*) n FROM platform_products WHERE shop_id=? AND image_id=?",
          )
          .get(shop.id, f.id).n || JSON.parse(shop.settings).logoId === f.id ||
        db.prepare("SELECT details FROM platform_products WHERE shop_id=?").all(shop.id).some(p=>JSON.parse(p.details||'{}').imageIds?.includes(f.id)) ||
        JSON.stringify(JSON.parse(shop.settings).appearance||{}).includes('/api/platform/images/'+f.id);
      if (used) fail(409, "Remove this image from products/logo first.");
      discard(f.id);
      res.json({ ok: true });
    }),
  );
  router.post(
    "/shops/:id/spreadsheets",
    (req, res, next) => { try { shopFor(req, "uploads"); next(); } catch (error) { next(error); } },
    spreadsheetMultipart,
    wrap((req, res) => { const { shop } = shopFor(req, "uploads"); res.status(201).json({ id: saveFile(shop, req.file, "spreadsheet", { replaceSpreadsheets: true }) }); }),
  );
  // The shop owner (or the platform owner) makes the upload key for the Windows program. It is shown
  // only once; making a new one stops the old program.
  router.get("/shops/:id/upload-key", wrap((req, res) => { const { shop } = shopFor(req, "uploads"); const row = db.prepare("SELECT created_at,last_used_at FROM platform_upload_keys WHERE shop_id=?").get(shop.id); res.json({ exists: Boolean(row), createdAt: row?.created_at || null, lastUsedAt: row?.last_used_at || null }); }));
  router.post("/shops/:id/upload-key", wrap((req, res) => { const { shop } = shopFor(req, "uploads"); const key = "ghk_" + crypto.randomBytes(24).toString("hex"); db.prepare("INSERT INTO platform_upload_keys(shop_id,key_hash) VALUES(?,?) ON CONFLICT(shop_id) DO UPDATE SET key_hash=excluded.key_hash,created_at=CURRENT_TIMESTAMP,last_used_at=NULL").run(shop.id, keyHash(key)); res.status(201).json({ key, shop: { slug: shop.slug, name: shop.name } }); }));
  router.post("/shops/:id/spreadsheets/import",wrap((req,res)=>{const {shop,limits}=shopFor(req,"products"),rows=Array.isArray(req.body?.rows)?req.body.rows.slice(0,500):[];if(!rows.length)fail(400,"Choose rows to import.");const num=v=>{const n=Number(String(v??"").replace(/,/g,"").trim());return Number.isSafeInteger(n)&&n>=0?n:0};let created=0,updated=0,skipped=0;db.transaction(()=>{let active=db.prepare("SELECT COUNT(*) n FROM platform_products WHERE shop_id=? AND active=1").get(shop.id).n,find=db.prepare("SELECT * FROM platform_products WHERE shop_id=? AND sku=?"),add=db.prepare("INSERT INTO platform_products(sku,name,description,category,price,stock,active,image_id,details,shop_id) VALUES(?,?,?,?,?,?,1,NULL,'{}',?)"),change=db.prepare("UPDATE platform_products SET name=?,description=COALESCE(?,description),category=COALESCE(?,category),price=COALESCE(?,price),stock=COALESCE(?,stock),active=1 WHERE id=? AND shop_id=?");for(const raw of rows){const sku=text(raw?.sku,80),name=text(raw?.name,150);if(!sku||!name){skipped++;continue}// Only linked, non-empty cells change an existing product; an unlinked Stock column must
  // never reset stock to 0 or wipe a category.
  const given=k=>raw&&Object.prototype.hasOwnProperty.call(raw,k)&&String(raw[k]??"").trim()!=="";const values=[name,text(raw?.description,1000),text(raw?.category,100),num(raw?.price),num(raw?.stock)],existing=find.get(shop.id,sku);if(existing){change.run(name,given("description")?values[1]:null,given("category")?values[2]:null,given("price")?values[3]:null,given("stock")?values[4]:null,existing.id,shop.id);updated++;continue}if(active>=limits.productLimit)fail(403,"Plan product limit reached.");add.run(sku,...values,shop.id);active++;created++}})();res.json({created,updated,skipped});}));
  function product(req, res, edit) {
    const { shop, limits } = shopFor(req, "products"),
      b = req.body;
    const current = edit
      ? db
          .prepare("SELECT * FROM platform_products WHERE shop_id=? AND id=?")
          .get(shop.id, Number(req.params.product))
      : null;
    if (edit && !current) fail(404, "Product not found.");
    if(edit&&current.trashed_at)fail(409,"Restore the product from Trash before editing.");
    if (edit && b.expectedStock !== current.stock)
      fail(409, "Stock changed. Reload before saving.");
    if (
      (!edit || (current.active === 0 && b.active !== false)) &&
      db
        .prepare(
          "SELECT COUNT(*) n FROM platform_products WHERE shop_id=? AND active=1",
        )
        .get(shop.id).n >= limits.productLimit
    )
      fail(403, "Plan product limit reached.");
    const name = text(b.name, 150),
      sku = text(b.sku, 80);
    if (!name || !sku) fail(400, "Name and SKU required.");
    if (b.imageId) asset(shop, b.imageId, "image");
    const details=require('./tenant-admin').productDetails(b, current, shop, asset, fail, text);
    const args = [
      sku,
      name,
      text(b.description, 1000),
      text(b.category, 100),
      integer(b.price),
      integer(b.stock),
      b.active === false ? 0 : 1,
      b.imageId || null,
    ];
    if (edit)
      db.prepare(
        "UPDATE platform_products SET sku=?,name=?,description=?,category=?,price=?,stock=?,active=?,image_id=?,details=? WHERE shop_id=? AND id=?",
      ).run(...args, JSON.stringify(details), shop.id, current.id);
    else
      db.prepare(
        "INSERT INTO platform_products(sku,name,description,category,price,stock,active,image_id,details,shop_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
      ).run(...args, JSON.stringify(details), shop.id);
    // Its photos in Drive follow the product's category and name.
    drive?.photoSaved();
    res.json({ ok: true });
  }
  router.post(
    "/shops/:id/products",
    wrap((req, res) => product(req, res, false)),
  );
  router.patch(
    "/shops/:id/products/:product",
    wrap((req, res) => product(req, res, true)),
  );
  // Delete moves an order to "Deleted orders" (it can be restored); deleting it again from
  // there removes it and its receipt photo for good. Only the shop owner, only this shop.
  // An order that still holds stock (not cancelled, shipped or completed) returns it on delete.
  router.delete(
    "/shops/:id/orders/:order",
    wrap((req, res) => {
      const { shop } = shopFor(req, "orders");
      const o = db.prepare("SELECT id,status,items,details,receipt_id FROM platform_orders WHERE id=? AND shop_id=?").get(Number(req.params.order), shop.id);
      if (!o) fail(404, "Order not found.");
      if (o.status === "deleted") {
        db.prepare("DELETE FROM platform_orders WHERE id=? AND shop_id=?").run(o.id, shop.id);
        if (o.receipt_id) discard(o.receipt_id);
        return res.json({ ok: true, permanent: true });
      }
      db.transaction(() => {
        if (!["cancelled", "shipped", "completed"].includes(o.status))
          for (const i of JSON.parse(o.items || "[]"))
            db.prepare("UPDATE platform_products SET stock=stock+? WHERE id=? AND shop_id=? AND stock+?<=1000000000").run(i.quantity, i.productId, shop.id, i.quantity);
        db.prepare("UPDATE platform_orders SET status='deleted',details=? WHERE id=? AND shop_id=?").run(JSON.stringify({ ...JSON.parse(o.details || "{}"), deleted_from: o.status }), o.id, shop.id);
      }).immediate();
      res.json({ ok: true });
    }),
  );
  router.delete(
    "/shops/:id/trash",
    wrap((req, res) => {
      const { shop } = shopFor(req, "orders");
      const rows = db.prepare("SELECT id,receipt_id FROM platform_orders WHERE shop_id=? AND status='deleted'").all(shop.id);
      db.prepare("DELETE FROM platform_orders WHERE shop_id=? AND status='deleted'").run(shop.id);
      for (const r of rows) if (r.receipt_id) discard(r.receipt_id);
      res.json({ ok: true, deleted: rows.length });
    }),
  );
  router.patch(
    "/shops/:id/orders/:order",
    wrap((req, res) => {
      const { shop } = shopFor(req, "orders");
      db.transaction(() => {
        const o = db
          .prepare("SELECT * FROM platform_orders WHERE id=? AND shop_id=?")
          .get(Number(req.params.order), shop.id);
        if (!o) fail(404, "Order not found.");
        if (req.body.restore === true) {
          if (o.status !== "deleted") fail(409, "Only a deleted order can be restored.");
          const d = JSON.parse(o.details || "{}"), back = d.deleted_from || "pending";
          if (!["cancelled", "shipped", "completed"].includes(back))
            for (const i of JSON.parse(o.items || "[]"))
              if (!db.prepare("UPDATE platform_products SET stock=stock-? WHERE id=? AND shop_id=? AND active=1 AND stock>=?").run(i.quantity, i.productId, shop.id, i.quantity).changes)
                fail(409, "Not enough available stock to restore this order.");
          delete d.deleted_from;
          db.prepare("UPDATE platform_orders SET status=?,details=? WHERE id=? AND shop_id=?").run(back, JSON.stringify(d), o.id, shop.id);
          return;
        }
        if (o.status === "deleted") fail(409, "Restore this order first.");
        const { status, paymentStatus } = req.body;
        if (
          ![
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "completed",
            "cancelled",
          ].includes(status) ||
          !["pending", "paid", "rejected"].includes(paymentStatus)
        )
          fail(400, "Invalid status.");
        if (
          ["processing", "shipped", "completed"].includes(status) &&
          paymentStatus !== "paid"
        )
          fail(409, "Manually verify payment first.");
        if (
          (o.status === "completed" && status !== "completed") ||
          (o.status === "shipped" && !["shipped", "completed"].includes(status))
        )
          fail(409, "Handle shipped/completed returns separately.");
        for (const i of JSON.parse(o.items)) {
          if (status === "cancelled" && o.status !== "cancelled") {
            if (
              !db
                .prepare(
                  "UPDATE platform_products SET stock=stock+? WHERE id=? AND shop_id=? AND stock+?<=1000000000",
                )
                .run(i.quantity, i.productId, shop.id, i.quantity).changes
            )
              fail(409, "Stock cannot be restored.");
          } else if (o.status === "cancelled" && status !== "cancelled") {
            if (
              !db
                .prepare(
                  "UPDATE platform_products SET stock=stock-? WHERE id=? AND shop_id=? AND active=1 AND stock>=?",
                )
                .run(i.quantity, i.productId, shop.id, i.quantity).changes
            )
              fail(409, "Insufficient stock to reopen order.");
          }
        }
        db.prepare(
          "UPDATE platform_orders SET status=?,payment_status=?,invoice=?,details=? WHERE id=? AND shop_id=?",
        ).run(
          status,
          paymentStatus,
          o.invoice ||
            (status === "confirmed" ? "SHOP-" + shop.id + "-" + o.id : null),
          JSON.stringify({...JSON.parse(o.details||'{}'),admin_note:text(req.body.adminNote,1000),confirmation_date:/^\d{4}-\d{2}-\d{2}$/.test(req.body.confirmationDate||'')?req.body.confirmationDate:''}),
          o.id,
          shop.id,
        );
      }).immediate();
      res.json({ ok: true });
    }),
  );
  router.get(
    "/shops/:id/receipts/:file",
    wrap((req, res) => {
      const { shop } = shopFor(req);
      const f = asset(shop, req.params.file, "receipt");
      res.type(f.mime).sendFile(path.join(media, String(shop.id), f.filename));
    }),
  );
  router.get(
    "/store/:slug/spreadsheets",
    wrap((req, res) => {
      const shop = publicShop(req.params.slug);
      const files = db.prepare("SELECT id,display_name,filename,bytes FROM platform_files WHERE shop_id=? AND kind='spreadsheet' AND ready=1 ORDER BY rowid DESC LIMIT 1").all(shop.id)
        .map(file => ({ id: file.id, name: file.display_name || file.filename, bytes: file.bytes, url: "/api/platform/spreadsheets/" + file.id }));
      res.json({ files });
    }),
  );
  router.get(
    "/spreadsheets/:file",
    wrap((req, res) => {
      const file = db.prepare("SELECT * FROM platform_files WHERE id=? AND kind='spreadsheet' AND ready=1").get(req.params.file);
      if (!file) fail(404, "Spreadsheet not found.");
      const shop = db.prepare("SELECT * FROM platform_shops WHERE id=?").get(file.shop_id);
      publicShop(shop.slug);
      res.set("Cache-Control", "private, max-age=300");
      res.set("Content-Disposition", "inline; filename*=UTF-8''" + encodeURIComponent(file.display_name || file.filename));
      res.type(file.mime).sendFile(path.join(media, String(shop.id), file.filename));
    }),
  );
  router.get(
    "/store/:slug",
    wrap((req, res) => {
      if (req.params.slug === "gearhub")
        return res.json({ legacy: true, url: "/" });
      const s = publicShop(req.params.slug);
      const limits = model.permissions(db, s);
      res.json({
        id: s.id,
        name: s.name,
        slug: s.slug,
        settings: JSON.parse(s.settings),
        products: db
          .prepare(
            "SELECT * FROM platform_products WHERE shop_id=? AND active=1",
          )
          .all(s.id),
        // Owner-managed plan values shown in the shop app's Settings.
        service: {
          usedBytes: limits.usedBytes,
          storageLimit: limits.storageLimit,
          endsAt: s.ends_at,
          state: limits.subscriptionState,
        },
        release: model.release(db),
      });
    }),
  );
  router.get(
    "/images/:file",
    wrap(async (req, res) => {
      const f = db
        .prepare(
          "SELECT * FROM platform_files WHERE id=? AND kind='image' AND ready=1",
        )
        .get(req.params.file);
      if (!f) fail(404, "Image not found.");
      const s = db
        .prepare("SELECT * FROM platform_shops WHERE id=?")
        .get(f.shop_id);
      publicShop(s.slug);
      const original = path.join(media, String(s.id), f.filename);
      // Image ids are never reused, so browsers may cache them for a year.
      res.set("Cache-Control", IMMUTABLE);
      const variant = await optimizedImage(original, f);
      if (variant) return res.type("image/webp").sendFile(variant);
      res.type(f.mime).sendFile(original);
    }),
  );
  // Photo search (photo-scan.js in the shop): a camera frame or saved photo → the closest products.
  // Off with PHOTO_SEARCH=off (it keeps a 24 MB image model in memory, ~100 MB).
  const photoSearch = process.env.PHOTO_SEARCH === "off" ? null : createPhotoSearch({ db, media, log: (...a) => console.error(...a) });
  if (photoSearch && process.env.NODE_ENV !== "test") setTimeout(() => photoSearch.warm(), 20000).unref();
  router.post(
    "/store/:slug/photo-search",
    rateLimit({ windowMs: 60 * 1000, limit: 120 }),
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "4mb" }),
    wrap(async (req, res) => {
      const s = publicShop(req.params.slug);
      if (!photoSearch) fail(503, "Photo search is off.");
      if (!Buffer.isBuffer(req.body) || !req.body.length) fail(400, "Send a photo.");
      res.set("Cache-Control", "no-store");
      res.json(await photoSearch.search(s, req.body));
    }),
  );
  // Similar parts (free AI #6), shown under a product's photos in the shop.
  router.get(
    "/store/:slug/similar/:product",
    rateLimit({ windowMs: 60 * 1000, limit: 120 }),
    wrap(async (req, res) => {
      const s = publicShop(req.params.slug);
      if (!photoSearch) fail(503, "Photo AI is off.");
      res.set("Cache-Control", "public, max-age=120");
      res.json(await photoSearch.similar(s, Number(req.params.product)));
    }),
  );
  // Free AI in the shop admin (#2 category suggestion, #3 duplicate check, #4 photo quality): a product photo
  // being added → the category its look-alikes are in, the same part already in the shop, dark/blurred.
  router.post(
    "/shops/:id/ai/photo",
    rateLimit({ windowMs: 60 * 1000, limit: 60 }),
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "6mb" }),
    wrap(async (req, res) => {
      const { shop } = shopFor(req, "products");
      if (!photoSearch) fail(503, "Photo AI is off.");
      if (!Buffer.isBuffer(req.body) || !req.body.length) fail(400, "Send a photo.");
      res.set("Cache-Control", "no-store");
      res.json(await photoSearch.insight(shop, req.body, { exclude: req.query.product }));
    }),
  );
  router.post(
    "/store/:slug/orders",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }),
    multipart,
    wrap((req, res) => {
      const s = publicShop(req.params.slug),
        settings = JSON.parse(s.settings);
      if (
        !settings.bankName ||
        !settings.bankAccountName ||
        !settings.bankAccountNumber
      )
        fail(409, "This shop has not configured payment instructions.");
      const key = text(req.get("idempotency-key"), 100);
      if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
        fail(400, "Checkout retry key required.");
      let items;
      try {
        items = JSON.parse(req.body.items);
      } catch {
        fail(400, "Invalid cart.");
      }
      const customer = text(req.body.customer, 120),
        phone = text(req.body.phone, 40),
        address = text(req.body.address, 500),
        reference = text(req.body.paymentReference, 100);
      if (
        !customer ||
        !phone ||
        !address ||
        !Array.isArray(items) ||
        !items.length ||
        items.length > 50
      )
        fail(400, "Complete customer details and cart.");
      if (!req.file || !signature(req.file.buffer, req.file.mimetype))
        fail(400, "Valid payment receipt required.");
      const hash = model.hash(
        JSON.stringify({
          items,
          customer,
          phone,
          address,
          reference,
          receipt: model.hash(req.file.buffer),
        }),
      );
      const existing = db
        .prepare(
          "SELECT id,code,total,request_hash FROM platform_orders WHERE shop_id=? AND request_key=?",
        )
        .get(s.id, key);
      if (existing) {
        if (existing.request_hash !== hash)
          fail(409, "Retry key was used for a different order.");
        return res.json({
          id: existing.id,
          code: existing.code,
          total: existing.total,
          replayed: true,
        });
      }
      let receipt;
      try {
        receipt = saveFile(s, req.file, "receipt");
        const result = db
          .transaction(() => {
            const duplicate = db
              .prepare(
                "SELECT id FROM platform_orders WHERE shop_id=? AND request_key=?",
              )
              .get(s.id, key);
            if (duplicate)
              fail(409, "Checkout changed; retry the original request.");
            const qty = new Map();
            for (const i of items) {
              if (
                !Number.isSafeInteger(i.id) ||
                !Number.isSafeInteger(i.quantity) ||
                i.quantity < 1 ||
                i.quantity > 10000
              )
                fail(400, "Invalid item quantity.");
              qty.set(i.id, (qty.get(i.id) || 0) + i.quantity);
            }
            let total = 0;
            const lines = [];
            for (const [id, q] of qty) {
              const p = db
                .prepare(
                  "SELECT * FROM platform_products WHERE shop_id=? AND id=? AND active=1",
                )
                .get(s.id, id);
              if (!p || p.stock < q)
                fail(409, "A product is unavailable or out of stock.");
              // Customers pay the promotion price shown in the shop, if any.
              let promo = null;
              try { promo = JSON.parse(p.details || "{}").promotionPrice; } catch {}
              const unit = salePrice(p.price, promo);
              total += unit * q;
              if (!Number.isSafeInteger(total) || total > 1e12)
                fail(400, "Order total too large.");
              lines.push({
                productId: p.id,
                name: p.name,
                quantity: q,
                unitPrice: unit,
                ...(unit !== p.price ? { originalPrice: p.price } : {}),
                lineTotal: unit * q,
              });
              db.prepare(
                "UPDATE platform_products SET stock=stock-? WHERE shop_id=? AND id=?",
              ).run(q, s.id, p.id);
            }
            const code = "GH-" + crypto.randomUUID();
            const id = db
              .prepare(
                "INSERT INTO platform_orders(shop_id,code,customer,phone,address,items,total,receipt_id,payment_reference,request_key,request_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
              )
              .run(
                s.id,
                code,
                customer,
                phone,
                address,
                JSON.stringify(lines),
                total,
                receipt,
                reference,
                key,
                hash,
              ).lastInsertRowid;
            return { id, code, total };
          })
          .immediate();
        res.status(201).json(result);
        // The shop owner's phone hears the new order (only this shop's subscribers).
        orderPush?.notify("shop:" + s.id, { ...orderMessage({ ...result, customer, url: "/shops/" + s.slug + "/admin#orders-content" }), icon: "/shops/" + s.slug + "/app-icon-192.png" }).catch(() => {});
      } catch (e) {
        if (receipt) discard(receipt);
        throw e;
      }
    }),
  );
  router.use((err, _req, res, _next) => {
    const status =
      err.status ||
      ((err.code || "").startsWith("SQLITE_CONSTRAINT") ? 409 : 500);
    if (status === 500)
      console.error(
        JSON.stringify({ event: "platform_error", code: err.code || err.name }),
      );
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Platform temporarily unavailable."
            : status === 409 && !err.status
              ? "This value is already in use."
              : err.message,
      });
  });
  return router;
}
module.exports = { createPlatform };
