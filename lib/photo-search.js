// Photo search (owner's request): finds the shop's product whose photos look most like a scanned photo.
// DINOv2-small (Meta, Apache-2.0; ONNX from Hugging Face "Xenova/dinov2-small", uint8 weights, 24 MB)
// turns a picture into 384 numbers (its "look"). Every product photo's look is computed once and kept
// next to the photo (media/<shop>/.photo-looks), so a scan only compares numbers. On the POLESTAR
// photos it put the right product first ~5× more often than the small on-phone model, and blank or
// blurred camera frames score far below real matches (~0.35 against ~0.9), so they can be ignored.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { categoryOf } = require("./category-hierarchy");

const MODEL = path.join(__dirname, "..", "models", "dinov2-small-q8.onnx");
const SIZE = 224, DIM = 384, MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
const LOOK_FILE = ".dinov2s.f32";

function createPhotoSearch({ db, media, log = () => {} }) {
  let session = null, queue = Promise.resolve();
  const ort = () => require("onnxruntime-node");
  const load = () => session || (session = ort().InferenceSession.create(MODEL, { intraOpNumThreads: 1, interOpNumThreads: 1 }).catch(error => { session = null; throw error; }));
  // One picture at a time, so scans and background learning never overload the server.
  const serial = fn => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

  // A picture → its look: fitted on white like the shop's product photos, 224×224, unit length.
  async function look(input) {
    const { data } = await sharp(input, { failOn: "none" }).rotate().removeAlpha()
      .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" }).raw().toBuffer({ resolveWithObject: true });
    const pixels = new Float32Array(3 * SIZE * SIZE);
    for (let i = 0; i < SIZE * SIZE; i++) for (let c = 0; c < 3; c++) pixels[c * SIZE * SIZE + i] = (data[i * 3 + c] / 255 - MEAN[c]) / STD[c];
    const s = await load();
    const out = await serial(() => s.run({ pixel_values: new (ort().Tensor)("float32", pixels, [1, 3, SIZE, SIZE]) }));
    const v = Float32Array.from(out.last_hidden_state.data.subarray(0, DIM));
    let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= n;
    return v;
  }

  // The shop's product photos: every photo of every active product (several angles per product).
  function photos(shop) {
    const file = db.prepare("SELECT id, filename FROM platform_files WHERE id=? AND shop_id=? AND kind='image' AND ready=1");
    const out = [];
    for (const p of db.prepare("SELECT id, image_id, details FROM platform_products WHERE shop_id=? AND active=1").all(shop.id)) {
      let ids = [];
      try { ids = JSON.parse(p.details || "{}").imageIds || []; } catch (_) {}
      if (!ids.length && p.image_id) ids = [p.image_id];
      for (const id of ids) { const f = file.get(id, shop.id); if (f) out.push({ product: p.id, id: f.id, file: path.join(media, String(shop.id), f.filename) }); }
    }
    return out;
  }

  // shop id → { looks: Map(photo id → { product, v }), unreadable: photo ids that could not be read, learning }
  const shops = new Map();
  const stateOf = shop => shops.get(shop.id) || (shops.set(shop.id, { looks: new Map(), unreadable: new Set(), learning: null }), shops.get(shop.id));
  const known = (st, id) => st.looks.has(id) || st.unreadable.has(id);
  function learn(shop) {
    const st = stateOf(shop);
    return st.learning || (st.learning = (async () => {
      const list = photos(shop), dir = path.join(media, String(shop.id), ".photo-looks");
      const keep = new Set(list.map(p => p.id));
      for (const id of st.looks.keys()) if (!keep.has(id)) st.looks.delete(id);
      for (const p of list) {
        if (known(st, p.id)) continue;
        const saved = path.join(dir, p.id + LOOK_FILE);
        let v = null;
        try { const b = fs.readFileSync(saved); if (b.length === DIM * 4) v = new Float32Array(b.buffer, b.byteOffset, DIM).slice(); } catch (_) {}
        if (!v) {
          try {
            v = await look(p.file);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(saved, Buffer.from(v.buffer));
          } catch (error) { st.unreadable.add(p.id); log("photo_search_unreadable_photo", p.id, error.message); continue; }
        }
        st.looks.set(p.id, { product: p.product, v });
      }
    })().finally(() => { st.learning = null; }));
  }

  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  // A scanned photo: the whole picture and two closer views of its middle (the part is usually centred, with the table or a
  // hand around it). Returns the 5 closest products with their best photo score (0–1), which of
  // their photos matched and which view of the scan.
  async function ranked(shop, image) {
    const st = stateOf(shop), list = photos(shop);
    // New photos are learned first (a few seconds); a whole shop is learned at server start (warm).
    if (list.some(p => !known(st, p.id))) {
      learn(shop).catch(() => {});
      return { ready: false, learned: list.filter(p => known(st, p.id)).length, total: list.length };
    }
    const meta = await sharp(image, { failOn: "none" }).rotate().metadata();
    const w = meta.autoOrient?.width || meta.width, h = meta.autoOrient?.height || meta.height;
    const middle = k => sharp(image, { failOn: "none" }).rotate()
      .extract({ left: Math.round(w * (1 - k) / 2), top: Math.round(h * (1 - k) / 2), width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }).toBuffer();
    const queries = [await look(image), await look(await middle(0.7)), await look(await middle(0.5))];
    // Each product's photos in order, so a match can say "its photo 2 of 4" (the reason shown with it).
    const order = new Map();
    for (const p of list) { const ids = order.get(p.product) || []; ids.push(p.id); order.set(p.product, ids); }
    const best = new Map();
    for (const [photo, { product, v }] of st.looks) {
      const scores = queries.map(q => dot(q, v)), s = Math.max(...scores);
      if (!(best.get(product)?.score >= s)) best.set(product, { score: s, photo, view: scores.indexOf(s) });
    }
    return { ready: true, best: [...best].sort((a, b) => b[1].score - a[1].score), order };
  }
  async function search(shop, image) {
    const r = await ranked(shop, image);
    if (!r.ready) return r;
    // view: 0 the whole picture, 1 and 2 closer views of its middle.
    const matches = r.best.slice(0, 5).map(([id, m]) => {
      const ids = r.order.get(id) || [];
      return { id: String(id), score: Math.round(m.score * 1000) / 1000, photo: ids.indexOf(m.photo) + 1, photos: ids.length, view: m.view };
    });
    return { ready: true, matches };
  }

  // Photo quality (free AI #4): too dark, or blurred. Measured on POLESTAR photos: clear ones have an edge
  // strength of 7.7–27 and brightness 179+; blurred ones 2.6–8.4, dark ones 36–46. Warnings only.
  async function quality(image) {
    const g = sharp(image, { failOn: "none" }).rotate().resize(512, 512, { fit: "inside" }).greyscale();
    const brightness = (await g.clone().stats()).channels[0].mean;
    const edges = await g.clone().convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 }).raw().toBuffer();
    let sum = 0, sq = 0;
    for (const v of edges) { sum += v; sq += v * v; }
    const mean = sum / edges.length, sharpness = Math.sqrt(Math.max(0, sq / edges.length - mean * mean));
    const dark = brightness < 70;
    return { dark, blurry: !dark && sharpness < 5, brightness: Math.round(brightness), sharpness: Math.round(sharpness * 10) / 10 };
  }

  // A new product photo in the shop admin (free AI #2, #3, #4): which category its look-alikes are in,
  // which existing products look the same (maybe added twice), and whether the photo is dark or blurred.
  async function insight(shop, image, { exclude } = {}) {
    const q = await quality(image);
    const r = await ranked(shop, image);
    if (!r.ready) return { ready: false, quality: q };
    let settings = {};
    try { settings = JSON.parse(shop.settings || "{}"); } catch (_) {}
    const cats = Array.isArray(settings.categories) ? settings.categories : [], key = v => String(v || "").trim().toLowerCase();
    const parentOf = c => {
      if (!c?.parent_en) return null;
      const named = cats.filter(p => p !== c && key(p.category_en) === key(c.parent_en));
      return (c.parent_id != null && cats.find(p => Number(p.id) === Number(c.parent_id))) || named.find(p => !p.parent_en) || named[0] || null;
    };
    const pathOf = c => { const out = [], seen = new Set(); for (let x = c; x && !seen.has(x); x = parentOf(x)) { seen.add(x); out.unshift(x.category_en); } return out.join(" › "); };
    const products = new Map(db.prepare("SELECT id,sku,name,category,details FROM platform_products WHERE shop_id=? AND active=1").all(shop.id).map(p => {
      let d = {};
      try { d = JSON.parse(p.details || "{}"); } catch (_) {}
      return [p.id, { ...p, categoryId: d.categoryId }];
    }));
    const near = r.best.filter(([id]) => String(id) !== String(exclude ?? "") && products.has(id));
    // The closest 8 products vote for their category (a closer look counts more).
    const votes = new Map();
    for (const [id, m] of near.slice(0, 8)) {
      if (m.score < 0.5) continue;
      const p = products.get(id), c = categoryOf(p, cats);
      if (!c) continue;
      const v = votes.get(c) || { total: 0, score: 0, example: p.name };
      v.total += m.score;
      if (m.score > v.score) { v.score = m.score; v.example = p.name; }
      votes.set(c, v);
    }
    const round = n => Math.round(n * 1000) / 1000;
    const categories = [...votes].sort((a, b) => b[1].total - a[1].total).slice(0, 3)
      .map(([c, v]) => ({ id: c.id ?? null, name: c.category_en, nameMy: c.category_my || c.category_en, path: pathOf(c), score: round(v.score), example: v.example }));
    // The same part already in the shop (it looks almost identical).
    const duplicates = near.filter(([, m]) => m.score >= 0.93).slice(0, 3)
      .map(([id, m]) => { const p = products.get(id); return { id: String(id), name: p.name, sku: p.sku, score: round(m.score) }; });
    return { ready: true, categories, duplicates, quality: q };
  }

  // Learn every shop's photos a little after the server starts, so the first scan answers at once.
  function warm() {
    (async () => {
      for (const shop of db.prepare("SELECT id FROM platform_shops WHERE legacy=0").all()) {
        try { await learn(shop); } catch (error) { log("photo_search_warm_failure", error); }
      }
    })();
  }
  // Similar parts (free AI #6): the products whose photos look most like this product's photos.
  async function similar(shop, productId, limit = 6) {
    const st = stateOf(shop), list = photos(shop);
    if (list.some(p => !known(st, p.id))) { learn(shop).catch(() => {}); return { ready: false, products: [] }; }
    const mine = [...st.looks.values()].filter(l => String(l.product) === String(productId)).map(l => l.v);
    if (!mine.length) return { ready: true, products: [] };
    const best = new Map();
    for (const { product, v } of st.looks.values()) {
      if (String(product) === String(productId)) continue;
      const s = Math.max(...mine.map(m => dot(m, v)));
      if (!(best.get(product) >= s)) best.set(product, s);
    }
    const products = [...best].filter(([, s]) => s >= 0.55).sort((a, b) => b[1] - a[1]).slice(0, limit)
      .map(([id, s]) => ({ id: String(id), score: Math.round(s * 1000) / 1000 }));
    return { ready: true, products };
  }
  return { search, insight, quality, similar, learn, warm };
}

module.exports = { createPhotoSearch };
