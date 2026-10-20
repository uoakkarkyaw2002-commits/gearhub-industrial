// New-order push notifications for the GearHub admin and every seller shop admin, so
// a phone hears a new order even when it is locked or the admin app is closed.
// Each store has its own scope ("main" or "shop:<id>"); a phone only gets alerts for
// the store it subscribed from. The VAPID key pair comes from VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY when set, otherwise it is made once and kept in platform_meta.
const webpush = require("web-push");

const MAX_PER_SCOPE = 20;

function createOrderPush({ db, env = process.env, subject, sender = webpush, log = () => {} }) {
  db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions(
    id INTEGER PRIMARY KEY,
    scope TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_push_scope ON push_subscriptions(scope);
  CREATE TABLE IF NOT EXISTS platform_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

  function keys() {
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
    const row = db.prepare("SELECT value FROM platform_meta WHERE key='vapid'").get();
    if (row) return JSON.parse(row.value);
    const made = sender.generateVAPIDKeys();
    db.prepare("INSERT INTO platform_meta(key,value) VALUES('vapid',?) ON CONFLICT(key) DO NOTHING").run(JSON.stringify(made));
    return JSON.parse(db.prepare("SELECT value FROM platform_meta WHERE key='vapid'").get().value);
  }
  const vapid = keys();
  // Push services only accept an https: or mailto: contact.
  const contact = [env.VAPID_SUBJECT, subject].find(v => /^(https:\/\/|mailto:)/.test(String(v || ""))) || "https://gearhub-industrial-1.onrender.com";

  function clean(subscription) {
    const endpoint = String(subscription?.endpoint || "");
    const p256dh = String(subscription?.keys?.p256dh || "");
    const auth = String(subscription?.keys?.auth || "");
    const key = /^[A-Za-z0-9_-]{40,200}$/.test(p256dh) ? Buffer.from(p256dh, "base64url") : Buffer.alloc(0);
    if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint) || key.length !== 65 || key[0] !== 4 || !/^[A-Za-z0-9_-]{8,100}$/.test(auth) || Buffer.from(auth, "base64url").length < 16) {
      const e = new Error("This phone's notification details are not valid."); e.status = 400; throw e;
    }
    return { endpoint, p256dh, auth };
  }

  return {
    publicKey: () => vapid.publicKey,
    count: scope => db.prepare("SELECT COUNT(*) n FROM push_subscriptions WHERE scope=?").get(scope).n,
    has: (scope, endpoint) => !!db.prepare("SELECT 1 FROM push_subscriptions WHERE scope=? AND endpoint=?").get(scope, String(endpoint || "")),
    subscribe(scope, subscription) {
      const s = clean(subscription);
      db.transaction(() => {
        // One phone belongs to one store; re-subscribing moves it.
        db.prepare("INSERT INTO push_subscriptions(scope,endpoint,p256dh,auth) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET scope=excluded.scope,p256dh=excluded.p256dh,auth=excluded.auth").run(scope, s.endpoint, s.p256dh, s.auth);
        const extra = db.prepare("SELECT id FROM push_subscriptions WHERE scope=? ORDER BY id DESC LIMIT -1 OFFSET ?").all(scope, MAX_PER_SCOPE);
        for (const r of extra) db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(r.id);
      })();
      return { ok: true };
    },
    unsubscribe(scope, endpoint) {
      db.prepare("DELETE FROM push_subscriptions WHERE scope=? AND endpoint=?").run(scope, String(endpoint || ""));
      return { ok: true };
    },
    // Never throws: an order must not fail because a phone could not be reached.
    // Each order is its own alert (no shared topic), so 5 orders make 5 alerts even
    // when the phone was locked or offline. The result is kept for the admin card.
    async notify(scope, message) {
      const rows = db.prepare("SELECT * FROM push_subscriptions WHERE scope=?").all(scope);
      const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, icon: message.icon, tag: message.tag || "gearhub-order", orderId: message.orderId ?? null, kind: message.kind || "order" });
      let sent = 0, failed = 0, error = "";
      await Promise.all(rows.map(async row => {
        try {
          await sender.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, {
            TTL: 60 * 60 * 24, urgency: "high",
            vapidDetails: { subject: contact, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
          });
          sent++;
        } catch (e) {
          failed++;
          error = [e?.statusCode, String(e?.body || e?.message || "error").replace(/\s+/g, " ").slice(0, 120)].filter(Boolean).join(" ");
          // The phone turned alerts off or the app was removed: forget it.
          if (e && (e.statusCode === 404 || e.statusCode === 410)) db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(row.id);
          else log("order_push_failure", e);
        }
      }));
      const last = { at: new Date().toISOString(), phones: rows.length, sent, failed, error, kind: message.kind || "order" };
      try { db.prepare("INSERT INTO platform_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run("push-last:" + scope, JSON.stringify(last)); } catch {}
      return sent;
    },
    lastResult(scope) {
      const row = db.prepare("SELECT value FROM platform_meta WHERE key=?").get("push-last:" + scope);
      try { return row ? JSON.parse(row.value) : null; } catch { return null; }
    },
  };
}

// The words a shop owner sees on the lock screen.
function orderMessage({ id, code, total, customer, url }) {
  const amount = new Intl.NumberFormat("en-US").format(Math.round(Number(total) || 0)) + " Ks";
  return {
    title: "🔔 အော်ဒါအသစ် / New order",
    body: [customer, amount, code].filter(Boolean).join(" · "),
    url,
    tag: "order-" + String(code || Date.now()),
    orderId: id ?? null,
  };
}

module.exports = { createOrderPush, orderMessage };
