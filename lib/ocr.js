// Free AI #7 / #8 (FREE_AI_PLAN.md): reading text in photos (OCR) on the shop server with tesseract.js
// and its English data from node_modules (no outside service, nothing downloaded at run time).
// One picture at a time; the reader starts when needed and stops after a minute without work (memory).
const path = require("node:path");
const sharp = require("sharp");

function createOcr({ log = () => {} } = {}) {
  let worker = null, idle = null, queue = Promise.resolve();
  const langPath = path.join(path.dirname(require.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");
  async function get() {
    if (!worker) {
      const { createWorker } = require("tesseract.js");
      worker = createWorker("eng", 1, { langPath, cacheMethod: "none", gzip: true, logger: () => {}, errorHandler: (e) => log("ocr_error", e) });
    }
    clearTimeout(idle);
    idle = setTimeout(async () => { const w = worker; worker = null; try { await (await w)?.terminate(); } catch (_) {} }, 60000);
    idle.unref?.();
    return worker;
  }
  // Bigger, grey and with stretched contrast reads best.
  function read(image) {
    const run = queue.then(async () => {
      const picture = await sharp(image, { failOn: "none" }).rotate().resize({ width: 1600, withoutEnlargement: true }).greyscale().normalize().png().toBuffer();
      const { data } = await (await get()).recognize(picture);
      return String(data?.text || "");
    });
    queue = run.catch(() => {});
    return run;
  }
  return { read };
}

// ---- Part numbers (#7) -----------------------------------------------------------------------------
// Letters OCR often swaps with digits are read the same way on both sides (O/0, I/L/1, S/5, B/8, Z/2).
const plain = (v) => String(v || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
const loose = (v) => plain(v).replace(/O/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8").replace(/Z/g, "2");
// Codes on a label: letters and digits (with - / . inside), at least 4 long and with a digit.
function labelCodes(text) {
  const seen = new Set(), out = [];
  for (const m of String(text || "").toUpperCase().matchAll(/[0-9A-Z][0-9A-Z\-/.]{2,}[0-9A-Z]/g)) {
    const code = plain(m[0]);
    if (code.length >= 4 && /\d/.test(code) && !seen.has(code)) { seen.add(code); out.push(code); }
  }
  return out;
}
// Products whose Part No. or SKU is on the label (a code may also be printed inside a longer one).
function matchCodes(codes, products) {
  const found = [];
  for (const p of products) {
    for (const [field, value] of [["partNo", p.partNo], ["sku", p.sku]]) {
      const mine = loose(value);
      if (mine.length < 4) continue;
      const hit = codes.find((c) => { const c2 = loose(c); return c2 === mine || (mine.length >= 5 && c2.includes(mine)) || (c2.length >= 6 && mine.includes(c2)); });
      if (hit) { found.push({ id: String(p.id), code: hit, field, exact: loose(hit) === mine }); break; }
    }
  }
  return found.sort((a, b) => Number(b.exact) - Number(a.exact));
}

// ---- Payment receipts (#8) -------------------------------------------------------------------------
// KBZPay / WavePay / bank screenshots: the amount ("-55,000.00 Ks", "Amount 55000 MMK") and the
// transaction ID ("Transaction ID 01234567890123456789"). Phone numbers and dates are skipped.
function readReceipt(text, total) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amounts = [];
  for (const line of lines) {
    const money = /amount|total|ks|mmk|kyat|paid|transfer|ကျပ်|ငွေ/i.test(line);
    for (const m of line.matchAll(/(?<![\d.])-?(\d{1,3}(?:,\d{3})+|\d{3,9})(?:\.\d{1,2})?(?![\d,])/g)) {
      const digits = m[1].replace(/,/g, "");
      if (/^0?9\d{7,9}$/.test(digits)) continue;   // a phone number
      if (/^(19|20)\d{2}$/.test(digits)) continue; // a year
      const value = Number(digits);
      if (value >= 100) amounts.push({ value, money: money || /,/.test(m[1]) || m[0].startsWith("-") });
    }
  }
  const likely = [...amounts.filter((a) => a.money), ...amounts.filter((a) => !a.money)].map((a) => a.value);
  const unique = [...new Set(likely)];
  let transactionId = "";
  for (const line of lines) {
    if (!/trans|txn|ref|id\b|no\.?\b|နံပါတ်/i.test(line)) continue;
    const id = (line.match(/[0-9A-Z]{10,}/i) || [])[0];
    if (id && /\d{6,}/.test(id)) { transactionId = id; break; }
  }
  if (!transactionId) transactionId = (String(text).match(/\d{14,}/) || [])[0] || "";
  const amount = unique.includes(Number(total)) ? Number(total) : unique[0] ?? null;
  return { amount, amounts: unique.slice(0, 5), transactionId, matches: amount != null && Number(total) === amount };
}

module.exports = { createOcr, labelCodes, matchCodes, readReceipt, loose };
