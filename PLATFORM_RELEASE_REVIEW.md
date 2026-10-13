# Multi-store release review (development only)

No merge, production deployment or production migration has been performed or authorized. Existing GearHub bank/contact/legal content and customer data are unchanged.

## Baseline and completed checks

PR #7 baseline `06d8fbd44a6ddbf4a76b3831645e6edfacf4391b` has tree `fcaac6ff7c4d3aad3900f4c2d89d2e69f83ca268`, matching the previous 57-test local source and successful GitHub CI. The PR description previously listed the older 55-test head; the final description supersedes it.

Real Google owner and PSM Group seller sign-in succeeded in separate browsers on that baseline. Real authenticated development sessions exercised pending application visibility, owner-only approval, pre-approval denial, exact two-calendar-month trial, product/image upload, manual receipt-backed order, authoritative price/stock, idempotency, upload/receipt/product quotas, receipt privacy, MB/GB controls and draft-preserving update. No fake login API exists. These successful earlier sign-ins do not prove replacement credentials work.

This follow-up binds announcements to package build version **1.1.0**. Owner cannot announce an undeployed version; stale/future metadata does not mislabel the current build. The service-worker cache generation is advanced and unversioned scripts refresh from the network with offline fallback. All platform write requests, including image removal, block Update until complete. A real headless Chrome installed-worker rehearsal using previous production worker v45 passed explicit waiting/activation, draft/cart retention and current-shell cleanup. Future releases must bump package+lock version and worker cache generation together; deploy reviewed assets before publishing notes for that installed version.

Isolated recovery rehearsal uses a private copy of an existing real archive, invalidates restored sessions/reset codes on that copy, and compares hashes of every legacy product/order/category/admin/settings row. Migration repeated without duplication; tenant rows/media were added only to the copy; snapshot/checksum/SQLite integrity and manual admin archive verified. Feature flag off retained legacy storefront/products while disabling tenant API; re-enabling preserved rows and produced no duplicate shops. Temporary drill copies and test admin credentials were discarded. No original backup or production database was modified.

## Safe migration / recovery / rollback

1. Record deployed commit, original durable DATA_DIR, one-instance setting, and private config. Take a complete private backup with database, uploads, receipts and platform-media, then validate with `npm run verify:restore -- /absolute/private/extracted/gearhub-backup`.
2. Rehearse on an isolated complete copy with no outgoing SMTP/S3, test OAuth client and independent session secret. Restore testing must invalidate sessions/reset codes on the COPY only.
3. After explicit authorization, deploy code with PLATFORM_ENABLED=false first, preserving the current database location. Confirm legacy storefront/admin/products/orders/stock/media and health.
4. Only after approved production OAuth/private config and migration authorization, enable PLATFORM_ENABLED=true on the same durable tree. Migration is additive and transaction-protected; existing GearHub rows remain in legacy tables. Verify owner binding and approval before accepting pilot sellers.
5. Normal rollback: turn PLATFORM_ENABLED=false on this tenant-aware code. Do not drop tables, delete media or restore a stale database. Tenant-aware backups must continue while disabled. Re-enabling repeats migration safely.
6. Disaster recovery only with separate authorization: stop service; preserve current DB plus WAL/SHM and all media as one private recovery copy; extract/verify chosen archive in a separate directory; replace database/media together without mixing old WAL/SHM with the snapshot; invalidate restored sessions and reset codes; restart on the original DATA_DIR; verify health, legacy and tenant catalogs/images/admin/orders/stock/receipts; take a fresh verified backup.
7. Before retiring this code for older single-store code, freeze tenant writes and retain a complete tenant-aware archive. Older scheduled backups do not preserve tenant media.

## Upload reservation recovery

Run `node scripts/check-platform-media.js /absolute/private/DATA_DIR` on a stopped-service copy for aggregate, filename-free diagnostics. It never changes data. Pending reservations still count against quota. Do not auto-delete or mark ready: compare private files/byte sizes and operation state, then review an explicit recovery transaction on the copy. Ready missing/unsafe media requires restore/investigation, not silent ledger removal. Development inspection had zero pending or missing/unsafe media.

## Owner-only OAuth actions (all remaining manual steps)

The earlier creation screenshot included a full development client secret. It is treated as exposed; it is not reproduced, copied into source, or used in reports. Connected tooling cannot administer Google Cloud OAuth clients.

1. In gearhub-development create a replacement Web application client. Authorized JavaScript origin: `http://localhost:3000` (optional for this server flow). Redirect: `http://localhost:3000/api/platform/auth/callback`. Keep Audience External/testing and owner/seller accounts in the allowed test-user list where required. Scopes only openid/email/profile.
2. Download new credentials privately. Supply only its local path to the agent; never attach JSON or display secrets. Import only into ignored private local settings with mode 0600, preserving the existing development data path and private session secret.
3. Restart localhost app, log out/re-enter both owner and seller through Google with the NEW client, and recheck roles. Existing sessions alone do not establish new-credential validation.
4. After both new-client sign-ins succeed, disable/revoke the old secret in the original client. If Console has no secret controls, retire/delete the OLD development client after verifying replacement client identity and that production does not use it. Do not delete the replacement or any production client. Confirm old-client credentials can no longer authorize, without printing them.
5. Create a separately reviewed production Web OAuth client with actual approved branding, support email and policies. Exact production callback: `https://gearhub-industrial-1.onrender.com/api/platform/auth/callback`; optional JavaScript origin: `https://gearhub-industrial-1.onrender.com`. No callback path in JavaScript origins, no wildcard, no trailing slash on callback.
6. Set production credentials privately in Render settings only after release approval; never commit OAuth JSON/env settings. Owner and seller production sign-in must be checked during the authorized release window before pilot invitations.

## Production environment checklist (values remain private)

- DATA_DIR: preserve VERIFIED existing location on persistent /var/data disk, including any existing subdirectory. Never repoint blindly.
- NODE_ENV, PUBLIC_ORIGIN: production mode and exact real HTTPS origin, no path/query/fragment.
- PLATFORM_ENABLED: staged flag off, then on only with separate migration approval.
- PLATFORM_OWNER_EMAIL: exactly one designated verified Google owner identity; existing Google subject binding must match.
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: production Web client pair, entered privately.
- SESSION_SECRET: strong existing private value; do not rotate automatically.
- PORT: hosting-provided listener port; WEB_CONCURRENCY: single worker and exactly one service instance.
- SEED_DEMO: disabled; preserve existing ADMIN_USERNAME/admin credentials.
- BACKUP_EMAIL_ENABLED, ALERT_EMAIL_ENABLED and SMTP_USER/SMTP_APP_PASSWORD/PASSWORD_RESET_EMAIL: preserve existing approved private operational settings; no mail sent by drills.
- Optional BACKUP_S3_*: preserve approved private off-site settings. Verify recovery capacity for all tenants.
- Node 22; build npm ci; start npm start; health /api/health; auto-deploy only after successful required CI if supported.

Production OAuth values, owner contact/bank/legal information and Render secrets are not printed here. Production settings have not been changed in this run. Final release readiness remains conditional on replacement-secret validation/revocation and production OAuth configuration; do not claim production OAuth login tested.

## Final local validation

Clean Node 22 npm ci completed; full suite 61 passed / 0 failed / 0 skipped / 0 cancelled; static 44 JavaScript / 3 JSON; npm audit 0 advisories. Isolated real-archive migration/restore/flag rollback/manual-export rehearsal passed 20 checks. Installed-worker Chrome rehearsal passed 7 checks. Intended tracked files contain no actual local OAuth/session secret values; private env is ignored/untracked with 0600 permissions. GitHub CI status and exact final commit are recorded in PR #7 after publishing.

Credential rotation was requested but a replacement JSON path has not been supplied. No new-secret import, new-client login or old-client revocation is claimed. Production OAuth/client/config checks remain owner-only release gates.
