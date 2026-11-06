// 1.1.314 owner: 💬 chat between a signed-in buyer and a shop, and 🔔 notifications for everyone.
// Two new tables (owner approved): platform_chats (one thread per buyer and shop) and platform_chat_messages.
// Notifications are not stored: they are read from orders, likes, comments, follows and chats as they happen.
// Every query is scoped by shop_id. Chat times keep milliseconds so a read mark and an answer in the same second
// are told apart.
const express = require('express');
const {validToken} = require('./security');
const fail = (status, message) => { const e = Error(message); e.status = status; throw e; };
const SLUG = /^[a-z0-9-]{1,80}$/;
const iso = v => String(v || '').replace(' ', 'T') + (String(v || '').endsWith('Z') ? '' : 'Z');
const parse = v => { try { const r = JSON.parse(v || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; } };

function installShopChat(router, {db, publicShop, user, isOwner = () => false, notify = () => {}, userPush = null, native = null, owner = null, ownerAlerts = () => []}) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_chats(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,user_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,shop_read_at TEXT NOT NULL DEFAULT '',user_read_at TEXT NOT NULL DEFAULT '',UNIQUE(shop_id,user_id));
CREATE TABLE IF NOT EXISTS platform_chat_messages(id INTEGER PRIMARY KEY,chat_id INTEGER NOT NULL,shop_id INTEGER NOT NULL,from_shop INTEGER NOT NULL DEFAULT 0,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS platform_chat_messages_chat ON platform_chat_messages(shop_id,chat_id,id);
CREATE TABLE IF NOT EXISTS platform_user_data(user_id INTEGER NOT NULL,k TEXT NOT NULL,v TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,k));
CREATE TABLE IF NOT EXISTS platform_chat_voice(id INTEGER PRIMARY KEY,shop_id INTEGER NOT NULL,chat_id INTEGER NOT NULL,mime TEXT NOT NULL,secs INTEGER NOT NULL DEFAULT 0,data BLOB NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  // 1.1.341 owner: voice messages and stickers. kind is 'text' (default), 'voice' (voice_id → platform_chat_voice) or 'sticker'.
  const cols = db.prepare('PRAGMA table_info(platform_chat_messages)').all().map(c => c.name);
  if (!cols.includes('kind')) db.exec("ALTER TABLE platform_chat_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'");
  if (!cols.includes('voice_id')) db.exec('ALTER TABLE platform_chat_messages ADD COLUMN voice_id INTEGER');
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
  const messages = (shop, chatId) => db.prepare('SELECT m.id,m.from_shop,m.body,m.created_at,m.kind,m.voice_id,v.secs FROM platform_chat_messages m LEFT JOIN platform_chat_voice v ON v.id=m.voice_id AND v.shop_id=m.shop_id WHERE m.shop_id=? AND m.chat_id=? ORDER BY m.id DESC LIMIT 300').all(shop.id, chatId).reverse()
    .map(m => ({id:m.id, fromShop:Boolean(m.from_shop), body:m.body, at:iso(m.created_at), kind:m.kind || 'text', ...(m.kind === 'voice' ? {voice:m.voice_id, secs:m.secs || 0} : {})}));
  const STICKERS = ['👍','❤️','😂','😮','😢','🙏','👏','🔥','🎉','😍','😎','🤝','✅','🛒','📦','🚚'];
  const sniff = b => b.length > 12 && b.readUInt32BE(0) === 0x1A45DFA3 ? 'audio/webm' : b.length > 12 && b.toString('latin1', 4, 8) === 'ftyp' ? 'audio/mp4' : b.length > 4 && b.toString('latin1', 0, 4) === 'OggS' ? 'audio/ogg' : b.length > 3 && (b.toString('latin1', 0, 3) === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0)) ? 'audio/mpeg' : '';
  const rawAudio = express.raw({type: () => true, limit: '900kb'});
  const userName = id => String(db.prepare('SELECT name FROM platform_users WHERE id=?').get(id)?.name || 'Customer').slice(0, 80);
  // 1.1.319 owner: GearHub's own Home has 🔔 and 💬 too, for the GearHub owner — GearHub alerts (orders, new shops)
  // plus every shop's chats, answered as that shop. Registered before /chat/:slug so "owner" is never a shop link.
  const ownerChats = () => db.prepare(`SELECT c.id,c.shop_id,c.user_id,c.updated_at,s.slug,s.name shop_name,s.settings,(SELECT body FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) last,
      (SELECT COUNT(*) FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id AND m.from_shop=0 AND m.created_at>c.shop_read_at) unread
      FROM platform_chats c JOIN platform_shops s ON s.id=c.shop_id WHERE s.legacy=0 ORDER BY c.updated_at DESC LIMIT 300`).all();
  router.get('/owner/chats', route((req, res) => {
    if (!owner) fail(404, 'Not found.'); owner(req);
    res.json({role:'shop', chats:ownerChats().map(r => ({id:r.id, slug:r.slug, shop:shopName({name:r.shop_name, settings:r.settings}), name:userName(r.user_id), last:String(r.last || '').slice(0, 120), at:iso(r.updated_at), unread:r.unread}))});
  }));
  router.get('/owner/notifications', route((req, res) => {
    if (!owner) fail(404, 'Not found.');
    let me; try { me = owner(req); } catch (error) { if (error.status === 401) return res.json({signedIn:false, items:[]}); throw error; }
    const items = ownerAlerts().map(a => ({kind:'alert', at:String(a.at || ''), text:[a.title, a.body].filter(Boolean).join(' · '), url:a.url || ''}));
    const chats = ownerChats();
    for (const m of db.prepare('SELECT c.user_id,m.body,m.created_at,s.slug,s.name shop_name,s.settings FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id JOIN platform_shops s ON s.id=m.shop_id WHERE m.from_shop=0 ORDER BY m.id DESC LIMIT 30').all())
      items.push({kind:'chat', at:iso(m.created_at), text:'✉️ ' + userName(m.user_id) + ' → ' + shopName({name:m.shop_name, settings:m.settings}) + ': ' + m.body.slice(0, 80), chat:true});
    items.sort((a, b) => b.at.localeCompare(a.at));
    res.json({signedIn:true, manager:true, owner:Boolean(me), items:items.slice(0, 60), unreadChats:chats.reduce((n, c) => n + c.unread, 0)});
  }));
  // Buyer: their one thread with this shop. Shop (owner / GearHub owner): the list of threads.
  router.get('/chat/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (manages(me, shop) && req.query.as !== 'buyer') {
      const rows = db.prepare(`SELECT c.id,c.user_id,c.updated_at,c.shop_read_at,(SELECT body FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) last,
        (SELECT COUNT(*) FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id AND m.from_shop=0 AND m.created_at>c.shop_read_at) unread FROM platform_chats c WHERE c.shop_id=? ORDER BY c.updated_at DESC LIMIT 200`).all(shop.id);
      return res.json({role:'shop', shop:shopName(shop), chats:rows.map(r => ({id:r.id, name:userName(r.user_id), last:String(r.last || '').slice(0, 120), at:iso(r.updated_at), unread:r.unread}))});
    }
    const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, me.id);
    if (chat) db.prepare("UPDATE platform_chats SET user_read_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?").run(shop.id, chat.id);
    res.json({role:'buyer', shop:shopName(shop), messages:chat ? messages(shop, chat.id) : []});
  }));
  // One message: text, or a sticker (one of STICKERS). Voice messages come in through the /voice routes below.
  const content = req => {
    const sticker = req.body?.sticker;
    if (sticker !== undefined) { if (!STICKERS.includes(sticker)) fail(400, 'Unknown sticker.'); return {kind:'sticker', body:sticker}; }
    return {kind:'text', body:text(req.body?.body)};
  };
  const append = (shop, chat, fromShop, {kind, body, voiceId = null}) => {
    db.prepare("INSERT INTO platform_chat_messages(chat_id,shop_id,from_shop,body,created_at,kind,voice_id) VALUES(?,?,?,?,strftime('%Y-%m-%d %H:%M:%f','now'),?,?)").run(chat.id, shop.id, fromShop ? 1 : 0, body, kind, voiceId);
    db.prepare(`UPDATE platform_chats SET updated_at=strftime('%Y-%m-%d %H:%M:%f','now'),${fromShop ? 'shop_read_at' : 'user_read_at'}=strftime('%Y-%m-%d %H:%M:%f','now') WHERE shop_id=? AND id=?`).run(shop.id, chat.id);
  };
  const buyerChat = (shop, me) => {
    if (shop.owner_id === me.id) fail(400, 'This is your own shop.');
    const last = db.prepare("SELECT 1 FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE c.user_id=? AND m.from_shop=0 AND m.created_at>datetime('now','-2 seconds')").get(me.id);
    if (last) fail(429, 'Please wait a moment before the next message.');
    db.prepare('INSERT OR IGNORE INTO platform_chats(shop_id,user_id) VALUES(?,?)').run(shop.id, me.id);
    return db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, me.id);
  };
  const voiceOf = req => {
    const b = req.body;
    if (!Buffer.isBuffer(b) || b.length < 200) fail(400, 'The voice message is empty.');
    const mime = sniff(b); if (!mime) fail(400, 'This voice format is not supported.');
    return {mime, secs:Math.max(1, Math.min(300, Number(req.query.secs) || 1)), data:b};
  };
  const saveVoice = (shop, chat, fromShop, v) => {
    const id = db.prepare('INSERT INTO platform_chat_voice(shop_id,chat_id,mime,secs,data) VALUES(?,?,?,?,?)').run(shop.id, chat.id, v.mime, v.secs, v.data).lastInsertRowid;
    append(shop, chat, fromShop, {kind:'voice', body:'🎤 Voice message', voiceId:Number(id)});
  };
  const shopLogo = shop => {
    const settings = parse(shop.settings), a = settings.appearance || {};
    return [a.appIconUrl, a.logoUrl, settings.logoId ? '/api/platform/images/' + settings.logoId : ''].find(u => typeof u === 'string' && /^\/(?!\/)/.test(u)) || null;
  };
  // 1.1.341 owner: every shop on SkyShopMM in the Chats list (not only the shop being visited), with this person's last message.
  router.get('/chat-shops', route((req, res) => {
    const me = user(req);
    const rows = db.prepare(`SELECT s.slug,s.name,s.settings,c.updated_at,(SELECT body FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) last,
      (SELECT COUNT(*) FROM platform_chat_messages m WHERE m.shop_id=c.shop_id AND m.chat_id=c.id AND m.from_shop=1 AND m.created_at>c.user_read_at) unread
      FROM platform_shops s LEFT JOIN platform_chats c ON c.shop_id=s.id AND c.user_id=? WHERE s.status='active' AND s.legacy=0 AND (s.owner_id IS NULL OR s.owner_id<>?) ORDER BY c.updated_at IS NULL, c.updated_at DESC, s.name COLLATE NOCASE LIMIT 300`).all(me.id, me.id);
    res.json({shops:rows.map(r => ({slug:r.slug, name:shopName(r), logo:shopLogo(r), last:String(r.last || '').slice(0, 120), at:r.updated_at ? iso(r.updated_at) : '', unread:r.unread || 0}))});
  }));
  router.post('/chat/:slug/voice', rawAudio, route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req), v = voiceOf(req), chat = buyerChat(shop, me);
    saveVoice(shop, chat, false, v);
    notify(shop, {title:'💬 ' + userName(me.id), body:'🎤 Voice message', url:'/shops/' + shop.slug + '/?chat=1'});
    res.status(201).json({role:'buyer', shop:shopName(shop), messages:messages(shop, chat.id)});
  }));
  router.post('/chat/:slug', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req), c = content(req), chat = buyerChat(shop, me);
    append(shop, chat, false, c);
    notify(shop, {title:'💬 ' + userName(me.id), body:c.body.slice(0, 120), url:'/shops/' + shop.slug + '/?chat=1'});
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
  router.post('/chat/:slug/:chat/voice', rawAudio, route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can answer this chat.');
    const chat = thread(req, shop); saveVoice(shop, chat, true, voiceOf(req));
    notifyBuyer(chat.user_id, shop, '💬 ' + shopName(shop), '🎤 Voice message');
    res.status(201).json({role:'shop', name:userName(chat.user_id), messages:messages(shop, chat.id)});
  }));
  router.post('/chat/:slug/:chat', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    if (!manages(me, shop)) fail(403, 'Only the shop can answer this chat.');
    const chat = thread(req, shop), c = content(req); append(shop, chat, true, c);
    notifyBuyer(chat.user_id, shop, '💬 ' + shopName(shop), c.body);
    res.status(201).json({role:'shop', name:userName(chat.user_id), messages:messages(shop, chat.id)});
  }));
  // A voice message: only the buyer of that chat and the shop can listen. Range requests are answered because iPhone Safari needs them.
  router.get('/chat/:slug/voice/:id', route((req, res) => {
    const shop = shopOf(req.params.slug), me = user(req);
    const v = db.prepare('SELECT v.mime,v.data,c.user_id FROM platform_chat_voice v JOIN platform_chats c ON c.id=v.chat_id AND c.shop_id=v.shop_id WHERE v.shop_id=? AND v.id=?').get(shop.id, Number(req.params.id) || -1);
    if (!v || (!manages(me, shop) && v.user_id !== me.id)) fail(404, 'Voice message not found.');
    const size = v.data.length, m = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') || '');
    res.set({'Content-Type':v.mime, 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'private, max-age=86400'});
    if (!m) return res.set('Content-Length', size).end(v.data);
    let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]), end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    if (start > end || start >= size) return res.status(416).set('Content-Range', 'bytes */' + size).end();
    res.status(206).set({'Content-Range':'bytes ' + start + '-' + end + '/' + size, 'Content-Length':end - start + 1}).end(v.data.subarray(start, end + 1));
  }));

  // 1.1.343 owner: voice calls (WebRTC). The audio goes phone to phone; this server only passes the offer/answer and
  // remembers the call while it rings. Calls live in memory only (they last seconds to minutes): nothing is stored except
  // the "📞 Voice call · 1:23" / "Missed voice call" line in the chat. Both phones send their whole offer/answer once
  // ICE gathering is done, so there are no per-candidate requests.
  const calls = new Map(); const RING_MS = 45000;
  const crypto = require('crypto');
  const sdp = v => { if (typeof v !== 'string' || v.length < 20 || v.length > 30000 || !/^v=0/.test(v)) fail(400, 'Bad call data.'); return v; };
  const callShop = c => { try { return shopOf(c.slug); } catch { return null; } };
  const unreadFor = me => {
    const mine = db.prepare('SELECT COUNT(*) n FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id WHERE c.user_id=? AND m.from_shop=1 AND m.created_at>c.user_read_at').get(me.id).n;
    const shops = db.prepare('SELECT COUNT(*) n FROM platform_chat_messages m JOIN platform_chats c ON c.id=m.chat_id JOIN platform_shops s ON s.id=m.shop_id WHERE s.owner_id=? AND m.from_shop=0 AND m.created_at>c.shop_read_at').get(me.id).n;
    return mine + shops;
  };
  const stopRing = c => {
    const shop = callShop(c); if (!shop) return;
    const end = {kind:'call-end', tag:'gearhub-call', url:'/shops/' + shop.slug + '/?chat=1'};
    if (c.initiator === 'buyer') notify(shop, {title:'call', body:'ended', ...end}); else notifyBuyer(c.buyerId, shop, 'call', 'ended', end);
  };
  const endCall = (c, by) => {
    if (c.state === 'ended') return;
    const wasRinging = c.state === 'ringing', shop = callShop(c);
    c.state = 'ended'; c.endedAt = Date.now(); if (wasRinging) stopRing(c);
    c.reason = wasRinging ? (by === 'callee' ? 'declined' : 'missed') : 'ended';
    if (!shop) return;
    const secs = c.startedAt ? Math.round((c.endedAt - c.startedAt) / 1000) : 0;
    const what = c.video ? 'video call' : 'voice call', icon = c.video ? '📹' : '📞';
    const body = c.reason === 'declined' ? icon + ' Call declined' : c.reason === 'missed' ? icon + ' Missed ' + what : icon + ' ' + (c.video ? 'Video call' : 'Voice call') + ' · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND id=?').get(shop.id, c.chatId);
    if (chat) append(shop, chat, c.initiator === 'shop', {kind:'call', body});
  };
  const live = c => { if (c.state === 'ringing' && Date.now() - c.createdAt > RING_MS) endCall(c, 'caller'); return c; };
  const roleIn = (c, me) => { if (me.id === c.buyerId) return 'buyer'; const shop = callShop(c); return shop && shop.owner_id === me.id ? 'shop' : ''; };
  const sweep = setInterval(() => { for (const [id, c] of calls) { live(c); if (Date.now() - (c.endedAt || c.createdAt) > 10 * 60000) calls.delete(id); } }, 30000); sweep.unref?.();
  const byId = (req, me) => {
    const c = calls.get(String(req.params.id)); if (!c) fail(404, 'Call not found.');
    const role = roleIn(c, me); if (!role) fail(404, 'Call not found.');
    return {c:live(c), role};
  };
  router.get('/call/config', route((req, res) => {
    user(req);
    const urls = String(process.env.TURN_URLS || '').split(',').map(x => x.trim()).filter(x => /^turns?:/.test(x));
    const iceServers = [{urls:['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']}];
    if (urls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) iceServers.push({urls, username:process.env.TURN_USERNAME, credential:process.env.TURN_CREDENTIAL});
    res.json({iceServers});
  }));
  // Polled every few seconds by every open page: calls ringing for me, and how many chat messages are unread (for the ding).
  router.get('/call/incoming', route((req, res) => {
    const me = user(req), list = [];
    for (const c of calls.values()) {
      if (live(c).state !== 'ringing') continue;
      const shop = callShop(c); if (!shop) continue;
      if (c.initiator === 'buyer' && shop.owner_id === me.id) list.push({id:c.id, slug:c.slug, name:userName(c.buyerId), offer:c.offer, video:c.video});
      else if (c.initiator === 'shop' && c.buyerId === me.id) list.push({id:c.id, slug:c.slug, name:shopName(shop), offer:c.offer, video:c.video});
    }
    res.json({calls:list, unread:unreadFor(me)});
  }));
  router.post('/call/start', route((req, res) => {
    const shop = shopOf(req.body?.slug), me = user(req), offer = sdp(req.body?.offer);
    let buyerId, initiator;
    if (manages(me, shop)) {
      if (shop.owner_id !== me.id) fail(403, 'Only the shop owner can call from here.');
      const chat = db.prepare('SELECT * FROM platform_chats WHERE shop_id=? AND id=?').get(shop.id, Number(req.body?.chat) || -1);
      if (!chat) fail(404, 'Chat not found.');
      buyerId = chat.user_id; initiator = 'shop';
    } else { buyerId = me.id; initiator = 'buyer'; }
    for (const c of calls.values()) if (c.slug === shop.slug && c.buyerId === buyerId && live(c).state !== 'ended') endCall(c, 'caller');
    db.prepare('INSERT OR IGNORE INTO platform_chats(shop_id,user_id) VALUES(?,?)').run(shop.id, buyerId);
    const chatId = db.prepare('SELECT id FROM platform_chats WHERE shop_id=? AND user_id=?').get(shop.id, buyerId).id;
    const c = {id:crypto.randomUUID(), slug:shop.slug, buyerId, chatId, initiator, video:req.body?.video === true, state:'ringing', offer, answer:'', createdAt:Date.now(), startedAt:0, endedAt:0, reason:''};
    calls.set(c.id, c);
    // 1.1.358 owner: an incoming call must ring like a call, not drop in as a message: a sticky alert with long vibration (kind 'call'),
    // taken away again (kind 'call-end') when the call is answered, declined or missed.
    const ring = {kind:'call', tag:'gearhub-call', url:'/shops/' + shop.slug + '/?call=1', video:c.video};
    if (initiator === 'buyer') notify(shop, {title:(c.video ? '📹 ' : '📞 ') + userName(buyerId), body:(c.video ? 'Video call' : 'Voice call') + ' · tap to answer', ...ring});
    else notifyBuyer(buyerId, shop, (c.video ? '📹 ' : '📞 ') + shopName(shop), (c.video ? 'Video call' : 'Voice call') + ' · tap to answer', ring);
    res.status(201).json({id:c.id});
  }));
  router.get('/call/:id', route((req, res) => {
    const {c, role} = byId(req, user(req)), caller = (role === 'buyer') === (c.initiator === 'buyer');
    res.json({state:c.state, reason:c.reason, answer:caller && c.state === 'active' ? c.answer : '', startedAt:c.startedAt});
  }));
  router.post('/call/:id/answer', route((req, res) => {
    const {c, role} = byId(req, user(req));
    if ((role === 'buyer') === (c.initiator === 'buyer')) fail(403, 'Only the person called can answer.');
    if (c.state !== 'ringing') fail(409, 'This call is over.');
    c.answer = sdp(req.body?.answer); c.state = 'active'; c.startedAt = Date.now(); stopRing(c);
    res.json({state:c.state});
  }));
  router.post('/call/:id/end', route((req, res) => {
    const {c, role} = byId(req, user(req));
    endCall(c, (role === 'buyer') === (c.initiator === 'buyer') ? 'caller' : 'callee');
    res.json({state:c.state, reason:c.reason});
  }));

  // 1.1.355 owner: a buyer's phone gets an alert when the shop answers, a message arrives or the shop calls. A buyer phone is saved
  // under the person (platform_user_data k='push-eps', up to 8 endpoints); a phone that already belongs to a store keeps that store.
  const endpointsOf = id => { try { const r = db.prepare("SELECT v FROM platform_user_data WHERE user_id=? AND k='push-eps'").get(id); const v = r ? JSON.parse(r.v) : []; return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
  const saveEndpoints = (id, list) => db.prepare("INSERT INTO platform_user_data(user_id,k,v,updated_at) VALUES(?,'push-eps',?,strftime('%Y-%m-%d %H:%M:%f','now')) ON CONFLICT(user_id,k) DO UPDATE SET v=excluded.v,updated_at=excluded.updated_at").run(id, JSON.stringify(list.slice(-8)));
  const notifyBuyer = (userId, shop, title, body, extra = {}) => {
    const m = {title, body:String(body).slice(0, 120), url:'/shops/' + shop.slug + '/?chat=1', ...extra};
    if (native) native.toUser(userId, m);
    if (!userPush) return; const eps = endpointsOf(userId); if (eps.length) userPush.notifyEndpoints(eps, m, userId);
  };
  // The native Android app hands its Firebase address to the page, the page saves it on the signed-in person here.
  if (native) router.post('/native-push/token', route((req, res) => { const me = user(req); native.save(me.id, req.body?.token); res.json({ok:true, enabled:native.enabled()}); }));
  if (userPush) {
    router.get('/user-push', route((req, res) => { const me = user(req); res.json({publicKey:userPush.key(), subscribed:endpointsOf(me.id).includes(String(req.query.endpoint || ''))}); }));
    router.post('/user-push/subscribe', route((req, res) => {
      const me = user(req), r = userPush.ensure(me.id, req.body?.subscription), list = endpointsOf(me.id).filter(x => x !== r.endpoint);
      list.push(r.endpoint); saveEndpoints(me.id, list); res.json({ok:true});
    }));
  }
  // 1.1.344 owner: what a person's phone remembered (the AI Assistant chat, their to-do notes, which alerts they have seen)
  // is kept on the server too, so it survives a new phone, a cleared browser or a re-installed app. Only these keys are allowed.
  const USER_KEY = /^(ai-chat|ai-todos-[a-z0-9-]{1,80}|noti-seen-[a-z0-9-]{1,80})$/;
  const userKey = req => { const k = String(req.params.key); if (!USER_KEY.test(k)) fail(404, 'Not found.'); return k; };
  router.get('/userdata/:key', route((req, res) => {
    const me = user(req), row = db.prepare('SELECT v FROM platform_user_data WHERE user_id=? AND k=?').get(me.id, userKey(req));
    res.json({value:row ? parse(row.v).value ?? null : null});
  }));
  router.put('/userdata/:key', route((req, res) => {
    const me = user(req), key = userKey(req), v = JSON.stringify({value:req.body?.value ?? null});
    if (v.length > 60000) fail(413, 'Too much to save.');
    db.prepare("INSERT INTO platform_user_data(user_id,k,v,updated_at) VALUES(?,?,?,strftime('%Y-%m-%d %H:%M:%f','now')) ON CONFLICT(user_id,k) DO UPDATE SET v=excluded.v,updated_at=excluded.updated_at").run(me.id, key, v);
    res.json({ok:true});
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
