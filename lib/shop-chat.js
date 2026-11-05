// 1.1.314 owner: 💬 chat between a signed-in buyer and a shop, and 🔔 notifications for everyone.
// Two new tables (owner approved): platform_chats (one thread per buyer and shop) and platform_chat_messages.
// Notifications are not stored: they are read from orders, likes, comments, follows and chats as they happen.
// Every query is scoped by shop_id. Chat times keep milliseconds so a read mark and an answer in the same second
// are told apart.
const {validToken} = require('./security');
const fail = (status, message) => { const e = Error(message); e.status = status; throw e; };
const SLUG = /^[a-z0-9-]{1,80}$/;
const iso = v => String(v || '').replace(' ', 'T') + (String(v || '').endsWith('Z') ? '' : 'Z');
const parse = v => { try { const r = JSON.parse(v || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; } };

function installShopChat(router, {db, publicShop, user, isOwner = () => false, notify = () => {}}) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_chats(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,user_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,shop_read_at TEXT NOT NULL DEFAULT '',user_read_at TEXT NOT NULL DEFAULT '',UNIQUE(shop_id,user_id));
CREATE TABLE IF NOT EXISTS platform_chat_messages(id INTEGER PRIMARY KEY,chat_id INTEGER NOT NULL,shop_id INTEGER NOT NULL,from_shop INTEGER NOT NULL DEFAULT 0,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS platform_chat_messages_chat ON platform_chat_messages(shop_id,chat_id,id);`);
  const signedIn = req => { try { return user(req); } catch { return null; } };
  const shopOf = slug => { if (!SLUG.test(String(slug))) fail(404, 'This shop is not available.'); const s = publicShop(String(slug)); if (s.status !== 'active') fail(404, 'This shop is not available.'); return s; };
  const manages = (me, shop) => Boolean(me && (shop.owner_id === me.id || isOwner(me)));
  const shopName = shop => String(parse(shop.settings).appearance?.brandName || shop.name);
  const route = fn => (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (req.method !== 'GET' && !validToken(req.session.csrfToken, req.get('x-csrf-token'))) return res.status(403).json({error:'Reload the page: security token missing or expired.'});
      fn(req, res);
    } catch (error) { next(error); }
  };
  const text = body => {
    const t = typeof body === 'string' ? body.replace(/\r\n?/g, '\n').trim() : '';
    if (!t || t.length > 2000) fail(400, 'Write a message of up to 2000 letters.');
    return t;
  };
  const messages = (shop, chatId) => db.prepare('SELECT id,from_shop,body,created_at FROM platform_chat_messages WHERE shop_id=? AND chat_id=? ORDER BY id DESC LIMIT 300').all(shop.id, chatId).reverse()
    .map(m => ({id:m.id, fromShop:Boolean(m.from_shop), body:m.body, at:iso(m.created_at)}));
  const userName = id => String(db.prepare('SELECT name FROM platform_users WHERE id=?').get(id)?.name || 'Customer').slice(0, 80);
  // Buyer: their one thread with this shop. Shop (owner / GearHub owner): the list of threads.
  router.get('/chat/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (manages(me, shop)) {
      const rows = db.prepare(`SELECT c.id,c.user_id,c.updated_at,c.shop_read_at,(SELECT body FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) last,
        (SELECT COUNT(*) FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id AND m.from_shop=0 AND m.created_at>c.shop_read_at) unread FROM platform_chats c WHERE c.shop_id=? ORDER BY c.updated_at DESC LIMIT 200`).all(shop.id);
      return res.json({role:'shop', shop:shopName(shop), chats:rows.map(r => ({id:r.id, name:userName(r.user_id), last:String(r.last || '').slice(0, 120), at:iso(r.updated_at), unread:r.unread}))});
    }
    const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, me.id);
    if (chat) db.prepare("UPDATE platform_chats SET user_read_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?").run(shop.id, chat.id);
    res.json({role:'buyer', shop:shopName(shop), messages:chat ? messages(shop, chat.id) : []});
  }));
  router.post('/chat/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req), body = text(req.body?.body);
    if (shop.owner_id === me.id) fail(400, 'This is your own shop.');
    const last = db.prepare("SELECT 1 FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE c.user_id=? AND m.from_shop=0 AND m.created_at>datetime('now','-2 seconds')").get(me.id);
    if (last) fail(429, 'Please wait a moment before the next message.');
    db.prepare('INSERT OR IGNORE INTO platform_chats(shop_id,user_id) VALUES(?,?)').run(shop.id, me.id);
    const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, me.id);
    db.prepare("INSERT INTO platform_chat_messages(chat_id,shop_id,from_shop,body,created_at) VALUES(?,?,0,?,strftime('%Y-%m-%d %H:%M:%f','now'))").run(chat.id, shop.id, body);
    db.prepare("UPDATE platform_chats SET updated_at=strftime('%Y-%m-%d %H:%M:%f','now'),user_read_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?").run(shop.id, chat.id);
    notify(shop, {title:'💬 ' + userName(me.id), body:body.slice(0, 120), url:'/shops/' + shop.slug + '/?chat=1'});
    res.status(201).json({role:'buyer', shop:shopName(shop), messages:messages(shop, chat.id)});
  }));
  const thread = (req, shop) => {
    const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND id=?').get(shop.id, Number(req.params.chat) || -1);
    if (!chat) fail(404, 'Chat not found.');
    return chat;
  };
  router.get('/chat/:slug/:chat', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can open this chat.');
    const chat = thread(req, shop);
    db.prepare("UPDATE platform_chats SET shop_read_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?").run(shop.id, chat.id);
    res.json({role:'shop', name:userName(chat.user_id), messages:messages(shop, chat.id)});
  }));
  router.post('/chat/:slug/:chat', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can answer this chat.');
    const chat = thread(req, shop), body = text(req.body?.body);
    db.prepare("INSERT INTO platform_chat_messages(chat_id,shop_id,from_shop,body,created_at) VALUES(?,?,1,?,strftime('%Y-%m-%d %H:%M:%f','now'))").run(chat.id, shop.id, body);
    db.prepare("UPDATE platform_chats SET updated_at=strftime('%Y-%m-%d %H:%M:%f','now'),shop_read_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?").run(shop.id, chat.id);
    res.status(201).json({role:'shop', name:userName(chat.user_id), messages:messages(shop, chat.id)});
  }));
  // 🔔 What happened lately, newest first. The phone keeps when the list was last opened (for the red dot).
  router.get('/notifications/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = signedIn(req), items = [];
    if (!me) return res.json({signedIn:false, items:[]});
    const name = id => userName(id), product = id => id < 0 ? 'your post' : String(db.prepare('SELECT name FROM platform_products WHERE shop_id=? AND id=?').get(shop.id, id)?.name || 'a product');
    if (manages(me, shop)) {
      for (const o of db.prepare('SELECT code,customer,total,created_at FROM platform_orders WHERE shop_id=? ORDER BY id DESC LIMIT 20').all(shop.id))
        items.push({kind:'order', at:iso(o.created_at), text:'🛒 New order ' + o.code + ' · ' + o.customer + ' · ' + Number(o.total).toLocaleString('en-US') + ' Ks', url:'/shops/' + shop.slug + '/admin'});
      for (const l of db.prepare('SELECT product_id,user_id,created_at FROM platform_post_likes WHERE shop_id=? AND user_id<>? ORDER BY created_at DESC LIMIT 20').all(shop.id, me.id))
        items.push({kind:'like', at:iso(l.created_at), text:'❤️ ' + name(l.user_id) + ' liked ' + product(l.product_id), view:'shops'});
      for (const c of db.prepare('SELECT product_id,user_id,body,created_at FROM platform_post_comments WHERE shop_id=? AND user_id<>? ORDER BY id DESC LIMIT 20').all(shop.id, me.id))
        items.push({kind:'comment', at:iso(c.created_at), text:'💬 ' + name(c.user_id) + ' commented on ' + product(c.product_id) + ': ' + c.body.slice(0, 80), view:'shops'});
      for (const f of db.prepare('SELECT user_id,created_at FROM platform_shop_follows WHERE shop_id=? ORDER BY created_at DESC LIMIT 20').all(shop.id))
        items.push({kind:'follow', at:iso(f.created_at), text:'👥 ' + name(f.user_id) + ' started following you', view:'profile'});
      for (const m of db.prepare('SELECT c.user_id,m.body,m.created_at FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE m.shop_id=? AND m.from_shop=0 ORDER BY m.id DESC LIMIT 20').all(shop.id))
        items.push({kind:'chat', at:iso(m.created_at), text:'✉️ ' + name(m.user_id) + ': ' + m.body.slice(0, 80), chat:true});
    } else {
      // A buyer: answers from this shop in their chat, and new comments under posts they commented on.
      const chat = db.prepare('SELECT id FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, me.id);
      if (chat) for (const m of db.prepare('SELECT body,created_at FROM platform_chat_messages WHERE shop_id=? AND chat_id=? AND from_shop=1 ORDER BY id DESC LIMIT 20').all(shop.id, chat.id))
        items.push({kind:'chat', at:iso(m.created_at), text:'✉️ ' + shopName(shop) + ': ' + m.body.slice(0, 80), chat:true});
      for (const c of db.prepare(`SELECT c.product_id,c.user_id,c.body,c.created_at FROM platform_post_comments c WHERE c.shop_id=? AND c.user_id<>? AND EXISTS(SELECT 1 FROM platform_post_comments mine WHERE mine.shop_id=c.shop_id AND mine.product_id=c.product_id AND mine.user_id=? AND mine.id<c.id) ORDER BY c.id DESC LIMIT 20`).all(shop.id, me.id, me.id))
        items.push({kind:'reply', at:iso(c.created_at), text:'💬 ' + name(c.user_id) + ' answered on ' + product(c.product_id) + ': ' + c.body.slice(0, 80), view:'shops'});
    }
    items.sort((a, b) => b.at.localeCompare(a.at));
    const unreadChats = manages(me, shop)
      ? db.prepare('SELECT COUNT(*) n FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE m.shop_id=? AND m.from_shop=0 AND m.created_at>c.shop_read_at').get(shop.id).n
      : db.prepare('SELECT COUNT(*) n FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE m.shop_id=? AND c.user_id=? AND m.from_shop=1 AND m.created_at>c.user_read_at').get(shop.id, me.id).n;
    res.json({signedIn:true, manager:manages(me, shop), items:items.slice(0, 50), unreadChats});
  }));
}
module.exports = {installShopChat};
