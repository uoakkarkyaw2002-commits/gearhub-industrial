// Background removal for product photos (owner, 1.1.227). Runs on our own server, no per-use cost.
// 1.1.228 owner: U²-Netp left smudges and soft edges, so the model is now "silueta" (rembg's U²-Net
// distilled for clean cut-outs, MIT; ONNX from npm "@rmbg/model-silueta", 44 MB). The mask is tightened
// (no grey halo, crisp edge) and applied as transparency. The model loads on first use and is let go
// after two quiet minutes so it does not hold server memory.
const path = require("node:path");
const sharp = require("sharp");
const MODEL = path.join(__dirname, "..", "models", "silueta.onnx");
const SIZE = 320, MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
let session = null, idle = null;
function load() {
  clearTimeout(idle);
  if (!session) session = require("onnxruntime-node").InferenceSession.create(MODEL, { graphOptimizationLevel: "all" }).catch(error => { session = null; throw error; });
  return session;
}
function rest() {
  clearTimeout(idle);
  idle = setTimeout(async () => { const s = session; session = null; try { await (await s)?.release?.(); } catch {} }, 120000);
  idle.unref?.();
}
// Returns a PNG with a transparent background, at most `max` pixels on the long side.
async function removeBackground(buffer, max = 1600) {
  const image = sharp(buffer, { limitInputPixels: 40e6 }).rotate();
  const { data: rgb, info } = await image.clone().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const small = await sharp(rgb, { raw: info }).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer();
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + i] = (small[i * 3 + c] / 255 - MEAN[c]) / STD[c];
  const ort = require("onnxruntime-node"), model = await load();
  const out = await model.run({ [model.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const pred = out[model.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (const v of pred) { if (v < lo) lo = v; if (v > hi) hi = v; }
  rest();
  // Soft model values between ~0.25 and ~0.65 become the edge; below is background, above is the object.
  const mask = Buffer.alloc(SIZE * SIZE), span = hi - lo || 1;
  for (let i = 0; i < mask.length; i++) { const v = (pred[i] - lo) / span; mask[i] = Math.round(Math.min(1, Math.max(0, (v - 0.25) / 0.4)) * 255); }
  dropSpecks(mask);
  const alpha = await sharp(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(info.width, info.height, { fit: "fill", kernel: "lanczos3" }).blur(0.6).extractChannel(0).raw().toBuffer();
  return sharp(rgb, { raw: info }).joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png({ compressionLevel: 8 }).toBuffer();
}
// Little loose bits away from the product (bits of table, plastic) are cleared: every separate patch
// smaller than 3% of the biggest one is made transparent.
function dropSpecks(mask) {
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
module.exports = { removeBackground, MODEL };
