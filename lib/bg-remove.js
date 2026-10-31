// Background removal for product photos (owner, 1.1.227). Runs on our own server, no per-use cost.
// 1.1.228 owner: U²-Netp left smudges and soft edges, so the fast model is now "silueta" (rembg's U²-Net
// distilled for clean cut-outs, MIT; ONNX from npm "@rmbg/model-silueta", 44 MB). The mask is tightened
// (no grey halo, crisp edge) and applied as transparency.
// 1.1.229 owner: "Remove background" must finish the job by itself, also where the background shows
// through closed loops (the table inside a pump's pipe loop). BiRefNet (lite, MIT, 224 MB) does this, but
// needs ~0.9 GB while it works, so it is used only when the server has the memory for it (≥1.8 GB);
// otherwise silueta is used. BiRefNet is too big for the repository: the server downloads it once into
// DATA_DIR/models from rembg's GitHub release and uses silueta until it is there.
// Models load on first use and are let go after two quiet minutes so they do not hold server memory.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const SILUETA = path.join(__dirname, "..", "models", "silueta.onnx");
const BIREFNET_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx";
const BIREFNET_BYTES = 224005088, NEED_MEMORY = 1.8e9;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
const MODELS = {
  fast: { size: 320, file: () => SILUETA, options: { graphOptimizationLevel: "all" } },
  best: { size: 1024, file: () => birefnetPath, options: { graphOptimizationLevel: "all", enableCpuMemArena: false, enableMemPattern: false, intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length)) } }
};
const sessions = {}, timers = {};
let birefnetPath = "", downloading = null;
function load(kind) {
  clearTimeout(timers[kind]);
  if (!sessions[kind]) sessions[kind] = require("onnxruntime-node").InferenceSession.create(MODELS[kind].file(), MODELS[kind].options).catch(error => { sessions[kind] = null; throw error; });
  return sessions[kind];
}
function rest(kind) {
  clearTimeout(timers[kind]);
  timers[kind] = setTimeout(async () => { const s = sessions[kind]; sessions[kind] = null; try { await (await s)?.release?.(); } catch {} }, 120000);
  timers[kind].unref?.();
}
// The memory this server may use: the container limit when there is one, else the machine's.
function memoryLimit() {
  for (const file of ["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]) {
    try { const v = Number(fs.readFileSync(file, "utf8").trim()); if (Number.isFinite(v) && v > 0 && v < 1e15) return v; } catch {}
  }
  return os.totalmem();
}
// Fetches BiRefNet once (in the background) when the server has the memory to run it.
function prepare(dataDir) {
  if (birefnetPath || downloading || memoryLimit() < NEED_MEMORY || !dataDir) return downloading;
  const dir = path.join(dataDir, "models"), file = path.join(dir, "birefnet-lite.onnx");
  try { if (fs.statSync(file).size === BIREFNET_BYTES) { birefnetPath = file; return null; } } catch {}
  downloading = (async () => {
    fs.mkdirSync(dir, { recursive: true });
    const part = file + ".part", response = await fetch(BIREFNET_URL);
    if (!response.ok) throw new Error("BiRefNet download failed: " + response.status);
    await require("node:stream/promises").pipeline(require("node:stream").Readable.fromWeb(response.body), fs.createWriteStream(part));
    if (fs.statSync(part).size !== BIREFNET_BYTES) { fs.rmSync(part, { force: true }); throw new Error("BiRefNet download was incomplete."); }
    fs.renameSync(part, file); birefnetPath = file;
  })().catch(() => {}).finally(() => { downloading = null; });
  return downloading;
}
// One photo at a time, so two people cannot double the memory.
let queue = Promise.resolve();
function removeBackground(buffer, options = {}) {
  const job = queue.then(() => cut(buffer, options));
  queue = job.catch(() => {});
  return job;
}
// Returns { png, model } — a PNG with a transparent background, at most `max` pixels on the long side.
async function cut(buffer, { max = 1600, dataDir = "" } = {}) {
  prepare(dataDir);
  const kind = birefnetPath && memoryLimit() >= NEED_MEMORY ? "best" : "fast", SIZE = MODELS[kind].size;
  const { data: rgb, info } = await sharp(buffer, { limitInputPixels: 40e6 }).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const small = await sharp(rgb, { raw: info }).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer();
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + i] = (small[i * 3 + c] / 255 - MEAN[c]) / STD[c];
  const ort = require("onnxruntime-node"), model = await load(kind);
  const out = await model.run({ [model.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const pred = out[model.outputNames[0]].data;
  rest(kind);
  const mask = Buffer.alloc(SIZE * SIZE);
  if (kind === "best") {
    // BiRefNet gives raw scores; the sigmoid turns them into 0–1.
    for (let i = 0; i < mask.length; i++) mask[i] = Math.round(255 / (1 + Math.exp(-pred[i])));
  } else {
    // Soft model values between ~0.25 and ~0.65 become the edge; below is background, above is the object.
    let lo = Infinity, hi = -Infinity;
    for (const v of pred) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = hi - lo || 1;
    for (let i = 0; i < mask.length; i++) { const v = (pred[i] - lo) / span; mask[i] = Math.round(Math.min(1, Math.max(0, (v - 0.25) / 0.4)) * 255); }
  }
  dropSpecks(mask, SIZE);
  const alpha = await sharp(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(info.width, info.height, { fit: "fill", kernel: "lanczos3" }).blur(kind === "best" ? 0.3 : 0.6).extractChannel(0).raw().toBuffer();
  const png = await sharp(rgb, { raw: info }).joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png({ compressionLevel: 8 }).toBuffer();
  return { png, model: kind };
}
// Little loose bits away from the product (bits of table, plastic) are cleared: every separate patch
// smaller than 3% of the biggest one is made transparent.
function dropSpecks(mask, SIZE) {
  const label = new Int32Array(mask.length), sizes = [0], stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] < 40 || label[start]) continue;
    const id = sizes.length; let count = 0; label[start] = id; stack.push(start);
    while (stack.length) { const i = stack.pop(); count++; const x = i % SIZE, y = (i - x) / SIZE;
      for (const j of [x > 0 ? i - 1 : -1, x < SIZE - 1 ? i + 1 : -1, y > 0 ? i - SIZE : -1, y < SIZE - 1 ? i + SIZE : -1]) if (j >= 0 && !label[j] && mask[j] >= 40) { label[j] = id; stack.push(j); } }
    sizes.push(count);
  }
  const keep = Math.max(...sizes) * 0.03;
  for (let i = 0; i < mask.length; i++) if (label[i] && sizes[label[i]] < keep) mask[i] = 0;
}
module.exports = { removeBackground, prepare, memoryLimit, MODEL: SILUETA, NEED_MEMORY };
