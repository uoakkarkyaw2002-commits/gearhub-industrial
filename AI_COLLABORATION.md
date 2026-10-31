# AI Collaboration Log (Claude ⇄ Codex)

The owner gives each task to **one** agent at a time. GitHub `main` is the handoff channel.

## Rules

- Before a task: pull the latest `main`, then read `AGENTS.md` and this file.
- Do not start a task that is listed below as **assigned / in progress** for the other agent.
- Change only the assigned feature. Use the owner's screenshots as the exact design reference.
- After a task: commit and merge to `main`, add a handoff entry below, and set its status to **completed**.
- **Do not deploy.** The owner deploys on Render himself (Auto-Deploy is Off).

## Messages between Claude accounts

The owner uses more than one Claude account. Claude reads `CLAUDE_MAILBOX.md` automatically (through
`CLAUDE.md`) and leaves a dated message there before stopping. Codex can read it too.

## In progress

_None._

## Project notes for the next agent

- Live site: https://skyshopmm.com. Seller shops live at `/shops/<slug>/` and their admin at `/shops/<slug>/admin`. The POLESTAR test shop is `psm-test-shop`.
- Run tests with **Node 22** (`npm test`). On Node 24, better-sqlite3 crashes.
- Every release bumps the version in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js` and `tests/tenant-install.test.js`.
- When you change a `public/*.js|css` file, update its `?v=` cache tag in `public/admin.html` (or the page that loads it).
- `main` requires a review. Merge with "Bypass rules and merge".
- Seller shops must never show the GearHub brand. Keep the seller-branding tests passing.

## Handoff entries (newest first)

### 1.1.226: Excel link cells offer Copy / Go (Claude)
- Owner: the PHOTO column's Google Drive links did nothing. `excel-select.js`: tapping (or clicking) a cell whose text is a single http(s) URL selects it and shows a small dark menu above it — Copy (clipboard, then "Copied ✓") and Go ↗ (`window.open(url,'_blank','noopener')`); outside tap or scroll closes it. Other cells behave as before. Works in the search views and the folder viewer (same grid).
- Checked: Chrome 375 rows view: link cell tap → menu, Copy put the URL on the clipboard, Go opened a new tab with the URL; plain cell → no menu; no errors. Node 22 check + 381/381.

### 1.1.225: "ရှာတာပဲ" rows are the same viewer; select/copy in place, nothing opens (Claude)
- Owner: tapping a row in the search results opened the Excel viewer — it must not; select, drag and copy must work right there. `excel-map.js`: `rowFilter` in renderSheet + `GearHubExcelViewer.rows(set)` (tabs hidden while filtered; `home()`/`release()` clear it). `excel-search.js` rows view = `embed` + `rows(new Set([header,...hits]))` + `search(q)`, up to 200 hits; the box is sized to the drawn table (≤75% of the screen); my separate rows table and the row-tap-opens-viewer handler are gone. 1.1.224 deployed fine (owner's screenshot).
- Checked: Chrome 375: rows view shows 1,1225,1289,1327,1427 only, cell tap selects, row-number tap selects 8 cells, no modal; Excel view still 155 rows drawn, 1/4; folder viewer full screen with tabs; no errors. Node 22 check + 380/380.

### 1.1.224: "Excel လို" search uses the real Excel viewer; faster first search (Claude)
- Owner (night, wants it ready by morning): PART NO column too wide; keep every column/row at its original size; bring back drag-select, copy and row select from the Excel viewer; hide the keyboard's bar (it does nothing); make the app as fast as possible.
- `excel-map.js`: workbooks are read once per page (`loadBook` cache, shared with search); `openBook(b,sheetName,embedded)`; new `GearHubExcelViewer.embed(host,…)`, `search(q)`, `step(n)`, `release()` — the viewer section (grid, tabs, excel-select.js selection/copy/row select, zoom) is moved under the shop search bar for the Excel view and moved back to its panel for the folder button. `excel-search.js`: Excel view = `embed` + `search`, the bar's count/˄ ˅ call `step`; my own 1.1.216–1.1.220 grid is now only the "ရှာတာပဲ" rows list (table width = sum of the file's column widths). Enter (Search key) = next match + closes the keyboard; `enterkeyhint="search"`. The workbook is read on idle (`requestIdleCallback`, skipped with Save-Data) so the first search takes ~0.2 s instead of ~0.8 s.
- Keyboard bar (˄ ˅ ✓ above the iPhone keyboard): drawn by iOS Safari/web apps for every text field; a web page cannot hide it. ✓ closes the keyboard; ˄ ˅ only jump between fields.
- Checked: Chrome 375: Excel view 1/4 → ˅ 2/4 (141 ms), "seal" 1/238, row-number tap selects the row, folder viewer still full screen; rows view table 877 px = file widths, tap opens the viewer at the row; 1280 fine; no errors. Node 22 check + 382/382. Not on a real iPhone.

### 1.1.223: The bin eats the typed letters (owner's video); scan hides while searching (Claude)
- Owner's video (Delete button "the bin eats the label"): tap the bin → lid opens (260 ms), the typed letters jump one by one (first letter first, ≤120 ms apart, 560 ms flight with a small arc) into the bin, the bin fills, lid closes (300 ms), a ring runs once around the bin (760 ms) and fades; then the search clears (~3 s like the video). `excel-search.js` `eat(bin)`: letters are copied into a fixed `.bin-letters` layer over the input (input text hidden meanwhile), Web Animations; reduced motion clears at once. Scan is hidden again while searching (owner changed their mind).
- Checked: Chrome 375 frames every 150 ms (lid, letters, fill, ring), search empty afterwards, banner/nav back; no errors. Node 22 check + tests.

### 1.1.222: Searching hides the banner and bottom nav; bar at the top (Claude)
- Owner (iPhone): while searching, hide the bottom navigation and the top banner and keep the search bar at the very top. `style.css` (≤850px): `body.searching` hides `.home-navigation`, `.announcement`, `.mobile-bottom-nav`; `.mobile-search` is sticky at top 0 (safe-area padding); in the Excel view the page itself does not scroll (`html:has(...)`/body overflow hidden), only the sheet. `excel-search.js` fit() no longer scrolls the page when the bar is sticky. PC unchanged. Owner: keep the camera in the bar while searching — only the folder hides; `.search-tools` is `display:contents` and `order` puts count, ˄ ˅, camera, bin.
- Checked: Chrome 375 both views: bar at y=10, banner/bottom nav hidden, sheet 86→804 of 812, wheel scroll keeps the bar; cleared → banner and nav back; 1280 top nav unchanged; no errors. Node 22 check + 381/381.

### 1.1.221: New search bar; count, ˄ ˅ and bin in the bar (Claude)
- Owner's picture: white pill with a 2px green line and soft green glow, green scan icon, no magnifier; white tile with a filled green folder (index.html svg). While typing (`body.searching`) the scan and folder hide, the bar runs full width and ends with `.search-tools` (from `excel-search.js`): number found (Excel hits; "n/total" in the Excel view), ˄ ˅ (Excel view only, like the viewer's) and a bin that clears the search. The "Open in Excel" button and the count bar on the grid are gone; the grid fills down to the bottom nav.
- Checked: Chrome 375 both views (1/4 → 2/4, bin clears and brings scan/folder back) and 1280 (bar full width, count + bin); no errors. Node 22 check + 380/380.

### 1.1.220: Excel view is light on iPhone (Claude)
- Owner: search works but the app became very heavy. The sheet view drew every row (1400+ × all columns) on each search. Now `excel-search.js` keeps the row list in `win` and draws only 100 rows around the current match (`draw(i)`: 40 above, 60 below); scrolling near the top/bottom adds 60 more (`grow`, keeps the scroll position when adding above). ˄ ˅ redraw only when the next match is outside the drawn rows. Search waits 450 ms after typing in the sheet view. Count/˄ ˅ moved to the left corner (the right edge had the phone's back handle over the ˅).
- Checked: Chrome 375, 1428-row sheet: 100 rows in the page, ˅ 87 ms, wraps, scroll up/down adds rows; no errors. Node 22 check + 379/379. Not measured on a real iPhone.

### 1.1.219: Excel view choice moved into the files panel; sheet edge to edge (Claude)
- Owner: move "Excel · BC / ရှာတာပဲ / Excel လို" into the folder (Excel files) panel beside the search bar; the sheet must have no side gaps or outer frame, one piece like Excel. `excel-search.js`: the choice is a "ရှာရင် Excel ပြပုံ / Search shows" row injected after `.excel-library-help` (hidden while a workbook is open); the page shows only the grid (Excel view: count + ˄ ˅ sit on the right of the letters row). `style.css`: `.excel-results` is 100vw wide (calc(50% - 50vw) margins), grid has only top/bottom lines.
- Checked: Chrome 375 and 1280 — grid 0→viewport width, page has no sideways scroll, setting switches the view, count 1 / 4, products hidden in the Excel view; no errors. Node 22 check + 378/378.

### 1.1.218: "Excel လို" view hides the products and fills the screen (Claude)
- Owner: in the Excel view the products must go; it must look fully like Excel. `excel-search.js`: body class `excel-sheet-mode` while the sheet view shows (removed when the search is cleared or in "ရှာတာပဲ"); `fit()` scrolls the search bar to the top and sizes the grid to the rest of the screen above the bottom nav and the Open button. `style.css` hides `#products` in that mode.
- Checked: Chrome 375 (grid 164→658 of 812) and 1280 (172→729 of 800); rows view keeps products; clearing restores them; no page sideways scroll; no errors. Node 22 check + 377/377.

### 1.1.217: Search Excel — "ရှာတာပဲ" / "Excel လို" views (Claude)
- Owner: rows were too small; wants two modes beside "Excel · BC": only the matching rows (as before), and the sheet like Excel that jumps to the match with the rows around it visible. `excel-search.js`: mode switch (remembered in localStorage `gh-excel-search-mode`); sheet view draws every visible row (up to 4000), marks hit rows, outlines the matching cell of the current hit, scrolls it a third down under the sticky header, ˄ ˅ and "n / total"; taps do not open the viewer there (the button does, at the current hit). Cells use the file's font size and row heights (bigger); base font 16px.
- Checked: Chrome 375 with a 1428-row BC sheet: rows view 4 rows; sheet view 1428 rows drawn in < 1 s, 1 / 4 at row 1225, ˅ → 1289, ˄˄ → 1427 (wraps), view remembered after reload; no page sideways scroll; no errors. Node 22 check + 376/376.

### 1.1.216: Search Excel rows look like the sheet (Claude)
- Owner: the 1.1.215 cards were hard to read; show the rows like Excel, with the header, scrolling sideways. `excel-search.js` now draws a table: column letters, row numbers (sticky left), the sheet's header row (sticky under the letters), the sheet's column widths, fills and fonts; hidden columns/rows skipped; max-height 70vh, scrolls both ways. Tapping a row still opens the viewer at that row.
- Checked: Chrome 375/1280 with a BC sheet (green header, hidden column D, wide PHOTO column): page has no sideways scroll, grid scrolls (scrollWidth 1405 vs 343), row numbers and header stay put; row tap → viewer at that row. Node 22 check + 375/375.

### 1.1.215: Search also lists Excel rows (sheet BC) (Claude)
- Owner (POLESTAR): when searching, show the Excel file under the products; default sheet "BC". New `public/excel-search.js` (seller shops only): reads the first .xlsx/.xlsm that has a sheet named BC (else the first file's first sheet) once per page through `window.GearHubExcelViewer.sheet()`, lists up to 30 matching rows (hidden rows/columns skipped; column names = first row with 2+ filled cells) under `#products`; a row or "Open in Excel" opens the viewer on that sheet with the same search, at that row. `excel-map.js`: the file-open click is now `openBook(b,sheetName)`; `readSheet(sheet,from=book)` no longer uses the global book; `window.GearHubExcelViewer={sheet,open}`.
- Checked: demo shop with a 2-sheet workbook (INV, BC), Chrome 375/1280: "monitor" → 2 BC rows; tapping row 2 → viewer on BC, "2 found", row 3 selected; folder button → file → INV, switching to BC still works; no page errors. Node 22 check + 374/374. Not checked with the real POLESTAR workbook (size/speed).

### 1.1.214: Searching shows only products (Claude)
- Owner (POLESTAR, iPhone): typing in the search bar left the banner, categories and catalog heading between the bar and the results. `store.js` renderProducts toggles `body.searching` when the search box has text; `style.css` hides every `[data-home-content]` except `.mobile-search` and `#catalog`, plus the catalog heading, filters and the Policies line.
- Checked: Chrome 375 and 1280 — hidden while typing, all back when cleared, no page errors. Node 22 check + 373/373.

### 1.1.213: Shop apps are added from the shop Home page (Claude)
- Owner (iPhone): the app added from the admin was "POLESTAR Admin" with a "P" icon and opened the admin; they want "POLESTAR" with the logo, opening the Home page. The paused `claude/install-from-home` helper is now in: on `/shops/<slug>/admin` the robot only says "Go to Home page" (→ `/shops/<slug>/?install=1`); on the Home page the steps open only with `?install=1` (customers never see it). `app-switch.js` "Add app" now opens `/shops/<slug>/?install=1` too. index.html loads install-guide.css/js; tags 1.1.213 in index/admin/platform/sw.
- Checked: Chrome 375 (iPhone UA): admin welcome → Go to Home page → Home with the 4 Safari steps; plain customer visit → no helper; standalone other-shop sheet → `x-safari-https://…/?install=1`; store page title/apple-touch-icon/manifest are the shop's. Node 22 check + 372/372. Old apps keep their install-time name/icon: delete "POLESTAR Admin" and add again from the Home page.

### 1.1.212: Another shop inside an installed app asks for its own app (Claude)
- Owner (iPhone): inside the installed GearHub app, opening POLESTAR showed POLESTAR under the GearHub app. Now `public/app-switch.js` (loaded by index.html, admin.html, platform.html; in sw.js SHELL) runs only in standalone mode: the first page of an app session sets sessionStorage `gh-app-home` (shop slug, '' for GearHub); on another shop a sheet asks to add that shop's own app. "Add app" opens Safari (`x-safari-https://`, iOS 17+) or Chrome (intent) at `/shops/<slug>/admin?welcome=1` (existing install helper); "Copy link"; "I have it" (localStorage `gh-app-own:<slug>`); "Not now" (asked once per session). iPhone cannot tell whether an app is installed, hence "I have it".
- Checked: Chrome 375 with navigator.standalone faked: GearHub start → other shop asks; Not now + reload → not again; app started on its own shop → no sheet; no page errors. Node 22 check + 371/371. Not checked on a real iPhone.

### 1.1.211: Play Store upload key in assetlinks.json (Claude)
- Owner built the Android package on pwabuilder.com (package `com.skyshopmm.app`) and sent its assetlinks.json. Its SHA-256 (upload key) is now always in `/.well-known/assetlinks.json` (`server.js`); `ANDROID_SHA256` only needs Google's App signing key after the first Play upload. The owner keeps `signing.keystore` + `signing-key-info.txt` (never in this public repo).

### 1.1.210: Ready for the Play Store (Claude)
- Owner: put skyshopmm.com on the Play Store. A Trusted Web Activity app (package `com.skyshopmm.app`) opens the site full screen.
- Files: `public/skyshop.webmanifest` (SkyShopMM, start `/`, 192/512 + maskable PNG icons in `public/icons/skyshop-*`), linked from `public/platform.html`; `server.js` serves `/.well-known/assetlinks.json` from `ANDROID_PACKAGE` + `ANDROID_SHA256` (comma list; 404 when empty); `.env.example`; `tests/play-store.test.js`.
- Not done: the .aab build. This container cannot reach dl.google.com (Android SDK). Either the owner allows dl.google.com and Claude builds with Bubblewrap, or the owner uses pwabuilder.com (Android package) with package `com.skyshopmm.app`. After the first upload, put the Play Console "App signing key" SHA-256 (and the upload key's) in Render env `ANDROID_SHA256`.
- Paused (owner said stop): branch `claude/install-from-home` — install helper moves to the shop Home page; it also uses 1.1.210, so bump it when resumed.
- Login page bar shows "SkyShopMM" instead of "GearHub" (phone + PC; ≤340px rule keeps one row at 320).
- Checked: Node 22 check + 369/369; real server: assetlinks JSON with a fingerprint, 404 without; manifest 200 `application/manifest+json`; `/` → `/platform.html`.

### 1.1.209: Phone login page = owner's factory picture (Claude)
- Owner sent a phone picture: blue-sky factory scene, one light glass top bar with GearHub (Hub green), Home/About/Service/Contact and a solid green Sign in with a person icon. Phone only (≤600px); PC visitor page unchanged.
- Files: `public/images/signin-scene-phone.webp` (owner's picture with its drawn top bar cropped off), `public/platform.html` (`data-phone-src`, `Gear<span>Hub</span>`), `public/platform.js` (phones load the phone scene), `public/signin.css` (1.1.209 block; brand gap moved to `::before` margin so "GearHub" has no space), `public/sw.js`, tests. The Sign in card still opens by itself (1.1.204).
- Checked: Chrome 320/360/390/430 (no sideways scroll, one row) and 1280 (unchanged); Node 22 check + 367/367. WebKit was not available in this container.

### 1.1.208: No excavator in the seller Hero field (Claude)
- Owner (treebird admin): the Hero / Homepage Banner field showed GearHub's excavator. `admin.js` fills an empty seller hero with "" (GearHub's own admin keeps the excavator default); `tenant-admin.js` PUT /appearance stores "" instead of `/images/hero-excavator.jpg` for every seller shop (platform.test.js). WebKit 375 local: field empty, preview hidden. Node 22 check + 366/366.

### 1.1.207: No footer gear; Navigation Background and Page Wallpaper are GearHub-only (Claude)
- Owner (treebird, Android): remove the gear at the bottom; remove Navigation Background and Page Wallpaper from sellers — only the owner changes them.
- `store.js` hideShopDefaults hides `.footer-logo` when the shop has no own logo (`style.css` `.footer-logo[hidden]`). `admin.html`: both appearance sections get `gearhub-only`; `site-admin.css` hides them unless `body.gearhub-owner`. Server `PUT /appearance` now keeps both navigationBackgroundUrl and wallpaperUrl unless GearHub saves (platform.test.js extended).
- WebKit 375 on the local server: seller sees neither section; kaizen footer logo hidden. Tags style/store/smart-search 1.1.207, site-admin 1.1.207. Node 22 check + 366/366.

### 1.1.206: One picture on Settings; smaller phone admin banner (Claude)
- Owner (treebird, Android): Settings showed two pictures — the 1.1.202 Home banner `.hero.seller-nav-hero{display:flex!important}` beat `.store-view-hidden{display:none!important}` (higher specificity). Now `.hero.seller-nav-hero:not(.store-view-hidden){display:flex!important}`.
- Owner: phone admin banner too big; make it the navigation picture size. `site-admin.css` (max-width:800px, body.seller-admin): min-height 116px, padding 14px 20px, h1 26px, text 13px → 126px tall at 375 (was 214px). PC unchanged.
- WebKit 375 on the local server: Home banner flex, Settings none, admin banner 126px. Node 22 check + 366/366.

### 1.1.205: Tab title "skyshopmm.com" (Claude)
- Owner: the browser tab of skyshopmm.com (platform.html) said "GearHub ဆိုင်စီမံခန့်ခွဲမှု"; now `<title>skyshopmm.com</title>`. Test line in platform-scene.test.js. Node 22 check + 366/366.

### 1.1.204: skyshopmm.com = login page for everyone (Claude)
- Owner-approved plan (mailbox 2026-10-29 night): a phone signed in as POLESTAR always jumped into POLESTAR admin (1.1.196 `gh-into-shop`, now removed). `platform.js` load(): `view=?view` (`drive` → console). Landing (no view, or `?visitor`) = visitor scene + Codex's glass card opened by itself (`signIn(true)`); header button reads "Account" when signed in. Signed in → `GearHubApplication.account(me)` (new in shop-application.js): "<shop> ဆိုင်ထဲ သွားမယ်" → admin / "Create your shop" or "Check status" → `?view=create` / "Owner console" → `?view=console`, plus "တခြား account နဲ့ ဝင်မယ်" (id google-login → /auth/start) and Logout. `?view=console` = owner console, `?view=create` = form/pending (non-owner without shop). Owner console "Skyshop" → /platform.html.
- `/auth/callback` redirect: owner → `?view=console`, seller with shop → admin (unchanged; so an expired app login comes straight back to the shop), no shop → `?view=create`. Store Settings "My shops" and the new-application email link → `?view=console`.
- Tests updated on purpose: platform-scene (card opens by itself), shop-application (artwork only on landing), install-guide (1.1.196 redirect → 1.1.204 account card). WebKit 375 on a local fake-Google server: visitor, seller, owner, owner ?view=console, new account, ?view=create, and seller sign-in landing in admin; 1280 seller card. Node 22 check + 366/366.

### 1.1.203: Approved glass Sign in screen and gentle floating entrance (Codex) — [PR #277](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/277)
- Owner clarified the previous request was image-only, so all uncommitted 1.1.200 design edits were restored and the unused branch deleted without a push/PR. Then supplied an 8.33-second video as a motion-only reference and explicitly authorized implementing the approved generated glass design in the app.
- Cause: visitor login still rendered the obsolete Apply/Review/Approved progress and an opaque card over a page-wide blur. `shop-application.js` now renders the approved bilingual title, three English feature rows, Google CTA and helper text in a glass dialog, without the review step. The existing one-field Create your shop form, pending/approved fallback states, Google readiness and all server logic remain intact.
- New visitor-only `signin.css` recreates the approved artwork/card, clear scene, green Google button and header. Entrance is a 1400 ms gentle downward/3D tilt-and-settle animation, informed by the video's entrance around 2.4–3.4 s. Reopens replay it; X/outside/Escape cancel it; reduced-motion users get the settled card immediately. `platform.js` preserves the original auth/start handler and adds dialog focus/Tab cycling and aria-expanded. No sound added.
- `public/images/signin-scene.webp` is a 1585×992, 344 KB clean background derived with the imagegen skill's built-in image_gen from the approved design image. Prompt: remove the central glass panel, every word/icon/button, GearHub wordmark and top navigation; seamlessly reconstruct the same blue mountain/forest lake, peach/lavender sunset peaks, straw-hat traveller with red cape, flowering grass and right tree canopy; preserve framing/colour/light, no UI/logos/new objects. Optimized to WebP; original generation remains in Codex generated_images. Only visitors use this artwork; signed-in owner/status/create views retain the configured scene and settings.
- Node 22 main baseline 364/364. Final `npm run check` passed and `npm test` 366/366; every touched browser JS passed node --check. New tests pin step-free approved login content/readiness, dialog semantics, motion/reduced-motion and asset/cache consistency. Updated the existing visitor-menu assertion on purpose for its new aria-expanded/aria-controls attributes (the first full run correctly flagged that markup change).
- Actual local seller/platform server, Chrome 375×812 and 1280×800: real Sign in clicks; sampled CSS transforms/opacity at 0/350/900/1400 ms; card fits with no horizontal overflow; repeat and mid-animation close/reopen, X, Escape, outside click, focus and reduced-motion passed. No console errors in the visitor flow. Real auth/start with a local fake Google provider → new seller → type shop name → Create → immediate shop admin passed. Owner page remained non-visitor, new scene image had no src, and owner Skyshop visitor preview kept the authenticated owner session. No live Google/iPhone device test or deployment.
- Actual rendered screenshots and a 31-frame 960×600 GIF (CSS animation sampled every 50 ms, with start/end holds) are saved in the task outputs for the owner. Compared settled UI with the approved design; header retains its functional Sign in trigger.
- Files: `public/shop-application.js`, `public/platform.js`, `public/platform.html`, new `public/signin.css` and scene WebP; `tests/shop-application.test.js`, `tests/platform-scene.test.js`; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; mailbox and this log. Base latest main d7e0691 (1.1.202). No backend/schema/product/order or seller storefront/admin edits. No merge/deploy.

### 1.1.202: New shop Home shows the settings navigation picture (Claude)
- Owner chose "1": a seller shop without its own hero photo now shows its settings navigation picture (GearHub default `/images/shop-nav-default.jpg`, or the picture GearHub set) on Home, with only the shop name (no GearHub texts). `store.js` `hideShopDefaults` adds `.seller-nav-hero` + `--seller-nav-picture`; `style.css` styles it (240px PC, 170px phone with 16px side margins). Shops with their own hero photo (POLESTAR) unchanged.
- Tags: style.css, store.js and smart-search.js → 1.1.202 (store/smart-search must share a tag). Tests updated on purpose (new-shop-defaults, free-ai sw tag). WebKit 375/1280 on the local server; Node 22 check + 364/364.

### 1.1.201: Seller admin banner = settings navigation picture; only GearHub changes it (Claude)
- Owner (kaizen): seller shops must not show the excavator admin picture; the admin home must use the settings navigation picture, which sellers cannot change (only GearHub).
- `lib/tenant-install.js` marks seller admin pages `body.seller-admin`; `site-admin.css` paints `.inventory-hero` (PC) and `.admin-head` (phone) with `var(--seller-nav-picture, url(/images/shop-nav-default.jpg))`; `admin.js` `setSellerNavPicture()` sets the variable from the shop's navigationBackgroundUrl (no more heroImageUrl/excavator for seller shops). `tenant-admin.js` (public) adds `gearhub-owner` for the platform owner; the Navigation background field is hidden for everyone else.
- Server: `shopFor()` also returns `isOwner`; `PUT /shops/:id/appearance` keeps the stored navigationBackgroundUrl unless GearHub saves (internal change, no new API). Applies to every seller shop, POLESTAR included (its admin banner now shows its own navigation picture on PC too).
- Tests: platform.test.js (seller cannot set, GearHub can, seller save keeps it). WebKit 375/1280 on the local fake-Google server (kaizen-like new shop). Node 22 check + 364/364.

### 1.1.200: Bouncing "Open in app" when the shop app is installed (Claude)
- Owner (Android photo): POLESTAR app is on the Home Screen but the admin was open in Chrome; show a bouncing "Open in app" note. `lib/tenant-install.js`: shop and admin manifests now list themselves in `related_applications` (platform webapp, absolute manifest URL; added after display_override so the title-bar test keeps its order). New `public/open-in-app.js` (admin.html + index.html, in the sw SHELL): in a browser tab, `navigator.getInstalledRelatedApps()` → bouncing green pill above the bottom nav with ×; Android tap tries an `intent://` hand-off with `S.browser_fallback_url=...#open-in-app`, and if Chrome keeps the page it shows "⋮ → Open in app"; PC shows the address-bar Open in app hint. iPhone Safari has no such API: nothing shows there.
- WebKit 375/1280 with a faked installed app (WebKit lacks the API): pill/help placement, no sideways scroll. Not verified on a real Android: whether the intent opens the installed app or falls back to the help. Node 22 check + 364/364.

### 1.1.199: Simple "Create your shop" form (Claude)
- Owner: remove the steps and texts from the shop application; pressing "Create your shop" makes the shop at once. `public/shop-application.js` form: heading, required shop name, one "ဆိုင်ဖွင့်မယ် / Create your shop" button and a one-line Seller Rules link (kept: sellers still agree to the rules). Removed: 1-2-3 steps, rejected note, Gmail field, About field/counter, help lines. Server unchanged (it already opens the shop at once while the owner's shop limit allows; then 1.1.195 goes to the admin with the install helper). Pending/approved cards unchanged.
- `tests/shop-application.test.js` updated on purpose for the new form. WebKit 375/1280 on the local fake-Google server: form, then Create → `/shops/<slug>/admin` with the helper. Node 22 check + 362/362.

### 1.1.198: Install helper as a chat with short step videos (Claude)
- Owner: show short videos instead of pictures, like someone teaching in front of you, with auto replies. `public/install-guide.js`: chat thread (robot types ~0.9 s, then the step; the seller taps "ပြီးပြီ ✓ / Done", their reply bubble appears and the robot answers with the next step; earlier steps stay above, shortened). Each iPhone Safari/Chrome and Android step has a drawn 5 s looping video (`install-guide.css`: phone screen mock, finger, menus/sheets moving; iOS 26 Safari ≡ → Share → Add to Home Screen → Open as Web App/Add → Home Screen icon). PC steps keep icons. These are CSS animations, not screen recordings (no iOS Simulator here).
- Fixed: the admin page `footer` style painted a dark band behind the helper buttons (now a div). The bubble no longer fades in from opacity 0 (the hidden WebKit test page does not run animations, so a fade left it invisible).
- WebKit 375 (frames paused at each tap: finger inside its target in all 4 iPhone steps) and 1280; Node 22 check + 362/362. Animations can only be seen moving on a real phone.

### 1.1.197: Owner "Skyshop" button opens the new-seller page (Claude)
- Owner: rename "Google Sign in" to "Skyshop"; tapping it shows the Skyshop new-shop page. It is now a link to `/platform.html?visitor`; with `?visitor` `platform.js` renders the visitor page (scene, Sign in → Continue with Google) while the owner stays signed in. Signing in there switches the Google account.
- WebKit 375/1280 on the local fake-Google platform server: link on the name line, visitor page shown, owner session kept. Node 22 check + 361/361.

### 1.1.196: Owner Google Sign in button; seller with a shop goes straight in; seller menu fits (Claude)
- Owner: a button on the owner console to go straight to Google sign-in. `platform.js` adds "Google Sign in" (owner only) on the name/email line; it uses the existing `/auth/start` (Google account chooser). Styles at the end of `platform.css`.
- Owner: a new shop (treebird) did not open straight in on the iPhone, although the shop was made on live. Locally (fake Google server, WebKit 375) Submit → `/shops/<slug>/admin?welcome=1` and the install helper worked, so the cause on the phone is unknown. Now `platform.html` also sends any signed-in seller who has a shop straight to its admin (at most once a minute via sessionStorage, so an admin that sends them back cannot loop); `?welcome=1` while the auto-opened shop has not finished the install helper.
- Seller menu on phones: with the logout button the words broke apart ("GearHu b", "Hom e"); for signed-in non-owners on phones the brand/links stay on one line (13px, 10px gap). Fits at 375.
- Tests: re-applying after the owner deletes the shop opens a new shop at once (`platform.test.js`); `install-guide.test.js` pins the redirect, button and menu. Node 22 check + 361/361. WebKit 375/1280 on a local platform server with fake Google login.

### 1.1.195: New shop goes straight into its admin + Home Screen install helper (Claude)
- Owner: after applying with Google the seller should land in their shop at once, then get step-by-step help to add it to the Home Screen.
- `public/platform.js`: when `POST /applications` returns a slug (shop opened), go to `/shops/<slug>/admin?welcome=1`. Shops that wait for the owner (limit reached) behave as before. `public/shop-application.js`: removed the old "opens only after owner approval" lines.
- New `public/install-guide.js` + `.css` (loaded in `admin.html`, in the sw SHELL): robot helper, one step at a time with Back/Next and dots, for iPhone Safari, iPhone Chrome, other iPhone apps (copy link → Safari), Android (install prompt or ⋮ menu) and PC. Opens on `?welcome=1`, and on phones until Done; Close hides it for the session; never inside the installed app. The installed iOS app has its own cookies, so the last step says Google sign-in may be asked once.
- Checked in WebKit at 375 and 1280 on a test page at a shop admin address (auto open, welcome removed from the URL, 4 steps, Done; no sideways scroll). The full admin with a faked sign-in froze the WebKit runner, so the guide was not seen inside the real admin page. Node 22 check + 360/360.

### 1.1.194: Phone Add Product at the size of the owner's picture (Claude)
- Owner sent the 1.1.193 reference picture again: "change to this size, the original is small". Only `public/product-phone.css` changed: new rules at the end of its phone-only media query. `--u` = one pixel of the 851px-wide picture (`min(.1175vw,.505px)`), so the toolbar, cards, fields, inputs, tabs and textarea keep the picture's proportions at any phone width. Text is a little smaller than the picture because the phone system font is wider than the picture's (labels stay on one line at 375).
- Checked in WebKit at 390 and 375 (field 43px/41px tall, was 34px) and PC 1280 (desktop form unchanged). Node 22 `npm run check`, `npm test` 358/358.
- Files: `public/product-phone.css`, `public/admin.html` + `public/sw.js` (css tag), version files, mailbox, this log.

### 1.1.193: Phone Add Product and AI advice match the owner's references (Codex) — [PR #267](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/267)
- Owner: redesign Phone Add Product and the AI warning/category advice from the two supplied images, send actual screenshots, and leave PC unchanged.
- Existing form controls and AI results already worked; the phone still used the long desktop-oriented sections/draft toolbar, and AI advice was a plain warning paragraph. New `product-phone.css` has only a max-width:800px media query. `product-phone.js` adds the top native Save action, compact two-column cards, barcode decoration and image chooser; folds Myanmar name/promotion/other optional controls into the existing details without deleting or duplicating them. Every moved node has a placeholder and returns home on desktop resize, preserving values/listeners. The new Save submits the original form and mirrors its disabled state.
- `product-ai.js` keeps its desktop HTML and existing API/category-ID action; phone results use the red robot warning and green bulb/category card. Scores/names/category paths come from the real response, including 99% MONITOR (300426-00202), Electrical Parts › Doosan in the local fixture. No fake response, threshold, backend, schema or API changes.
- Robot asset: `public/images/product-ai-robot.png` (360×285 transparent PNG, 108 KB), built-in image_gen via imagegen skill, derived from the supplied robot reference. Prompt: isolate/recreate only its white/silver robot, navy face and pointing hand, cyan eyes, green AI badge and red attention marks; transparent background; preserve pose/material, remove all UI/text except AI. Source output remains in Codex generated_images; project references only the committed asset. Standard image size optimization preserves alpha.
- Node 22 baseline main 355/355. Final `npm run check` and `npm test` 358/358; new tests pin desktop startup without mutation, media-query containment, existing field names/native Save, live-response AI markup, safe text, category ID selection and desktop advice restoration.
- Actual local seller server, Chrome 375×812/648 and 1280×900: typed required/optional fields, native required validation, clicked category picker, language tabs, chosen real MONITOR photo, tapped real AI category suggestion and top Save. Server data kept photo, part number, Myanmar/English descriptions, category ID and promotion. Edited the saved product's stock via the actual inventory Edit button; all other fields/photos remained unchanged. Back closes the phone editor. Desktop widths/heights, styles, labels and relative positions matched the pre-change baseline exactly (scroll offset normalized); resizing phone→PC returned fields to their original parents. Compared screenshots with the references; actual screenshots in the task outputs. No physical iPhone test. Initialization has a pre-existing blob-audio CSP rejection (also seen before the phone editor was loaded); no new errors during the editor flow. Audio/security untouched.
- Files: new `public/product-phone.js`, `public/product-phone.css`, robot PNG, `tests/product-phone.test.js`; `public/product-ai.js`, `public/admin.html`; required metadata/cache changes in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; mailbox and this log. Base main 59aa54a (1.1.192). No merge/deploy.

### 1.1.192: Free AI pack — FREE_AI_PLAN.md #2–#8 (Claude) — in review
- Owner (going out): "add all the free AI". Everything runs on the GearHub server (or in the phone); no outside service, no cost per use.
- #2 #3 #4 `lib/photo-search.js` `insight()` + `POST /shops/:id/ai/photo` (owner of the shop or GearHub owner, 60/min) + `public/product-ai.js` under "Choose photos": category suggestion from look-alike products' categories (one tap fills Category + categoryId), "may already be in the shop" (score ≥ 0.93, the edited product excluded), dark (brightness < 70) / blurred (edge strength < 5; calibrated on POLESTAR photos: clear 7.7–27, blurred 2.6–8.4).
- #5 `public/smart-search.js` (phone): spelling mistakes, word order, codes without dashes; added after exact matches in `store.js`.
- #6 `similar()` + `GET /store/:slug/similar/:product` + `public/similar-parts.js`: "Similar parts" row under a product's photos (score ≥ 0.55, top 6).
- #7 #8 `lib/ocr.js` (tesseract.js 7 + @tesseract.js-data/eng best_int 2.9 MB from node_modules, one job at a time, stops after 60 s idle; OCR=off turns it off). #7 "Part No." button in the scanner → `POST /store/:slug/read-label` → products whose Part No./SKU is on the label (O/0, I/1… tolerated). #8 `GET /shops/:id/orders/:order/receipt-read` (orders permission) → amount + transaction ID, compared with the order total, kept in order details (`receiptRead`, read once per receipt); line under the order's buttons (`order-detail.js`).
- Tests `tests/free-ai.test.js` run the real image model and real OCR. Checked in headless WebKit at 375 and 1280 (AI panel with sample answers; tap fills Category), live POLESTAR data through a pass-through (smart search "startr swich", "k100-1858"; Similar parts row with sample look-alikes; Part No. button present), order receipt line (sample answer). Not checked with the owner's login, a real camera label or a real KBZPay screenshot.

### 1.1.191: Excel library matches the owner's photo; open the whole file card (Codex) — [PR #265](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/265)
- Owner: match the supplied Excel files photo, make every part of an uploaded workbook card open it, compare the actual result and send a screenshot.
- Cause: only the old View link carried the existing viewer action; the library used the old horizontal upload form and Windows-only download UI. Each workbook is now one native accessible button with its existing viewer data, an Excel icon, filename and size. Icon/name/padding and Enter open the same viewer. The dialog has the pictured full-width file chooser, green Upload button, dashed automatic-upload panel and Windows/Mac download buttons. No viewer, product/order data, database, route or permission changes.
- Mac download is a ZIP preserving the .command executable bit; it uses the native file picker, curl and a per-shop user LaunchAgent. It snapshots a stable workbook, sends the existing shop key/origin, retries failures and leaves the source file intact. Windows generation is unchanged. No installer was installed on the test host and no Windows machine or physical iPhone was used.
- Node 22 main baseline 346/346; final `npm run check` passed and `npm test` 349/349. New tests cover the whole-card action, safe filename text, Mac ZIP/shell syntax and watcher retry/key/origin/source preservation. The full-suite run exposed an overly short watcher-test wait; it now waits up to 15 seconds and reports child stderr rather than failing with an opaque missing-file error.
- Real server with isolated POLESTAR branding/workbook fixtures, Chrome 375×812 and 1280×900: clicked icon, name, blank card padding and Enter; existing sheet rendered. Selected/uploaded the workbook (one file retained), downloaded both OS files, checked ZIP/executable/shell syntax, verified anonymous cannot upload and GearHub owner can. Both dialog sizes fit without internal overflow; no console errors during the card tests. Compared actual phone and PC screenshots to the photo; screenshots saved in the task output folder. Device status/assistive controls belong to the photographed phone; unrelated storefront chrome is unchanged.
- Files: `public/index.html`, `public/style.css`, `public/excel-library.js`, `public/excel-auto-upload.js`; `tests/excel-library-card.test.js`, `tests/excel-auto-upload.test.js`; required version/cache metadata in `package.json`, `package-lock.json`, `public/sw.js`, `tests/tenant-install.test.js`; this log and mailbox. Based on latest main b706e45 (documentation-only change after baseline). No merge/deploy.

### 1.1.190: Keep Google owner login when signing into GearHub Admin (Codex) — [PR #263](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/263)
- Owner: Settings → My shops repeatedly required Google owner login after signing into GearHub Admin with its password; the owner confirmed this trigger.
- Cause reproduced against the real server: `/api/admin/login` regenerated the shared session and retained only `admin`, discarding the existing verified `platformUser`. `server.js` now preserves only that server-side Google identity during rotation. Session ID/CSRF rotation and explicit logout remain intact; password login by itself never creates a Google identity or owner role.
- Added `tests/owner-login.test.js`: existing owner survives password login and server restart; old session ID revoked; password-only visitor is not a platform owner; seller stays a seller; explicit logout clears both identities. Fixtures seed verified Google state only in a temporary SQLite session, with no app authentication bypass.
- Node 22 baseline 345/345; final `npm run check` and `npm test` 346/346. Real-server Chrome at 375×812 and 1280×812: typed Admin password, clicked Settings → My shops twice, returned through GearHub link, reloaded owner page; no OAuth requests or post-login console errors. Seller page retained its branding and did not gain My shops. No iPhone device test performed.
- Files: `server.js`, new regression test; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`. No storefront layout, product/order data or schema changes. If the previous version already lost the Google session, sign in once after deploy; subsequent Admin password logins retain it. No merge/deploy.

### 1.1.189: "GearHub" link on the My shop page opens GearHub's store (Claude) — in review
- Owner: clicking "GearHub" (top left of skyshopmm.com/platform.html) no longer showed the shop.
- Cause: since 1.1.130 "/" redirects to /platform.html (owner's request) and GearHub's store is at /index.html; the link still pointed to "/", so it reloaded the same page.
- `public/platform.html`: link → `/index.html`. Test `tests/gearhub-link.test.js`. Live /index.html checked (200, GearHub store).

### 1.1.188: Backups live in Google Drive only, not on the Render disk (Claude) — merged, live
- Owner: the Render disk is 3 GB (live: 3.13 GB, 1.42 GB used); keep backups only in Drive (5 TB, newest 30), none on Render.
- `lib/backups.js`: after Drive confirms the upload, every local archive is deleted (step "local-cleanup"); if Drive fails, local copies stay until a later upload works. The free-space check uses the last backup's size when no local archive is left. Status `retainedLocalCopies` is 0 with Drive.
- Tests: `tests/backup-disk.test.js` (no local copy with Drive; kept when Drive fails; cleared by the next good upload). Server-only change, nothing to see in the browser. After deploy the first daily backup frees the local copies.

### 1.1.187: Review and fix the owner storefront preview blocked in production (Codex) — [PR #260](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/260)
- Owner requested a recheck of PR #259. Confirmed the live storefront sends `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`, which blocks its iframe. The previous demo omitted Helmet and served the obsolete `platform-shop.html`, so its browser check did not verify the production storefront.
- Only successful public `/shops/<slug>/` HTML now allows same-origin framing (`SAMEORIGIN`, `frame-ancestors 'self'`). All other CSP rules remain unchanged; admin/login, manifests and unavailable shops keep DENY. No database or API changes.
- `lib/security.js` shares the unchanged production Helmet policy with `server.js`, the test and demo; only the local HTTP demo disables HTTPS upgrading. `scripts/platform-demo.js` uses the actual `installTenantApps` storefront routes now.
- Extended `tests/owner-store-preview.test.js` with HTTP assertions: reproduced DENY before the fix, then verified SAMEORIGIN only on public shop HTML and intact protections elsewhere. Node 22 main baseline: 342/342; final `npm run check` and `npm test`: 343/343. Chrome at 375×812 and 1280×812: actual View, Category, Close and Manage clicks passed; real branded storefront loaded with no console errors or failed requests.
- Files: `lib/security.js`, `lib/tenant-install.js`, `server.js`, `scripts/platform-demo.js`, preview regression test; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`. No merge or deploy.

### 1.1.186: Preview the customer storefront inside GearHub owner shops (Codex) — [PR #259](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/259)
- Owner asked to see a newly opened shop exactly as customers see it from GearHub owner settings.
- The owner shop list's existing `View` action now opens a full-viewport in-console preview iframe pointed at the same `/shops/<slug>` route, with a close button and an optional full-page link. No storefront rendering or shop data is duplicated.
- Files: `public/platform.js`, `public/platform.css`, `public/platform.html`; version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; focused test `tests/owner-store-preview.test.js`.
- Verified on local-only fixtures in Chrome at 1280×900 and 375×812: clicked the actual View and Close buttons; the preview filled the viewport and its iframe showed the fixture shop's public storefront. `npm run check` and `npm test` passed on Node 22 (342/342 tests). The empty demo shop returned 404s for absent image/media fixtures; preview UI and app code produced no reported exceptions.
- Do not merge or deploy; owner handles deployment after review.

### 1.1.185: No GearHub info cards in seller shops (Claude) — in review
- Owner: remove "🏭 Industrial selection / 💸 Bank / mobile transfer / 🧰 Purchase support" from all seller shops, new and old.
- `public/store.js` `hideShopDefaults()` adds class `seller-shop` on <html>; `public/style.css` `.seller-shop .benefits{display:none!important}` (a class, so switching views never brings them back). GearHub's own store keeps them.
- Checked with live data through a pass-through: treebird and POLESTAR at 375 (cards gone; POLESTAR otherwise unchanged, 101 products) and 1280 (hidden). Seen but not asked: the footer of a seller shop still shows GearHub's gear logo.

### 1.1.184: New seller shops without GearHub's hero, gear logo and default texts; default navigation picture (Claude) — merged, live
- Owner (new shop "treebird" on iPhone): no hero (gear picture, "INDUSTRIAL SUPPLY · BUILT FOR WORK", "Browse our products.", "Browse equipment"), no gear in the logo circle, no "Industrial equipment" / "Find what you need, from motors to safety supplies."; the navigation background must be the owner's picture (factory skyline) for every shop by default.
- New `public/images/shop-nav-default.jpg` (owner's picture, 1320×429, 84 KB). `public/store.js`: seller shop navigation = its own navigation picture, else the default (GearHub main unchanged); empty logo circle instead of ⚙; `hideShopDefaults()` hides `.hero` without the shop's own hero picture and the catalogue heading/text unless the shop saved its own. Owner: only new shops change — POLESTAR (own logo, navigation picture, hero, saved texts) stays exactly as before. `public/style.css`: `[hidden]` rules.
- Checked with live data through a localhost pass-through (http localhost rejects images in `checkedImageUrl`; relaxed in the test page only): treebird 375/1280 — nothing listed shows, navigation shows the picture; POLESTAR unchanged (logo, own navigation picture, EXCAVATOR hero, its saved "Industrial equipment" text).
- Still GearHub defaults on new shops (not asked): the three cards "Industrial selection / Bank, mobile transfer / Purchase support".

### 1.1.183: No product limit (Claude) — merged, live
- Owner (Plans screenshot): remove the product limit.
- `lib/platform-model.js`: `permissions().productLimit` is `Infinity`, so creating a product, Excel import and restoring from Trash never stop at a count (storage stays the limit). `platform_plans.product_limit` column kept (no schema change).
- `lib/platform.js`: plans saved without `productLimit` keep the stored value (PATCH `COALESCE`), new plans store 100000. `public/platform.js`: "Active product limit" field removed from Plans.
- Test `tests/no-product-limit.test.js`; browser (sample data, 375): Plans has no limit field, Save sends name/storage/permissions only.

### 1.1.182: Owner deletes a test shop at once (Claude) — merged, live
- Owner (iPhone): "Delete shop" in Manage shop did not delete the test shop; wanted it deleted at once.
- Causes: (1) a prompt asked to type the exact shop URL and silently stopped on any mismatch; (2) `platform_upload_keys` (Excel auto-upload key) references the shop, so with foreign keys ON the delete failed for a shop that used auto-upload.
- `lib/platform.js` DELETE `/owner/shops/:id`: also deletes the shop's upload key and Drive photo rows (Drive copies stay in Drive). `public/platform.js`: one confirm ("Delete this shop and all its data for good?") instead of typing the URL; the client still sends `confirmDelete: slug`.
- Test: a shop with an upload key is deleted (owner only). Browser (sample data, 375): one confirm, DELETE sent, shop gone from the list.

### 1.1.181: New shops open at once, up to the owner's shop limit, with the owner's MB (Claude) — merged, live
- Owner: remove the "owner approves" step for new shop applications; owner sets how many shops may open (e.g. 10) and the storage per new shop (e.g. 100 MB).
- `lib/platform.js`: table `platform_signup` (max_shops default 10, storage_mb default 100). `POST /applications` opens the shop in the same transaction while seller shops < max_shops (trial 2 months, `storage_override` = MB, application "approved", note "Opened automatically", GearHub notice has `opened:true`); otherwise it stays pending and the owner approves as before (owner-approved shops also get the MB setting). `PUT /owner/signup` (owner only, 0–10000 shops, 1–10240 MB); owner view has `signup`.
- Owner console: "New shops / ဆိုင်အသစ် ဖွင့်ခြင်း" — shop limit (with current count) and MB per new shop. Applicant page: "Your shop opens straight away"; the waiting card says shops are full.
- Tests: platform tests start with max_shops 0 (they test manual approval); new subtest for auto-open, limit, MB, owner-only. Checked the owner section and applicant text with sample data at 375. Not checked live (needs owner login / a new Google account).

### 1.1.180: Drive photos sorted into category folders, named by product (Claude) — merged, live
- Owner (Drive on iPhone): 1.1.179 put all 990 photos in one shop folder with ID names — too mixed. Wanted category folders.
- `lib/drive-backup.js`: "GearHub Backups/Photos/<shop>/<main>/<sub>/<child>/<SKU> <product name> (n).jpg" (category by `categoryOf` + parent_id); photos on no product → "Other". `platform_drive_photos` gains `parent_id`, `name`; each sweep moves/renames copies whose product category or name changed (PATCH addParents/removeParents, one parent). 1.1.179's flat copies (no parent_id) are moved out of the shop folder on the first sweep after deploy (200 per batch, loops until done).
- `lib/platform.js`: a product save triggers a sweep (~30 s), so Drive follows edits.
- Tests: fake Drive with move/rename; exact paths for Main/Sub, Other, the two-"Sany" move, old flat copies sorted. Not run against the real Drive yet: after deploy the owner opens Drive → GearHub Backups → Photos → psm-test-shop (sorting starts about a minute after the deploy).

### 1.1.179: Google Drive backup — daily backup and shop photo originals (Claude) — merged, live; owner connected Drive, 990/990 photos copied
- Owner: has 5 TB Google Drive; chose "option 1" (approved new server storage code): Drive holds the daily backup and the original of every shop photo; shops keep serving photos from the Render disk (fast, no Drive quotas).
- New `lib/drive-backup.js`: owner connects once (same Google OAuth client as login, extra scope `drive.file` = only files the app made; refresh token in table `platform_drive`). Folder "GearHub Backups": backup archives (newest 30 kept); "GearHub Backups/Photos/<shop slug>/" every ready image (existing ones too, 200 per batch, every 15 min and ~30 s after an upload; table `platform_drive_photos`). Deleted shop photos stay in Drive. Revoked access → shows "not connected" + error.
- `lib/backups.js`: Drive is an off-site destination (step "drive-delivery"). `server.js`: creates Drive when PLATFORM_ENABLED, runs a backup right after connecting. `lib/platform.js`: `POST /owner/drive/connect|sync|disconnect` (owner only), the OAuth callback handles `stored.drive`, owner view has `drive` status, image saves call `drive.photoSaved()`.
- Owner console (`public/platform.js`, `platform.css`): "Google Drive backup" section — Connect / account, last backup, photos copied n/N, Copy photos now, Disconnect.
- Owner setup (one time): Google Cloud project of the login client → enable "Google Drive API"; OAuth consent screen must be "In production" (Testing tokens expire after 7 days). No new Render keys.
- Checked: tests with a fake Google (folders, uploads, retention, photo copy once, revoked access), owner-only routes; owner console with sample data at 375 and 1280 (connect button leads to Google's address, connected view, Copy photos now). Not checked against the real Google Drive (needs the owner's Google consent).

### 1.1.178: Same subcategory name under different main categories; inventory filter uses the category picker (Claude) — merged, live
- Owner (iPhone): "Sany" under Swing Gear Parts was refused ("Category names must be non-empty and unique") because SANY exists under Electrical Parts. Owner approved changing how products store their category. Then: make the Product Inventory category filter the same picker as Add Product.
- Data: products keep `category` (name) and now also `details.categoryId` (no table change). A product belongs to its category ID while that category still has the product's name, else to the first category with that name (`categoryOf` in `lib/category-hierarchy.js`, `public/category-browser.js`, `public/tenant-store.js`, `public/admin.js`). Saving categories gives every product its category ID (renames follow the ID, delete check by ID).
- `lib/category-hierarchy.js`: `validateHierarchy(rows,{sameNameUnderOtherParents:true})` for seller shops: names unique among siblings only; parents by `parent_id` (a name two categories share must be a main). GearHub main (server.js) unchanged (one name per shop).
- `lib/tenant-admin.js`: counts by ID, saves `parent_id`, product save resolves `categoryId` (chosen ID if it has this name, else previous, else first by name).
- Admin: `category-picker.js` adds a hidden `categoryId` to the product form, finds parents by ID, refreshes after a category save; `admin.js` category editor links rows to their parent row (`_parentKey`) and saves `parent_id`; edit fills `categoryId`. Inventory filter: the select only shows the choice ("Sany (Swing Gear Parts)"); a transparent button opens the picker (All Categories / main / subcategory; a main shows everything under it).
- Storefront: `store.js` buttons carry `data-category-id`, the catalogue select uses IDs, counts by ID.
- Checked: new unit + platform tests (owner's case end to end); admin with sample data at 375 and 1280 (filter, Add Product picker sends ID 4 for Swing's Sany, Edit opens on the right main even when both are spelled "Sany", editor tree, save sends parent_id); live POLESTAR storefront through a pass-through with the new scripts (Doosan 19 in the select and the category page). Not checked in the real seller admin (needs login) or on the owner's iPhone.

### 1.1.177: Photo scan counts seconds, stops with "No match found", says why (Claude) — merged, live
- Owner (iPhone): the scanner kept "Looking…" forever when nothing matched. Wanted: say there is no match; count seconds and say how long it took; say why the photo matches.
- `public/photo-scan.js`: "Looking… 3 s" count while scanning (paused while the shop's photos are still being learned). A sure match (same product twice) shows "found in 3.4 s" and a reason line: "Why: 81% alike in shape, colour and surface to its photo 2 of 4 (close-up of the middle); next closest product 69%". After 15 s without one it stops: "No match found · Searched 15.x s" and why (closest only N% alike, needs 60% / seen only for a moment, hold still / two products look the same). A saved photo now also says "No match found" instead of showing a weak closest product. The product name is the top line ("Best match" moved to the line under it); ˄ ˅ hidden when there is nothing to step through.
- `lib/photo-search.js`: each match also returns `photo` / `photos` (which of the product's photos matched) and `view` (0 whole picture, 1–2 closer views). Same API, extra fields.
- `public/style.css`: the reason is a full-width line under the result; name up to two lines.
- Checked at 375 on the live POLESTAR catalogue through a local pass-through (scratchpad live-proxy.js serves the new script/CSS, everything else from skyshopmm.com) with a fake camera: product photo → "SWITCH STARTER", found in 3.4–6.1 s, reason shown; coloured blocks → stopped at 16.2 s, "No match found", "closest, Drive Shaft, only 21% alike". 1280: bar fits. The "photo n of N" part needs the new server (verified by the real-model test). Not checked with the owner's iPhone camera.

### 1.1.176: Recycle Bin looks like the owner's reference photo (Claude) — merged, live
- Owner (reference photo + iPhone screenshots): redesign the inside of Deleted orders like the photo; the dashboard card must not be a "delete" (❌) icon — call it "Recycle Bin".
- `public/admin.html`: card "🗑️ Recycle Bin" (PC sidebar link too). Panel header: red bin in a pink circle, "DELETED", "Deleted orders", red "Delete all" button, note.
- `public/admin.js`: each order is a card — Order ID and Customer on the left, Total and Order date (date / time) in the middle, dark-green Restore on the right, icons as in the photo. As in the photo there is no per-order "Delete forever" any more; "Delete all" empties the bin. The PC sidebar link only opens the bin (a second tap closed it into a blank page).
- `public/tenant-admin.js`: seller shops no longer hide "Delete all" (the platform `/trash` route empties that shop only).
- `public/site-admin.css`: `#deleted-panel .bin-*` styles; phones ≤ 480 px tighter spacing, numbers stay on one line, middle column 126 px so cards line up.
- Checked with sample orders at 375 (no overflow, Restore, Delete all) and 1280 (sidebar link twice, Restore cards). Not checked on the owner's iPhone.

### 1.1.175: Network speed reads like the phone's meter (Claude) — merged, live
- Owner (phone photo): the phone's status bar showed 1.80 MB/s while the badge showed 228KB.
- Cause: the badge timed the shop catalogue, which is only ~28 KB on the wire (brotli) but was counted as ~99 KB, and its time included the server building it and the long wait for a far server. A sample that small measures mostly the wait.
- New `public/speed-test.bin` (1 MB of random bytes: plain file, no compression, not kept by the service worker). `public/net-speed.js` reads it as a stream and times from the first byte; stops after 1.5 s (slow links use little data). Every 3 minutes instead of every minute (each check can use up to ~1 MB on a fast link), plus on opening, returning to the app and coming online. MB now shows two decimals ("1.80MB") like the phone. Good = ≥ 1 MB/s (and first byte < 2 s), Normal ≥ 200 KB/s.
- Checked through a throttled local link: real 1.80 MB/s → 1.61–1.65MB (the page was loading at the same time), real 300 KB/s → 277KB yellow. Fits under the logo at 375 and in the PC pill at 1280. Not checked on the owner's phone. The phone's own meter shows all traffic at that second, so the two will never match exactly.

### 1.1.174: Add Product opens full width on phones (Claude) — merged, live
- Owner (iPhone screenshot): after 1.1.173, "+ Add Product" opened the form squeezed into a one-third card slot.
- Cause: on phones the form was moved to the full-width area under the cards only when its own card ("Add a product", removed in 1.1.173) was tapped.
- `public/admin.js`: `setProductFormOpen` now places the form there on phones (`positionMobileDashboardDetail`), so "+ Add Product" and Edit both open it full width; Edit scrolls to the form's title. PC unchanged.
- Checked locally with sample data at 375 (Add, Back, Edit: 355 px wide, title at the top) and 1280 (Add, Edit). Not checked on the owner's iPhone.

### 1.1.173: Cancelled orders go to the trash; no Add a product card (Claude) — merged, live
- Owner (admin screenshot): remove the "Cancelled orders" card — a cancelled order goes to the trash, and everything deleted is kept there; remove the "Add a product" card (Product Inventory already has "+ Add Product").
- `public/admin.html`: no Cancelled orders button or panel; the PC sidebar's "Cancel Order" link is now "Deleted Orders" (opens the trash).
- `public/admin.js`: "Deleted orders" lists deleted and cancelled orders. Restore brings a cancelled order back to pending (as before). "Delete forever" on a cancelled order calls DELETE twice (to deleted, then for good); "Permanently delete all" moves cancelled orders to deleted first. No API or database change. Product editor Back now scrolls to Product Inventory.
- `public/site-admin.css`: phone order cards are 2 per row; the Add a product card is hidden, its panel only shows while the form is open (from "+ Add Product", Edit, or the PC sidebar).
- Checked in the browser with sample orders (page requests answered in the browser, no login) at 375 and 1280: cards, trash list, Delete forever, Restore, Permanently delete all, + Add Product, sidebar links; no script errors. Not checked on the owner's iPhone or the live shop admin.
- Tests: new `tests/order-trash.test.js`; 322 pass.

### 1.1.172: Speed badge no longer touches the logo (Claude) — merged, live
- Owner (iPhone + mock-up): the wifi badge overlapped the logo; wanted the logo and shop name a little higher and the badge below the logo with a gap.
- `public/style.css` (phones, ≤ 850 px): logo and name moved up 12 px; badge starts 5 px under the logo; icon 21 px. PC unchanged.
- Checked at 375 on the local store: logo 13–79 px, badge 81–113 px, banner ends at 116 px; matches the mock-up. Not checked on the owner's iPhone (its banner also has the status-bar area).

### 1.1.171: Network speed under the shop logo (Claude) — merged, live
- Owner (iPhone mock-up): a wifi icon under the logo showing the real network speed — green good, yellow normal, red low.
- New `public/net-speed.js`: iPhone Safari does not report the speed, so it is measured: a tiny request (`/api/platform/me`) gives the delay, then the shop's catalogue (`/api/platform/store/<slug>`, no-store, ~100 KB for POLESTAR; `/api/products` on the main store) gives bytes per second. Good ≥ 1 MB/s with delay < 600 ms, Normal ≥ 200 KB/s with delay < 1.5 s, else Low; grey "Offline". Shown as e.g. "1MB" / "350KB". Measured 1.5 s after opening, every minute while the app is on screen, on coming back online and on returning to the app (about 100 KB per minute).
- `public/style.css`: under the logo on phones (white text, coloured icon); a small white pill under the small logo on PC (≥ 851 px).
- Checked in the app browser on the local store at 375 and 1280. Not checked: real numbers on the owner's iPhone over Wi-Fi / mobile data.

### 1.1.170: Closing a product keeps the shop where it was (Claude) — merged, live
- Owner (iPhone): after looking at a product's photos and closing them, the shop jumped back to the top.
- Cause (reproduced in WebKit on the live site: 1470 px → 0): `back-nav.js` adds a history step when photos open and steps back with `history.go` on ✕/Back; the browser then restored the scroll it had saved for that step while `body.gallery-open` locked the page — 0.
- Fix: `back-nav.js` sets `history.scrollRestoration='manual'`; `store.js` remembers the scroll when photos open and returns there on close (focus inside the photos is dropped first); `dialogs.js` returns focus with `preventScroll` and never to `<body>` (iPhone taps don't focus buttons, so the "opener" was the page); `photo-scan.js` returns to the same place when the scanner closes.
- Checked in WebKit (iPhone user agent) on the local store: ✕ and Back both keep the position at 375 (1581 → 1581) and 1280 (1393 → 1393). Test added. Not checked on the owner's iPhone.

### 1.1.169: Photo scan on the server (DINOv2) — accurate matches (Claude) — merged, live, owner confirmed
- Owner (iPhone, 1.1.168): scanning a VALVE PLATE highlighted SHOE PLATE. Owner allowed a new server API and AI model.
- Why 1.1.168 failed: the on-phone MobileNet v2 0.5 gave the right photo only 0.46, while blank/blurred camera frames scored 0.56–0.65, so the scanner locked onto junk before the part was in view; parts shot from another angle were first only ~10 % of the time.
- New `lib/photo-search.js`: DINOv2-small (Meta, Apache-2.0; `models/dinov2-small-q8.onnx`, 24 MB uint8 ONNX from Hugging Face Xenova/dinov2-small) via `onnxruntime-node` 1.20.1 (CPU, one picture at a time). Every photo of every active product is turned into 384 numbers once and kept next to the photo (`platform-media/<shop>/.photo-looks/<id>.dinov2s.f32`); all shops are learned 20 s after the server starts; new photos are learned on the next scan; unreadable photos are skipped. Queries are compared whole and at 70 % / 50 % centre views; best photo per product; top 5 returned.
- New route `POST /api/platform/store/:slug/photo-search` (public shop via `publicShop`, CSRF like orders, 120/min per IP, JPEG/PNG/WebP up to 4 MB) → `{ready:false,learned,total}` while learning, else `{ready:true,matches:[{id,score}]}`. `PHOTO_SEARCH=off` disables it. `.npmrc` skips onnxruntime's CUDA download on Render.
- `public/photo-scan.js`: no on-phone model (removed `public/vendor/`); the scanner sends the part inside the frame (≤640 px JPEG) frame after frame; an answer needs score ≥ 0.6, 0.03 ahead of the next product, the same product twice in a row. Gallery photos show the closest products. Seller shops only.
- Measured on POLESTAR's 641 photos: owner's scan → VALVE PLATE 0.92 (next 0.76); blank 0.31, blurred 0.40; simulated shots from another angle: right product first 48 %, top 3 79 % (MobileNet: ~10 % / ~20 %). Learning all 641 photos: ~50 s on this Mac, server memory ~120–220 MB; a scan ~0.25 s here. Render CPU is slower: not measured.
- Checked: `tests/photo-scan.test.js` runs the real model (two synthetic parts); module run end-to-end on the 641 photos; app flow in the browser with a stubbed server (not ready → wait, 0.35 ignored, 0.92 twice → highlight). Not checked: Render memory/speed and the real iPhone camera (owner, after deploy).

### 1.1.168: Photo scan — live camera, quiet learning, best match highlighted (Claude) — merged, live (wrong matches, see 1.1.169)
- Owner (iPhone, 1.1.167): wants the scan button to open a live scanner at once (like the iPhone code scanner: corner frame, flashlight), no "first time only" learning message, and the closest product highlighted like an Excel search match (not a filtered list). The shop's products have many photos from every side; all are used.
- `public/photo-scan.js` rewritten: the shop's photos are learned quietly in the background a few seconds after the shop opens (one photo per ~120 ms; faster while the scanner is open) and kept in IndexedDB. Scan button → full-screen camera (`getUserMedia`, back camera) with a corner frame, gallery button (saved photo) and a flashlight button when the camera supports it. Every ~350 ms the part inside the frame is compared (whole frame and its centre); the same product first 3 times in a row, clearly ahead of the next, is the answer: the scanner closes, the product card gets a blue highlight (kept when the list redraws) and a strip under the search bar shows the photo, "Best match: …", ˄ ˅ to the next 4 closest, and ✕. Scanning waits until learning has finished ("Getting ready…"), so a half-learned shop cannot answer wrongly. Search word / category are cleared if they hide the match.
- `public/store.js`: list filtering from 1.1.167 removed. `public/style.css`: scanner, highlight, ˄ ˅ styles; progress-bar styles removed.
- Checked in the app browser at 375 with the local store: learning ran silently; a gallery photo and a simulated camera (canvas stream of the part on a table) both found the right product (camera in 1.9 s) and highlighted its card. The real camera is blocked in the app browser: the iPhone camera, permission prompt and flashlight are not verified (owner).

### 1.1.167: Photo search in the shop (scan button in the search bar) (Claude) — merged, live (owner asked for changes, see 1.1.168)
- Owner: a scan button at the right of the search bar; take a photo or pick one from the gallery, and products that look the same are shown (owner chose "photo look", not part-number text).
- New `public/photo-scan.js`: the button opens the iPhone camera / photo library (`<input type=file accept=image/*>`). On the phone, TensorFlow.js + MobileNet v2 0.5 (`public/vendor/`, served from this site because the CSP allows only same-origin scripts; weights re-packed to uint8, 2.0 MB) turns each picture into 1280 numbers. The shop's photos are turned once and kept in IndexedDB (first scan shows "Learning the shop's photos… n / N"); model files are kept with the Cache API, so it works offline after the first use. Matching: the shop-wide average is taken away (white background), the photo is compared whole and at two closer centre crops, best photo per product; top 12 products replace the list (most similar first) until ✕. `public/store.js` `renderProducts` reads `window.photoScanIds`.
- TF.js assigns `regeneratorRuntime` and falls back to `Function()` (blocked by CSP) when the global is missing; the script creates it first.
- Accuracy check with POLESTAR's own photos (30 products, each photo turned into 4 simulated phone shots — rotated, on coloured surfaces, darker): right product first 66 %, in the top 3 92 %. Photos taken from a very different angle, or of the box, match less well. End-to-end at 375: simulated phone photo of RELAY → "Closest match: RELAY", list shows it first; ✕ restores all; PC 1280 button in place. Not checked on a real iPhone camera (owner).
- Files: `public/photo-scan.js`, `public/vendor/` (+ README), `public/store.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/photo-scan.test.js`, version files.

### 1.1.166: Excel — dragging a selection keeps all its rows/columns (Claude) — merged, live
- Owner (Google Sheets video): with 3 cells selected, a sideways drag should grow all 3 rows; ours restarted from the touched cell (one row).
- `public/excel-select.js`: a drag that starts on the selection now grows the whole selection towards the finger (union of the selection and the finger's cell); holding still on the selection no longer shrinks it to one cell. Handles unchanged (they can still shrink).
- Test added; cache tag bumped.
- Checked in the app browser at 375 with the real workbook: B7:B9 dragged sideways from B8 → B7:D9.

### 1.1.165: Excel — drag the selection sideways on iPhone (Claude) — merged, live, owner confirmed
- Owner (iPhone video): dragging down grew the selection, but a sideways drag moved the whole screen and selected nothing.
- iPhone decides at touch-down whether a finger pans, so `preventDefault` in `touchmove` was too late for sideways drags. `public/style.css`: `#excel-grid td.xs-sel, .xs-handle {touch-action:none}` (the selection and its dots never pan), `#excel-grid{overscroll-behavior:contain}` (the sheet's scrolling never pulls the page). `public/excel-select.js`: while dragging a selection near an edge of the sheet, it scrolls (Google Sheets style).
- Test added; cache tags bumped.
- Checked in the app browser at 375 with the real workbook: selected cells report `touch-action:none`, others `auto`; dragging the end dot to the right edge auto-scrolled 168 px and selected columns B–E. Real iPhone: owner.

### 1.1.164: Excel selection polish — drag from the selection, one outline, visible "Copied" (Claude) — merged, live
- Owner (iPhone, 1.1.163 works): "Copied" never showed; dragging only worked from the blue dots; selected cells showed double lines.
- `public/excel-select.js`: a touch that starts on the selection holds back the first move (no page scroll) and, once it moves, selects from that cell; a still touch there still copies. Elsewhere a drag scrolls. The per-cell blue box is replaced by one `.xs-range` outline around the whole selection, drawn over the cell lines. "Copied" is its own `.xs-copied-note` on `document.body` above the full-screen sheet (the shop toast sat behind it). Handles + outline share `.xs-mark`, which the repaint observer ignores.
- `public/style.css`: `.xs-range`, `.xs-copied-note`; `td.xs-active` no longer draws an inset box. Tests updated/added.
- Checked in the app browser with the real workbook: phone 375 (drag from A4 → A4:B6, outline exactly around it, tap → 3 lines copied and "Copied" visible), PC 1280 (outline, no handles). No script errors. Real iPhone: owner.

### 1.1.163: Excel tap-to-select works on iPhone (Claude) — merged, live, owner confirmed
- Owner (iPhone, 1.1.162): tapping a cell selected nothing, so the handles and copy never appeared.
- 1.1.162 selected on the `click` event; iPhone Safari did not deliver it there. `public/excel-select.js` now reads a tap from `touchend` (touch shorter than 500 ms that moved under 8 px, not a handle drag or hold) and ignores the click that may follow; `click` stays for pens/other pointers. Copy runs inside `touchend` (a user gesture, so the clipboard is allowed).
- Test added in `tests/excel-select.test.js`; cache tag bumped.
- Checked in the app browser at 375 with touch events only (no click): tap selects + handles, second tap copies + "Copied". Not checked on a real iPhone: this Mac has no Xcode / iOS Simulator.

### 1.1.162: Excel selection like Google Sheets on phones; tap selection to copy (Claude) — merged, live (tap failed on iPhone, see 1.1.163)
- Owner (iPhone video): scrolling selected the cell under the finger. Wanted: tap where you want, then drag to select (like Google Sheets); tapping the selection again copies it.
- `public/excel-select.js`: touch `pointerdown` no longer selects (a swipe only scrolls); a tap (`click`) selects a cell. On touch screens two blue corner handles (`.xs-handle`, placed in the grid) drag to grow/shrink the selection; hold-and-drag still works. Tapping inside the selection copies it (toast "Copied", short flash). Mouse: clicking the selected single cell again copies it; clicking a cell inside a bigger selection selects that cell; Ctrl/Cmd+C as before. The repaint observer ignores the handles moving (no loop).
- Styles at the end of `public/style.css`. Tests in `tests/excel-select.test.js` updated and added.
- Checked in the app browser with the real workbook: phone 375 (touch-down selects nothing, tap selects + handles, dragging the end handle selects B6:D9 with scrolling blocked, tapping inside copies 4 lines + toast), PC 1280 (drag range, click inside → single cell, click again → copied). No script errors. Not checked on a real iPhone (owner).

### 1.1.161: Excel pictures scale with zoom; tab line only on the open sheet (Claude) — merged, live
- Owner (iPhone): zoomed out, INV's logo stayed big and ran over the address rows; and the coloured line under the sheet tabs should show only on the open sheet.
- `public/excel-map.js` `placeShapes`: anchor offsets (`colOff`/`rowOff`), one-cell sizes, picture frame and shadow are stored at 100 % and are now multiplied by the sheet zoom. `renderTabs` no longer sets each tab's own colour.
- `public/style.css`: `.excel-tab` bottom line is transparent; only `.excel-tab.active` keeps the blue line.
- Checked in the app browser with the real workbook at 375: INV logo vs row 32 at zoom 3 (bottom 364 px, row 32 at 406 px) and 0.3 (37 / 65) — same proportions, no overlap; only the INV tab has a line.

### 1.1.160: Excel viewer — ≡ sheet list like Google Sheets (Claude) — merged, live
- Owner (Google Sheets app screenshots): add a button at the left of the sheet tabs that lists every sheet.
- `public/excel-map.js`: `renderTabs` puts a ≡ button first in `#excel-tabs` (sticky, stays at the left while the tabs scroll). It opens `.excel-sheet-list`: a "Sheets" panel from the bottom (phones) / centred card (≥700 px) listing all sheets, the open one in green; a row opens that sheet, a tap outside or Esc closes. The open sheet's tab is now scrolled into view (it stayed off-screen before when picked far right).
- Styles at the end of `public/style.css` (dark panel like the reference). Cache tags bumped.
- Checked in the app browser with the real workbook: phone 375 (≡ visible, list of 24 sheets, INV picked → 1104 rows, INV tab in view), PC 1280 (centred list). No script errors (the console only had local-server 401/404s from opening a logged-out admin earlier).

### 1.1.159: Product category is required again (Claude) — merged, live
- Owner (iPhone, 1.1.158): a product could be added with no category, and the runaway button showed Category as filled.
- Cause: `public/category-picker.js` made the category field `readOnly`; browsers skip `required` on read-only fields, so neither the form check nor the runaway button saw it as empty.
- Fix: not read-only any more; `inputMode="none"` (no keyboard) and typing / paste / drop are blocked, so the value still only comes from the picker and `required` works.
- Tests: `tests/category-parent-picker.test.js`. Version files and the picker's cache tag bumped.
- Checked in the app browser with the real form at 375: empty category → form invalid, the button runs with "One to go — Category", typing is blocked; after a category is set → "Locked in", form valid.

### 1.1.158: Add Product "runaway" button (Claude) — merged, live
- Owner: when Add Product is pressed with required fields empty, animate like their reference video ("Runaway Login": the button will not stand still until the form is filled).
- New `public/product-runaway.js` (loaded by `admin.html`): with SKU / Category / English name / Price / Stock empty, a tap (phones) or the mouse coming close (PCs) makes the button bolt out of its slot as a pill; a dashed outline marks the slot, a line ties it back, and a status line lists the empty fields ("N fields to fill before it stands still", "One to go — it is slowing down"). Filled required fields get a green outline + check, empty ones an orange outline. Once all are filled it returns to the slot ("Locked in. Go on then."). While saving, the button shows a spinner. Enter still submits through the existing `saveProductForm` (browser validation). Save logic is unchanged.
- Styles at the end of `public/site-admin.css`.
- Checked in the app browser with the real form markup on a temporary page (no admin login locally): phone 375 (bolt, status updates 5 → 2 → 1 → locked in, checks/outlines, spinner) and PC 1280 (mouse dodging). Not checked inside a logged-in admin (owner).

### 1.1.157: Gallery download — parachute falls slowly, save after landing (Claude) — merged, live, owner confirmed
- Owner (iPhone video of 1.1.156): photos came from the saved copies so fast that the parachute flashed and the share sheet opened at once. Wanted: the parachute falls slowly from above onto the bar, and saving shows only after it lands.
- `public/store.js` `downloadGalleryPhotos`: the shown progress is the smaller of the real download progress and time / 3 s, driven by a 30 ms timer (animation frames stop in hidden windows). It sets `--fall` (0→1) and the %; after landing: check + "Complete", 0.5 s, then the share sheet (phones) or the file downloads (PCs). If iOS refuses the late share sheet, the existing "Tap to save" step appears.
- `public/style.css`: while downloading the drop sits at `calc(-40px + var(--fall) * 48px)` (starts above the bar, lands on it), no transition.
- Checked in the app browser: phone 375 — the parachute goes from 44 px above the bar to the bar over ~3 s (6 %, 41 %, 75 %, Complete), share called after landing (~4.3 s); PC 1280 — files saved after landing. No console errors.

### 1.1.156: Download all photos button in the product gallery (Claude) — merged, live
- Owner: add a button that downloads all of a product's photos; design from their reference video (a ring with a down arrow; pressed, the ring unrolls into a progress bar, the arrow floats on a parachute with the %, then a check and "Complete").
- `public/index.html`: `#gallery-download` next to the gallery count. `public/style.css` (end of file): `.gallery-dl*` states idle / downloading / done / save. `public/store.js` `downloadGalleryPhotos`: fetches each photo with byte progress (works offline, photos are cache-first), names files `<product>-<n>.<ext>`. Phones (`pointer:coarse` + `navigator.canShare({files})`) open the share sheet (Save Images → Photos); if the browser refuses it after the download, the button shows "Tap to save" and the next tap opens it. PCs download each file.
- Checked in the app browser: PC 1280 (3 photos → 3 files named correctly, idle / 33 % with parachute / 100 % / Complete), phone 375 (share path with a stubbed share: "Tap to save" then Complete), no console errors, no sideways scroll. Not checked: the real iPhone share sheet (owner).

### 1.1.155: Saved product photos show at once offline (Claude) — merged, live, owner confirmed
- Owner (installed PC app, internet off, 1.1.154): Fuse Box gallery showed the big photo but thumbnails 2–11 stayed blank.
- All 11 photos were in the offline cache (checked on live). The fetch handler tried the network first and used the cache only after the network failed; offline the network can hang instead of failing, so those requests never finished. The big photo came from the browser's own HTTP cache.
- `public/sw.js`: product photos (`/api/platform/images/<id>`, immutable) are now served from the cache first, and downloaded (and kept, max 900) only when missing. Other images keep network-first.
- Tests: `tests/tenant-install.test.js` (a saved photo answers even when fetch never settles). Version files bumped.
- Checked locally: with the server up, the service worker answers a saved photo from the cache; the store's photos load, no console errors.

### 1.1.154: Offline photos finish on big shops (Claude) — merged, live (645/645 saved in 128 s)
- Live check of 1.1.153 on POLESTAR (100 products, 645 photos, ~180 KB each): after 2 minutes 393/645 photos were saved (61 %) and Settings showed "Offline failed". `store.js` gave the whole download 120 s, and every run downloaded every photo again (`cache:"reload"`).
- `store.js`: the 120 s limit now restarts on every progress message, so it only fails when the download stalls.
- `sw.js` SAVE_OFFLINE: a product photo (`/api/platform/images/<id>`, immutable) already in the offline cache is skipped; one already seen while browsing is copied from the other caches instead of downloaded. Later runs only fetch new photos.
- Tests: `tests/tenant-install.test.js` (saved/seen photos are not fetched again). Version files and cache tags bumped.

### 1.1.153: Offline keeps product photos (Claude) — merged, live (timed out on POLESTAR, see 1.1.154)
- Owner (installed PC app, internet off): Settings said "Offline success" but product photos (gallery 2/3, 3/3) were blank.
- Cause: product photos are served from `/api/platform/images/<id>`, and the offline save skipped every `/api/` address (in `store.js` collect and in the `sw.js` SAVE_OFFLINE filter). Only photos already seen were in the image cache.
- Fix: both allow `/api/platform/images/`; other `/api/` data is still not saved. Offline, the image branch of the fetch handler already falls back to `caches.match`, which finds the saved copy.
- Files: `public/store.js`, `public/sw.js` (+ cache tag in `index.html`), `tests/tenant-install.test.js`, version files.
- Checked locally (port 3008): the save includes the photo URL and skips `/api/products`; with the server stopped, the saved photo URL answers 200 from the cache and the store reloads with all 14 products and 6/6 photos. Real POLESTAR photos can only be checked on the live site after deploy.

### 1.1.152: Offline download progress in Settings (Claude) — merged, live
- Owner: "I can't tell whether offline has finished". Asked for "Offline" on the right of Server storage, a 1–100 % ring while downloading, and a check with "Offline success" at 100 %.
- `public/sw.js` SAVE_OFFLINE posts `{progress,total}` after each batch of 6 files; `public/store.js` passes the percent with the `gearhub:auto-download` event; `public/settings.js` `renderOffline` draws it in `#offline-status` (replaces the storage row's chevron in `index.html`). States: Offline / N% / Offline success / Offline failed. Styles in `style.css` (`.offline-status`, `.offline-ring`, dark mode).
- Tests: `tests/tenant-install.test.js` checks the progress messages. Version files and cache tags bumped.
- Checked in the app browser on a local store (port 3008, no platform mode — locally the platform root redirects `/`, so its service worker cannot install): real download went 0→21→43→64→86→100 % → Offline success; PC 1280 and phone 375, no console errors, no sideways scroll.

### 1.1.151: INV lines like Excel — SR box, WH-1 boxes, blue bar (Claude) — merged, live
- Owner (PC app, ~1625px): "SR border still broken; WH-1 lines don't look good".
- `public/excel-map.js` `edgeAt`/`edgeCss`: each line is now drawn whole inside the cell that owns it (no more half-and-half thick lines). On an edge both cells claim, the right/lower cell's line wins, as in Excel (SR's black left line over D36:F36's thick white right line); the cell that gives way hides its line and its gridline there. Merged cells do this part by part, placed from the border box so they line up with the cells beside (WH-1 top line stuck out 2px).
- Files: `public/excel-map.js` (+ cache tag in `index.html`/`sw.js`), `tests/excel-library.test.js`, version files.
- Checked in WebKit with the real workbook: INV at 1625×1017 (SR box closed, WH-1 boxes even, blue bar straight at row 36) and 440×956; all 24 sheets scrolled at phone size: 0 gaps, 0 jumps.

### 1.1.150: Installed app title bar stays white (Claude) — merged
- Owner (PC app screenshot): the dark green bar at the very top of the installed POLESTAR app should be white like the header below.
- Cause: the page and manifest were already white (1.1.147), but `public/settings.js` `applyTheme` set `<meta name="theme-color">` back to `#183426` in light mode after load. Now `#ffffff` (dark mode keeps `#101a14`).
- Files: `public/settings.js` (+ cache tag in `index.html`/`sw.js`), `tests/manifest.test.js`, version files.
- Checked: after load the meta stays `#ffffff`. The owner should close and reopen the installed app.

### 1.1.149: INV like Excel — logo, centred thick lines, merged edges, cell margin (Claude) — in review
- Owner's screenshot (PC app, wide window): INV logo cut off, borders broken, "22,854,000 DT" box cut, "***" cut.
- Pictures/shapes: a picture's cell no longer forms its own layer (a later picture cell's white background covered the bottom of the logo); shapes sit at z 5 above cells. Frozen cells holding boxes are stacked so earlier (upper/left) ones are on top. Picture frames (`a:ln`, Excel picture styles) and saved outer shadows are drawn from the file.
- Borders: thick lines are centred on the shared edge like Excel (left/upper cell draws the first half) — removes the white notch in INV's blue bar at row 36. A neighbour inside a merged range shows the range's outer edge (E53:G53 with G hidden showed F53's inner red line). Merged cells draw all four sides part by part (O48:Q49 drew row 48's green line on row 49 too).
- Excel's cell margin (column width = text + 5px): `td{padding:0 2px}`; text spill widths follow. Spilling cells sit above neighbouring pinned (frozen) cells, which paint white backgrounds.
- Checked in WebKit at the owner's window size (1625px) and phone size with the real workbook.

### 1.1.148: Excel looks like the file — all rows, no gridlines where off, merged borders, wrapping (Claude) — in review
- Owner: "BC sheet doesn't show all rows" and "INV differs from the original a lot". Reference: the owner's earlier photos of Excel on the laptop (INV top and totals area).
- BC has 2297 rows; the 1500-row cap (from before only nearby rows were drawn) cut it. `MAX_ROWS` is now Excel's 1048576 (`<col>` ranges stop 1000 columns after their start).
- INV/YUAN/GRP/Sheet4 turn gridlines off (`showGridLines="0"`); the viewer drew them anyway → `table.excel-nogrid` hides the light lines, file borders stay.
- Merged cells: the right/bottom edge is taken from the range's last column/row, part by part (INV H34:I34 "NO PAID" lost its red right side; D36:F36 drew D37's green top across E–F). Uneven edges are drawn as background segments.
- Excel wraps only at spaces: Myanmar words stay whole (`.excel-word`), so "NO PAID / ငွေမရှင်းသေး" breaks like Excel.
- Text rotation (`textRotation` 90/180/255/angles) and long text spilling into empty neighbour cells (left/right/centre, stops at text or merges) as in Excel.
- Kept: rows above / columns left of a pane frozen low down stay hidden (owner's Excel photo, 1.1.125: INV starts at row 28 / column C).
- Checked in WebKit with the real workbook: INV top and totals area match the Excel photos (shape colours come straight from the file, e.g. FF00FF); vertical total in O894; BC shows 2296 rows, SLM STOCK 6008 (both were cut at 1500). All 24 sheets at 440px: no gaps/jumps, zoom 3–82 ms. A `:has()` rule made INV zoom take 1.3 s in WebKit; spilled-text cells use a class instead.

### 1.1.147: White installed storefront top bar (Codex) — in review
- Owner asked for the dark top app/browser color to become white and blend into the storefront below.
- Cause: the root page theme-color and installed seller app manifest theme_color were both dark green; iOS standalone status style also requested a dark translucent bar.
- `public/index.html`, `public/manifest.webmanifest`, `lib/tenant-install.js`: set storefront/app theme color to white and iOS standalone status style to default.
- Release version and shell cache bumped; `tests/manifest.test.js` and `tests/tenant-install.test.js` pin white.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/219
- Node 22 checks: static check passed; 304 tests passed. Browser visual check unavailable; no deployment.

### 1.1.146: Excel borders like the file; clean top bar (Claude) — in review
- Owner (iPhone screenshot, BC row 1010): cell borders missing; wants the look exactly like the original file. Also: never again anything smudged/overlapping at the very top.
- Cause 1: the file sets borders on cells' left/top. With collapsed table borders the left/upper cell's light gridline wins a shared edge, so most black lines showed grey (this was true before the recent Excel changes too: 525/525 cell borders identical to 1.1.143).
- Cause 2: with collapsed borders, rows scrolling under the sticky column letters painted their lines and a strip of text over them (WebKit and Chrome).
- `public/style.css`: table uses separate borders; cells and headers draw right/bottom edges only. Search bar fixed to 40px inside the 50px white bar (it was 57px and hung over the column letters); back button centred.
- `public/excel-map.js`: each cell's right/bottom edge = its own border, else the left/top border of the cell to the right/below (inside a merged range: the range's first cell). First shown column/row draw their own left/top.
- Checks (WebKit, owner's real workbook): BC rows 1004–1018 now show black borders like Google Sheets; top bar clean at 440px and 1280px; all 24 sheets scroll with no gaps/jumps; old-vs-new pixel check at the top of all 24 sheets: no line lost (only 1–3px shifts of thick lines, now inside the cell), black lines gained where the file has them; search jumps at 440/1280 still correct; row heights equal (one INV row +1px from a 2px border).

### 1.1.145: Excel search like Google Sheets (Claude) — in review
- Owner (iPhone screenshots): searching hid every row without a match, so the header row disappeared; wanted it like Google Sheets.
- `public/excel-map.js`: search no longer filters rows. `find()` lists matching cells (row by row), selects the first, scrolls it just under the header/frozen rows (and sideways past frozen columns only when they are really frozen), and ˄ ˅ buttons / Enter / Shift+Enter go to the previous/next match (wrapping). Status shows "N found" / "No match". After zoom the same match stays selected.
- `public/excel-select.js`: an `excel-find` event selects the found cell (blue box, lit column letter and row number). A selection made on a freshly drawn table is no longer wiped by the table-replaced observer (a zoomed match kept its box when the next match was selected).
- `public/style.css`: search bar = box + two round arrow buttons.
- Checks: real workbook in WebKit at 375px and 1280px — BC "carrier" (60, incl. jumps to rows 1160–1168), CB "A8-Y26" (44), INV "hitachi", Fast Moving "assy" (90), DEL: match always on screen, exactly one blue box, header row stays; "No match" case. Node 22 check + tests.

### 1.1.144: Faster Excel viewer (Claude) — in review
- Owner: the Excel viewer stutters and feels heavy. Tested with the owner's real workbook (OCT-2026 (Excavator).xlsm, 24 sheets, up to 37,000 cells per sheet; frozen rows/columns, pictures, 1,500 merges).
- `public/excel-map.js`: only rows near the screen are drawn (1200 px above/below; frozen rows always); spacer rows stand in for the rest (bottom spacer in its own `tbody.excel-after` so cut merges end at the drawn part). A merge starts its drawn part at its first row. Drawn rows are measured with fractional heights so spacers stay exact; no spacer above the first rows (an empty row takes a pixel between collapsed borders). Shapes are placed only when their corner row is drawn. `grid.cellText` gives copy the sheet's own text.
- `public/excel-select.js`: cells/headers indexed by position (rebuilt and selection repainted when rows are redrawn); copy reads `grid.cellText`.
- `public/style.css`: spacer rows; `.excel-sheet{overflow-anchor:none}` (browser scroll anchoring moved the sheet ~3000 px per redraw).
- Results (WebKit at 375px, real workbook): zoom 2–110 ms (was 121–448 ms on a Mac, more on phones); sheet switch e.g. CB 210→29 ms, BC revisit 674→53 ms; drag select ~0.1 ms (was 20–46 ms); cells on the page e.g. BC 37,489→~1,900.
- Checks: every sheet scrolled top to bottom in WebKit at 375px (and 6 big sheets at 1280px): no gaps, no jumps. Screenshots vs the previous version at the top of 10 sheets and after scrolling down on 6 (incl. frozen columns, pictures): pixel-identical except one 1-px line under the sticky header on 2 sheets. Selection across redraws, copy of 247 rows incl. undrawn ones, row-number select, search: correct. Chrome 375px: no gaps.
- Known: jumping straight to a far scroll position (scroll-bar drag) can land a few rows from where the old full table would, because undrawn rows' wrapped-text heights are only known once drawn; content is always correct. First open of a very large sheet still spends ~0.4 s reading its XML (once per file).
- Testing notes: WebKit probe = Swift WKWebView runner, local server behind a proxy that strips `upgrade-insecure-requests` and caching; hide the SkyShop splash before snapshots.

### 1.1.143: Phone grass under the working birds layer (Claude) — in review
- Owner's iPhone recording after 1.1.142: picture fast, but the grass didn't sway and the birds vanished once the Codex box appeared.
- Reproduced with a WebKit (WKWebView) probe at 375px: the Codex `<svg>` moved into the page can stay paused at time 0 (`animationsPaused()`), which leaves its birds frozen off-screen. The birds `<img>` layer flies on iPhone (1.1.141).
- `public/platform.js`: the `.sky-codex` box now holds only the picture + grass program and goes under the birds layer (`underBirds`); no SVG is moved in.
- Local WebKit test needs `upgrade-insecure-requests` removed (WebKit upgrades http://localhost); a throwaway proxy was used, nothing changed in the app.
- Validation: Node 22 check + tests; WebKit probe at 375px through the proxy: order picture → grass box → birds layer, grass drawn, birds move, no errors. Not verified on a real iPhone.

### 1.1.142: Swaying grass on phones without a frame (Claude) — in review
- Owner: after 1.1.141 the birds fly on iPhone but the grass doesn't sway like PC. Owner asked to add it.
- `public/platform.js`: on phones, after the picture + birds layer show, the stored phone page's own picture (`img#art`) and birds `<svg>` are placed in a `.sky-codex` box in this page, and its program runs from `GET /scene-asset/phone-script`. No frame, so iPhone doesn't freeze it. The grass canvas stays hidden until 8 frames are drawn (`.drawn`), so there is no black screen. PC keeps the frame.
- `lib/tenant-install.js`: `GET /scene-asset/phone-script` serves the phone page's first `<script>` as JavaScript (404 without a phone page). It runs with this site's rights; only the GearHub owner can upload that page.
- `public/platform.css`: `.sky-codex` layout. Files also: `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Validation: Node 22 check + 297 tests. App browser 375px: picture at once, birds fly, grass sways, no frame, no errors; 1280px still the frame. Not verified on a real iPhone.

### 1.1.141: Phones show the picture and flying birds without the Codex frame (Claude) — in review
- Owner's iPhone recording (home-screen app): ~10 s dark screen while the Codex phone page loaded, then the birds stayed frozen inside the frame. Owner chose: phones without the frame (birds fly, picture at once); grass sways on PC only.
- `public/platform.js`: the `.sky-frame` is only created above 600px; phones keep `/scene-asset/phone` + `/scene-asset/phone-layer` (the zip upload already saves both). The phone page stays stored but is not shown.
- Files: `public/platform.js`, `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Not verified on a real iPhone (no WebKit here); checked at 375px and 1280px in the app browser.

### 1.1.140: Codex background pages with their own program (Claude) — in review
- Task: Codex's new background zips (picture, birds SVG and a WebGL script that sways the grass) showed only the old still picture on skyshopmm.com. Continues the unmerged `claude/scene-page` branch (its server part is included here; its page part was never uploaded).
- `lib/site-scene.js`: kinds `page` / `phone-page` (whole HTML page, ≤10 MB). `lib/tenant-install.js`: `GET /scene-asset/state` and `/scene-asset/page|phone-page`, served with a CSP `sandbox allow-scripts` header, no outside requests, `frame-ancestors` = the site, no X-Frame-Options.
- `public/platform.js`: an iframe `.sky-frame` over the picture shows the page (phones: phone page, else the PC page unless the phone has its own picture). No `sandbox` attribute: WebKit leaves attribute-sandboxed frames blank; the CSP header sandboxes it. The zip upload keeps a page whole when it has a `<script>` and no outside `src`/`href`; otherwise that side's page is removed. The owner editor shows "Codex page" with a remove button. `public/platform.css`: frame placement matching the picture.
- Files: `lib/site-scene.js`, `lib/tenant-install.js`, `public/platform.js`, `public/platform.css`, `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Validation: Node 22 `npm run check` and `npm test` passed (296 tests). Browser (local, `PLATFORM_ENABLED=true`, Codex's Golden_Mountain_PC and Phone_Grass pages saved straight into the local database): 1280px shows the PC page, 375px shows the phone page, birds and grass render, Sign in still opens, no failed requests. Not verified: the owner zip-upload button itself (needs an owner login), and on a real iPhone. The page is black for a few seconds while Codex's page draws its picture.

### 1.1.139: Excel row and cell selection (Codex) — in review
- Task: only a row-number click selects the whole row; a data-cell click selects that cell, and dragging selects a range.
- Cause addressed: pointer handling now resolves a clicked data cell before checking for a row header; the selection script cache key is bumped so deployed clients fetch the corrected behavior.
- Files: `public/excel-select.js`, `tests/excel-select.test.js`, version/cache files.
- Validation: Node 22 `npm run check` and `npm test` passed (294 tests); `node --check public/excel-select.js` passed. Browser verification was unavailable in this environment.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/211.

### 1.1.138: Excel gridlines on filled cells (Codex) — in review
- Task: restore visible cell lines in the Excel viewer, including on filled cells.
- Cause: cells without explicit workbook borders had their border colour changed to match the fill, hiding gridlines.
- Change: keep the viewer's light gridlines on unbordered edges while preserving explicit workbook and conditional-format borders.
- Files: `public/excel-map.js`, `tests/excel-library.test.js`, version/cache files.
- Validation: Node 22 checks and 294 tests passed. Chrome seller shop with the uploaded workbook at 375px and 1280px: INV sheet gridlines on filled cells, red workbook borders, select interactions, scroll/zoom and reload; no page errors. Original workbook used for browser verification.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/210.

### 1.1.137: Excel cell selection and row headers (Codex) — in review
- Task: only row-number taps select a whole row; cell taps select one cell and dragging selects a range.
- Cause: the cell pointerdown handler called selectRow, so all ordinary cell clicks selected a row and mouse dragging started from its first column.
- Change: cell-based anchors restored; phone hold (350 ms) then drag selects a range, quick swipes scroll, and two-finger gestures remain available to the existing zoom handler.
- Files: `public/excel-select.js`, `tests/excel-select.test.js`, version/cache files; no CSS changes.
- Validation: baseline Node 22 checks and 292 tests passed; final checks and all 293 tests passed. Chrome local seller shop at 375px and 1280px: actual cell/row clicks, mouse drag, touch hold-drag, phone swipe scrolling and reload passed without page errors. Temporary CSV fixture; physical iPhone and the owner's workbook not verified.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/209. Owner merges after green CI and deploys manually.

### 2026-10-23 — Claude — 1.1.136 Background zip: Codex single-HTML packages
- Owner: the phone zip from Codex was refused (PC zip worked). It holds only OPEN_ON_PHONE.html: the picture as a data: URI in `img#art` and the moving `<svg>` inline.
- `public/platform.js`: when a zip (or a picked .html) has no separate picture/SVG, `fromHtmlPackage` takes the data: picture and the first `<svg>` out of the HTML. For phones a wide picture is cut to 9:16 at the page's `#art` object-position (88% in Codex's file), so it matches Codex's preview. Checked with the real file: 528×938 picture + 9.5 KB SVG; phone page looks like the preview.
- Test in `tests/site-scene.test.js`.

### 2026-10-23 — Claude — 1.1.135 No broken-image icon on skyshopmm.com
- Live check after 1.1.134: with no moving layer uploaded, `/scene-asset/layer` returned 404 and Chrome drew a small broken-image icon at the top left.
- `lib/tenant-install.js`: a missing layer now returns an empty 1×1 transparent SVG. Test in `tests/site-scene.test.js`.

### 2026-10-23 — Claude — 1.1.134 GearHub owner uploads the skyshopmm.com background
- Owner wants to change the skyshopmm.com background himself, e.g. with the zip Codex makes (background.jpg + animated birds.svg).
- Owner also asked for phones: separate phone picture (`phone`) and phone layer (`phone-layer`); phones without their own use the PC files.
- `lib/site-scene.js` (new): picture (sharp → JPG ≤2600px) and optional moving SVG layer, kept in `platform_meta` "site-scene" and `<dataDir>/platform-media/scene/`. SVGs are cleaned (scripts, on* attributes, foreignObject, outside links removed; non-SVG refused).
- `lib/platform.js`: `POST/DELETE /api/platform/owner/scene/:kind` (picture|layer, owner only, 12 MB); `/owner` returns `scene`.
- `lib/tenant-install.js`: `GET /scene-asset/{picture,phone,layer,phone-layer}`; phone falls back to PC, no picture = built-in drawing. Files are sent directly (a redirect to the sandboxed SVG failed to load in Chrome). SVGs carry CSP `sandbox`; no-cache.
- `public/platform.html/.js/.css`: `<picture>` elements pick `/scene-asset/phone*` under 600px, else `/scene-asset/picture` + `/scene-asset/layer` on top. Owner page has "skyshopmm.com background / နောက်ခံပုံ" with PC and Phone parts, each with preview, Zip upload (opened in the browser; first picture + first SVG are uploaded), picture, SVG and reset buttons.
- Tests: `tests/site-scene.test.js`, `tests/platform.test.js` (owner-only upload), `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.133 PC top menu on every page
- Owner: on PC the top menu disappeared on Category (and other non-home pages), so it was hard to get back.
- `public/desktop.css`: at ≥851px the store header shows on every view and is sticky at the top; off the Home page the logo area matches Home (no banner artwork). `style.css` still hides it on phones (bottom menu there).
- Test: `tests/pc-top-nav.test.js`.

### 2026-10-23 — Claude — 1.1.132 skyshopmm.com top menu + Sign in pop-up
- Owner's picture: menu at the top right (Home, About, Service, Contact, Sign in); the shop form shows only after Sign in. About/Service/Contact content comes later (links are #about/#service/#contact for now).
- `public/platform.html`: `#site-nav` in the header (Home has `data-platform-link`, so updates.js does not add its own "My shop" link).
- `public/platform.js`: `body.visitor` when nobody is signed in; Sign in opens `#account` as a pop-up (`body.signin-open`), closed by ×, Esc or a tap outside. Signed-in applicants see their card as before.
- `public/platform.css`: menu, pop-up and phone layout (Sign in top right, links in a second row, scene full screen).
- Test: `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.131 Sunset scene on skyshopmm.com
- Owner (video of an illustrated landscape website): use that kind of background on skyshopmm.com instead of the plain one.
- `public/images/platform-scene.svg`: original drawing (not copied from the video): sunset sky, mountain range with a sunlit peak, lake, grass; clouds drift, birds fly, grass sways; motion stops with prefers-reduced-motion.
- `public/platform.html`/`platform.css`: shown only for visitors (`body.onboarding`); fixed full screen on PC, a top picture on phones with the card below it. Header text turns white over the scene. Shop owners' control pages are unchanged.
- Test: `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.130 skyshopmm.com opens "My shop"
- Owner: skyshopmm.com should land on /platform.html (Apply / Review / Approved).
- `server.js`: `GET /` redirects 302 to `/platform.html` (query kept) when `PLATFORM_ENABLED=true`. GearHub's own store is still at `/index.html`; `/shops/<slug>/` is unchanged.
- Test: `tests/root-to-platform.test.js`.

### 2026-10-23 — Claude — 1.1.129 Update no longer stops at 80%
- Owner: with the app open, "Updating… 80%" stayed until the app was closed and opened again.
- Cause (`public/updates.js`): `apply()` set `reloading=true`, then (new worker waiting) only posted `APPLY_UPDATE`. The `controllerchange` handler `reloadWhenSafe()` returns when `reloading` is true, so nothing reloaded.
- Fix: in that branch `apply()` reloads itself on `controllerchange`, or after 4 s if the switch never comes. `registration.update()` now times out after 15 s.
- Tests: new case in `tests/updates.test.js` (fails on the old code); cache tag in `tests/keep-category-draft.test.js`.

### 2026-10-23 — Claude — 1.1.128 Search bar + Excel folder button
- Owner's picture: a white search pill and a square folder button beside it; Excel opens only from that folder button, not from Settings.
- `public/index.html`: the search section holds `.search-pill` (SVG magnifier + `#search`) and `#excel-library-open.excel-folder-button` (folder icon). The top-bar Excel button and the Settings "Excel files" row are removed.
- `public/excel-library.js`: the folder button shows only in seller shops (`open.hidden=!slug`).
- `public/style.css` / `public/desktop.css`: pill and folder button styles (phone and PC).
- Tests: `tests/excel-library.test.js`, `tests/excel-auto-upload.test.js` (cache tag).

### 2026-10-23 — Claude — 1.1.127 Excel: selection visible on filled cells, pinch zoom out
- Owner: tapped selection did not show on many cells (BC, INV); INV could only zoom bigger.
- Cause: `cellStyle` wrote `background:` (shorthand), which removed the blue `background-image` of `.xs-sel` on every filled cell. Now `background-color:`.
- Zoom: `excel-map.js` has its own sheet zoom 30%–300% (two-finger pinch on phones, Ctrl+wheel / trackpad pinch on PC). Widths, row heights and fonts are drawn at the zoom; while pinching the table is scaled live, then redrawn keeping the scroll position. `#excel-grid{touch-action:pan-x pan-y}` + `gesturestart` preventDefault stop the page zoom inside the sheet.
- Tests in `tests/excel-library.test.js`.

### 2026-10-23 — Claude — 1.1.126 Excel viewer draws shapes and pictures
- Owner: INV row 28 totals (16,111,720, 38,251,500 PSM, DT, JSM, 831,682) were missing. They are Excel shapes linked to cells (`textlink="ERCK!AS206"`), not cell values.
- `public/excel-map.js`: `readDrawing` reads the sheet's drawing (shapes `sp` with fill/line/text and theme colours incl. lumMod/lumOff; pictures `pic` from xl/media). The saved linked value inside the shape is shown. `placeShapes` puts each shape inside the td under its top-left corner, so it scrolls and stays frozen with that cell; columns reached by shapes are drawn. The zip reader can now return a Blob (`read(name,true)`).
- `public/style.css`: freeze-pane z-index layers reworked (cells < frozen cols 10 < frozen rows 20 < corner 30 < row numbers 40 < letters 50); a shape's cell is lifted 5 in its layer (`.excel-shape-host`).
- Tests in `tests/excel-library.test.js`.

### 2026-10-23 — Claude — 1.1.125 Excel freeze panes start where Excel froze them
- Owner's photo: Excel shows INV from row 28 / column C (frozen at C28), the web showed row 1 and columns A-B.
- `public/excel-map.js`: the frozen area starts at the sheet view's `topLeftCell`; rows above and columns left of it are not shown (like Excel). Merges are cut at these lines. Frozen columns now stick when at least 120px is left to scroll (PC); on phones they scroll.
- Number formats: `?` shows as a space, so accounting zero `"-"??` shows `-` (was `-??`).
- Tests updated in `tests/excel-library.test.js` and `tests/excel-select.test.js`.

### 1.1.124: Select an Excel row from any cell (Codex) — in review
- Task: owner wants a complete blue row selection like Google Sheets, without needing to tap the left row number.
- Change: clicking or tapping any cell selects every visible cell in that row; clicking its row number still works. Mouse drag and Shift+click range selection remain available.
- Files: `public/excel-select.js`, version/cache files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/196
- Notes: Node 22 `npm run check && npm test` passed (279 tests). Interactive 375px/1280px browser checks are unavailable in this environment.

### 1.1.123: Reliable Excel full-row selection (Codex) — in review
- Task: tapping or clicking an Excel row number selects its complete visible row, like Google Sheets.
- Cause: the earlier code calculated the range from column headers, which is unreliable when the displayed row contains hidden columns or merged cells.
- Files: `public/excel-select.js`, cache/version files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/195
- Notes: Node 22 `npm run check && npm test` passed (279 tests). Interactive 375px/1280px browser checks are unavailable in this environment.

### 2026-10-23 — Claude — 1.1.122 Excel viewer looks like the original file
- Owner wants view-only Excel that looks exactly like the file in Excel.
- `public/excel-map.js`:
  - Reads conditional-format styles (`<dxfs>`, "automatic" colour = black) and each sheet's `<conditionalFormatting>`. Rules run by priority: formulas (refs, `$`, comparisons, `& + - * /`, OR/AND/NOT/ISBLANK/LEN/TRIM/UPPER/LOWER/ABS/ISNUMBER/IF), duplicate/unique, blanks/non-blanks, cellIs, containsText. Unknown formulas are skipped. This fixed the POLESTAR INV rows that were white-on-white.
  - Rows with `hidden="1"` are hidden even without `ht`. Hidden columns are left out completely (merges count only visible rows/columns; `data-c` stays the sheet index).
  - Freeze panes from `<pane state="frozen">`: frozen rows stick under the letters; frozen columns stick only when they use at most half the view (else they scroll, so phones can still move). A merge never crosses the freeze line.
- `public/style.css`: freeze-pane sticky rules at the end.
- Tests: `tests/excel-library.test.js` runs the formula engine; `tests/excel-select.test.js` header pattern updated.

### 1.1.121: Excel auto upload from the shop's Windows PC (Claude) — in review
- Task: the owner edits the Excel file every day on a Windows PC and wants it uploaded to the shop by itself, without visiting the site.
- How it works: in the shop's Excel panel the owner presses "Download PC auto upload". The server makes a per-shop upload key (only its SHA-256 is stored; a new key replaces the old one), and the browser builds a `.bat` file carrying it. Double-clicking the `.bat` once on the PC:
  - asks for the Excel file;
  - saves a PowerShell watcher in `%LOCALAPPDATA%\SkyShopExcelUpload`;
  - adds a hidden start-up entry in the Startup folder (no admin rights needed).
  The watcher checks every minute and uploads the file after each save, even while Excel has it open.
- Files:
  - `lib/platform-model.js`: `platform_upload_keys` table.
  - `lib/platform.js`:
    - `POST /api/platform/spreadsheets/auto-upload` takes the key in `X-Upload-Key`, needs no session or CSRF (it sits before the CSRF middleware), is rate limited, and replaces the shop's spreadsheet.
    - `GET/POST /shops/:id/upload-key` is for the owner only, through `shopFor`.
  - `public/excel-auto-upload.js` (new; builds the `.bat`).
  - `public/excel-library.js`: button and status.
  - `public/index.html`, `public/style.css`, SW shell, version files, `tests/excel-auto-upload.test.js`.
- PR: (this PR). Replaces #192, which clashed with #191 on version 1.1.120.
- Also fixes main: #191 (Codex) again pasted truncated tool output into `public/style.css` ("Warning: truncated output" at the top and "…2332 tokens truncated…" on line 390). About 9 KB of real CSS was lost, and #191's CI failed but it was merged. The lost CSS is restored from 50616fa; #191's one real CSS change (`#excel-grid tbody th[data-r]{cursor:pointer}`) is kept.
- Notes: the watcher sends `Origin` because `originGuard` blocks POSTs without one. Not run on a real Windows PC yet; the script was only reviewed.

### 1.1.120: Select a full Excel row (Codex) — in review
- Task: clicking or tapping an Excel row number selects the complete row, matching Google Sheets.
- Cause: `excel-select.js` accepted pointer events only from cells, so row headers were ignored.
- Files: `public/excel-select.js`, `public/style.css`, version/cache files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/191
- Notes: Node 22 `npm run check && npm test` passed (275 tests). Interactive browser verification at phone and PC widths was unavailable in this environment.

### 1.1.119: Cart on phones reaches the bottom edge (Claude) — completed
- Task: tapping Cart on a phone showed a dark band around the bottom nav's round corners and notch. The empty-cart drawer stopped 86 px above the bottom, so the dark overlay showed through.
- Files: `public/style.css` (phone: `#drawer` and the empty-cart drawer use `bottom:0`, with `padding-bottom:calc(96px + safe area)` so content stays above the nav), tags, version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/190

### 1.1.118: Select cells in the Excel viewer (Claude) — completed
- Task: in the Excel viewer, cells could not be selected. Now they can be selected like a spreadsheet:
  - click or tap a cell (blue outline);
  - drag with the mouse, or Shift+click, to select a range (tinted, with the row numbers and column letters highlighted);
  - Ctrl/Cmd+C copies the range as rows and columns; Esc clears.
- Files:
  - `public/excel-select.js` (new).
  - `public/excel-map.js`: cells get `data-r`/`data-c` (plus `data-r2`/`data-c2` for merges); headers get `data-c`/`data-r`.
  - `public/style.css`: `.xs-sel`, `.xs-active`, `.xs-head`; no text dragging on a mouse.
  - Tags, version files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/188

### 1.1.117: Excel viewer top bar clean; every Excel file works offline (Claude) — completed
- Task: remove the blurred grey band at the top of the Excel full-screen viewer, and make every uploaded Excel file work offline automatically.
- Files:
  - `public/style.css`: white card, a 50 px white top bar, plain search input (no iOS shading), and the sheet starts below the bar.
  - `public/sw.js`: new `EXCEL_CACHE`. `/api/platform/spreadsheets/:id` is cache-first (each upload has a new id). `/api/platform/store/:slug/spreadsheets` is network-first with an offline copy.
  - `public/excel-library.js`: `keepOffline()` runs 3 s after every shop visit, when the phone comes back online and right after an upload. It saves the current file(s) and deletes old ones.
  - Tags, version files, `tests/excel-offline.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/187

### 1.1.116: PC product cards tilt with the mouse (Claude) — completed
- Task: the owner's video, PC only. Moving the mouse over a product card tilts it towards the pointer in 3D, lifts the photo forward (scale 1.1, follows the pointer) and moves a soft light with the pointer. Phones and touch screens get nothing.
- Files: `public/card-tilt.js` (new; only for `(hover:hover) and (pointer:fine) and (min-width:851px)` with a mouse pointer; resets when the mouse leaves), `public/desktop.css` (tilt styles inside the PC hover media block; off for reduced motion), tags and SW shell, version files, `tests/card-tilt.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/186

### 1.1.115: Opening picture always sharp; real Loading; Updating flowers finish (Claude) — completed
- Task: on a slow line the opening picture loaded slowly, stuttered, looked blurred or showed only blue. The owner wants:
  - the picture always sharp;
  - Loading that moves only when the line moves, and nothing at all on a fast line;
  - the Updating animation always played to the end, and repeated only on a slow line;
  - Settings → Refresh to show the same animation.
- Cause: the built-in pictures had no `?v=`, so the server sent `no-store` and every visit downloaded them again. The service worker was network-first for images, and the splash background was blue.
- Files:
  - `lib/tenant-install.js`: versioned pictures (`SPLASH_IMAGE_V`).
  - `public/sw.js`: the pictures are precached and served cache-first for `/images/skyshop-splash-*` and `/splash-asset/pc|phone`.
  - `public/skyshop-splash.js`:
    - the picture fades in only after `decode()`;
    - the counter moves on real steps only (15 / 70 / 70–99 / 100);
    - the Loading box shows only when slow;
    - the flowers continue across the reload (`gh-bloom-start`) and the screen leaves only at full bloom;
    - both pictures are saved for next time.
  - `public/skyshop-splash.css`: paper background, picture fade, Loading box visibility.
  - `public/updates.js`: reports `progress(40)` after `registration.update()`.
  - `public/settings.js`: Refresh shows the Updating screen.
  - Tags, version files and tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/185

### 1.1.114: Looping flower animation while Updating (Claude) — completed
- Task: the owner's video. While the app updates, a dark screen shows pink flowers growing (stems, leaves, grass, gold sparkles). The scene fades and grows again in a 6 s loop until 100%. It is drawn with SVG and the Web Animations API, so no video file is downloaded.
- Files: `public/skyshop-splash.js` (`bloom()` is called from `prepareUpdate`), `public/skyshop-splash.css` (dark background; the picture is hidden while updating), `lib/tenant-install.js` (`SPLASH_V`), sw tag, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/184
- Notes: the 0–100% counter is unchanged. Reduced motion shows the scene without movement.

### 1.1.113: "Updating…" counts 0–100% (Claude) — completed
- Task: the Updating screen showed a full bar with no number. Now it counts from 0%, and the shop opens only at 100%.
- Files:
  - `public/skyshop-splash.js`: `showUpdating()` counts up to 60% while the new version downloads, then to the step that `updates.js` reports (80%). It stores the number in `gh-update-splash:<scope>`, and the reloaded page continues from it.
  - `public/updates.js`: keeps the splash handle and reports `progress(80)` once the new worker is installed.
  - `lib/tenant-install.js` (`SPLASH_V`), tags in index/admin/sw, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/183

### 1.1.112: Press and drag along the phone bottom nav (Claude) — completed
- Task: the owner's recording (iPhone tab bar). Pressing the bottom nav and dragging left or right moves the bubble with the finger. The tab under the finger rises and shows its label, and letting go opens that tab. A plain tap works as before.
- Files: `public/liquid-nav.js` (pointer events; drag starts after 8 px; the bubble is clamped to the first and last tab; the leftover click is swallowed; `place()` pauses while dragging), `public/style.css` (`touch-action:none` on the nav, `.liquid-dragging` and `.liquid-hover` styles), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/182

### 1.1.111: Phone bottom nav sits on the bottom edge (Claude) — completed
- Task: the floating bar left a gap under it where the page showed through. The bar now touches the bottom and both sides, keeps round top corners, and is white down to the screen edge (home-bar area included).
- Files: `public/style.css` (`left/right/bottom:0`, safe-area padding inside the bar, `border-radius:24px 24px 0 0`), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/181

### 1.1.110: Opening screen shows 0–100% and never reveals an empty shop (Claude) — completed
- Task: show a 0–100% counter on the opening screen and open the shop only at 100%. If the shop cannot load (offline, server down), keep showing the picture and never the GearHub template without the shop's data.
- Files:
  - `public/skyshop-splash.js`: the counter follows real steps (page, shop data, first-screen pictures). It never passes 75% before the data arrives. The 12 s cap is removed. On failure it says Retrying and retries every 5 s and when the phone comes back online. A reload starts as a plain cover and shows the picture after 0.7 s.
  - `public/skyshop-splash.css`: counter styles.
  - `public/store.js`: sends `gearhub:store-shown` when `catalogLoaded` (live or saved offline copy) and `gearhub:store-failed` otherwise, and adds `window.GearHubStore.retry()`.
  - `lib/tenant-install.js` (`SPLASH_V`), tags, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/180

### 1.1.109: Phone bottom nav matches the owner's picture (Claude) — completed
- Task: make the open tab obvious, exactly like the owner's picture, without changing icon colours. The bar floats with round corners, the notch has smooth shoulders, and the open tab sits in a white bubble with a bold black label.
- Files: `public/style.css` (floating bar, SVG notch mask that moves with `--liquid-x` via `mask-composite`, white bubble, `#111` bold label, dark-mode versions), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/179
- Notes: the owner said do nothing beyond the picture. Never change the icon colours (no line or black icons).

### 1.1.108: Phone bottom nav "liquid" animation (Claude) — completed
- Task: the owner's screen recording. On phones the open tab's icon rises into a round bubble that sits in a curved notch of the bar. Tapping another tab slides the bubble and the notch there (0.5 s), and the label shows only under the open tab.
- Files: `public/liquid-nav.js` (new; follows `.active` set by store.js and sets `--liquid-x` / `--liquid-lift`), `public/style.css` (phone-only `.mobile-bottom-nav.liquid` block, `@property --liquid-x`), `public/index.html` / `public/sw.js` tags, version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/178
- Notes: the shop's white bar and colour icons are kept (the video has a dark bar). PC is unchanged; it uses the top navigation. Turned off for reduced motion.

### 1.1.107: Updating screen stays until the shop is ready; no double reload (Claude) — completed
- Task: during an update, and on reload, the page shook, and GearHub's template or other pictures flashed before the shop's own content. The owner wants a quiet "Updating…" picture (no sound) until everything is ready behind it.
- Cause: the splash left 0.8 s after `load`, before the shop's name, banner and products arrived. A reload had no cover at all. One update could reload twice (`apply()` and `controllerchange`).
- Files:
  - `public/skyshop-splash.js` holds the screen until `gearhub:store-shown` and the first-screen pictures have loaded (12 s cap). Update: "Updating…" picture, no sound, at least 1.2 s. Reload: a plain cover in the page colour.
  - `public/skyshop-splash.css`: quiet cover and a moving bar.
  - `public/store.js` sends `gearhub:store-shown` after `init()`.
  - `public/updates.js` reloads once and never reloads a page that already has the server's version.
  - `lib/tenant-install.js` (`SPLASH_V`), tags in index/admin/sw, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/177

### 1.1.106: Add-to-cart button animation (Claude) — completed
- Task: the owner's video. Tapping a product card's cart button rolls a cart in, drops a box into it and rolls it out (1.3 s). The button then becomes a green circle with a tick and a ring pulse (1.3 s), and returns to normal.
- Files: `public/store.js` (`playCartButton`, called from `addCart` after the stock check), `public/style.css` (`.cart-fx*` styles and `cart-fx-*` keyframes, top level for PC and phone), `public/index.html` / `public/sw.js` tags, version files, `tests/cart-button-animation.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/176
- Notes: the existing photo-flies-to-cart animation is kept. Turned off when the device asks for reduced motion. Only `.products .product .add` buttons animate; the small "+" in the category list is unchanged.

### 1.1.105: PC product cards lost their styles; CSS restored (Claude) — completed
- Task: on PC, product cards showed black squares for View photos / Add to cart and an unstyled quantity box.
- Cause: commit efd756f (1.1.102, Codex) pasted truncated tool output into `public/style.css`. The text "Warning: truncated output…" went in at the top, and "…131 tokens truncated…" replaced real lines, including the `}` that closes an `@media(max-width:850px)` block. Everything after it became phone-only.
- Files: `public/style.css` (restored from 7f682de; Codex's Excel search changes kept), `scripts/check-static.js` (fails on truncation text or unbalanced CSS braces), `tests/css-integrity.test.js`, `AGENTS.md` 9.11, version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/175

### 1.1.104: No unstyled page during a deploy; no dark title bar in the PC store app (Claude) — completed
- Task: while Render restarts during a deploy, the shop page showed without its styles (black icons, old nav). The installed PC store app also showed a dark title bar with the shop name.
- Files: `public/sw.js` (a failed or 5xx `.css`/`.js` uses a saved copy, matched with `ignoreSearch`; a 5xx page navigation opens the saved shop page), `lib/tenant-install.js` and `server.js` (store manifests get `display_override:["window-controls-overlay","standalone"]`; the admin manifest is unchanged), `public/desktop.css` (white drag strip in `display-mode:window-controls-overlay`), version files, `tests/safe-deploy-titlebar.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/174
- Notes: updates still reach people only after the owner deploys on Render. Merging alone changes nothing live. Already-installed apps pick up the new manifest when Chrome next checks it (can take up to a day), or after a reinstall.

### 1.1.103: PC store navigation in the top header (Claude) — completed
- Task: on PC (≥851px) Home / Category / Promotion / Cart / Settings sit in the top header with outline icons; the active page has a light-green pill. The language button beside the Excel icon is hidden on PC. Phones keep the bottom nav.
- Files: `public/index.html` (`<nav class="desktop-top-nav">`), `public/desktop.css`, `public/sw.js`, version files, `tests/desktop-top-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/173
- Notes: the buttons reuse `data-store-view` / `data-store-action="open-cart"`, so `store.js` needs no change. The phone rule is `.nav .desktop-top-nav{display:none}` because `.nav nav{display:flex}` would otherwise win.

### 1.1.102: One Excel file and in-sheet search (Codex) — in review
- Task: keep only one uploaded Excel workbook per seller shop and let the owner search a sheet while it is open in the app.
- Cause: each upload inserted a new spreadsheet record, so the library rendered every previous file and had no search control for sheet rows.
- Files: `lib/platform.js` (safe, shop-scoped spreadsheet replacement; list only the newest file), `public/excel-map.js`, `public/style.css`, cache/version files, `tests/excel-library.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/172
- Notes: Node 22 `npm run check && npm test` passed (237 tests). Browser testing at 375px and 1280px was unavailable on this machine and must be completed before merging.

### 1.1.101: Plant icon and a continuous line beside "Add" rows (Claude) — completed
- Task: main categories use a plant (sprout) icon instead of a gear, and the green line beside "Add Child subcategory" / "Add Subcategory" was broken.
- Cause of the break: those Add rows have a 1px border, which moved their connector origin by 1px. Their `::before`/`::after` now use `left:calc(var(--cx) - 1px)` and `top:-12px`.
- Files: `public/admin.js` (`CATEGORY_GEAR` renamed to `CATEGORY_PLANT`, new SVG), `public/site-admin.css`, `public/admin.html`, `tests/category-tree.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/170

### 1.1.100: Category editor as a tree (Claude) — completed
- Task: the owner wants the admin Product Categories editor to look exactly like their tree design: green gear square for main categories, green folder squares for sub/child categories, green connector lines, product-count pills ("1 product" / "N products"), and › (closed) / ⌄ (open) chevrons. "Add Child subcategory" / "Add Subcategory" are tree rows with a round green plus.
- Files: `public/admin.js` (`categoryRowMarkup`: icon span, count pill, chevron, add button markup), `public/site-admin.css` (tree block scoped to `#category-manager-rows`; the Myanmar name, the "Main category · N" line and the pencil are hidden; `grid-template-columns:minmax(0,1fr)` keeps rows on screen), `public/admin.html` (cache tags), `tests/category-tree.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/169
- Notes: tapping a name still opens its editor; swipe-to-delete, the parent picker, + Subcategory and save are unchanged. Connector geometry uses `--cx` (line x) and `--mid` (row centre) per depth; keep them in sync if you change icon or row sizes.

### 1.1.99: Excel sheet opens full screen (Claude) — completed
- Task: the owner wants the opened sheet to fill the screen like Google Sheets on a phone, with only one back arrow in the top-left corner.
- `public/excel-map.js`: opening a sheet puts the modal in `.excel-fullscreen` (covers the store's bottom navigation). A floating `#excel-fs-back` leaves it, and closing the panel also leaves it. The table width is now set to the exact sum of column widths: before, the browser stretched column A, e.g. 149px instead of 40px for width 5. Filled cells hide gridlines unless they have their own border, like Excel/Sheets.
- `public/style.css`: full-screen rules. The title, status and the linking/import panel are hidden in full screen.
- Checked with the owner's real workbook (24 visible sheets, 565 rows on CB) at phone 375px and PC 1280px.
- Files: `public/excel-map.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/168
- Notes: the linking/import panel is not reachable in full screen. The owner said to do the remaining Excel work later.

### 1.1.98: Quiet seller splash during app updates (Codex) — in review
- Task: during an app update or refresh, keep the POLESTAR seller splash visible with `Updating…` so GearHub content never flashes. Update transitions do not play splash sound; normal app openings retain the configured splash sound.
- Files: `public/updates.js`, `public/skyshop-splash.js`, `public/skyshop-splash.css`, `lib/tenant-install.js`, cache/version files, and the splash regression test.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/167
- Notes: Node 22 local validation passed: `npm run check && npm test` (233 passing), plus syntax checks for both changed browser scripts. Browser verification is still required before merge.

### 1.1.97: Excel files open like a spreadsheet (Claude) — completed
- Task: the owner wants an uploaded workbook to look like Excel/Google Sheets in the app (owner screenshot: sheet tabs CB/PT/JN/BC/ERCK, column letters, row numbers, coloured cells, merged title row, dates like 1-Oct-26).
- `public/excel-map.js` was rewritten as a readable viewer. It reads the ZIP, workbook, sheet relations, theme colours (with tint), styles (fonts, fills, borders, alignment, number formats), shared strings, merged cells, column widths and row heights. It has tabs for every visible sheet (hidden sheets are skipped) and shows up to 1500 rows × 60 columns. The header row for linking is the first row with at least two values. Linking, import and owner access are unchanged.
- `public/style.css`: `.excel-sheet` grid (sticky letters and row numbers, gridlines), `.excel-tabs`, and a wider card while a sheet is open. Removed the 110px cell minimum inside the viewer.
- Files: `public/excel-map.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/166
- Notes: old binary `.xls` cannot be previewed (download only). Formulas show their saved value.

### AGENTS.md section 9: engineering rules (Claude) — completed
- Task: the owner asked to write down the mistakes from 1.1.84–1.1.95 so they are not repeated. `AGENTS.md` now has section 9: no direct pushes to main, `npm run check && npm test`, single-backslash regexes, `gearhub-shell-v85-<version>`, matching `?v=` tags in `sw.js`, `shop_id` scoping, no data-wiping imports, modal/`hidden` patterns, phone + PC browser tests, honest reports.
- Files: `AGENTS.md`, `AI_COLLABORATION.md` (docs only; no version bump).
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/165
- Notes: **Both agents: read AGENTS.md section 9 before every task.**

### 1.1.96: Excel View opens in the app, phones get Excel, import keeps unlinked data (Claude) — completed
- Task: the owner reported that "View" still downloaded the file (1.1.95), and asked for Excel on phones.
- Fixes:
  1. `public/excel-map.js` had double-escaped regexes again (`\\/`, `\\d`, `\\.csv`, `\\r?\\n`, `\\uFEFF`), a syntax error, so the preview never ran. Main also failed `every public/*.js file parses`.
  2. The import route's `UPDATE platform_products … WHERE id=?` was not scoped to `shop_id` (failed `tenant-isolation`). It also overwrote unlinked fields: stock became 0 and category became empty. Now it uses `COALESCE(?,col)` and `WHERE id=? AND shop_id=?`, so only linked, non-empty cells change.
  3. The GearHub owner can import into any shop (same as upload). Back restores the upload form only for people who saw it, and the file list hides while a sheet is open.
  4. Phones: Settings has an "Excel files" row (seller shops only) that opens the same panel. The column pickers use two columns on phones.
- Files: `public/excel-map.js`, `public/excel-library.js`, `public/index.html`, `public/style.css`, `public/sw.js`, `lib/platform.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/164
- Notes: **Codex: inside JS regex literals, use single backslashes; run `npm run check && npm test` and open a PR; do not push to main.**

### 1.1.95: Map Excel columns to products (Codex) — completed
- Task: preview Excel data in-app and let the owner select column-to-product mappings before importing.
- Files: `lib/platform.js`, `public/excel-map.js`, `public/index.html`, `public/style.css`, plus release files.
- Notes: matching SKU updates a product; new SKU creates one.

### 1.1.94: Excel library accepts .xlsm (Claude) — completed
- Task: the owner's workbook `OCT-2026 (Excavator).xlsm` was greyed out in the file picker.
- Files: `lib/platform.js` (`spreadsheetFile` accepts `.xlsm` with a ZIP signature; the stored type now comes from the checked extension, not the browser, so an upload is never served as a web page), `public/index.html` (`accept` list), `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/162
- Notes: the upload limit is still 10 MB per file, and it counts against the shop's storage.

### 1.1.93: Excel library fixed and usable in every shop (Claude) — completed
- 1.1.93 additions: the GearHub owner can upload Excel files to any shop (`excel-library.js` looks the shop up in `/api/platform/owner`; the server already allowed it), and visitors no longer see the upload form (`.excel-library-card form[hidden]{display:none}` in `style.css`, which overrode `hidden`).
- Task: the owner reported that the Excel icon from 1.1.91 did nothing.
- Three bugs: (1) `public/excel-library.js` had `/^\\/shops\\/…/` (double backslashes), a syntax error, so the whole script never ran. (2) The panel only removed `hidden`, but `.modal` is `display:none` until it also gets `.open`. (3) `GET /api/platform/store/:slug/spreadsheets` selected `created_at`, which `platform_files` does not have, so it failed with SQLITE_ERROR ("Platform temporarily unavailable").
- Files: `public/excel-library.js`, `lib/platform.js`, `public/index.html` and `public/sw.js` (`excel-library.js` tag), `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/160 (1.1.92) and https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/161 (1.1.93)
- Notes: 1.1.91 went to `main` without a PR, so CI never ran; `npm run check` and the `every public/*.js file parses` test both failed on `main`. **Codex: always open a PR and wait for CI, and run `npm run check && npm test` locally first.** On phones the Excel icon is still hidden (1.1.91 design); only PC shows it.

### 1.1.91: Storefront Excel library (Codex) — completed
- Task: add an Excel icon beside the language button; shop owners can upload Excel files and visitors can open uploaded files.
- Files: `lib/platform.js`, `lib/platform-model.js`, `public/index.html`, `public/excel-library.js`, `public/style.css`, plus release files.
- Notes: uploads require the authenticated owner of that shop; every visitor can open an uploaded file. Files accept .xlsx, .xls and .csv up to 10 MB.

### 1.1.90: "+ Subcategory" inside the category edit panel (Claude) — completed
- Task: let the owner add a subcategory straight from a main category's edit panel, without expanding it first.
- Files: `public/admin.js` (edit actions get a `data-category-command="add-sub"` button: "＋ Subcategory" for main categories, "＋ Child subcategory" for subcategories, nothing at level 3; the category draft is now saved only when there are unsaved edits, and an empty draft is never restored, because an empty draft showed no categories and Save would have removed them), `public/admin.html`, `tests/category-add-sub-in-edit.test.js`, plus the version files.
- Also fixed: after 1.1.89, `public/sw.js` cached `style.css?v=…banner-top-1` while `index.html` loaded `…desktop-nav-logo-1`, so the `share-store` offline-shell test failed on main. `tests/category-banner-top.test.js` no longer pins a `style.css` tag.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/158
- Notes: **Codex: when you change a `?v=` tag in `index.html`, change the same one in `public/sw.js` (SHELL list), and run `npm test` before merging.**

### 1.1.89: Restore desktop home logo (Codex) — completed
- Task: show the shop logo and name again in the PC home navigation while keeping its navigation artwork hidden.
- Files: `public/style.css`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: phone navigation is unchanged.

### 1.1.88: Category page banner at the top (Claude) — completed
- Task: on the storefront Category tab, remove the category title (e.g. "Electrical Parts") above the banner so the banner sits at the top.
- Files: `public/style.css` (title and subtitle hidden outside products mode; the whole header row is hidden at ≤850px, where its search button was already hidden), `public/index.html` and `public/sw.js` (`style.css` cache tag), `tests/category-banner-top.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/156 (replaces #155, which conflicted with Codex's 1.1.87)
- Notes: products mode (inside a category) is unchanged. `store.js` still sets the h2 text; it is just hidden.
- Also fixed again: 1.1.87 set `CACHE_NAME` to `gearhub-shell-v86-…`, which fails `npm run check` (`scripts/check-static.js` requires `gearhub-shell-v85-<version>`). **Codex: keep the `v85-` prefix and run `npm run check` before merging.**

### 1.1.87: Hide storefront navigation image on desktop (Codex) — completed
- Task: remove the navigation/profile banner image from the PC storefront only.
- Files: `public/style.css`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: the banner remains available on phone screens; desktop hides only the top navigation artwork.

### 1.1.86: New categories stay until saved (Claude) — completed
- Task: about 10–20 seconds after the owner added a new category (before Save), it disappeared.
- Cause: the 20-second order poll (`admin-extras.js` → `refreshAll()`) ends with `loadCategoryManager()`, which redrew the editor from the server and wiped unsaved rows.
- Files: `public/admin.js` (`loadCategoryManager` returns early while `window.__gearhubCategoryDirty` is set), `public/admin.html`, `tests/keep-category-draft.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/153
- Notes: anything else that `refreshAll()` redraws must also respect unsaved edits.

### 1.1.85: App updates never reload under unsaved edits (Claude) — completed
- Task: while the owner was adding a new category, an app update (after a deploy) reloaded the page and threw them back to the dashboard.
- Files: `public/updates.js` (`blocked()` now also waits while an input, textarea or select is focused, or while `window.__gearhubCategoryDirty` is set), `public/admin.js` (`markCategoriesDirty()` on add, edit, parent pick, move and remove; cleared after a successful save), `public/admin.html`, `public/index.html`, `public/sw.js` (`updates.js` cache tag), `tests/keep-category-draft.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/152 (replaces #151, which conflicted with Codex's 1.1.84)
- Notes: if you add another editor with unsaved state, set a similar flag and add it to `blocked()` in `updates.js`.
- Also fixed: `tests/tenant-install.test.js` still expected the old service worker cache name (`gearhub-shell-v85-1.1.83`), so it failed on main after 1.1.84. When you bump `CACHE_NAME` in `public/sw.js`, update that test too. Keep the `gearhub-shell-v85-<version>` prefix: `scripts/check-static.js` (CI) requires it, and the `v86` name broke CI.

### 1.1.84: Android launch screen uses the original round shop icon (Codex) — completed
- Task: remove the blue Android launch/background color and show the shop’s original logo as a round icon.
- Files: `lib/tenant-install.js`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: tenant manifests now use a white launch background; generated shop icons have transparent corners and a white circular face. Reinstall/update the Android app to refresh its launcher icon.

### 1.1.83: One add button in the category editor (Claude) — completed
- Task: remove the top "＋ Add Category" button. Keep only "+ Add Main Category" under the list.
- Files: `public/admin.html`, `public/admin.js` (its listener removed), `tests/one-add-category.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/149
- Notes: `#add-category` no longer exists. Use `#add-main-category` (and the per-row "Add Subcategory").

### 1.1.82: Category save frees the editor at once (Claude) — completed
- Task: after **Save Categories**, Add/Save went dead until the whole page reloaded. On phones this took long, and a failed reload reported the save as failed.
- Files: `public/admin.js`, `public/admin.html`, `tests/category-save.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/147
- Notes: after the PUT succeeds, `refreshAll()` runs in the background (`.catch(()=>{})`). Do not `await` it again inside the save handler.

### 1.1.81: Admins stay signed in (Claude) — completed
- Task: admins were sent back to login every 8 hours and during every deploy.
- Files: `server.js` (30-day `rolling` session, `SESSION_MAX_AGE`), `public/admin.js`, `public/tenant-admin.js` (wait up to ~2 minutes on a 5xx before showing login), `tests/stay-signed-in.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/146
- Notes: sessions are stored in SQLite (`sessions` table), so restarts keep them.

### 1.1.80: Parent category uses the Add Product picker (Claude) — completed
- Task: in the category editor, **Parent category** now opens the same picker as Add Product instead of a native `<select>`.
- Files: `public/category-picker.js` (new `window.GearHubCategoryPicker.open({...})`), `public/admin.js`, `tests/category-parent-picker.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/145
- Notes: options are `allowNone`, `mainSelectable` and `allowed(row)`. The Add Product behaviour (a main category can't be picked) is unchanged.

### 1.1.79: Phones tap a category to edit it (Claude) — completed
- Task: hide the ✎ button on phones (≤600px); tapping the category heading opens or closes its editor.
- Files: `public/admin.js`, `public/site-admin.css`, `tests/category-tap-edit.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/144

### 1.1.78: Order alerts reconnect by themselves (Claude) — completed
- Task: a device with notification permission that the server no longer knows (for example, after the domain change) is re-subscribed silently, unless alerts were turned off on purpose.
- Files: `public/admin-extras.js`, `tests/order-push.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/143
