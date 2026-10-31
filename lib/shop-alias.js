// 1.1.239 owner: a shop's link must read like its name (POLESTAR → /shops/polestar/, not psm-test-shop).
// 1.1.240 owner: and when the name changes, the link follows. Only platform_shops.slug (and the owner's
// application slug) change; products, photos, files and orders belong to the shop id and are not touched.
// Every slug a shop had is kept in settings.formerSlugs, so old links and QR codes keep working: pages are
// sent on to the new link, and store API calls are answered as the shop's current slug.
const SLUG = /^[a-z0-9-]{1,60}$/, RESERVED = ["gearhub", "admin", "api", "platform", "shop"];
const base = name => String(name || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 35);
// The link a shop should have for its name; "" keeps the current one (name without Latin letters, or the
// link already matches the name, also "name-2" when the plain name was taken).
function slugFor(db, shop) {
  const want = base(shop.name);
  if (want.length < 3 || RESERVED.includes(want)) return "";
  if (shop.slug === want || new RegExp("^" + want + "-\\d+$").test(shop.slug)) return "";
  const taken = s => db.prepare("SELECT 1 FROM platform_shops WHERE slug=? AND id<>? UNION ALL SELECT 1 FROM platform_applications WHERE slug=? AND user_id IS NOT ? AND status IN ('pending','approved') LIMIT 1").get(s, shop.id, s, shop.owner_id);
  let slug = want, n = 2;
  while (taken(slug)) slug = want + "-" + n++;
  return slug === shop.slug ? "" : slug;
}
// Gives the shop the link that matches its name. Returns the new slug, or "" when nothing changed.
function syncSlug(db, id) {
  const shop = db.prepare("SELECT id,owner_id,slug,name,settings FROM platform_shops WHERE id=? AND legacy=0").get(id);
  if (!shop) return "";
  const to = slugFor(db, shop);
  if (!to) return "";
  let settings = {};
  try { settings = JSON.parse(shop.settings || "{}"); } catch { return ""; }
  settings.formerSlugs = [...new Set([...(Array.isArray(settings.formerSlugs) ? settings.formerSlugs : []), shop.slug])].filter(s => s !== to);
  db.transaction(() => {
    db.prepare("UPDATE platform_shops SET slug=?,settings=? WHERE id=?").run(to, JSON.stringify(settings), shop.id);
    if (shop.owner_id != null) db.prepare("UPDATE platform_applications SET slug=? WHERE user_id=? AND slug=?").run(to, shop.owner_id, shop.slug);
  })();
  return to;
}
// At start-up: every shop's link follows its name.
function syncAll(db) {
  for (const { id } of db.prepare("SELECT id FROM platform_shops WHERE legacy=0 ORDER BY id").all()) syncSlug(db, id);
}
// The shop's slug now, for a slug that belonged to it before; "" when the slug is current or unknown.
function currentSlug(db, slug) {
  if (!SLUG.test(slug)) return "";
  try {
    if (db.prepare("SELECT 1 FROM platform_shops WHERE slug=?").get(slug)) return "";
    for (const s of db.prepare("SELECT slug,settings FROM platform_shops WHERE legacy=0 AND settings LIKE ?").all('%"formerSlugs"%')) {
      try { if ((JSON.parse(s.settings).formerSlugs || []).includes(slug)) return s.slug; } catch {}
    }
  } catch {}
  return "";
}
// Mounted before the platform API and the shop pages.
function aliasMiddleware(db) {
  return (req, res, next) => {
    const page = req.path.match(/^\/shops\/([^/]+)(\/.*)?$/), api = req.path.match(/^\/api\/platform\/store\/([^/]+)(\/.*)?$/);
    const m = page || api;
    if (!m) return next();
    let slug = "";
    try { slug = decodeURIComponent(m[1]); } catch { return next(); }
    const to = currentSlug(db, slug);
    if (!to) return next();
    const q = req.originalUrl.indexOf("?"), query = q >= 0 ? req.originalUrl.slice(q) : "";
    if (page) {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      return res.redirect(302, "/shops/" + to + (m[2] || "/") + query);
    }
    req.url = "/api/platform/store/" + to + (m[2] || "") + query;
    next();
  };
}
// Kept for 1.1.239 callers.
const renameOnce = syncAll;
module.exports = { syncSlug, syncAll, renameOnce, slugFor, currentSlug, aliasMiddleware };
