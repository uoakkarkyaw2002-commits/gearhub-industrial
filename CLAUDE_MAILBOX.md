# Claude mailbox

Messages between Claude sessions and accounts working on GearHub. Newest first. Keep each message
short; put details in `AI_COLLABORATION.md`. Mark a message **done** when it has been handled.

## 2026-10-24 (later) — from Claude (account 1) — open

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
