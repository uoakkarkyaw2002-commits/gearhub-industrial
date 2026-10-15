# Category hierarchy and reversible product trash — 1.1.8

Prepared from main/production 1c02eb1 (PR #13 / 1.1.6). Production has not been changed. No real products were trashed, restored, moved, edited or added for QA.

## Changes and use

Inventory has a direct red trash button beside Edit on every row. Clicking moves the product to Product Trash and offers Undo; the Product Trash section also has Restore after reload. It is not a hard delete or the existing cancelled-order trash. Previously hidden products stay hidden after Restore. Orders/invoices, SKU, prices, stock, original photos and shared files stay intact. Editing a trashed product requires Restore first; tenant restore checks the active-product quota and normal shop permissions.

Category navigation now keeps MAIN CATEGORY on the RIGHT, SUBCATEGORY and expandable Child subcategories on the LEFT. Leaf selection opens its products; branches have explicit direct-product navigation so products assigned to a main/subcategory remain reachable. Counts/names derive only from existing records. Search/cart/photos and global bottom navigation remain. Sort dropdown, stock filter, floating Sort/Filter pill and synthetic All categories chips are absent. The independent category banner remains, including the existing admin upload/change/remove controls, without a public owner edit link.

Root and seller category editors support Main → Subcategory → Child subcategory. Add/edit/reorder/save preserve IDs and associations. Parent selectors exclude invalid depth/descendants; server validation rejects duplicate/foreign IDs, missing parents, self-parenting, cycles and depth >3. Deleting a category containing products is a clear conflict; deleting a parent with retained children requires explicit reassignment/removal. There is no cascading product deletion or automatic catalogue reassignment. No sample data is added outside disposable test fixtures.

## Migration, backup and rollback

Category hierarchy needs no schema/data migration: existing root parent_id and tenant parent_en already support it. Product Trash needs only additive nullable trashed_at and trash_previous_active columns on products/platform_products, guarded by table_info; existing rows and visible/hidden values are not rewritten. Normal existing backup archives include these SQLite columns. Tests verify migration replay and SQLite backup/restore integrity with historical order and category fixtures.

Before an approved production deployment verify current backup/capacity and exact green commit. Scheduled backup health is a known pre-existing 503, cause unverified; this is not hidden or claimed fixed. No destructive restore or database replacement is authorized by this PR.

Code rollback target: 1c02eb1. Do not drop columns or overwrite production database. Restore any intentionally trashed products through the new UI before rolling back if they must remain visible; otherwise the old code sees them as hidden (their data remains stored). During rollback freeze inventory writes or roll forward before using the new Restore marker, so old visibility edits do not conflict with trash metadata. Historical orders/photos do not need recovery.

## Verification

- Node 22 clean npm ci.
- 95/95 automated tests; 0 failed/skipped/cancelled.
- Static validation: 61 JavaScript and 3 JSON files.
- npm audit --omit=dev: 0 vulnerabilities.
- Chrome disposable tenant fixture: 56 checks at 320/390/1440, main-right/sub-left, expand/collapse, actual long Myanmar text, banner retained, no removed controls, leaf/direct products, two product columns, cart/search, red trash SVG click, Undo, reload + Restore, Add/Edit/Delete Child + Save, stable category IDs/order, unchanged root/tenant product/order hashes and original shared-image hash, no runtime exceptions. Local results/screenshots: outputs/gearhub-hierarchy-2026-10-15.
- Case-insensitive existing category associations/counts are preserved on explicit rename (no automatic product rewrite).
- Root and tenant HTTP tests exercise hierarchy persistence/rename/reference errors and authorization/soft-trash/restore; pure tests cover quota, hidden visibility, idempotency, historical order/invoice preservation and backup/restore replay.
- No new real Google login or iPhone device test is claimed.

## Pending work preserved / release gates

Web Push PR #14 head 2ad7781 is preserved as a separate unmerged branch; no private settings or source changes were overwritten. This UI branch intentionally does not activate pending push features. Its release is 1.1.8 / worker cache v54. Before merging both branches, reconcile release version/cache metadata and overlapping source changes and rerun their combined tests; do not overwrite one branch with the other. Private Web Push activation and backup diagnosis remain their existing separate gates.

- [ ] Exact-head GitHub CI green (record in PR).
- [x] Combined pending Web Push compatibility: isolated merge of PR14 and this code, resolving six version/cache metadata conflicts while preserving both feature implementations; test-only 1.1.9/v55 snapshot passed 113/113 tests, static 68 JS/3 JSON, and the same 56 Chrome fixture checks. Neither remote branch was rebased/overwritten; reconcile versions in the approved release merge order.
- [ ] Verify a current production recovery backup/capacity and investigate scheduled backup 503.
- [ ] Owner review/approval for this new PR merge/additive migration/deploy.
- [ ] Post-deploy root/POLESTAR health/version/install/read-only catalogue checks.
