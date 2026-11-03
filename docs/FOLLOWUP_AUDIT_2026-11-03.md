# Follow-up audit — 2026-11-03

Reviewed main `a6d0f6e` (1.1.267; Excel PR #346 merged). This is a focused review, not an exhaustive security or browser audit. No runtime code, live data or deployment changed.

## 1. P1 — One shop deletes another shop's offline Excel

Source: `public/excel-library.js:21–28`. Every shop shares `gearhub-excel-v1`. Cleanup deletes every spreadsheet URL absent from the current shop's list, including other shops' files.

Reproduced by executing the actual `keepOffline()` against mocked Cache/Fetch APIs with shop A and B cached: opening A deletes B's cached file. Server originals are unaffected, but B can lose offline availability.

Fix: scope cache/cleanup by shop, accounting for migration. Verify A → B → A offline, two tabs and replacement cleanup.

## 2. P1 — External/PC Excel upload leaves open pages searching old data

Source: `public/excel-search.js:58–68,117–118`. The resolved `loading` promise is reused indefinitely. Only an upload event in the same page resets it; there is no file-ID revalidation on focus/online/search.

Reproduced using actual `workbook()`: load old file, change mocked server list to new file, search again. Only one list request occurs; old file remains selected. Old stock/prices can remain visible until refresh.

Fix: bounded file-ID freshness checks and revalidation on returning online/to the app; change workbook/index only when its ID changes. Preserve offline fallback and stale-result cancellation. Test PC upload → already-open customer page and same-page upload.

## 3. P1 — Quoted CSV fields shift columns

Source: `public/excel-map.js:553–556`. `csvBook()` splits lines and commas without CSV quoting rules.

Actual parser reproduction: `X1,"Seal, large",100` becomes four cells (`X1`, `"Seal`, ` large"`, `100`), rather than three (`X1`, `Seal, large`, `100`). Preview/import column mapping can be wrong. No import/database write was executed.

Fix: parse quoted commas, escaped quotes, CRLF and quoted newlines. Verify preview/import mapping while preserving XLSX/XLSM and non-empty-field update behavior.

## 4. P2 — Seller request drops the caller's timeout signal

Source: `public/store.js:199`; `public/tenant-store.js:11–20,47–50`. Initialization passes `AbortSignal.timeout(8000)`; tenant transport starts the underlying catalogue request with only `{cache:'no-store'}`.

Reproduced by calling the actual transport with an AbortSignal and recording underlying fetch options: `/api/platform/store/shop-a` has no signal. Thus the caller's eight-second timeout does not bound that request; a stall can delay loading/fallback. A real network stall was not timed in this audit.

Fix: bound the shared tenant request without allowing one cancelled consumer to break other consumers. Test stalled origin, retry, offline fallback and concurrent products/categories/config.

## 5. P2 — Speed sampling competes with startup and ignores Save-Data

Source: `public/net-speed.js:19–30,34–48`. An uncached sample starts after 1.5 seconds, repeats every three minutes and on visibility/online. There is no Save-Data guard or coordination with catalogue/Excel transfers; a sample can transfer up to 1 MB.

This was already noted in the earlier performance audit and remains present. It is a source-confirmed scheduling observation. The incremental startup slowdown was not newly benchmarked; not every sample necessarily transfers the full megabyte.

Fix: preserve the requested badge but defer active sampling until initial catalogue/Excel work is idle, respect Save-Data and avoid repeated sampling on rapid tab switching. Compare before/after on the same network.

## Verification and next steps

- Findings 1–4 were reproduced using isolated Node/VM executions of the current source functions, with controlled inputs and no source-function edits.
- Local evidence/harness: `/private/tmp/gearhub-followup-audit/reproduce.cjs` and `reproductions.json`.
- No new live-site, visual, authenticated production or physical-device tests. Browser reproduction remains part of each proposed fix.
- Only this report, `CLAUDE_MAILBOX.md` and `AI_COLLABORATION.md` changed.
- Prioritize 1 and 2, then 3, then 4 and 5. Do not automatically start unrelated mailbox work.
