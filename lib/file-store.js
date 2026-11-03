// 1.1.282 owner: shops' uploads (photos, Excel files, receipts in DATA_DIR/platform-media/<shop>/) filled the
// fixed-size Render disk. Each one is now also kept in Cloudflare R2 (S3 API), and the Render disk keeps only a
// cache of recently used files (FILES_CACHE_MB, default 400 MB). A file that is needed but no longer on the
// disk is fetched back from R2 first (ensureLocal), so every reader keeps working on a plain local path.
// Off until FILES_S3_BUCKET is set; the endpoint and keys default to the backup ones (BACKUP_S3_*).
// The table file_store records what is safely in R2; nothing is removed from the disk before that.
const fs = require("node:fs");
const path = require("node:path");

const VARIANT = /\.opt\.webp$/;            // re-made from the original on demand (lib/image-variants.js)
const MIN_AGE_MS = 10 * 60 * 1000;          // a new upload is copied once it is 10 minutes old

function createFileStore({ db, dataDir, env = process.env, client = null, log = () => {}, cacheBytes: cacheOverride }) {
  const root = path.join(dataDir, "platform-media");
  const bucket = env.FILES_S3_BUCKET || "";
  const prefix = env.FILES_S3_PREFIX ?? "files/";
  const cacheBytes = cacheOverride ?? Math.max(50, Number(env.FILES_CACHE_MB || 400) || 400) * 1024 * 1024;
  const enabled = Boolean(bucket && (client || env.FILES_S3_ENDPOINT || env.BACKUP_S3_ENDPOINT));
  db.exec("CREATE TABLE IF NOT EXISTS file_store(key TEXT PRIMARY KEY, bytes INTEGER NOT NULL, stored_at TEXT NOT NULL, used_at TEXT NOT NULL)");
  let s3 = client, timer = null, sweeping = null;
  const sdk = () => require("@aws-sdk/client-s3");
  function api() {
    if (s3) return s3;
    const { S3Client } = sdk();
    const id = env.FILES_S3_ACCESS_KEY_ID || env.BACKUP_S3_ACCESS_KEY_ID, secret = env.FILES_S3_SECRET_ACCESS_KEY || env.BACKUP_S3_SECRET_ACCESS_KEY;
    return s3 = new S3Client({ region: env.FILES_S3_REGION || env.BACKUP_S3_REGION || "auto", endpoint: env.FILES_S3_ENDPOINT || env.BACKUP_S3_ENDPOINT || undefined, forcePathStyle: (env.FILES_S3_FORCE_PATH_STYLE || env.BACKUP_S3_FORCE_PATH_STYLE) === "true", credentials: id ? { accessKeyId: id, secretAccessKey: secret } : undefined });
  }
  const command = (name, input) => client ? { name, input } : new (sdk()[name])(input);
  // Only files of a shop folder (platform-media/<shop id>/<file>), never the hidden learning folders.
  function keyOf(full) {
    const rel = path.relative(root, path.resolve(full));
    const parts = rel.split(path.sep);
    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || parts[1].startsWith(".") || VARIANT.test(parts[1])) return null;
    return parts.join("/");
  }
  const row = key => db.prepare("SELECT * FROM file_store WHERE key=?").get(key);
  const now = () => new Date().toISOString();

  // The local path of a shop file, fetched back from R2 when only R2 has it. Never throws for a missing file.
  async function ensureLocal(full) {
    if (!enabled) return full;
    const key = keyOf(full);
    if (!key) return full;
    if (fs.existsSync(full)) { touch(key); return full; }
    if (!row(key)) return full;
    const tmp = full + ".r2-" + process.pid + "-" + Date.now();
    try {
      const out = await api().send(command("GetObjectCommand", { Bucket: bucket, Key: prefix + key }));
      fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o700 });
      await require("node:stream/promises").pipeline(out.Body, fs.createWriteStream(tmp, { mode: 0o600 }));
      fs.renameSync(tmp, full);
      touch(key, true);
    } catch (error) { fs.rmSync(tmp, { force: true }); log("file_store_fetch_failure", key, error.message); }
    return full;
  }
  // Recently used files stay on the disk longest (written at most once an hour per file).
  function touch(key, force) {
    const r = row(key);
    if (r && (force || Date.now() - Date.parse(r.used_at) > 3600000)) db.prepare("UPDATE file_store SET used_at=? WHERE key=?").run(now(), key);
  }
  async function remove(full) {
    const key = keyOf(full);
    if (!enabled || !key || !row(key)) return;
    try { await api().send(command("DeleteObjectCommand", { Bucket: bucket, Key: prefix + key })); db.prepare("DELETE FROM file_store WHERE key=?").run(key); }
    catch (error) { log("file_store_delete_failure", key, error.message); }
  }
  async function removeShop(shopId) {
    if (!enabled) return;
    for (const { key } of db.prepare("SELECT key FROM file_store WHERE key LIKE ?").all(Number(shopId) + "/%")) await remove(path.join(root, ...key.split("/")));
  }
  function shopFiles() {
    const out = [];
    let shops = [];
    try { shops = fs.readdirSync(root).filter(n => /^\d+$/.test(n)); } catch (_) {}
    for (const shop of shops) {
      let names = [];
      try { names = fs.readdirSync(path.join(root, shop)); } catch (_) {}
      for (const name of names) {
        if (name.startsWith(".") || name.includes(".r2-")) continue;
        const full = path.join(root, shop, name);
        let st; try { st = fs.statSync(full); } catch (_) { continue; }
        if (st.isFile()) out.push({ full, key: VARIANT.test(name) ? null : shop + "/" + name, bytes: st.size, mtime: st.mtimeMs });
      }
    }
    return out;
  }
  // 1) copy every shop file older than MIN_AGE_MS that R2 does not have yet; 2) while the disk copy is over
  // the cache size, remove the least recently used files that R2 has (and re-makeable image variants).
  async function sweep() {
    if (!enabled) return { copied: 0, removed: 0 };
    return sweeping || (sweeping = (async () => {
      let copied = 0, removed = 0;
      const files = shopFiles();
      for (const f of files) {
        if (!f.key || row(f.key) || Date.now() - f.mtime < MIN_AGE_MS) continue;
        try {
          await api().send(command("PutObjectCommand", { Bucket: bucket, Key: prefix + f.key, Body: fs.createReadStream(f.full), ContentLength: f.bytes }));
          db.prepare("INSERT OR REPLACE INTO file_store(key,bytes,stored_at,used_at) VALUES(?,?,?,?)").run(f.key, f.bytes, now(), new Date(f.mtime).toISOString());
          copied++;
        } catch (error) { log("file_store_copy_failure", f.key, error.message); }
      }
      let local = files.reduce((t, f) => t + f.bytes, 0);
      if (local > cacheBytes) {
        const used = new Map(db.prepare("SELECT key, used_at FROM file_store").all().map(r => [r.key, Date.parse(r.used_at)]));
        const candidates = files.filter(f => !f.key || used.has(f.key)).map(f => ({ ...f, at: f.key ? used.get(f.key) : f.mtime })).sort((a, b) => a.at - b.at);
        for (const f of candidates) {
          if (local <= cacheBytes * 0.8) break;
          try { fs.rmSync(f.full, { force: true }); local -= f.bytes; removed++; } catch (_) {}
        }
      }
      if (copied || removed) log("file_store_sweep", { copied, removed, localBytes: local });
      return { copied, removed };
    })().finally(() => { sweeping = null; }));
  }
  function start(everyMs = 10 * 60 * 1000) { if (!enabled || timer) return; timer = setInterval(() => sweep().catch(() => {}), everyMs); timer.unref?.(); setTimeout(() => sweep().catch(() => {}), 60000).unref?.(); }
  function stop() { clearInterval(timer); timer = null; }
  function status() { const r = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(bytes),0) b FROM file_store").get(); return { enabled, bucket: enabled ? bucket : "", files: r.n, bytes: r.b, cacheBytes }; }
  return { enabled, ensureLocal, remove, removeShop, sweep, start, stop, status, keyOf };
}

module.exports = { createFileStore };
