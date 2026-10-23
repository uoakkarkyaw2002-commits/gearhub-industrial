# AI Collaboration Log (Claude ⇄ Codex)

The owner gives each task to **one** agent at a time. GitHub `main` is the handoff channel.

## Rules

- Before a task: pull the latest `main`, then read `AGENTS.md` and this file.
- Do not start a task that is listed below as **assigned / in progress** for the other agent.
- Change only the assigned feature. Use the owner's screenshots as the exact design reference.
- After a task: commit and merge to `main`, add a handoff entry below, and set its status to **completed**.
- **Do not deploy.** The owner deploys on Render himself (Auto-Deploy is Off).

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
