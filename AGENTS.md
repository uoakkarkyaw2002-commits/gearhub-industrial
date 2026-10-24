# GearHub — Permanent Instructions

These rules apply to all future GearHub tasks, within their applicable scope.

## 1. Minimize Usage
- Minimize token consumption and unnecessary tool calls.
- Inspect only files relevant to the requested task.
- Avoid repeated searches, builds, and tests.
- Do not scan the entire repository unless necessary.
- Use the smallest possible code changes.
- Stop when the requested task is complete.

## 2. Reference Design Accuracy
- Treat uploaded screenshots as the primary design reference.
- Match spacing, layout, colors, typography, dimensions, and alignment as closely as possible.
- Never redesign unrelated elements.
- Do not add anything that was not requested.
- Do not substitute a conceptual preview for the actual implementation.

## 3. Mobile and Desktop Protection
- Preserve existing mobile and desktop layouts.
- Changes to mobile must not break desktop.
- Changes to desktop must not break mobile.
- Check both layouts when changes may affect both.

## 4. Actual Visual Verification
- When browser tools are available, verify the actual implemented page.
- Compare screenshots at matching viewport sizes.
- Fix relevant visual differences.
- Limit repeated screenshot and verification attempts to avoid excessive usage.
- If visual verification is unavailable, clearly report it.

## 5. Protect Existing Functionality
- Do not modify unrelated features.
- Do not refactor unrelated code.
- Do not change database structures or APIs without explicit permission.
- Preserve existing functionality.

## 6. Task Completion
- Never claim success without completing the implementation.
- Run only essential checks.
- Report which files were changed.
- Clearly identify incomplete or unverified work.
- If blocked, explain the reason instead of repeatedly attempting the same approach.

## 7. Follow Instructions Exactly
- If one change is requested, make only that change.
- Do not introduce additional features.
- Do not make assumptions about unclear requirements.
- Ask for clarification only when essential.

## 8. Permanent Project Rules
- This file lives in the root `AGENTS.md`.
- Follow it for all future GearHub tasks within its applicable scope.
- Do not overwrite an existing `AGENTS.md` without checking and preserving its important rules.

## 9. Engineering Rules (learned from real mistakes, 1.1.84–1.1.95)
Each rule below exists because breaking it broke the live site or `main`'s CI.

### 9.1 Never push straight to `main`
- Always work on a branch and open a Pull Request. Merge only after CI ("Production readiness / node22") is green.
- 1.1.91 and 1.1.95 went to `main` without a PR. Both had syntax errors, so the Excel feature was dead in production.

### 9.2 Run the checks locally before every PR (Node 22; better-sqlite3 crashes on Node 24)
```
npm run check && npm test
```
- Both must pass with 0 failures. If a test fails because of your change, fix the code or update the test on purpose. Never ignore a failure.

### 9.3 Regex literals in browser JS use single backslashes
- Wrong: `/^\\/shops\\/([^/]+)/`, `/\\d/`, `/\\.csv$/i`, `/\\r?\\n/`
- Right: `/^\/shops\/([^/]+)/`, `/\d/`, `/\.csv$/i`, `/\r?\n/`
- A double backslash makes the whole file a syntax error, so nothing in it runs (`excel-library.js`, `excel-map.js`). Run `node --check public/<file>.js` on every JS file you touch.

### 9.4 Service worker cache name and asset tags
- In `public/sw.js`, `CACHE_NAME` must be exactly `gearhub-shell-v85-<version>`, e.g. `gearhub-shell-v85-1.1.97`. Keep the `v85-` prefix: `scripts/check-static.js` requires it, and `v86` broke CI twice.
- Every release bumps the same version in `package.json`, `package-lock.json` (two places), `public/index.html`, `public/sw.js` and `tests/tenant-install.test.js`.
- When you change a `?v=` tag for a JS/CSS file in `public/index.html`, change the identical tag in the `SHELL` list in `public/sw.js`. The share-store offline-shell test checks that they match.

### 9.5 Database and shop isolation (security)
- Every SELECT/UPDATE/DELETE on `platform_products`, `platform_orders` or `platform_files` must include `shop_id=?`. `tests/tenant-isolation.test.js` enforces this.
- Only use columns that exist. Check the schema in `lib/platform-model.js` first. `platform_files` has no `created_at`; selecting it caused SQLITE_ERROR.
- Store uploaded file types from the checked extension, never from the browser's MIME type.

### 9.6 Never destroy existing data on import or update
- When updating an existing product from a spreadsheet, change only the fields the owner linked and that have a non-empty value; use `COALESCE(?, column)` for the rest. 1.1.95 reset stock to 0 and emptied categories for unlinked columns.

### 9.7 UI patterns already in this codebase
- `.modal` is `display:none` until it also has class `open`. Removing `hidden` alone does not show it.
- A CSS rule like `form{display:flex}` overrides the `hidden` attribute. Add `selector[hidden]{display:none}` for anything you hide with `hidden`.
- The GearHub owner (`me.isOwner`) controls every shop. Anything a shop owner can do in their shop, the GearHub owner must also be able to do (find the shop via `/api/platform/owner`).
- Seller shops must never show the GearHub brand.

### 9.8 Test in a real browser at both sizes before saying "done"
- Phone 375px and PC 1280px, on a seller shop (`/shops/<slug>/`). Click the actual buttons; confirm the feature works, the console has no errors, and nothing else on the page broke.
- If a feature is PC-only by design, say so and say how phones reach it.

### 9.9 One agent at a time; keep the handoff log
- Before starting, pull the latest `main` and read `AGENTS.md` and `AI_COLLABORATION.md`.
- After finishing, add a handoff entry to `AI_COLLABORATION.md` (task, files, PR link, notes) in the same PR.
- Do not deploy. The owner deploys on Render himself.

### 9.10 Report honestly
- Never say "done", "merged" or "works" without verifying it. List what you tested, at which sizes, and anything not verified.

### 9.11 Never paste tool output into a source file
- 1.1.102 wrote a viewer's "… 131 tokens truncated …" note and "Warning: truncated output" lines into `public/style.css`. Real CSS, including a closing `}`, was lost. Every style after that point became phone-only, so PC product cards showed black icons and black buttons.
- Edit files with real file edits, never by copying a shortened file view back in. If a file view says it was truncated, read it in parts.
- `npm run check` now fails on truncation text in `public/`, `lib/` or `server.js`, and on unbalanced `{ }` in any CSS file.

## 10. More than one AI account — the mailbox (owner's request, 2026-10-24)
The owner switches between Claude accounts (and Codex) when one reaches its usage limit, and does not want to repeat anything.
- **Start of every task:** read `CLAUDE_MAILBOX.md` and act on open messages; then read the newest entries in `AI_COLLABORATION.md`.
- **Before you stop, or when a usage limit is near:** add a short dated message at the top of `CLAUDE_MAILBOX.md` (done, open, what the next agent must know) and commit it with your work.
- Reply to the owner in Burmese, in short numbered steps. Do and verify everything yourself; the owner only merges PRs, deploys on Render, logs in and tests on their iPhone.
- Never let anything at the top of a screen look blurred/smudged or hang over the content below it (the Excel search box once covered the column letters).
