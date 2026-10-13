# Multi-store platform development review

This branch is a development preview. **Do not merge/deploy or enable PLATFORM_ENABLED on production until reviewed.** Existing GearHub root shop, admin password account, products/orders/payment/contact/policies are not reassigned or rewritten. Separate security-audit work is paused; feature-required OAuth, CSRF, owner authorization and tenant predicates are included.

## Architecture and migration

The app is a shared website/PWA, not a native Android/iOS binary. One deployed source serves all shops; `/shops/<slug>` is the prepared storefront and `/platform.html` is the application/shop/owner dashboard. `/shops/gearhub` redirects to the existing root shop. Existing `/admin.html` retains the existing legacy admin account and is not granted to Google shop owners.

`PLATFORM_ENABLED=false` is the default. Enabling on a disposable copy invokes an additive, idempotent migration (`lib/platform-model.js`): platform_users, platform_meta, platform_plans, platform_applications, platform_shops, platform_products, platform_files, platform_orders plus tenant indexes. Existing products/categories/orders/admins/site_settings tables are unchanged. A legacy GearHub registry entry points to the root shop; its existing data stays in the old tables. New shops use tenant tables with mandatory shop_id predicates on all private operations. GearHub registry is read-only in the new dashboard; actual legacy operations remain in the original admin. Google ownership/plan enforcement for the legacy shop is deliberately not silently imposed.

No actual production migration was executed. Shared SQLite remains one Node instance. No horizontal scaling or automatic billing was added. Sessions reuse the existing persistent server store. Google-auth-library verifies signed ID token issuer/audience/expiry; callback also checks verified Google-managed email, nonce, one-use session state and expiry and regenerates the session. Access tokens are not persisted. An owner email alone supplied by a client does not establish privilege: the configured owner email is bound to a verified Google subject, and future permissions require both subject and email. Missing owner configuration grants nobody owner access. Changing that binding requires an explicit reviewed owner-account transfer; no self-service elevation exists.

## First-version behavior

- Google login creates a user only. Application is pending until the platform owner approves; rejection with notes allows resubmission. One approved shop per user, unique immutable URL.
- Shop owner edits their shop name/logo/contact/manual-payment instructions, products/category text/SKU/price/stock, and orders. Bank/contact updates apply only to that newly owned shop. Existing GearHub values remain unchanged.
- Owner sees users/applications/shops/plans and storage use, approves/rejects, suspends/reactivates, configures plan permissions/limits/subscription dates and publishes version notes.
- Plan statuses active/trial/sponsored can permit actions within date range; inactive/expired/suspended remove writes/selling but do not delete data. Active permissions are checked on every request, not trusted from UI/session. User suspension blocks private access and hides their storefront. Public product catalog/images are intentionally public for active shops; private orders/receipts remain scoped/authenticated.
- New shops have no sample products or payment details. Checkout requires configured payment fields and a valid receipt; verification remains manual. Prices/stock/total come from the server, checkout is transactional/idempotent, stale stock edits conflict, cancellation restores once, insufficient reopening rolls back, shipped/completed cancellation is rejected.

## Limits and storage definition

One plan table and `permissions()` define allowed products/orders/uploads/selling, active-product limit, storage and dates. Owner-sponsored default: 50 MiB, 100 active products, all permissions, no expiry. These are editable development defaults, not an approved commercial contract or billing obligation.

Billable storage counts recorded bytes of product/logo image files and private receipts, including unused images and transient reserved uploads. It excludes SQLite rows/indexes, session records, platform code, shared legacy files and backup duplicates. A shop's image and receipt bytes share its quota. Each upload reserves bytes in an immediate SQLite transaction before writing; simultaneous uploads cannot exceed the quota. Invalid/oversize files and failed orders release their own reservations/files. Actual remaining filesystem space must also retain 100 MiB. Quota decreases/plan expiry never auto-delete files/orders. An explicit unused-image removal action can reclaim space; referenced images are protected.

Platform_files is a durable quota ledger. A process crash between reservation and completion can leave a pending reservation; an owner/operator must reconcile pending rows versus files on a private copy, not blindly delete tenant data. Storage aggregation for the legacy registry does not claim to measure its old filesystem through the new quota ledger; original storage/backup panel still covers it. Global disk capacity/retention must be sized independently of per-shop quotas.

Both scheduled and manual archives now copy platform-media with the shared database, and v2 manifest includes that component when present. Restore verification checks ready tenant media as well as legacy images/receipts. Existing v1/manifest-less archives remain accepted after validation. Shared backup snapshots contain all tenants' private data; never give them to individual shop owners. The legacy backup download remains legacy-admin-only; tenant dashboard has no shared backup route.

## Google setup needed from owner

Owner must designate exactly one Gmail/Workspace email and create a Google OAuth **Web application** client in a separate development Google Cloud project. Configure consent branding/scopes `openid email profile`; register redirect URI `<development PUBLIC_ORIGIN>/api/platform/auth/callback`. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and PLATFORM_OWNER_EMAIL privately in development. Never paste the secret into chat/PR. On production, use a separate approved client and the real HTTPS origin callback, after review. No real Google round-trip has been claimed without credentials. Mock provider exists only through explicit test-constructor injection and the localhost-only disposable demo, not through a production API/test-login flag.

Sources: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google ID-token validation](https://developers.google.com/identity/sign-in/web/backend-auth).

## Local test procedure

From repository checkout, Node 22:

```sh
npm ci
npm test
npm run check
node scripts/platform-demo.js
```

Open `http://127.0.0.1:8870/platform.html`. This is visibly **LOCAL FIXTURE**, not real Google login. Continue with Google leads to local role choices owner/alice/bob. Use separate browser profiles/private windows for each role. Alice applies; owner approves; Alice reloads and enters shop/payment fixtures, uploads a small image, adds products and opens `/shops/alice-shop`. Bob cannot access Alice's private shop endpoint or owner dashboard. Owner can lower quota/change dates/permissions to verify blocked actions while data stays readable. Checkout a fixture receipt; verify only Alice can read its receipt. Stop demo with Ctrl+C: temp data is removed. It binds only to localhost, uses no real credentials/mail/payment services, and never reads an existing DATA_DIR. The demo uses a temporary session store; the normal server uses persistent SQLite sessions.

For actual Google staging tests, use a disposable copy of a trusted complete backup (verify integrity/media first), set PLATFORM_ENABLED=true plus private OAuth/owner config, run normal server with staging DATA_DIR. Do not reuse production sessions: revoke restored sessions/reset codes on that disposable copy only.

## Shared app update flow

`/api/app-release` returns version/notes; platform owner publishes notices after deploying reviewed shared code. Browser/PWA polls for an in-app notice and waiting worker. External push is not configured. New service worker no longer automatically skipWaits on install; user Update sends APPLY_UPDATE. Other tabs do not automatically reload.

Update preserves browser-local carts and saves non-password/non-file form drafts into that tab's session storage before reload. Dynamic dashboard drafts are restored when forms render. Selected files and active checkout/action block update; finish/clear these first. Passwords/files are never persisted as drafts. Publishing a version alone does not deploy code or update native binaries: deploy shared reviewed assets first, then announce the matching version. Existing first-generation workers already installed may activate their own old update behavior once; staged rollout must verify transition to the waiting-worker version. Native wrappers/external push require separate service credentials, user permissions and an approved later scope.

## Migration rollout and rollback plan

1. Review PR/tests, Google account binding, plan defaults and privacy/retention implications before any production change.
2. Take a complete private online backup and verify it offline. Record current deployed commit, env and original DATA_DIR; keep DB+WAL/SHM/media together if a stopped-service copy is needed.
3. Rehearse on an isolated backup copy with no SMTP and test Google client. Verify legacy counts/health/orders/cart/admin, all tenant boundaries, upload reservations, new shared backup/restore and PWA update drafts.
4. Deploy reviewed code with PLATFORM_ENABLED=false first (only after explicit production authorization). Check legacy behavior. Then, after explicit migration authorization, enable on the same durable data tree with approved Google/owner configuration. Never repoint DATA_DIR to an empty path.
5. Migration is additive/transactional at the SQL transaction level; rehearse failure handling and complete backups before enabling. Accept pilot sellers only after real Google/staging validation, owner approval and adequate disk budget.
6. Operational rollback: set PLATFORM_ENABLED=false on the new reviewed code; tenant writes/API become unavailable, legacy shop remains. Do not drop tenant tables or delete platform-media. Retain unified backup code so dormant tenant media continues to be backed up.
7. Rolling back to older code loses tenant-aware backup behavior: freeze tenant writes, retain a fresh complete archive with platform-media privately, and do not rely solely on old scheduled backups. Database replacement is disaster recovery, not normal rollback, and requires separate explicit authorization. Never mix generations of SQLite WAL/SHM. No destructive down migration is provided.

## Cost and remaining limits

No paid service, production environment change, real email or real bank integration was created. Existing Render compute/disk costs remain; seller files and backups will require more disk as adoption grows. PostgreSQL/object storage are future scaling options, not provisioned now. S3/R2 off-site storage/requests/traffic, external push/email delivery, custom domains/native app publication could incur costs if later approved. Check current [Render pricing](https://render.com/pricing) and the owner's dashboard; the preview makes no new monthly billing commitment.

Remaining before production: approved owner Google identity/OAuth setup and real round-trip; review/authorization of migration/deployment; account binding transfer policy; final commercial defaults/retention/support policies; physical disk budget/recovery validation at pilot size. First version has manual subscriptions, no automatic charging, no custom-domain per-shop setup, and no native app store binaries or external push. Legacy GearHub is preserved rather than silently reassigned to a Google account.
