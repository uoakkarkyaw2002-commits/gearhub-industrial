# Claude mailbox

Messages between Claude sessions and accounts working on GearHub. Newest first. Keep each message
short; put details in `AI_COLLABORATION.md`. Mark a message **done** when it has been handled.

## 2026-10-26 (evening) — from Claude (account 1) — open

- 1.1.170 (closing a product keeps the scroll position; history.scrollRestoration manual) is in a PR.

## 2026-10-26 (later) — from Claude (account 1) — done

- 1.1.169 (photo search on the server with DINOv2 + new API, owner approved) is in a PR. After deploy: check Render memory/logs and a real scan on POLESTAR.

## 2026-10-26 — from Claude (account 1) — done

- 1.1.168 (photo scan: live camera scanner, quiet background learning, Excel-style highlight) is in a PR. Real iPhone camera not verified.

## 2026-10-25 (night 7) — from Claude (account 1) — done

- 1.1.167 (photo search: scan button in the search bar, on-device MobileNet) is in a PR. Owner tests with the iPhone camera.

## 2026-10-25 (night 6) — from Claude (account 1) — done

- 1.1.166 (Excel: dragging a selection keeps its rows/columns) is in a PR.

## 2026-10-25 (night 5) — from Claude (account 1) — done

- 1.1.165 (Excel: sideways selection drag on iPhone via touch-action:none, edge auto-scroll) is in a PR.

## 2026-10-25 (night 4) — from Claude (account 1) — done

- 1.1.164 (Excel: drag from the selection, one outline, visible Copied) is in a PR.

## 2026-10-25 (night 3) — from Claude (account 1) — done

- 1.1.163 (Excel tap-to-select from touchend; iPhone did not deliver click) is in a PR. Owner must confirm on iPhone — no iOS Simulator on this Mac.

## 2026-10-25 (night 2) — from Claude (account 1) — done

- 1.1.162 (Excel: tap to select, corner handles, tap selection to copy) is in a PR. Owner tests on iPhone.

## 2026-10-25 (evening 3) — from Claude (account 1) — done

- 1.1.161 (Excel pictures scale with zoom; tab line only on the open sheet) is in a PR.
- The test shop's workbook was re-uploaded: its id is now 62c609f3-e6e1-4a22-922d-40dbf3897018 (old 230283a2… is 404).

## 2026-10-25 (evening 2) — from Claude (account 1) — done

- 1.1.160 (Excel ≡ sheet list like Google Sheets) is in a PR.

## 2026-10-25 (later still) — from Claude (account 1) — done

- 1.1.159 (category required again: picker field no longer read-only) is in a PR.

## 2026-10-25 (late) — from Claude (account 1) — done

- 1.1.158 (Add Product runaway button, `public/product-runaway.js`) is in a PR. Owner tests in the real admin.
- Skyshopmm Safari login loss: checked, no server cause found (30-day rolling cookie); owner said leave it.

## 2026-10-25 (night) — from Claude (account 1) — done

- 1.1.157 (gallery download: parachute falls slowly over 3 s, save after landing) is in a PR. Owner tests on iPhone; if iOS shows "Tap to save" instead of opening the share sheet, that is the fallback for the late share.

## 2026-10-25 (evening) — from Claude (account 1) — done

- 1.1.156 (gallery "download all photos" button, design from the owner's video) is in a PR. Owner tests the iPhone share sheet.

## 2026-10-25 (later) — from Claude (account 1) — done

- 1.1.155 (saved product photos served cache-first; offline gallery thumbnails were blank) is in a PR. Owner tests on the installed PC app with internet off.

## 2026-10-25 — from Claude (account 1) — done

- 1.1.154 (offline photos: no 2-minute limit while progressing, saved photos not downloaded again) is in a PR. After deploy, run the offline save on live POLESTAR and check all 645 photos are in `gearhub-offline-v2:/shops/psm-test-shop/`.

## 2026-10-24 (midnight) — from Claude (account 1) — done

- 1.1.153 (offline also saves product photos from /api/platform/images/) is in a PR. After deploy, check on the live POLESTAR shop with internet off.

## 2026-10-24 (late night) — from Claude (account 1) — done

- 1.1.152 (Settings: offline download % ring and "Offline success") is in a PR; owner merges and deploys.

## 2026-10-24 (night) — from Claude (account 1) — done

- 1.1.151 (INV SR / WH-1 lines: each line drawn inside the cell that owns it, right/lower cell wins) is in a PR.

## 2026-10-24 (evening) — from Claude (account 1) — done

- 1.1.149 (INV logo, centred thick borders, merged edges, Excel cell margins) is in a PR; owner merges and deploys.
- The owner compares the viewer with Excel on their PC (window ~1625px wide, INV's frozen columns pinned).
  Always test at that width too, not only 375/1280.

## 2026-10-24 (later) — from Claude (account 1) — done

- 1.1.148 (Excel looks like the file) is in a PR; the owner merges and deploys. Then check the live site.
- The owner's reference for Excel looks: their photos of Excel on the laptop. INV intentionally starts at
  row 28 / column C (Excel hides rows above a pane frozen low down; owner asked for this in 1.1.125).
- Shape colours come straight from the file (INV's purple total is FF00FF; photos look softer).

## 2026-10-24 — from Claude (account 1) to the next Claude — open

Hi. The owner switched to you because my account reached its limit. Here is where things stand.

**Done and live (1.1.140–1.1.146, see `AI_COLLABORATION.md`):**
- skyshopmm.com background: Codex's page (swaying grass, flying birds). PC uses a sandboxed frame;
  phones run the picture, the birds layer and the grass program in the page (iPhone froze them in a frame).
- Excel viewer: only rows near the screen are drawn (fast zoom, sheet switch, selection); search works
  like Google Sheets (rows stay, ˄ ˅ between matches); borders follow the file (separate borders,
  shared edges, merged ranges); the search bar fits inside the top bar.

**Open:**
- The owner has not confirmed that the grass sways on their iPhone (1.1.143). Ask them once; if it
  doesn't, test with WebKit before changing anything.

**Know before you start:**
- Run tests with Node 22 (`npm test`); Node 24 crashes better-sqlite3.
- Test iPhone behaviour in WebKit, not only Chrome. Locally WebKit needs the CSP rule
  `upgrade-insecure-requests` stripped (it upgrades http://localhost).
- For Excel work, test with the test shop's real workbook (`/api/platform/store/psm-test-shop/spreadsheets`).
- Claude cannot merge into `main` or force-push: open a new branch and PR each time; the owner merges.
- Codex also works in this repo (1.1.147 white storefront top bar). Pull `main` first.
