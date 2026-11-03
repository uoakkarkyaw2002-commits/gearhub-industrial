# GearHub မြန်နှုန်းစစ်ဆေးမှု — ၂၀၂၆-၁၁-၀၃

လက်ရှိ live version **1.1.259** ကို read-only တိုင်းထားသည်။ App code၊ ဆိုင် data၊ server configuration၊ cache version နှင့် deployment မပြောင်းထားပါ။

## ၁။ လက်ရှိ အမှန်တကယ်တိုင်းထားသော ဖွင့်ချိန်

**အချိန်အားလုံး စက္ကန့်ဖြစ်သည်။** ဆိုင် data ပေါ်ပြီး Loading cover ပျောက်သည့်အချိန်ကို “သုံးလို့ရချိန်” အဖြစ်တိုင်းသည်။ HTTP load event/LCP နှင့် မတူပါ။

| ဆိုင် | Phone ပထမဖွင့် (median / range) | Phone Refresh (median / range) | PC ပထမဖွင့် | PC Refresh |
|---|---:|---:|---:|---:|
| GearHub | 19.2 (8.9–26.5) | 4.3 (4.3–4.6) | 17.9 | 7.2 |
| POLESTAR | 18.1 (12.2–48.3) | 6.5 (6.4–9.8) | 13.9 | 6.6 |
| Kaizen Beauty | 17.8 (13.1–47.2) | 6.4 (6.2–8.7) | 9.4 | 3.4 |
| treebird Mobile | 17.7 (15.8–30.4) | 6.1 (6.1–6.3) | 7.3 | 3.1 |

Phone တစ်ဆိုင်လျှင် cold ၃ ကြိမ်၊ warm ၃ ကြိမ်၏ median ဖြစ်သည်။ PC က တစ်ဆိုင်လျှင် cold/warm တစ်ကြိမ်စီဖြစ်သည်။ ဒီစက်ပေါ် Chrome 375×812 / 1280×900 ဖြင့် တိုင်းထားခြင်းဖြစ်ပြီး တကယ့် iPhone/Android hardware မဟုတ်ပါ။ အင်တာနက်လမ်းကြောင်း အလွန်ကွာဟနေသဖြင့် phone/PC ကွာခြားမှုကို စက်အမျိုးအစားကြောင့်သာဟု မယူဆရပါ။

- Platform landing: cold **1.8 s**, warm **0.8 s** (တစ်ကြိမ်စီ)။
- ဆိုင်ပေါ်ပြီး Category ခလုတ်ကို နှိပ်ရာမှ next paint: median **45.2 ms**, range **27–122 ms** (native CPU၊ field INP မဟုတ်)။
- Data ပြပြီးနောက် Loading cover အမှန်တကယ်ပျောက်သည်အထိ ထပ်စောင့်ရမှု median **3.8 s**။ ပုံ/font စောင့်ခြင်း၊ progress/fade နှင့် Excel main-thread အလုပ်များ အပါအဝင်ဖြစ်၍ အားလုံးကို animation တစ်ခုတည်းကြောင့်ဟု မဆိုနိုင်ပါ။

## ၂။ POLESTAR Excel search — တကယ်စာရိုက်တိုင်းထားမှု

| စမ်းသပ်မှု | ပထမ `seal` ရှာချိန် | နောက် `300426` ရှာချိန် |
|---|---:|---:|
| Phone ပုံမှန်လိုင်း | 15.4 s | 1.7 s |
| Phone 4G + CPU 4× simulation | 34.8 s | 3.4 s |
| PC ပုံမှန်လိုင်း | 19.4 s | 1.9 s |

`seal` သည် 200+ hits ရပြီး `300426` သည် 1 hit ဖြစ်သည်။ မတူသော query များဖြစ်သောကြောင့် ကွာခြားမှုကို cache တစ်ခုတည်း၏ အကျိုးသက်ရောက်မှုဟု မယူဆရပါ။ Case တစ်ခုလျှင် တစ်ကြိမ်စီ တိုင်းထားသည်။ Workbook သည် **3,445,130 bytes (3.29 MiB)** ဖြစ်သည်။ 4G simulation တွင် workbook ယူချိန် 21.8 s၊ အခြား startup run တွင် main-thread task အရှည်ဆုံး 3.38 s တွေ့ရသည်။

## ၃။ API တုံ့ပြန်မှု

API တစ်ခုလျှင် သုံးကြိမ်၊ curl connection reuse ဖြင့် တိုင်းထားသည်။ TTFB သည် server CPU time မဟုတ်ဘဲ network/origin waiting ပါဝင်သည်။

| API | Median ပြီးဆုံးချိန် | Median first-byte |
|---|---:|---:|
| `/api/products` | 1.39 s | 1.22 s |
| `/api/platform/store/polestar` | 2.12 s | 1.00 s |
| `/api/platform/store/kaizen-beauty` | 2.15 s | 1.76 s |
| `/api/platform/store/treebird-mobile` | 2.16 s | 2.15 s |

ပထမ fresh curl connection တွင် DNS 2.13 s၊ TCP+TLS ပါပြီး 4.73 s၊ API body ပြီးဆုံးချိန် 8.37 s ဖြစ်ခဲ့သည်။ Connection reuse ရသည့်နောက် နောက်ဆုံးလေးခု API များ 0.65–0.88 s အထိ ရလာသည်။ အင်တာနက်/ချိတ်ဆက်မှုကို server processing နှင့် မရောထွေးရပါ။

## ၄။ တိုင်းတာချက်/ကုဒ်နှစ်ခုလုံးက ထောက်ပြသော အချက်များ

1. **Cold startup network/critical assets** — ပထမ GearHub run တွင် window မှမြင်ရသော request 60 ခု၊ JS 28 ခု၊ CSS 4 ခုရှိသည်။ ဆိုးဆုံး POLESTAR cold run တွင် 39 KB compressed CSS ယူချိန် 37.3 s ဖြစ်ပြီး data API ကို နောက်မှ စတောင်းသည်။ ဤဖြစ်စဉ်တွင် network/transfer stall က အကြီးဆုံးဖြစ်ပြီး server CPU ပြည့်နေသည်ဟု မသက်သေပြပါ။
2. **Loading cover** — `skyshop-splash.js` သည် ပထမဖွင့် minimum interval၊ viewport pictures/fonts (အများဆုံး 2.5 s စောင့်)၊ progress counter နှင့် fade ကို စောင့်သည်။ Requested opening picture/sound/update animation ကို အလိုအလျောက်ဖယ်မပစ်သင့်ပါ။ Loading အလုပ်များကို ထပ်မစောင့်အောင် တွဲလုပ်ခြင်းနှင့် cache ကို သုံးခြင်းက အခွင့်အရေးဖြစ်သည်။
3. **Speed badge အတွက် background download** — `net-speed.js` က ဖွင့်ပြီး 1.5 s တွင် `/speed-test.bin` (1 MB အထိ) ကို ယူသည်။ Cold startup ၏ banner/API/Excel download များနှင့် bandwidth ပြိုင်သုံးနိုင်သည်။ အောက်ခြေက MB က app ဖွင့်ချိန်မဟုတ်ပါ။
4. **Excel** — ရှာဖို့ workbook အပြည့်ယူ/ဖြည်/ဖတ်ပြီး viewer ကို render လုပ်နေသည်။ တိုတောင်းသော search index၊ parsed-sheet reuse၊ Web Worker နှင့် first-search အတွက် ကြိုတင်ပြင်ဆင်မှုကို ဦးစားပေးသင့်သည်။
5. **တူညီသော request ထပ်ယူခြင်း** — seller startup sample များတွင် store snapshot/API release စသည်တို့ တစ်မျိုးကို နှစ်ကြိမ်မြင်ရသည်။ Public store data ကို shop ခွဲပြီး sharing/revalidation တစ်ခုတည်းလုပ်ခြင်းက request များ လျော့နိုင်သည်။
6. **Compression/cache ရှိပြီးသား** — CSS response သည် Brotli နှင့် `max-age=31536000, immutable` ရှိပြီးသားဖြစ်သည်။ Compression ဖွင့်ရုံဟု မပြောနိုင်ပါ။ စမ်းထားသော CSS/API response တွင် Cloudflare `DYNAMIC` ဖြစ်သည်။ Public versioned CSS/JS/photos များအတွက် edge delivery ကို စစ်သင့်သည်; private admin/session/order APIs ကို shared cache မလုပ်ရပါ။

## ၅။ ပိုမြန်နိုင်သည့်အဆင့် — ခန့်မှန်း/ရည်မှန်းချက်သာ

| လုပ်ဆောင်ချက် | အလုပ်ပြင်ပြီး စမ်းရန် ရည်မှန်းချက် |
|---|---:|
| ပထမဆုံး ဆိုင်ဖွင့် (opening picture ကို ထားလျက်၊ တည်ငြိမ်သောလိုင်း) | 4–7 s |
| သာမန် Refresh / reload | 1.5–3 s |
| Search index ပြင်ပြီး Excel ပထမရှာ | 1–3 s |
| အဆင်သင့် Excel index ထဲ နောက်တစ်ကြိမ်ရှာ | 0.3–0.8 s |

ဤကိန်းဂဏန်းများသည် ပြင်ပြီးစမ်းထားသော after-result မဟုတ်ပါ။ လက်ရှိအလုပ်ခွဲချိန်၊ ကုဒ်လမ်းကြောင်းနှင့် payload ကို အခြေခံထားသော conditional engineering targets ဖြစ်သည်။ Internet stall 30–48 s ကို code တစ်ခုတည်းဖြင့် ပယ်ဖျက်နိုင်သည်ဟု အာမခံမပေးပါ။ Server CPU/memory/region metrics မတိုင်းထားသဖြင့် paid plan ပြောင်းလဲမှုအတွက် အကျိုးသက်ရောက်မှု မခန့်မှန်းထားပါ။

## ၆။ Local ပုံဖိုင်အရွယ်အစား စမ်းသပ်ချက် — live မပြောင်းထား

| Asset | မူလ bytes | Display အရွယ် WebP bytes | လျော့နိုင်မှု |
|---|---:|---:|---:|
| hero.jpg | 181,591 | 36,928 | 79.7% |
| logo.png | 170,933 | 1,626 | 99.0% |
| navigation.jpg | 175,136 | 49,720 | 71.6% |

WebP quality 80၊ hero/nav width 960px၊ avatar logo 128px ဖြင့်သာ စမ်းထားသည်။ Full-size originals/app icon/gallery ကို ဆက်သိမ်းရမည်။ အရွယ်အစားနှင့် quality trade-off ရှိပြီး production ပြောင်းမီ အမြင်စစ်ရန်လိုသည်။ Download-size saving ကို startup-time saving အဖြစ် တိုက်ရိုက်မပြောင်းတွက်ရပါ။

## ၇။ စမ်းသပ်မှု၏ အကန့်အသတ်နှင့် မှတ်တမ်း

- စုစုပေါင်း navigation samples **38** (ပထမ draft harness runs မပါ); Excel query samples 6။ Service worker ပိတ်မထားပါ။ Cold = အသစ်သော browser context၊ warm = အဲဒီ context ထဲ ပုံမှန် reload။ Warm ကို ပထမဖွင့်ပြီးမကြာမီတိုင်းထား၍ background pre-cache အားလုံး မပြီးနိုင်သေးပါ။ ပိတ်ထားပြီးနောက် PWA ပြန်ဖွင့်ခြင်းနှင့် မတူပါ။ Version အသစ်တင်သော Updating flower animation သည် အနည်းဆုံး ~4.9 s cycle ကို ပြီးစေသည့် သီးခြားလမ်းကြောင်းဖြစ်ပြီး ဤသာမန် Refresh target မပါဝင်ပါ။
- Simulated 4G = 1.6 Mbps down / 0.75 Mbps up၊ added latency 150 ms၊ CPU 4× slower။ Real network ကွာဟမှု ထပ်ပါနေ၍ simulation ရလဒ်ကို normal run နှင့် controlled A/B comparison အဖြစ် မယူရပါ။
- Session ကို ဆိုင်ရွေး/စာရိုက်ရန်သာ သုံးပြီး account login၊ credentials/cookies၊ product/order mutations မသုံးပါ။
- Admin အတွင်း authenticated လုပ်ဆောင်ချက်၊ checkout/payment submit၊ AI photo removal၊ actual installed-app startup၊ real phones၊ true field INP၊ field p75 နှင့် server CPU/memory ကို မတိုင်းထားပါ။
- LCP observer သည် splash photo ကိုပါ တွက်နိုင်သောကြောင့် “ဆိုင်သုံးလို့ရချိန်” ကို သီးခြားတိုင်းထားသည်။ Raw layout-shift sum ~0.14 သည် formal CLS session-window score မဟုတ်ပါ။
- Window CDP transfer counters တွင် service-worker ကိုယ်တိုင် background fetch များ မပြည့်စုံနိုင်သည်။ Recorded resource payload/cache fields များကို တစ်မျိုးတည်းသော total-app download size ဟု မယူရပါ။
- Main measured navigation samples တွင် uncaught application JS exceptions မတွေ့ပါ။ ယင်းသည် feature အားလုံး အမှားကင်းသည်ဟု အာမခံခြင်း မဟုတ်ပါ။

Evidence files: `runs.json`, `runs-extra.json`, `search.json`, `api-timings.json`, `summary.json`, `results.csv`, `image-experiment.json`, `environment.json`; reproducible scripts `audit.mjs`, `search.mjs`, `summarize.py`. Preflight public config/store responses contain shop/business information and are retained locally, not committed to Git.

References: [Web Vitals guidance](https://web.dev/articles/vitals), [LCP and splash limitations](https://web.dev/articles/lcp), [INP definition](https://web.dev/articles/inp), [Chrome network emulation](https://chromedevtools.github.io/devtools-protocol/tot/Network/), [Chrome CPU emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/). Google recommends LCP <=2.5 s, INP <=200 ms and formal CLS <=0.1 at field p75. These are distinct from our splash-dismissed readiness metric.
