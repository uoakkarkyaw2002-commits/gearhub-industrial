// Google Drive copy (owner's request): the daily backup archive and the original of every shop photo go
// to the GearHub owner's Google Drive, folder "GearHub Backups". The shops keep serving photos from the
// server disk (fast); Drive is the off-site copy. The owner connects Drive once (Google consent); the
// app asks only for drive.file, so it can see and change only the files it made itself.
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER = "application/vnd.google-apps.folder";
const ROOT_NAME = "GearHub Backups";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id";

function createDrive({ db, clientId, clientSecret, media, keepBackups = 30, fetchImpl = (...a) => fetch(...a), log = () => {} }) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_drive(id INTEGER PRIMARY KEY CHECK(id=1),refresh_token TEXT,email TEXT,connected_at TEXT,last_backup_at TEXT,last_backup_name TEXT,last_photo_at TEXT,last_error TEXT,last_error_at TEXT);
    CREATE TABLE IF NOT EXISTS platform_drive_folders(key TEXT PRIMARY KEY,drive_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS platform_drive_photos(file_id TEXT PRIMARY KEY,shop_id INTEGER NOT NULL,drive_id TEXT NOT NULL,copied_at TEXT NOT NULL);`);
  const row = () => db.prepare("SELECT * FROM platform_drive WHERE id=1").get() || {};
  const configured = () => Boolean(clientId && clientSecret);
  const connected = () => configured() && Boolean(row().refresh_token);
  const set = (fields) => {
    const keys = Object.keys(fields);
    db.prepare(`INSERT INTO platform_drive(id,${keys.join(",")}) VALUES(1,${keys.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${keys.map((k) => k + "=excluded." + k).join(",")}`).run(...keys.map((k) => fields[k]));
  };
  const failed = (error) => { set({ last_error: String(error.message || error).slice(0, 300), last_error_at: new Date().toISOString() }); log("drive_failure", error.message); };

  // ---- Google access ----------------------------------------------------------------------------
  let token = null;
  async function accessToken() {
    if (token && token.expires > Date.now() + 60000) return token.value;
    const refresh = row().refresh_token;
    if (!refresh) throw Error("Google Drive is not connected.");
    const r = await fetchImpl("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refresh, grant_type: "refresh_token" }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Access removed in the Google account (or expired): show "not connected" so the owner connects again.
      if (data.error === "invalid_grant") { set({ refresh_token: null }); throw Error("Google Drive access was removed. Connect Google Drive again."); }
      throw Error("Google sign-in for Drive failed (" + r.status + ").");
    }
    token = { value: data.access_token, expires: Date.now() + Number(data.expires_in || 3600) * 1000 };
    return token.value;
  }
  async function call(url, options = {}) {
    const r = await fetchImpl(url, { ...options, headers: { Authorization: "Bearer " + (await accessToken()), ...(options.headers || {}) } });
    if (!r.ok) throw Error("Google Drive answered " + r.status + " " + (await r.text().catch(() => "")).slice(0, 160));
    return r;
  }
  // A folder the app made before (remembered), else found by name, else made now.
  async function folder(name, parent) {
    const key = parent + "/" + name, saved = db.prepare("SELECT drive_id FROM platform_drive_folders WHERE key=?").get(key);
    if (saved) return saved.drive_id;
    const q = `name='${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and mimeType='${FOLDER}' and '${parent}' in parents and trashed=false`;
    const found = (await (await call(API + "?fields=files(id)&q=" + encodeURIComponent(q))).json()).files?.[0]?.id;
    const id = found || (await (await call(API + "?fields=id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }) })).json()).id;
    db.prepare("INSERT OR REPLACE INTO platform_drive_folders(key,drive_id) VALUES(?,?)").run(key, id);
    return id;
  }
  const root = () => folder(ROOT_NAME, "root");
  // Resumable upload: the file streams from disk (backup archives can be large).
  async function upload(file, name, parent, mime) {
    const bytes = (await fs.promises.stat(file)).size;
    const start = await call(UPLOAD, { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime, "X-Upload-Content-Length": String(bytes) }, body: JSON.stringify({ name, parents: [parent] }) });
    const location = start.headers.get("location");
    if (!location) throw Error("Google Drive did not start the upload.");
    const r = await fetchImpl(location, { method: "PUT", headers: { "Content-Type": mime, "Content-Length": String(bytes) }, body: Readable.toWeb(fs.createReadStream(file)), duplex: "half" });
    if (!r.ok) throw Error("Google Drive upload failed (" + r.status + ").");
    return (await r.json()).id;
  }

  // ---- Daily backup ------------------------------------------------------------------------------
  // The archive goes to "GearHub Backups"; the newest 30 are kept there (older ones are deleted).
  async function backup(archive, name) {
    try {
      const parent = await root();
      await upload(archive, name, parent, "application/gzip");
      const q = `'${parent}' in parents and name contains 'gearhub-' and mimeType!='${FOLDER}' and trashed=false`;
      const files = (await (await call(API + "?orderBy=createdTime desc&pageSize=200&fields=files(id,name)&q=" + encodeURIComponent(q))).json()).files || [];
      for (const old of files.filter((f) => /^gearhub-.*\.tar\.gz$/.test(f.name)).slice(keepBackups)) await call(API + "/" + old.id, { method: "DELETE" });
      set({ last_backup_at: new Date().toISOString(), last_backup_name: name, last_error: null, last_error_at: null });
    } catch (error) { failed(error); throw error; }
  }

  // ---- Photo originals ---------------------------------------------------------------------------
  // Every shop photo not yet copied goes to "GearHub Backups/Photos/<shop>"; existing photos are copied
  // too, a batch at a time. Photos stay in Drive when a shop deletes them (it is the safety copy).
  let sweeping = null, soon = null, timer = null;
  async function sweepOnce() {
    if (!connected()) return 0;
    let copied = 0;
    try {
      for (const shop of db.prepare("SELECT id,slug FROM platform_shops WHERE legacy=0 ORDER BY id").all()) {
        const files = db.prepare("SELECT id,filename,mime FROM platform_files WHERE shop_id=? AND kind='image' AND ready=1 AND id NOT IN (SELECT file_id FROM platform_drive_photos WHERE shop_id=?) LIMIT ?").all(shop.id, shop.id, 200 - copied);
        if (!files.length) continue;
        const parent = await folder(shop.slug || "shop-" + shop.id, await folder("Photos", await root()));
        for (const f of files) {
          const file = path.join(media, String(shop.id), f.filename);
          if (!fs.existsSync(file)) continue;
          const id = await upload(file, f.filename, parent, f.mime || "image/jpeg");
          db.prepare("INSERT OR REPLACE INTO platform_drive_photos(file_id,shop_id,drive_id,copied_at) VALUES(?,?,?,?)").run(f.id, shop.id, id, new Date().toISOString());
          copied++;
        }
        if (copied >= 200) break;
      }
      if (copied) set({ last_photo_at: new Date().toISOString(), last_error: null, last_error_at: null });
    } catch (error) { failed(error); }
    return copied;
  }
  // One sweep at a time; a full batch means more are waiting, so it goes on.
  function sweep() {
    if (!sweeping) sweeping = (async () => { let n; do n = await sweepOnce(); while (n >= 200); })().finally(() => { sweeping = null; });
    return sweeping;
  }
  // A new photo is copied about half a minute after it is saved (several uploads go together).
  function photoSaved() { if (!connected() || soon) return; soon = setTimeout(() => { soon = null; sweep(); }, 30000); soon.unref?.(); }
  function start() { timer = setInterval(() => sweep(), 15 * 60 * 1000); timer.unref?.(); setTimeout(() => sweep(), 60000).unref?.(); }

  let onConnect = () => {};
  function whenConnected(fn) { onConnect = fn; }
  function connect({ refreshToken, email }) {
    if (!refreshToken) throw Error("Google did not give Drive access. Try again and allow access.");
    token = null;
    db.prepare("DELETE FROM platform_drive_folders").run();
    set({ refresh_token: refreshToken, email: String(email || "").slice(0, 200), connected_at: new Date().toISOString(), last_error: null, last_error_at: null });
    sweep();
    onConnect();
  }
  // Disconnecting keeps everything already in Drive; nothing more is sent.
  function disconnect() { token = null; set({ refresh_token: null }); }
  function status() {
    const r = row(), copied = db.prepare("SELECT COUNT(*) n FROM platform_drive_photos").get().n;
    const total = db.prepare("SELECT id FROM platform_shops WHERE legacy=0").all().reduce((n, s) => n + db.prepare("SELECT COUNT(*) n FROM platform_files WHERE shop_id=? AND kind='image' AND ready=1").get(s.id).n, 0);
    return { configured: configured(), connected: connected(), email: r.email || "", connectedAt: r.connected_at || null, lastBackupAt: r.last_backup_at || null, lastBackupName: r.last_backup_name || "", lastPhotoAt: r.last_photo_at || null, photosCopied: copied, photosTotal: total, lastError: r.last_error || "", lastErrorAt: r.last_error_at || null, folder: ROOT_NAME };
  }
  return { SCOPE, configured, connected, connect, whenConnected, disconnect, backup, sweep, photoSaved, start, status };
}

module.exports = { createDrive, SCOPE };
