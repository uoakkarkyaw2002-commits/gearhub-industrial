# Category and update feedback release — 1.1.6

This change is prepared for review; it is not deployed.

## Behavior

- Public category pages contain no owner edit link or synthetic All categories entry. Admin appearance banner upload/removal stays available.
- Category selection starts with a real category. Compact selected-category cards retain photos, SKU, stock, prices, cart behavior, and the existing global navigation. Mobile Sort/Filter controls sit above the bottom navigation.
- Empty category deletion persists after Save Categories. Categories containing products cannot be deleted: the API returns 409 and the editor explains that products must first be explicitly assigned to another category. Parent categories require removing children first. Products are never silently moved/deleted by category deletion.
- Update notices are transient foreground in-app notices, once per version per installation scope when enabled. Settings shows the available version regardless of notification preference. Updating is explicit; active orders/actions/files block it, and saved form drafts/cart behavior remains protected.
- Sound is best effort after a permitted user gesture. Browser autoplay, iPhone silent/Focus settings and system permissions are not bypassed. There is no remote Web Push subscription/sending service: closed-app delivery is not implemented or claimed.
- Default GearHub APP Settings text respects tenant branding; custom owner text is retained.

## Verification

- Node 22 clean npm ci completed.
- Automated suite: 87/87 passed, 0 failed/skipped/cancelled.
- Static validation: 57 JavaScript and 3 JSON files passed.
- npm audit --omit=dev: 0 vulnerabilities.
- Dedicated Chrome with disposable fixture database/media: 38 checks passed. Widths 320/390/1440; two-column cards, no horizontal overflow, real hierarchy, empty states, SKU search, price sort, stock filter, cart, fixed-control clearance at the final card, admin banner upload/save/remove, unchanged product/order hashes, no runtime exceptions.
- Unit/integration coverage includes root and tenant empty-category persistence, atomic rejection of populated-category removal, tenant isolation, update preference/version deduplication, sound/visibility restrictions, explicit worker activation, cart/draft and active-action protections.
- Screenshots/results: local outputs/gearhub-feedback-2026-10-15. Browser fixture uses synthetic identity, not real Google login or production edits. Actual iPhone sound/installation is not newly verified.

## Deployment and rollback

No schema migration or automatic data rewrite. Category changes occur only when an admin explicitly saves. Existing business/payment data and global navigation are preserved.

After explicit approval, merge the exact green PR commit and deploy normally. Verify the deployed release is 1.1.6, worker cache v52, health and root/tenant catalogue and install identities. Revert the code release to main commit 1c291322d754a57b6870b16b8ee8a916b2d87f67 if needed; do not restore/overwrite the production database for a code rollback. Reverting code does not undo category edits deliberately saved by an admin.

Known pre-existing operations issue: scheduled backup health was 503 before this release; cause has not been established. No backup settings, secrets, size limits or alerts were disabled to hide this issue. Previously verified 2026-10-14 archive is historical, not a fresh current backup. No production writes, deletes or restores were used for this QA.

## Remaining release checklist

- [ ] Exact PR head GitHub CI green (record in PR).
- [ ] Owner approval for this new PR's merge/deploy.
- [ ] Post-deploy release/health/root and tenant read-only smoke checks.
- [ ] Real iPhone foreground update/sound behavior; OS restrictions may keep sound silent.
- [ ] Diagnose pre-existing scheduled backup failure separately using authenticated operations details.
- [ ] Remote closed-app Web Push is a separate feature requiring subscription/server delivery and owner-approved setup.
