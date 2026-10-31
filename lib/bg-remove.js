// Background removal for product photos (owner, 1.1.227). Runs on our own server, no per-use cost:
// U²-Netp (Qin et al., Apache-2.0; ONNX from npm "@rmbg/model-u2netp", 4.6 MB) finds the object; the
// mask is softened and applied as transparency. The model loads on first use and stays in memory.
const path = require("node:path");
const sharp = require("sharp");
const MODEL = path.join(__dirname, "..", "models", "u2netp.onnx");
const SIZE = 320, MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
let session = null;
function load() {
  if (!session) session = require("onnxruntime-node").InferenceSession.create(MODEL).catch(error => { session = null; throw error; });
  return session;
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
  const mask = Buffer.alloc(SIZE * SIZE), span = hi - lo || 1;
  for (let i = 0; i < mask.length; i++) mask[i] = Math.round(((pred[i] - lo) / span) * 255);
  const alpha = await sharp(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(info.width, info.height, { fit: "fill" }).blur(0.8).extractChannel(0).raw().toBuffer();
  return sharp(rgb, { raw: info }).joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png({ compressionLevel: 8 }).toBuffer();
}
module.exports = { removeBackground, MODEL };
