// 1.1.239 owner: POLESTAR was opened as a test shop, so its link was /shops/psm-test-shop/. The owner wants
// the link to read like the shop: /shops/polestar/. The shop is renamed once at start-up (only its slug; its
// products, photos, files and orders are kept by shop id). Old slugs are remembered in settings.formerSlugs, so
// old links and QR codes still work: pages are sent on to the new link, and store API calls are answered as
// the shop's new slug.
const RENAMES = [["psm-test-shop", "polestar"]];
const SLUG = /^[a-z0-9-]{1,60}$/;
function renameOnce(db) {
  for (const [from, to] of RENAMES) {
    const shop = db.prepare("SELECT id,owner_id,settings FROM platform_shops WHERE slug=? AND legacy=0").get(from);
    if (!shop) continue;
    const taken = db.prepare("SELECT 1 FROM platform_shops WHERE slug=? UNION ALL SELECT 1 FROM platform_applications WHERE slug=? AND user_id IS NOT ? LIMIT 1").get(to, to, shop.owner_id);
    if (taken) continue;
    let settings = {};
    try { settings = JSON.parse(shop.settings || "{}"); } catch {}
    settings.formerSlugs = [...new Set([...(Array.isArray(settings.formerSlugs) ? settings.formerSlugs : []), from])];
    db.transaction(() => {
      db.prepare("UPDATE platform_shops SET slug=?,settings=? WHERE id=?").run(to, JSON.stringify(settings), shop.id);
      if (shop.owner_id != null) db.prepare("UPDATE platform_applications SET slug=? WHERE user_id=? AND slug=?").run(to, shop.owner_id, from);
    })();
  }
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
    const to = currentSlug(req.app.locals.db || db, decodeURIComponent(m[1]));
    if (!to) return next();
    const query = req.originalUrl.slice(req.originalUrl.indexOf("?") >= 0 ? req.originalUrl.indexOf("?") : req.originalUrl.length);
    if (page) {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      return res.redirect(302, "/shops/" + to + (m[2] || "/") + query);
    }
    req.url = "/api/platform/store/" + to + (m[2] || "") + query;
    next();
  };
}
module.exports = { renameOnce, currentSlug, aliasMiddleware, RENAMES };
