// 1.1.359 owner: alerts for the native Android app (Firebase Cloud Messaging, HTTP v1). The app sends its Firebase address (token)
// to the page; the page saves it on the signed-in person. Needs the Firebase service account in env FCM_SERVICE_ACCOUNT (the whole
// JSON, set by the owner on Render). Without it nothing is sent and everything else keeps working.
// Data-only messages with high priority: the app itself decides how to show them (call = full-screen ring).
const crypto = require('crypto');

const b64 = v => Buffer.from(v).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const KEY = 'fcm-tokens', MAX_TOKENS = 5;

function createNativePush({db, log = () => {}, env = process.env, fetchImpl = fetch}) {
  let account = null;
  try { const raw = String(env.FCM_SERVICE_ACCOUNT || '').trim(); if (raw) account = JSON.parse(raw); } catch (e) { log('fcm_config_invalid', e); }
  if (account && !(account.client_email && account.private_key && account.project_id)) account = null;
  let access = {token: '', exp: 0};

  let pending = null;
  const accessToken = () => {
    if (access.token && access.exp - 60000 > Date.now()) return Promise.resolve(access.token);
    return pending || (pending = fetchAccessToken().finally(() => { pending = null; }));
  };
  async function fetchAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    const head = b64(JSON.stringify({alg: 'RS256', typ: 'JWT'}));
    const claim = b64(JSON.stringify({iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600}));
    const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(account.private_key);
    const r = await fetchImpl('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + b64(sig)});
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw Error('fcm_auth_' + r.status);
    access = {token: d.access_token, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000};
    return access.token;
  }

  const read = userId => { try { const r = db.prepare("SELECT v FROM platform_user_data WHERE user_id=? AND k=?").get(userId, KEY); const v = r ? JSON.parse(r.v) : []; return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
  const write = (userId, list) => db.prepare("INSERT INTO platform_user_data(user_id,k,v,updated_at) VALUES(?,?,?,strftime('%Y-%m-%d %H:%M:%f','now')) ON CONFLICT(user_id,k) DO UPDATE SET v=excluded.v,updated_at=excluded.updated_at").run(userId, KEY, JSON.stringify(list.slice(-MAX_TOKENS)));

  async function sendOne(token, data) {
    const body = {message: {token, data, android: {priority: 'HIGH', ttl: data.kind === 'call' ? '45s' : '86400s'}}};
    const r = await fetchImpl('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(account.project_id) + '/messages:send', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + await accessToken()}, body: JSON.stringify(body)});
    if (r.ok) return {ok: true};
    const d = await r.json().catch(() => ({}));
    return {ok: false, status: r.status, gone: r.status === 404 || d?.error?.details?.some?.(x => x.errorCode === 'UNREGISTERED'), error: d?.error?.message || ('http ' + r.status)};
  }

  const strings = m => {
    const data = {};
    for (const [k, v] of Object.entries({title: m.title, body: m.body, url: m.url, kind: m.kind || 'chat', tag: m.tag, video: m.video ? '1' : '', callId: m.callId, key: m.key, fg: m.fg ? '1' : ''})) if (v != null && v !== '') data[k] = String(v).slice(0, 400);
    return data;
  };

  return {
    enabled: () => Boolean(account),
    tokens: read,
    save(userId, token) {
      const t = String(token || '').trim();
      if (!/^[A-Za-z0-9_:\-.]{20,4096}$/.test(t)) { const e = Error('Bad token.'); e.status = 400; throw e; }
      write(userId, [...read(userId).filter(x => x !== t), t]);
    },
    // Never throws: an alert must not break the chat or the order.
    async toUser(userId, message) {
      if (!account || !userId) return {sent: 0, failed: 0};
      const tokens = read(userId); if (!tokens.length) return {sent: 0, failed: 0};
      const data = strings(message); let sent = 0, failed = 0, keep = tokens.slice();
      await Promise.all(tokens.map(async t => {
        try { const r = await sendOne(t, data); if (r.ok) sent++; else { failed++; if (r.gone) keep = keep.filter(x => x !== t); else log('fcm_send_failure', Error(r.error)); } }
        catch (e) { failed++; log('fcm_send_failure', e); }
      }));
      if (keep.length !== tokens.length) { try { write(userId, keep); } catch {} }
      return {sent, failed};
    }
  };
}
module.exports = {createNativePush};
