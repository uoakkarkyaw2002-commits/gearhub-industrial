// Public product discovery. Each seller is checked using the storefront's own
// visibility rules, and every product/image lookup stays scoped to that shop.
const {promotionPrice} = require('./promotion');
const parse = value => { try { const result=JSON.parse(value || '{}'); return result && typeof result === 'object' ? result : {}; } catch { return {}; } };
function installShopFeed(router, {db, publicShop}) {
  const products = db.prepare('SELECT id,sku,name,description,category,price,stock,image_id,details FROM platform_products WHERE shop_id=? AND active=1 AND trashed_at IS NULL AND id<? ORDER BY id DESC LIMIT ?');
  const images = db.prepare("SELECT id FROM platform_files WHERE shop_id=? AND kind='image' AND ready=1");
  router.get('/feed', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const raw = req.query.before;
      if (raw !== undefined && (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)))) return res.status(400).json({error:'Invalid product cursor.'});
      const before = raw === undefined ? Number.MAX_SAFE_INTEGER : Number(raw), limit = 20;
      const candidates = [];
      for (const row of db.prepare("SELECT slug FROM platform_shops WHERE legacy=0 AND status='active'").all()) {
        let shop;
        try { shop = publicShop(row.slug); } catch (error) { if (error.status === 404) continue; throw error; }
        for (const product of products.all(shop.id, before, limit + 1)) candidates.push({shop, product});
      }
      candidates.sort((a, b) => b.product.id - a.product.id);
      const selected = candidates.slice(0, limit), owned = new Map();
      const items = selected.map(({shop, product:p}) => {
        if (!owned.has(shop.id)) owned.set(shop.id, new Set(images.all(shop.id).map(file => file.id)));
        const allowed = owned.get(shop.id), settings = parse(shop.settings), appearance = settings.appearance || {}, d = parse(p.details);
        const imageIds = [...new Set([p.image_id, ...(Array.isArray(d.imageIds) ? d.imageIds : [])])].filter(id => typeof id === 'string' && allowed.has(id)).slice(0, 200);
        const logo = [appearance.appIconUrl, appearance.logoUrl, settings.logoId ? '/api/platform/images/' + settings.logoId : ''].find(url => {
          const id = typeof url === 'string' && /^\/api\/platform\/images\/([a-zA-Z0-9-]+)$/.exec(url)?.[1];
          return id && allowed.has(id);
        });
        const promo = promotionPrice(p.price, d.promotionPrice);
        return {id:p.id, name:p.name, nameMy:typeof d.nameMy === 'string' ? d.nameMy : '', description:p.description, category:p.category,
          price:promo ?? p.price, originalPrice:promo === null ? null : p.price, stock:p.stock,
          images:imageIds.map(id => '/api/platform/images/' + encodeURIComponent(id)),
          shop:{name:String(appearance.brandName || shop.name), url:'/shops/' + encodeURIComponent(shop.slug) + '/', logo:logo || null}};
      });
      res.json({items, nextBefore:candidates.length > limit ? String(selected[selected.length - 1].product.id) : null});
    } catch (error) { next(error); }
  });
}
module.exports = {installShopFeed};
