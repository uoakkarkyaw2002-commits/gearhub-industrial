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

### 1.1.103: PC store navigation in the top header (Claude) — in review
- Task: on PC (≥851px) Home / Category / Promotion / Cart / Settings sit in the top header with outline icons; the active page has a light-green pill. The language button beside the Excel icon is hidden on PC. Phones keep the bottom nav.
- Files: `public/index.html` (`<nav class="desktop-top-nav">`), `public/desktop.css`, `public/sw.js`, version files, `tests/desktop-top-nav.test.js`.
- PR: (this PR)
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
