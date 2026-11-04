// 1.1.303 owner (Facebook profile picture): a shop profile shows real followers / following / posts, visitors
// follow a shop with Google sign-in, and the shop posts personal posts (photos + text) that appear only on its
// profile and in Discover, never among its products. Every query is scoped by shop_id.
const {validToken} = require('./security');
const parse = value => { try { const result = JSON.parse(value || '{}'); return result && typeof result === 'object' ? result : {}; } catch { return {}; } };
const fail = (status, message) => { const e = Error(message); e.status = status; throw e; };
const SLUG = /^[a-z0-9-]{1,80}$/;

function installShopProfile(router, {db, publicShop, user, isOwner = () => false}) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_shop_follows(shop_id INTEGER NOT NULL,user_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(shop_id,user_id));
CREATE INDEX IF NOT EXISTS platform_shop_follows_user ON platform_shop_follows(user_id);
CREATE TABLE IF NOT EXISTS platform_posts(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,body TEXT NOT NULL DEFAULT '',image_ids TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS platform_posts_shop ON platform_posts(shop_id,id);`);
  const signedIn = req => { try { return user(req); } catch { return null; } };
  const shopOf = slug => { if (!SLUG.test(String(slug))) fail(404, 'This shop is not available.'); const shop = publicShop(String(slug)); if (shop.status !== 'active') fail(404, 'This shop is not available.'); return shop; };
  const manages = (me, shop) => Boolean(me && (shop.owner_id === me.id || isOwner(me)));
  const readyImages = db.prepare("SELECT id FROM platform_files WHERE shop_id=? AND kind='image' AND ready=1");
  // The same shop card as the Discover feed (own logo only, never another shop's picture).
  function card(shop) {
    const settings = parse(shop.settings), appearance = settings.appearance || {}, owned = new Set(readyImages.all(shop.id).map(f => f.id));
    const logo = [appearance.appIconUrl, appearance.logoUrl, settings.logoId ? '/api/platform/images/' + settings.logoId : ''].find(url => { const id = typeof url === 'string' && /^\/api\/platform\/images\/([a-zA-Z0-9-]+)$/.exec(url)?.[1]; return id && owned.has(id); });
    return {card:{name:String(appearance.brandName || shop.name), slug:shop.slug, url:'/shops/' + encodeURIComponent(shop.slug) + '/', logo:logo || null}, owned};
  }
  function item(row, shop, info, me) {
    const images = (() => { try { const v = JSON.parse(row.image_ids); return Array.isArray(v) ? v : []; } catch { return []; } })().filter(id => typeof id === 'string' && info.owned.has(id));
    return {kind:'post', id:'p' + row.id, postId:row.id, body:row.body, images:images.map(id => '/api/platform/images/' + encodeURIComponent(id)),
      postedAt:row.created_at.replace(' ', 'T') + 'Z', shop:info.card, canDelete:manages(me, shop),
      // 1.1.308: likes and comments like a product post (kept under the negative id).
      likes:db.prepare('SELECT COUNT(*) n FROM platform_post_likes WHERE shop_id=? AND product_id=?').get(shop.id, -row.id).n,
      comments:db.prepare('SELECT COUNT(*) n FROM platform_post_comments WHERE shop_id=? AND product_id=?').get(shop.id, -row.id).n,
      liked:Boolean(me && db.prepare('SELECT 1 FROM platform_post_likes WHERE shop_id=? AND product_id=? AND user_id=?').get(shop.id, -row.id, me.id))};
  }
  const route = fn => (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (req.method !== 'GET' && !validToken(req.session.csrfToken, req.get('x-csrf-token'))) return res.status(403).json({error:'Reload the page: security token missing or expired.'});
      fn(req, res);
    } catch (error) { next(error); }
  };
  const followers = db.prepare('SELECT COUNT(*) n FROM platform_shop_follows WHERE shop_id=?');
  const following = db.prepare('SELECT COUNT(*) n FROM platform_shop_follows WHERE user_id=?');
  const follows = db.prepare('SELECT 1 FROM platform_shop_follows WHERE shop_id=? AND user_id=?');
  router.get('/profile/following', route((req, res) => {
    const me = signedIn(req);
    if (!me) return res.json({signedIn:false, slugs:[]});
    const slugs = db.prepare('SELECT s.slug FROM platform_shop_follows f JOIN platform_shops s ON s.id=f.shop_id WHERE f.user_id=? ORDER BY f.created_at DESC').all(me.id).map(r => r.slug);
    res.json({signedIn:true, slugs});
  }));
  // The shops this phone followed before signing in move to the account.
  router.post('/profile/following/import', route((req, res) => {
    const me = user(req), slugs = Array.isArray(req.body?.slugs) ? req.body.slugs.filter(s => typeof s === 'string' && SLUG.test(s)).slice(0, 100) : [];
    for (const slug of slugs) { try { const shop = shopOf(slug); if (shop.owner_id !== me.id) db.prepare('INSERT OR IGNORE INTO platform_shop_follows(shop_id,user_id) VALUES(?,?)').run(shop.id, me.id); } catch (error) { if (error.status !== 404) throw error; } }
    res.json({ok:true});
  }));
  router.get('/profile/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = signedIn(req), can = manages(me, shop);
    const products = db.prepare('SELECT COUNT(*) n FROM platform_products WHERE shop_id=? AND active=1 AND trashed_at IS NULL').get(shop.id).n;
    const posts = db.prepare('SELECT COUNT(*) n FROM platform_posts WHERE shop_id=?').get(shop.id).n;
    res.json({followers:followers.get(shop.id).n, following:shop.owner_id ? following.get(shop.owner_id).n : 0, posts:products + posts,
      followed:Boolean(me && follows.get(shop.id, me.id)), signedIn:Boolean(me), canPost:can, ...(can ? {shopId:shop.id} : {})});
  }));
  router.post('/profile/:slug/follow', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (shop.owner_id === me.id) fail(400, 'This is your own shop.');
    if (follows.get(shop.id, me.id)) db.prepare('DELETE FROM platform_shop_follows WHERE shop_id=? AND user_id=?').run(shop.id, me.id);
    else db.prepare('INSERT OR IGNORE INTO platform_shop_follows(shop_id,user_id) VALUES(?,?)').run(shop.id, me.id);
    res.json({followed:Boolean(follows.get(shop.id, me.id)), followers:followers.get(shop.id).n});
  }));
  // Personal posts, newest first: one shop (?shop=) or several (?shops=a,b), optional ?q= on the text.
  router.get('/posts', route((req, res) => {
    const raw = req.query.before;
    if (raw !== undefined && (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw))) fail(400, 'Invalid post cursor.');
    const before = raw === undefined ? Number.MAX_SAFE_INTEGER : Number(raw), limit = 10, me = signedIn(req);
    const list = typeof req.query.shop === 'string' ? [req.query.shop] : typeof req.query.shops === 'string' ? req.query.shops.split(',') : null;
    const only = list ? new Set(list.filter(s => SLUG.test(s)).slice(0, 100)) : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 80) : '';
    const like = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
    const rows = [];
    for (const row of db.prepare("SELECT slug FROM platform_shops WHERE legacy=0 AND status='active'").all()) {
      if (only && !only.has(row.slug)) continue;
      let shop; try { shop = publicShop(row.slug); } catch (error) { if (error.status === 404) continue; throw error; }
      const name = String(parse(shop.settings).appearance?.brandName || shop.name).toLowerCase(), search = q && !name.includes(q);
      const found = db.prepare('SELECT id,shop_id,body,image_ids,created_at FROM platform_posts WHERE shop_id=? AND id<?' + (search ? " AND lower(body) LIKE ? ESCAPE '\\'" : '') + ' ORDER BY id DESC LIMIT ?').all(...[shop.id, before, ...(search ? [like] : []), limit + 1]);
      for (const post of found) rows.push({post, shop});
    }
    rows.sort((a, b) => b.post.id - a.post.id);
    const page = rows.slice(0, limit), cards = new Map();
    const items = page.map(({post, shop}) => { if (!cards.has(shop.id)) cards.set(shop.id, card(shop)); return item(post, shop, cards.get(shop.id), me); });
    res.json({items, nextBefore:rows.length > limit ? String(page[page.length - 1].post.id) : null});
  }));
  router.post('/profile/:slug/posts', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can post here.');
    const body = typeof req.body?.body === 'string' ? req.body.body.replace(/\r\n?/g, '\n').trim() : '';
    const owned = new Set(readyImages.all(shop.id).map(f => f.id));
    const ids = Array.isArray(req.body?.imageIds) ? [...new Set(req.body.imageIds)].filter(id => typeof id === 'string' && owned.has(id)) : [];
    if (body.length > 3000) fail(400, 'Write up to 3000 letters.');
    if (ids.length > 10) fail(400, 'Choose up to 10 photos.');
    if (!body && !ids.length) fail(400, 'Write something or choose a photo.');
    const id = Number(db.prepare('INSERT INTO platform_posts(shop_id,body,image_ids) VALUES(?,?,?)').run(shop.id, body, JSON.stringify(ids)).lastInsertRowid);
    res.status(201).json({item:item(db.prepare('SELECT * FROM platform_posts WHERE shop_id=? AND id=?').get(shop.id, id), shop, card(shop), me)});
  }));
  router.delete('/profile/:slug/posts/:post', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can remove its posts.');
    const postId = Number(req.params.post) || -1, gone = db.prepare('DELETE FROM platform_posts WHERE shop_id=? AND id=?').run(shop.id, postId).changes;
    if (!gone) fail(404, 'Post not found.');
    db.prepare('DELETE FROM platform_post_likes WHERE shop_id=? AND product_id=?').run(shop.id, -postId);
    db.prepare('DELETE FROM platform_post_comments WHERE shop_id=? AND product_id=?').run(shop.id, -postId);
    res.json({ok:true});
  }));
}
module.exports = {installShopProfile};
