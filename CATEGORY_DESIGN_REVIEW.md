# Category presentation and independent banner — prepared 1.1.5

## Scope

Category landing now uses a text-only hierarchy/sidebar and subcategory rows on a pale background. Category detail uses rounded two-column photo cards, real SKU, stock state/quantity, price and existing cart/gallery actions. There are no category thumbnails, gear fallbacks or decorative stock/price emojis in this view. Global navigation remains unchanged. No reference catalogue names, counts or products are imported.

The old hardcoded Heavy Machinery branch incorrectly displayed other main categories as subcategories and borrowed a product photo for the banner. The replacement projects the actual parent/child tree and computes counts from the active catalogue without changing a row. Search covers category names, product names and SKU; sorting and the in-stock filter are read-only projections. Missing photos show text. Empty and many-category states remain usable.

## Banner administration

Both original GearHub and shop admins use **Frontend Appearance → Category Banner**. Choose a file, then **Save Changes**; **Remove banner**, then Save Changes clears only the banner reference. A link from the storefront banner opens this section directly for an authenticated administrator. Anonymous users still require the existing login and permissions.

`categoryBannerUrl` is independent of homepage `heroImageUrl`, product image IDs and the PWA app icon. No existing image setting is overwritten at deployment. An unset banner shows a neutral empty state, never a random product photo. Existing forms that omit the new field preserve a previously configured banner. Removing the banner does not delete its uploaded file or any product photograph.

Uploads reuse the existing validated image flow, authenticated tenant API and storage quota. Shop settings only accept that shop's completed public image assets; cross-shop URLs are rejected. An image referenced by a banner cannot be deleted as unused. Expired plans and write permissions continue to apply.

## Verification

- Node22 clean npm ci; npm test **81/81**, zero failed/skipped/cancelled.
- Static validation **56 JavaScript / 3 JSON**; dependency audit 0 vulnerabilities.
- Category projection tests cover hierarchy/counts, real record/photo retention, search, sort, stock filter, empty and many-category data, and immutable input hashes.
- Real root admin API test covers image upload, banner save/remove, older-form compatibility, payment preservation and unchanged product/order/category row hashes.
- Real tenant API regression covers foreign image rejection, own-image acceptance, referenced-file deletion protection, old-form preservation, other-shop settings unchanged, and unchanged legacy/tenant product/order rows. Existing quota, approval, trial, cart/order and install identity suites pass.
- Isolated Chrome fixture **33 checks**, **12 screenshots**: 320px, 390px, 1440px; landing, child product grid, empty/many categories, no-banner state, actual photo rendering, search/sort/in-stock filter/cart; seller Google-session fixture opens shared admin directly, uploads and changes banner, removes it, and preserves catalogue/order hashes. Google provider is a test fixture, not a new real Google login test. No horizontal page overflow or browser runtime exceptions found. Screenshots use clearly labelled synthetic fixture data only.
- Read-only production before/after catalogue snapshots are equal: original products, original categories and POLESTAR public products. Production orders/customers were not read; preservation for those tables is verified in isolated integration tests. No production writes have been performed.

Local artifacts: `/Users/oakkar/Documents/Codex/outputs/gearhub-category-2026-10-15/`.

## Release / rollback

This branch starts from merged PR11/main `7d9100a850ce26266b104d79578f643c571583ec` and retains its URL-specific installation identities/icons/cache isolation. Prepared shared version 1.1.5 and worker generation v51; existing draft/cart update behavior is unchanged. No schema migration, reseed, product/category association rewrite, price/stock change or order/payment change is included.

Merge/deploy is pending approval for this new PR. After deployment, verify version, root/POLESTAR health, loaded Category assets and install manifest identities, then compare the available read-only catalogue snapshot (allowing for concurrent owner edits). Production banner writes should be made only by the shop owner. Roll back code to `7d9100a` if needed; no database restore is required. The old release ignores the new optional banner field. Never restore an old production database merely to roll back this presentation release.
