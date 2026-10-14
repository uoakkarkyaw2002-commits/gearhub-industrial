# Shared merchant admin — 1.1.2

Approved sellers now use `/shops/<slug>/admin`: the same `admin.html`, `admin.js` and styling as the original GearHub admin. Google callback sends an approved seller directly there; new applicants and the platform owner still go to the platform page. There is no second legacy password step. The platform page retains the existing fallback editor and now links to the shared merchant admin.

An explicit transport adapts legacy UI requests to authenticated, CSRF-protected platform shop routes. It never proxies to global `/api/admin`. Server-side tenant ownership, active account, subscription and action permissions still govern all writes. The original GearHub password/session/routes stay separate.

## Merchant feature inventory

- Sales/order/product counts, low stock, inventory search and existing product editor.
- English/Myanmar product names/descriptions/categories, SKU, non-negative price/stock, optimistic stock conflict, active/hidden status, up to ten uploaded images and selected cover. Uploaded photos use existing signature checks and quotas. External/Drive image import is intentionally unavailable to tenants; upload to the shop instead.
- Category hierarchy, names, ordering and icons. Category renames update only that shop's products; deleting a category used by products preserves their grouping and does not delete products.
- Shared order editor, confirmation/invoice, manual payment state, notes/date, shipping/completion/cancellation and restore. Existing stock transaction rules stay in force. Private receipt links remain authenticated and scoped. Destructive empty-trash is unavailable.
- Separate contact/payment editor; no parent shop bank/contact data copied. Appearance forms cannot overwrite bank details with stale values.
- Brand/logo, hero, colors, navigation background, wallpaper, bilingual plain text and layout. Image URLs must refer to this shop's uploaded assets or the bundled generic hero. App-icon field configures presentation; the install manifest remains a centralized platform PWA, not a separate seller app package.
- Shop JSON export with only its own settings/products/orders/media metadata. This is not a restorable full backup and excludes file bytes/sessions. Production-wide backup, recovery email, auth/reset and operations controls remain unavailable to sellers.
- Path-scoped product/update drafts and category draft preservation. Update waits for uploads/writes/files/checkout. Private shop admin navigation bypasses the service-worker cache.

## Migration and rollback

Startup adds `details TEXT NOT NULL DEFAULT '{}'` once to platform products/orders. Bilingual/multiple-image/order-note metadata lives there. Shop categories/appearance use the existing settings JSON. Original GearHub tables, approval/trial dates, storage location and credentials are not changed. Re-running migration does not duplicate columns or rows.

Before deployment, obtain and validate a fresh full backup of the current database plus media using the existing private backup path. Preserve DATA_DIR and the durable disk. Roll back to reviewed 1.1.1 code against the same database; additive columns are harmless to its explicit SQL, and metadata remains on disk for re-upgrade. Do not drop columns, delete shops, restore a stale database or mix old WAL/SHM with a newer database. If a verified disaster restore is necessary, follow DEPLOYMENT.md separately and invalidate restored sessions.

## Verification

Node 22: 67/67 tests, zero failed/skipped/cancelled. Static:49 JavaScript/3 JSON. Existing backup archive/manifest/integrity/tenant media recovery tests pass; a pre-parity schema fixture upgrades/replays and preserves old explicit queries. Added ownership, category hierarchy, appearance/media ownership, export denial, expired-plan denial, Google-to-admin callback and private-worker cache regression coverage.

Isolated real Chrome fixture:21 checks pass, including request/approval/trial, Google-session admin without password, image/product save, category rename, appearance save/draft reload, no root admin/data API requests, storefront/search/cart/receipt checkout/stock, manual order confirmation/invoice, own export,320px admin/storefront and zero JS errors. The identity provider is a local injected fixture, not a real Google provider or a production authentication bypass. No production product, payment or customer row is used by these tests.

Fresh production backup verification and real authenticated production admin smoke checks are release gates, not claimed by local results. Real seller business/payment inputs must be supplied by the merchant before taking payments. No paid infrastructure, auto-billing, broad security audit or unrelated redesign is included.
