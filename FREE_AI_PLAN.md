# Free AI plan / အခမဲ့ AI စာရင်း

Owner's decision (2026-10-31): add **all** of these, later, one PR at a time. Every one runs on the
GearHub server (Render), like Photo scan, with no outside AI service and no cost per use.

ပိုင်ရှင်ဆုံးဖြတ်ချက်: အောက်က AI အကုန်ထည့်မယ်၊ တစ်ခုချင်း လုပ်မယ်။ အကုန်လုံး ကိုယ့် server ပေါ်မှာ run လို့ ပိုက်ဆံ မကုန်ပါ။

| # | AI | ဘာလုပ်ပေးလဲ | How (for the next Claude/Codex) | Status |
|---|----|------------|---------------------------------|--------|
| 1 | 📷 Photo scan | ပုံနဲ့ ပစ္စည်းရှာ | DINOv2-small ONNX, `lib/photo-search.js` | ✅ done (1.1.169–1.1.177) |
| 2 | 🗂️ Category suggestion | ပစ္စည်းပုံ တင်ရင် "Electrical Parts → SANY ဖြစ်နိုင်တယ် (85% တူ)" အကြံပေး၊ တစ်ချက်နှိပ် ဖြည့် | Reuse the photo-search looks: compare the new photo with the shop's photos, vote by their products' `categoryId`; button in Add Product next to Category | ☐ next |
| 3 | ♻️ Duplicate photo check | ပစ္စည်းတစ်ခုတည်း ၂ ခါ ထည့်မိရင် သတိပေး | Same looks; score ≥ 0.95 with a photo of another product → warning before Save | ☐ |
| 4 | 🔍 Photo quality check | ပုံ ဝါး/မှောင်ရင် "ပြန်ရိုက်ပါ" | `sharp` stats on upload: blur (Laplacian variance) and brightness; warning only, never blocks | ☐ |
| 5 | ⌨️ Smarter search | စာလုံးပေါင်းမှားလည်း၊ အဓိပ္ပာယ်တူလည်း ရှာတွေ့ | Fuzzy matching (edit distance) + small multilingual text-embedding ONNX model (e.g. MiniLM ~25–120 MB, check disk) for product names/SKU | ☐ |
| 6 | 🧩 Similar products | ပစ္စည်းကြည့်ရင် ဆင်တူတာ ပြ | Nearest products by photo look (+ text embedding when #5 exists); "Similar parts" row in the product view | ☐ |
| 7 | 🏷️ Part No. reader | Label ကို ကင်မရာနဲ့ ဖတ်ပြီး part number နဲ့ ရှာ | OCR: `tesseract.js` (eng) on the server; read text → match `partNo`/SKU; button in the scanner | ☐ |
| 8 | 🧾 Payment receipt reader | KBZPay/WavePay screenshot ထဲက ငွေပမာဏ၊ transaction ID ဖတ်ပြီး order နဲ့ တိုက်စစ် | OCR (`tesseract.js` eng + mya) on the uploaded receipt; show "Ks 55,000 · ID …" next to the order total, mark match/mismatch; admin confirms | ☐ |

Notes / သတိပြုရန်
- Render disk is 3 GB (≈0.4 GB used after 1.1.188). Check model sizes before adding (#5, #7, #8).
- Server RAM/CPU is shared with the shops: run models one at a time (like `serial()` in photo-search) and rate limit.
- Suggested order (Claude): #8 receipt reader and #2 category suggestion first; the owner decides.
- Each item: new branch + PR, tests, phone 375 / PC 1280 check, handoff entry (AGENTS.md).
