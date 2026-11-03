// Photo search (1.1.273, owner: "remember the part, not the background"): a camera picture of a part on a
// table or grass is cut out with U²-Netp (Apache-2.0, 4.6 MB, 320×320, in models/) and put on white, cropped
// to the part, like the shop's product photos. Only the part is then compared. On the owner's Drive Shaft
// scans on grass the right product rose from 0.65–0.69 to 0.71–0.73 alike while an unrelated product dropped.
const path = require("node:path");
const sharp = require("sharp");

const fs = require("node:fs"), os = require("node:os");
// With ≥1.5 GB (Render Standard, 2 GB) the better silueta model (44 MB) cuts the part out; on the 512 MB plan
// the small U²-Netp. Owner's Drive Shaft scans: right product 0.71/0.73 alike with U²-Netp, 0.74/0.78 with silueta.
function memoryLimit() {
  for (const file of ["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]) {
    try { const v = Number(fs.readFileSync(file, "utf8").trim()); if (Number.isFinite(v) && v > 0 && v < 1e15) return v; } catch {}
  }
  return os.totalmem();
}
const MODEL = path.join(__dirname, "..", "models", memoryLimit() >= 1.5e9 ? "silueta.onnx" : "u2netp.onnx");
const S = 320, MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
const { fork } = require("node:child_process");
// The model runs in lib/cut-worker.js (it briefly needs ~220 MB): one picture at a time, stopped after a
// minute without scans, and a picture that takes over 10 s (helper stopped or stuck) counts as a failure.
let child = null, idle = null, seq = 0, chain = Promise.resolve();
const waiting = new Map();
function helper() {
  if (child) return child;
  child = fork(path.join(__dirname, "cut-worker.js"), [], { serialization: "advanced", stdio: ["ignore", "ignore", "inherit", "ipc"] });
  const me = child;
  me.unref();
  me.on("message", ({ id, pred, error }) => { const w = waiting.get(id); if (!w) return; waiting.delete(id); error ? w.reject(new Error(error)) : w.resolve(new Float32Array(Uint8Array.from(pred).buffer)); });
  me.on("exit", () => { if (child === me) child = null; for (const [id, w] of waiting) { waiting.delete(id); w.reject(new Error("cut helper stopped")); } });
  return me;
}
function infer(tensor) {
  const run = () => new Promise((resolve, reject) => {
    clearTimeout(idle);
    const id = ++seq, c = helper(), timer = setTimeout(() => { if (waiting.delete(id)) { c.kill(); reject(new Error("cut took too long")); } }, 10000);
    waiting.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
    c.channel?.ref?.();
    c.send({ id, file: MODEL, input: Buffer.from(tensor.buffer) });
  }).finally(() => { if (!waiting.size) child?.channel?.unref?.(); clearTimeout(idle); idle = setTimeout(() => child?.kill(), 60000); idle.unref?.(); });
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}

// Returns a JPEG of the part on white, cropped to it with a small margin, or null when no single part
// stands out (nothing found, or the "part" fills almost the whole picture).
async function objectOnWhite(input) {
  const { data: rgb, info } = await sharp(input, { failOn: "none" }).rotate().removeAlpha()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const small = await sharp(rgb, { raw: info }).resize(S, S, { fit: "fill" }).raw().toBuffer();
  const tensor = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) tensor[c * S * S + i] = (small[i * 3 + c] / 255 - MEAN[c]) / STD[c];
  const pred = await infer(tensor);
  let lo = Infinity, hi = -Infinity;
  for (const v of pred) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1, mask = Buffer.alloc(S * S);
  let x0 = S, y0 = S, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, v = (pred[i] - lo) / span;
    mask[i] = Math.round(Math.min(1, Math.max(0, (v - 0.25) / 0.4)) * 255);
    if (mask[i] > 127) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const share = n / (S * S);
  if (share < 0.01 || share > 0.85) return null;
  const alpha = await sharp(mask, { raw: { width: S, height: S, channels: 1 } }).resize(info.width, info.height, { fit: "fill" }).extractChannel(0).raw().toBuffer();
  const onWhite = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) { const a = alpha[i] / 255; for (let c = 0; c < 3; c++) onWhite[i * 3 + c] = Math.round(rgb[i * 3 + c] * a + 255 * (1 - a)); }
  const sx = info.width / S, sy = info.height / S, mx = Math.round((x1 - x0) * sx * 0.08), my = Math.round((y1 - y0) * sy * 0.08);
  const left = Math.max(0, Math.round(x0 * sx) - mx), top = Math.max(0, Math.round(y0 * sy) - my);
  const width = Math.max(1, Math.min(info.width - left, Math.round((x1 - x0 + 1) * sx) + 2 * mx)), height = Math.max(1, Math.min(info.height - top, Math.round((y1 - y0 + 1) * sy) + 2 * my));
  return sharp(onWhite, { raw: { width: info.width, height: info.height, channels: 3 } }).extract({ left, top, width, height }).jpeg({ quality: 90 }).toBuffer();
}

// 1.1.275 (owner's Drive Shafts look alike): the part on white turned so its long side is upright and cropped
// tight, plus its shape (long side ÷ short side, from the mask's spread). Shop photos and scans are made the
// same way, so a part photographed lying down still compares with one standing up, and a long thin shaft
// is told from a short thick one. Returns { jpeg, aspect } or null.
async function partView(input) {
  const { data: rgb, info } = await sharp(input, { failOn: "none" }).rotate().removeAlpha()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const small = await sharp(rgb, { raw: info }).resize(S, S, { fit: "fill" }).raw().toBuffer();
  const tensor = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) tensor[c * S * S + i] = (small[i * 3 + c] / 255 - MEAN[c]) / STD[c];
  const pred = await infer(tensor);
  let lo = Infinity, hi = -Infinity;
  for (const v of pred) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1, mask = Buffer.alloc(S * S);
  let n = 0;
  for (let i = 0; i < S * S; i++) { const v = (pred[i] - lo) / span; mask[i] = Math.round(Math.min(1, Math.max(0, (v - 0.25) / 0.4)) * 255); if (mask[i] > 127) n++; }
  if (n / (S * S) < 0.01 || n / (S * S) > 0.85) return null;
  const W = info.width, H = info.height;
  const alpha = await sharp(mask, { raw: { width: S, height: S, channels: 1 } }).resize(W, H, { fit: "fill" }).extractChannel(0).raw().toBuffer();
  // The part's long axis (principal direction of the mask) and how long it is against how wide.
  let m = 0, mx = 0, my = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 127) { m++; mx += x; my += y; }
  mx /= m; my /= m;
  let cxx = 0, cyy = 0, cxy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 127) { const dx = x - mx, dy = y - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
  cxx /= m; cyy /= m; cxy /= m;
  const half = (cxx + cyy) / 2, root = Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy);
  const aspect = Math.sqrt((half + root) / Math.max(half - root, 1e-6));
  const degrees = 90 - 0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180 / Math.PI;
  const onWhite = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { const a = alpha[i] / 255; for (let c = 0; c < 3; c++) onWhite[i * 3 + c] = Math.round(rgb[i * 3 + c] * a + 255 * (1 - a)); }
  const turned = await sharp(onWhite, { raw: { width: W, height: H, channels: 3 } }).rotate(degrees, { background: "#ffffff" }).png().toBuffer();
  let jpeg;
  try { jpeg = await sharp(turned).trim({ background: "#ffffff", threshold: 12 }).jpeg({ quality: 90 }).toBuffer(); }
  catch { jpeg = await sharp(turned).jpeg({ quality: 90 }).toBuffer(); }
  return { jpeg, aspect };
}

module.exports = { objectOnWhite, partView };
