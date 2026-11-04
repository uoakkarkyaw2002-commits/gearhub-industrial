// Public product discovery. Each seller is checked using the storefront's own
// visibility rules, and every product/image lookup stays scoped to that shop.
const {promotionPrice} = require('./promotion');
const visitorView = require('./visitor-view');
const {validToken} = require('./security');
const parse = value => { try { const result=JSON.parse(value || '{}'); return result && typeof result === 'object' ? result : {}; } catch { return {}; } };
// 1.1.296 owner: posts get likes and comments (Google sign-in only). Saved posts stay on the phone.
function installShopFeed(router, {db, publicShop, user = () => { const e = Error('Google login required.'); e.status = 401; throw e; }, isOwner = () => false}) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_post_likes(shop_id INTEGER NOT NULL,product_id INTEGER NOT NULL,user_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(product_id,user_id));
CREATE TABLE IF NOT EXISTS platform_post_comments(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,product_id INTEGER NOT NULL,user_id INTEGER NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS platform_post_comments_product ON platform_post_comments(shop_id,product_id);`);
  const likeCount = db.prepare('SELECT COUNT(*) n FROM platform_post_likes WHERE shop_id=? AND product_id=?');
  const commentCount = db.prepare('SELECT COUNT(*) n FROM platform_post_comments WHERE shop_id=? AND product_id=?');
  const likedBy = db.prepare('SELECT 1 FROM platform_post_likes WHERE shop_id=? AND product_id=? AND user_id=?');
  const signedIn = req => { try { return user(req); } catch { return null; } };
  const products = db.prepare('SELECT id,sku,name,description,category,price,stock,image_id,details FROM platform_products WHERE shop_id=? AND active=1 AND trashed_at IS NULL AND id<? ORDER BY id DESC LIMIT ?');
  const images = db.prepare("SELECT id FROM platform_files WHERE shop_id=? AND kind='image' AND ready=1");
  router.get('/feed', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const raw = req.query.before;
      if (raw !== undefined && (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)))) return res.status(400).json({error:'Invalid product cursor.'});
      const before = raw === undefined ? Number.MAX_SAFE_INTEGER : Number(raw), limit = 20;
      // 1.1.298 owner: search (shop name or product name / SKU), Trending (most liked and commented) and
      // Following (the shops this phone follows, sent as ?shops=a,b).
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 80) : '';
      const trending = req.query.mode === 'trending';
      const only = typeof req.query.shops === 'string' ? new Set(req.query.shops.split(',').filter(slug => /^[a-z0-9-]{1,80}$/.test(slug)).slice(0, 100)) : null;
      const like = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
      const candidates = [];
      for (const row of db.prepare("SELECT slug FROM platform_shops WHERE legacy=0 AND status='active'").all()) {
        if (only && !only.has(row.slug)) continue;
        let shop;
        try { shop = publicShop(row.slug); } catch (error) { if (error.status === 404) continue; throw error; }
        const settings = parse(shop.settings), name = String(settings.appearance?.brandName || shop.name).toLowerCase();
        const search = q && !name.includes(q), sku = visitorView.normalize(settings.visitorView).sku;
        if (!search && !trending) { for (const product of products.all(shop.id, before, limit + 1)) candidates.push({shop, product}); continue; }
        const sql = 'SELECT p.id,p.sku,p.name,p.description,p.category,p.price,p.stock,p.image_id,p.details,' +
          '(SELECT COUNT(*) FROM platform_post_likes l WHERE l.shop_id=p.shop_id AND l.product_id=p.id)+2*(SELECT COUNT(*) FROM platform_post_comments c WHERE c.shop_id=p.shop_id AND c.product_id=p.id) score ' +
          'FROM platform_products p WHERE p.shop_id=? AND p.active=1 AND p.trashed_at IS NULL' +
          (search ? " AND (lower(p.name) LIKE ? ESCAPE '\\'" + (sku ? " OR lower(p.sku) LIKE ? ESCAPE '\\'" : '') + ')' : '') +
          (trending ? ' ORDER BY score DESC, p.id DESC LIMIT ?' : ' AND p.id<? ORDER BY p.id DESC LIMIT ?');
        const args = [shop.id, ...(search ? (sku ? [like, like] : [like]) : []), ...(trending ? [] : [before]), limit + 1];
        for (const product of db.prepare(sql).all(...args)) if (!trending || product.score > 0) candidates.push({shop, product});
      }
      if (trending) candidates.sort((a, b) => b.product.score - a.product.score || b.product.id - a.product.id);
      else candidates.sort((a, b) => b.product.id - a.product.id);
      const selected = candidates.slice(0, limit), owned = new Map(), me = signedIn(req);
      const items = selected.map(({shop, product:row}) => {
        if (!owned.has(shop.id)) owned.set(shop.id, new Set(images.all(shop.id).map(file => file.id)));
        const settings = parse(shop.settings), view = visitorView.normalize(settings.visitorView), p = visitorView.forVisitor(row, view);
        const allowed = owned.get(shop.id), appearance = settings.appearance || {}, d = parse(p.details);
        const imageIds = [...new Set([p.image_id, ...(Array.isArray(d.imageIds) ? d.imageIds : [])])].filter(id => typeof id === 'string' && allowed.has(id)).slice(0, 200);
        const logo = [appearance.appIconUrl, appearance.logoUrl, settings.logoId ? '/api/platform/images/' + settings.logoId : ''].find(url => {
          const id = typeof url === 'string' && /^\/api\/platform\/images\/([a-zA-Z0-9-]+)$/.exec(url)?.[1];
          return id && allowed.has(id);
        });
        const promo = promotionPrice(p.price, d.promotionPrice);
        return {id:p.id, sku:p.sku || '', partNo:typeof d.partNo === 'string' ? d.partNo : '', name:p.name, nameMy:typeof d.nameMy === 'string' ? d.nameMy : '', description:p.description, category:p.category,
          price:promo ?? p.price, originalPrice:promo === null ? null : p.price, stock:p.stock,
          images:imageIds.map(id => '/api/platform/images/' + encodeURIComponent(id)),
          likes:likeCount.get(shop.id, p.id).n, comments:commentCount.get(shop.id, p.id).n, liked:Boolean(me && likedBy.get(shop.id, p.id, me.id)),
          shop:{name:String(appearance.brandName || shop.name), slug:shop.slug, url:'/shops/' + encodeURIComponent(shop.slug) + '/', logo:logo || null},
          ...(view.price ? {} : {price:null, originalPrice:null}), ...(view.stock ? {} : {stock:null})};
      });
      res.json({items, nextBefore:!trending && candidates.length > limit ? String(selected[selected.length - 1].product.id) : null});
    } catch (error) { next(error); }
  });
  // A post is a public product of a public, active shop.
  const product = db.prepare('SELECT id FROM platform_products WHERE shop_id=? AND id=? AND active=1 AND trashed_at IS NULL');
  function post(req) {
    const id = String(req.params.id);
    if (!/^[1-9]\d{0,15}$/.test(id)) { const e = Error('Post not found.'); e.status = 404; throw e; }
    const shop = publicShop(String(req.params.slug));
    if (shop.status !== 'active' || !product.get(shop.id, Number(id))) { const e = Error('Post not found.'); e.status = 404; throw e; }
    return {shop, id:Number(id)};
  }
  const route = fn => (req, res, next) => { res.set('Cache-Control', 'no-store'); try {
    if (req.method !== 'GET' && !validToken(req.session.csrfToken, req.get('x-csrf-token'))) return res.status(403).json({error:'Reload the page: security token missing or expired.'});
    fn(req, res); } catch (error) { next(error); } };
  router.post('/feed/:slug/:id/like', route((req, res) => {
    const {shop, id} = post(req), me = user(req);
    if (likedBy.get(shop.id, id, me.id)) db.prepare('DELETE FROM platform_post_likes WHERE shop_id=? AND product_id=? AND user_id=?').run(shop.id, id, me.id);
    else db.prepare('INSERT OR IGNORE INTO platform_post_likes(shop_id,product_id,user_id) VALUES(?,?,?)').run(shop.id, id, me.id);
    res.json({liked:Boolean(likedBy.get(shop.id, id, me.id)), likes:likeCount.get(shop.id, id).n});
  }));
  function comments(req, shop, id) {
    const me = signedIn(req), manager = me && (shop.owner_id === me.id || isOwner(me));
    const rows = db.prepare('SELECT c.id,c.body,c.created_at,c.user_id,u.name FROM platform_post_comments c JOIN platform_users u ON u.id=c.user_id WHERE c.shop_id=? AND c.product_id=? ORDER BY c.id ASC LIMIT 500').all(shop.id, id);
    return {signedIn:Boolean(me), count:commentCount.get(shop.id, id).n, comments:rows.map(r => ({id:r.id, name:String(r.name || 'Customer').slice(0, 80), body:r.body, at:r.created_at.replace(' ', 'T') + 'Z', mine:Boolean(me && r.user_id === me.id), canDelete:Boolean(me && (r.user_id === me.id || manager))}))};
  }
  router.get('/feed/:slug/:id/comments', route((req, res) => { const {shop, id} = post(req); res.json(comments(req, shop, id)); }));
  router.post('/feed/:slug/:id/comments', route((req, res) => {
    const {shop, id} = post(req), me = user(req);
    const body = typeof req.body?.body === 'string' ? req.body.body.replace(/\r\n?/g, '\n').trim() : '';
    if (!body || body.length > 1000) { const e = Error('Write a comment of up to 1000 letters.'); e.status = 400; throw e; }
    const last = db.prepare("SELECT 1 FROM platform_post_comments WHERE user_id=? AND created_at>datetime('now','-3 seconds')").get(me.id);
    if (last) { const e = Error('Please wait a moment before the next comment.'); e.status = 429; throw e; }
    db.prepare('INSERT INTO platform_post_comments(shop_id,product_id,user_id,body) VALUES(?,?,?,?)').run(shop.id, id, me.id, body);
    res.status(201).json(comments(req, shop, id));
  }));
  // The writer, the shop owner and the GearHub owner can remove a comment.
  router.delete('/feed/:slug/:id/comments/:comment', route((req, res) => {
    const {shop, id} = post(req), me = user(req);
    const row = db.prepare('SELECT user_id FROM platform_post_comments WHERE shop_id=? AND product_id=? AND id=?').get(shop.id, id, Number(req.params.comment) || -1);
    if (!row) { const e = Error('Comment not found.'); e.status = 404; throw e; }
    if (row.user_id !== me.id && shop.owner_id !== me.id && !isOwner(me)) { const e = Error('Only the writer or the shop can remove this comment.'); e.status = 403; throw e; }
    db.prepare('DELETE FROM platform_post_comments WHERE shop_id=? AND product_id=? AND id=?').run(shop.id, id, Number(req.params.comment));
    res.json(comments(req, shop, id));
  }));
}
module.exports = {installShopFeed};
