// Runs one background-removal model in its own short-lived process (1.1.230), so the model's memory is
// given back as soon as the photo is done and, if the server runs short of memory, only this helper
// stops — never the shop. Receives { file, size, input } and answers with the model's first output.
const ort = require("onnxruntime-node");
process.once("message", async ({ file, size, input }) => {
  try {
    const session = await ort.InferenceSession.create(file, { enableCpuMemArena: false, enableMemPattern: false, executionMode: "sequential", intraOpNumThreads: 1, interOpNumThreads: 1 });
    const data = new Float32Array(Uint8Array.from(input).buffer);
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, size, size]) });
    const pred = out[session.outputNames[0]].data;
    process.send({ pred: Buffer.from(pred.buffer, pred.byteOffset, pred.byteLength) }, () => process.exit(0));
  } catch (error) { process.send({ error: String(error?.message || error) }, () => process.exit(1)); }
});
