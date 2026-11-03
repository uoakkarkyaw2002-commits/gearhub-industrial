// Helper process for the photo-search cut-out (1.1.273). U²-Netp briefly needs ~220 MB while it runs, so it
// lives here, not in the shop server: if the box runs short of memory only this helper stops. It stays up
// while a scan is going on (one frame after another) and object-crop.js stops it after a minute of rest.
const ort = require("onnxruntime-node");
let session = null;
process.on("message", async ({ id, file, input }) => {
  try {
    session = session || await ort.InferenceSession.create(file, { enableCpuMemArena: false, enableMemPattern: false, executionMode: "sequential", intraOpNumThreads: 1, interOpNumThreads: 1 });
    const data = new Float32Array(Uint8Array.from(input).buffer);
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, 320, 320]) });
    const pred = out[session.outputNames[0]].data;
    process.send({ id, pred: Buffer.from(pred.buffer, pred.byteOffset, pred.byteLength) });
  } catch (error) { process.send({ id, error: String(error?.message || error) }); }
});
