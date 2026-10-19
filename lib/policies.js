// GearHub policies page (/policies.html). The GearHub owner edits the text in the
// owner dashboard; it is stored in platform_meta('policies') and rendered here as a
// static page (no scripts). Text uses a tiny format so nobody needs HTML:
//   ## Heading         - list item        > highlighted note        **bold**
// A blank line starts a new paragraph. English-only text is shown in grey, and the
// part after " / " is grey when it has no Myanmar letters.
const SECTIONS = ["intro", "terms", "privacy", "delivery", "seller", "contact"];
const LIMITS = { title: 120, subtitle: 160, body: 20000, phone: 40, email: 120 };
const DEFAULTS = {
  phone: "09-766472432",
  email: "",
  sections: {
    intro: { title: "GearHub စည်းကမ်းများ", subtitle: "Terms of Use, Privacy Policy and Seller Rules", body: `GearHub က ဆိုင်တွေ အွန်လိုင်းမှာ ပစ္စည်းရောင်းနိုင်အောင် အဆင်သင့်ဆိုင် ပေးတဲ့ platform ပါ။ GearHub ဆိုင်နဲ့ GearHub ပေါ်က ဆိုင်တိုင်း (/shops/…) ကို ဒီစည်းကမ်းတွေ သက်ဆိုင်ပါတယ်။

GearHub provides ready-made online shops. These rules apply to the GearHub store and to every shop hosted on GearHub (/shops/…).` },
    terms: { title: "၁။ အသုံးပြုမှု စည်းကမ်း", subtitle: "1. Terms of Use", body: `## ဝယ်သူနဲ့ ဆိုင် / Buyers and shops
ဆိုင်တစ်ဆိုင်ချင်းစီက ကိုယ့်ပစ္စည်း၊ ဈေးနှုန်း၊ stock၊ ပို့ဆောင်မှုနဲ့ ပြန်အမ်းငွေကို ကိုယ်တိုင် တာဝန်ယူပါတယ်။ ဝယ်ယူမှုဆိုတာ ဝယ်သူနဲ့ အဲ့ဒီဆိုင်ကြားက သဘောတူညီချက်ပါ။ ပြဿနာ ဖြစ်ရင် GearHub က ညှိနှိုင်းပေးဖို့ ကူညီနိုင်ပါတယ်။

Each shop is responsible for its own products, prices, stock, delivery and refunds. A purchase is an agreement between the buyer and that shop. GearHub can help mediate if there is a problem.

## ငွေပေးချေမှု / Payment
ဝယ်သူက ဆိုင်ရဲ့ KBZPay / WavePay / ဘဏ်အကောင့်ကို တိုက်ရိုက် ငွေလွှဲပြီး ပြေစာ (screenshot) တင်ရပါတယ်။ ဆိုင်က ငွေရောက်ကြောင်း စစ်ပြီးမှ အော်ဒါကို အတည်ပြုပါတယ်။ GearHub က ဝယ်သူ့ငွေကို လက်ခံ၊ ကိုင်တွယ်ခြင်း မရှိပါ။

Buyers pay the shop directly (KBZPay, WavePay or bank transfer) and upload a receipt. The shop confirms the order after checking the payment. GearHub does not receive or hold buyers' money.

## မလုပ်ရ / Not allowed
- လိမ်လည်ခြင်း၊ အတုပစ္စည်း သို့မဟုတ် တရားမဝင်ပစ္စည်း ရောင်းခြင်း / Fraud, or selling fake or illegal goods
- အခြားသူ့ account သို့မဟုတ် data ကို ခွင့်မရှိဘဲ ဝင်ကြည့်ဖို့ ကြိုးစားခြင်း / Trying to access another person's account or data
- Website ကို ပျက်စီးအောင်၊ နှေးအောင် လုပ်ခြင်း / Attacking, overloading or disrupting the website

## ပြောင်းလဲမှု / Changes
ဒီစည်းကမ်းတွေကို ပြင်ဆင်နိုင်ပါတယ်။ အရေးကြီး ပြောင်းလဲမှုတွေကို ဒီစာမျက်နှာနဲ့ ဆိုင်ရှင် dashboard မှာ ကြေညာပါမယ်။

These rules may change. Important changes are announced on this page and in the seller dashboard.` },
    privacy: { title: "၂။ ကိုယ်ရေးအချက်အလက်", subtitle: "2. Privacy Policy", body: `## ဘာတွေ သိမ်းလဲ / What we keep
- **ဝယ်သူ** — နာမည်၊ ဖုန်း၊ လိပ်စာ၊ email (ထည့်ရင်)၊ ငွေလွှဲပြေစာ ပုံ (အော်ဒါ ပို့ဆောင်ဖို့၊ ငွေစစ်ဖို့) / Buyers: name, phone, address, optional email and payment receipt, to deliver the order and check payment
- **ဆိုင်ရှင်** — Google account နာမည်နဲ့ email၊ ဆိုင်အချက်အလက်၊ ပစ္စည်းပုံ / Sellers: Google name and email, shop details and product photos
- **အားလုံး** — Login cookie (ဝင်ထားမှပဲ)၊ ဈေးခြင်းကို ကိုယ့်ဖုန်း/ကွန်ပြူတာထဲမှာပဲ သိမ်း / Everyone: a sign-in cookie only when signed in; your cart stays on your own device

- **ကြော်ငြာ / tracking cookie မသုံးပါ။ Data ကို မရောင်းပါ။** / No advertising or tracking cookies. We never sell data.
- ဝယ်သူ့ အချက်အလက်ကို ဝယ်ခဲ့တဲ့ ဆိုင်နဲ့ GearHub admin ကသာ မြင်ရပါတယ်။ / Buyer details are visible only to the shop you bought from and the GearHub admin.
- Data ကို Render (server) နဲ့ Cloudflare R2 (backup) မှာ သိမ်းပြီး HTTPS နဲ့ ပို့ပါတယ်။ / Data is stored on Render and Cloudflare R2 (backups); all connections use HTTPS.

## ဘယ်လောက်ကြာ သိမ်းလဲ / How long
- အော်ဒါမှတ်တမ်း — **၂ နှစ်** / Order records — 2 years
- Backup — **ရက် ၃၀** / Backups — 30 days

## ဖျက်ခိုင်းချင်ရင် / Deleting your data
ဆက်သွယ်ရန်ကို ပြောပါ။ **ရက် ၃၀** အတွင်း ဖျက်ပေးပါမယ် (ဥပဒေအရ သိမ်းထားရမယ့် စာရင်းကလွဲရင်)။

Contact us. We delete your data within 30 days, except records we must keep by law.` },
    delivery: { title: "ပို့ဆောင်ခြင်း၊ ပြန်လဲခြင်း၊ အာမခံ", subtitle: "Delivery, returns and warranty", body: `ပို့ဆောင်ခ၊ ပို့ဆောင်ချိန်၊ ပစ္စည်းပြန်လဲခြင်း၊ ငွေပြန်အမ်းခြင်းနဲ့ အာမခံကို **ဆိုင်တစ်ဆိုင်ချင်းစီက သတ်မှတ်ပါတယ်**။ ဆိုင်က ဖော်ပြမထားရင် **မဝယ်ခင် ဆိုင်ကို မေးပါ**။

Each shop sets its own delivery fee and time, returns, refunds and warranty. If a shop does not state them, ask the shop before you buy.

- ပစ္စည်းရရင် ချက်ချင်း စစ်ပါ။ ပြဿနာရှိရင် ဆိုင်ကို အမြန်ဆုံး အော်ဒါနံပါတ်နဲ့ ဆက်သွယ်ပါ။ / Check items on arrival and contact the shop quickly with your order number.
- ငွေလွှဲပြေစာနဲ့ အော်ဒါနံပါတ်ကို သိမ်းထားပါ။ / Keep your payment receipt and order number.
- ဆိုင်နဲ့ ညှိမရရင် GearHub ကို ဆက်သွယ်ပါ၊ ညှိနှိုင်းပေးပါမယ်။ / If you cannot agree with the shop, contact GearHub and we will help mediate.` },
    seller: { title: "၃။ ဆိုင်ရှင် စည်းကမ်း", subtitle: "3. Seller Rules", body: `## ဆိုင်ဖွင့်ခွင့် / Opening a shop
- Google account နဲ့ လျှောက်ရပြီး GearHub ကသာ approve / reject လုပ်ပါတယ်။ / Apply with a Google account; only GearHub approves or rejects shops.
- Google account တစ်ခုကို ဆိုင်တစ်ဆိုင်ပဲ ဖွင့်ခွင့်ရှိပါတယ်။ / One shop per Google account.

## ဝန်ဆောင်ခ / Fees
> **လောလောဆယ် အခမဲ့ ဖြစ်ပါတယ်။** နောက်ပိုင်း ဝန်ဆောင်ခ ယူမယ်ဆိုရင် ဆိုင်ရှင်တွေကို ကြိုတင် အသိပေးပါမယ်။ ငွေမပေးလို့ ဆိုင်ကို ချက်ချင်း မပိတ်ပါ။
> GearHub is currently free. If fees start later, sellers will be told in advance. No shop is closed without notice.

## ရောင်းခွင့်မရှိတဲ့ ပစ္စည်း / Not allowed
- လက်နက်၊ ပေါက်ကွဲစေတတ်သော ပစ္စည်း / Weapons and explosives
- မူးယစ်ဆေးဝါး / Illegal drugs
- အတု၊ ခိုးရာပါ၊ မူပိုင်ခွင့် ချိုးဖောက်ထားသော ပစ္စည်း / Fake, stolen or counterfeit goods
- ဆရာဝန်ညွှန်ကြားချက် လိုအပ်သော ဆေးဝါး / Prescription-only medicines

## ဆိုင်ရှင် တာဝန် / Seller duties
- ပစ္စည်းဖော်ပြချက်၊ ဈေးနှုန်း၊ stock မှန်ကန်ရမယ်။ / Keep descriptions, prices and stock accurate.
- ငွေလွှဲပြေစာကို စစ်ပြီးမှ အော်ဒါ အတည်ပြုရမယ်။ / Confirm orders only after checking the payment.
- ဝယ်သူ အချက်အလက်ကို အော်ဒါအတွက်သာ သုံးရမယ်။ / Use buyer details only for their order.

## ပိတ်ခံရနိုင်တဲ့ အကြောင်း / Suspension
ရောင်းခွင့်မရှိတဲ့ ပစ္စည်း ရောင်းခြင်း၊ ဝယ်သူကို လိမ်ခြင်း၊ တိုင်ကြားချက် များခြင်း ဖြစ်ရင် — ပထမ သတိပေး → ထပ်ဖြစ်ရင် ယာယီပိတ် → ပြင်းထန်ရင် အပြီးပိတ်။

For banned goods, cheating buyers or repeated complaints: first a warning, then a temporary suspension, and permanent closure for serious cases.

## ဆိုင် ရပ်နားသွားရင် / Inactive or closed shops
ဆိုင် ရပ်နားသွားရင် ဝယ်သူတွေ ဝယ်လို့ မရတော့ပေမဲ့ **data မပျက်ပါ**။ **ရက် ၉၀** ကျော်ရင် ဆိုင်ရှင်ကို ကြိုတင် အသိပေးပြီးမှ ဖျက်ပါမယ်။ ပစ္စည်းနဲ့ အော်ဒါစာရင်းကို ဆိုင်ရှင် dashboard ကနေ export လုပ်လို့ ရပါတယ်။

When a shop is inactive, buyers cannot order but no data is lost. After 90 days we warn the seller before deleting anything. Sellers can export products and orders from their dashboard.` },
    contact: { title: "ဆက်သွယ်ရန်", subtitle: "Contact", body: "" },
  },
  updated: "2026-10-19",
};
const NAV = { terms: "အသုံးပြုမှု စည်းကမ်း / Terms", privacy: "ကိုယ်ရေးအချက်အလက် / Privacy", delivery: "ပို့ဆောင်ခြင်း၊ ပြန်လဲခြင်း / Delivery & returns", seller: "ဆိုင်ရှင် စည်းကမ်း / Seller rules", contact: "ဆက်သွယ်ရန် / Contact" };

const clean = (v, max) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ").trim();
const yangonDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });

function load(db) {
  let saved = null;
  try { const row = db.prepare("SELECT value FROM platform_meta WHERE key='policies'").get(); if (row) saved = JSON.parse(row.value); } catch {}
  if (!saved || typeof saved !== "object") return { ...structuredClone(DEFAULTS), custom: false };
  const out = { phone: oneLine(saved.phone, LIMITS.phone), email: oneLine(saved.email, LIMITS.email), updated: oneLine(saved.updated, 20) || DEFAULTS.updated, sections: {}, custom: true };
  for (const id of SECTIONS) { const s = saved.sections?.[id] || {}; out.sections[id] = { title: oneLine(s.title, LIMITS.title), subtitle: oneLine(s.subtitle, LIMITS.subtitle), body: clean(s.body, LIMITS.body) }; }
  return out;
}
// Validates owner input, stamps today's Myanmar date and saves. reset:true restores the defaults.
function save(db, input) {
  if (input?.reset === true) { db.prepare("DELETE FROM platform_meta WHERE key='policies'").run(); return load(db); }
  const email = oneLine(input?.email, LIMITS.email), phone = oneLine(input?.phone, LIMITS.phone);
  if (email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) { const e = new Error("Enter a valid email or leave it empty."); e.status = 400; throw e; }
  if (phone && !/^[+0-9][0-9 ()-]{4,}$/.test(phone)) { const e = new Error("Enter a valid phone number or leave it empty."); e.status = 400; throw e; }
  const value = { phone, email, updated: yangonDay(), sections: {} };
  for (const id of SECTIONS) {
    const s = input?.sections?.[id] || {};
    value.sections[id] = { title: oneLine(s.title, LIMITS.title), subtitle: oneLine(s.subtitle, LIMITS.subtitle), body: clean(s.body, LIMITS.body) };
    if (id !== "contact" && id !== "intro" && !value.sections[id].title && value.sections[id].body.trim()) { const e = new Error("Each section with text needs a title."); e.status = 400; throw e; }
  }
  if (!value.sections.intro.title) value.sections.intro.title = DEFAULTS.sections.intro.title;
  db.prepare("INSERT INTO platform_meta(key,value) VALUES('policies',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));
  return load(db);
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MY = /[က-႟ꩠ-ꩿ]/;
// Escape first, then the only markup we add is <strong> and the grey English span.
function inline(text) {
  let html = esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const cut = html.lastIndexOf(" / ");
  const tail = html.slice(cut + 3), balanced = !/<\/strong>/.test(tail) || /<strong>/.test(tail);
  if (cut > 0 && balanced && MY.test(html.slice(0, cut)) && !MY.test(tail)) html = html.slice(0, cut) + ' / <span class="en">' + html.slice(cut + 3) + "</span>";
  return html;
}
function body(text) {
  const out = []; let list = null, para = [], note = [];
  const flushPara = () => { if (para.length) { const raw = para.join(" "); out.push(`<p${MY.test(raw) ? "" : ' class="en"'}>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = null; } };
  const flushNote = () => { if (note.length) { out.push(`<p class="note">${note.map(inline).join("<br>")}</p>`); note = []; } };
  const flush = () => { flushPara(); flushList(); flushNote(); };
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (t.startsWith("## ")) { flush(); out.push(`<h3>${inline(t.slice(3))}</h3>`); continue; }
    if (/^[-•*] /.test(t)) { flushPara(); flushNote(); (list ||= []).push(t.slice(2)); continue; }
    if (t.startsWith("> ")) { flushPara(); flushList(); note.push(t.slice(2)); continue; }
    flushList(); flushNote(); para.push(t);
  }
  flush();
  return out.join("\n");
}
function render(p) {
  const s = p.sections, shown = SECTIONS.filter((id) => id === "intro" || id === "contact" ? true : s[id].body.trim());
  const contact = [p.phone && `<div>📞 <a href="tel:${esc(p.phone.replace(/[^+0-9]/g, "").replace(/^0/, "+95"))}">${esc(p.phone)}</a></div>`, p.email && `<div>✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>`].filter(Boolean).join("");
  const section = (id) => {
    const x = s[id];
    if (id === "intro") return `<section aria-labelledby="intro-title"><h1 id="intro-title">${esc(x.title)}</h1>${x.subtitle ? `<p class="en">${esc(x.subtitle)}</p>` : ""}${body(x.body)}<p class="updated">နောက်ဆုံးပြင်ဆင်ရက် / Last updated: ${esc(p.updated)}</p></section>`;
    if (id === "contact") return contact || x.body.trim() ? `<section id="contact" aria-labelledby="contact-title"><h2 id="contact-title">${esc(x.title || "ဆက်သွယ်ရန်")}</h2>${x.subtitle ? `<p class="en">${esc(x.subtitle)}</p>` : ""}${body(x.body)}<div class="contact">${contact}</div></section>` : "";
    return `<section id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${esc(x.title)}</h2>${x.subtitle ? `<p class="en">${esc(x.subtitle)}</p>` : ""}${body(x.body)}</section>`;
  };
  const nav = shown.filter((id) => id !== "intro" && (id !== "contact" || contact || s.contact.body.trim())).map((id) => `<a href="#${id}">${esc(NAV[id])}</a>`).join("");
  return `<!doctype html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#183426">
<title>GearHub စည်းကမ်းများ | Terms, Privacy &amp; Seller Rules</title>
<meta name="description" content="GearHub terms of use, privacy policy and seller rules in Myanmar and English.">
<link rel="icon" href="/favicon.ico">
<style>
:root{--green:#17482b;--leaf:#398d1b;--ink:#1f2b24;--muted:#5f6f65;--line:#dfe8e2;--soft:#f3f8f4;--bg:#f7faf8;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI","Noto Sans Myanmar","Myanmar Text",sans-serif}
a{color:var(--leaf)}
header{background:var(--green);color:#fff;padding:18px 16px}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px}
header a.home{color:#fff;text-decoration:none;font-weight:800;letter-spacing:.5px}
header small{opacity:.8}
.wrap{max-width:860px;margin:0 auto}
nav.toc{position:sticky;top:0;z-index:2;background:var(--card);border-bottom:1px solid var(--line)}
nav.toc .wrap{display:flex;gap:6px;overflow-x:auto;padding:10px 16px}
nav.toc a{flex:none;text-decoration:none;font-size:14px;font-weight:700;color:var(--green);background:var(--soft);padding:7px 12px;border-radius:999px}
main{padding:20px 16px 48px}
section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin:0 0 18px;scroll-margin-top:64px;overflow-wrap:anywhere}
h1{margin:0 0 4px;font-size:24px;line-height:1.35}
h2{margin:0 0 2px;font-size:21px;color:var(--green);line-height:1.4}
h3{margin:18px 0 6px;font-size:16px}
.en{color:var(--muted);font-size:14px;margin-top:2px}
p,li{margin:6px 0}
ul{padding-left:22px}
.note{background:var(--soft);border-radius:12px;padding:12px 14px;font-size:15px}
.updated{color:var(--muted);font-size:13px}
.contact{display:grid;gap:6px}
footer{text-align:center;color:var(--muted);font-size:13px;padding:0 16px 32px}
@media(max-width:600px){section{padding:16px;border-radius:14px}h1{font-size:21px}h2{font-size:19px}}
</style>
</head>
<body>
<header><div class="wrap"><a class="home" href="/">← GEARHUB</a><small>Myanmar · English</small></div></header>
<nav class="toc" aria-label="Sections"><div class="wrap">${nav}</div></nav>
<main class="wrap">
${shown.map(section).join("\n")}
</main>
<footer>© GearHub · <a href="/">gearhub</a></footer>
</body>
</html>
`;
}
module.exports = { load, save, render, body, DEFAULTS, SECTIONS, LIMITS };
