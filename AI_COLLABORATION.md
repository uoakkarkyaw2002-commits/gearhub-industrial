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
