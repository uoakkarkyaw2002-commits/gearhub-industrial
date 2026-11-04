// Keep the seller frontend on the owner's confirmed build across server deploys.
// Backend/API code still runs on the deployed server; releases must stay compatible.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const express = require('express');
const {deployedVersion} = require('./app-release');
const VERSION = /^\d+\.\d+\.\d+$/;
const STATIC = /\.(?:js|css|html|svg|webmanifest|ico|png|jpe?g|webp|gif|avif|woff2?|ttf|bin)$/i;
const SEED_VERSION = '1.1.287';

function createShopReleases({db, dataDir, publicDir, version = deployedVersion, seedArchive = path.join(__dirname, '../release-seed/1.1.287.tar.gz')}) {
  if (!VERSION.test(version)) throw Error('Invalid deployed app version.');
  const root = path.join(dataDir, 'app-builds');
  fs.mkdirSync(root, {recursive: true});
  if (fs.lstatSync(root).isSymbolicLink()) throw Error('App builds cannot be a symlink.');
  const manifests = new Map();
  function filesIn(dir, prefix = '') {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) return [];
      const name = prefix + entry.name;
      if (entry.isDirectory()) return filesIn(path.join(dir, entry.name), name + '/');
      return entry.isFile() && STATIC.test(name) ? [name] : [];
    }).sort();
  }
  function manifest(v) {
    if (!VERSION.test(v)) throw Error('Invalid app version.');
    if (!manifests.has(v)) {
      const names = JSON.parse(fs.readFileSync(path.join(root, v, 'files.json'), 'utf8'));
      if (!Array.isArray(names) || !names.includes('index.html') || !names.includes('sw.js')) throw Error('Incomplete saved app build.');
      manifests.set(v, new Set(names));
    }
    return manifests.get(v);
  }
  function save(v, source) {
    const destination = path.join(root, v);
    if (fs.existsSync(destination)) { manifest(v); return; }
    const temp = fs.mkdtempSync(path.join(root, '.save-'));
    try {
      const names = filesIn(source);
      if (!names.includes('index.html') || !names.includes('sw.js') || !names.includes('admin.html')) throw Error('Incomplete app build.');
      for (const name of names) {
        const target = path.join(temp, 'public', name);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.copyFileSync(path.join(source, name), target);
      }
      fs.writeFileSync(path.join(temp, 'files.json'), JSON.stringify(names));
      fs.renameSync(temp, destination);
    } finally { fs.rmSync(temp, {recursive: true, force: true}); }
  }
  const loadState = () => {
    const row = db.prepare("SELECT value FROM platform_meta WHERE key='shop-release'").get();
    return row ? JSON.parse(row.value) : null;
  };
  const writeState = state => db.prepare("INSERT INTO platform_meta(key,value) VALUES('shop-release',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(state));
  if (!loadState()) {
    // One-time bridge: the live build before this feature is bundled, so the first
    // installation also waits for Confirm. Never silently publish the new build.
    const temp = fs.mkdtempSync(path.join(root, '.seed-'));
    try {
      execFileSync('tar', ['-xzf', seedArchive, '-C', temp]);
      save(SEED_VERSION, path.join(temp, 'public'));
      writeState({version: SEED_VERSION, notes: 'Current shop version', publishedAt: null});
    } finally { fs.rmSync(temp, {recursive: true, force: true}); }
  }
  manifest(loadState().version); // Fail closed if the confirmed build was lost.
  save(version, publicDir);
  function published() { const state = loadState(); manifest(state.version); return state; }
  function status() {
    const active = published();
    return {deployedVersion: version, sellerVersion: active.version, pending: version !== active.version, publishedAt: active.publishedAt};
  }
  function publish(candidate, notes = '') {
    if (candidate !== version) { const error = Error('Deploy changed. Refresh and confirm the deployed version.'); error.status = 409; throw error; }
    manifest(candidate);
    const current = published();
    if (current.version === candidate) return current;
    const state = {version: candidate, notes: String(notes).slice(0, 500), publishedAt: new Date().toISOString()};
    writeState(state);
    return state;
  }
  function read(v, name) {
    if (!manifest(v).has(name)) throw Error('Unknown app asset.');
    return fs.readFileSync(path.join(root, v, 'public', name));
  }
  function rewrite(text, v) {
    const known = manifest(v);
    // Pin static assets, including lazy JS loads and Workers. Dynamic API images,
    // shop manifests/icons and navigation links retain their normal addresses.
    return text.replace(/(["'`(])\/([a-zA-Z0-9_./-]+\.(?:js|css|svg|ico|png|jpe?g|webp|gif|avif|woff2?|ttf|bin))(?=[?"'`)\s])/g,
      (all, quote, name) => known.has(name) ? quote + '/app-builds/' + v + '/' + name : all);
  }
  function page(text, v = published().version) { return rewrite(text, v); }
  function html(name) { return read(published().version, name).toString('utf8'); }
  function worker(slug) {
    const v = slug ? published().version : version, suffix = ':' + (slug ? 'shop-' + slug : 'gearhub');
    let source = rewrite(read(v, 'sw.js').toString('utf8'), v);
    source = source.replace(/const CACHE_NAME = "([^"]+)";/, (_, cache) => 'const CACHE_NAME = ' + JSON.stringify(cache + suffix) + ';');
    source = source.replace('key.startsWith("gearhub-shell-")', 'key.startsWith("gearhub-shell-") && key.endsWith(' + JSON.stringify(suffix) + ')');
    if (slug) source = source.replace(',"/",', ',"/shops/' + slug + '/",').replace('"/app.webmanifest"', '"/shops/' + slug + '/app.webmanifest"');
    return source;
  }
  const assets = express.Router();
  assets.get('/:version/*', (req, res) => {
    const v = req.params.version, name = req.params[0];
    if (!VERSION.test(v) || !STATIC.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) return res.sendStatus(404);
    let known;
    try { known = manifest(v); } catch { return res.sendStatus(404); }
    if (!known.has(name)) return res.sendStatus(404);
    if (/\.(?:js|css)$/i.test(name)) {
      const body = rewrite(read(v, name).toString('utf8'), v);
      res.type(path.extname(name)).set('Cache-Control', 'public, max-age=31536000, immutable').send(body);
    } else res.set('Cache-Control', 'public, max-age=31536000, immutable').sendFile(path.join(root, v, 'public', name));
  });
  return {published, status, publish, html, page, worker, assets};
}
module.exports = {createShopReleases};
