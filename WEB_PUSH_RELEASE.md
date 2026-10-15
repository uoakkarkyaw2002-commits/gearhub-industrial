# Standard Web Push release — 1.1.7 (review, not deployed)

Base: merged PR #13, production 1.1.6 / main 1c02eb1fbe49cb8f9d1603a60fab18e0dd91996a.

## Architecture and boundaries

Reuses Settings, explicit Update app, draft/cart guards, and the existing service-worker cache behavior. Adds standard `web-push` delivery (no paid notification service). Root worker remains /sw.js; each tenant has /shops/<slug>/sw.js and its own registration scope/subscription. Public provider endpoint allowlist is exact HTTPS Apple/FCM/Mozilla hosts, with no credentials/custom port/fragment; subscription keys are validated. The server sends encrypted Web Push only to those providers; it does not fetch user-supplied arbitrary URLs.

SQLite tables push_devices, push_releases, push_deliveries, push_tests are additive and contain only operational subscription/release state. Device capabilities are random 256-bit tokens stored hashed on server; per-install scope and endpoint ownership are enforced. Writes require same origin and session CSRF, except release confirmation which requires a private bearer capability and same-origin header. Subscription endpoints/keys/private VAPID/provider response bodies are never logged or returned in public status. Existing business/customer/payment tables are not changed. Backups already include the database and therefore these private operational tables; treat archives as private.

A toggle gesture requests browser permission. Denied/unsupported/uninstalled iPhone/unconfigured states stay off. Existing root/other-shop subscriptions cannot be unsubscribed by a different shop's toggle. Disable unsubscribes the browser and disables the server device; failures are shown. Revoked permission/expired subscriptions require opting in again. No automatic permission prompt or resubscription. A worker capability handshake requires users with an older worker to explicitly Update app first.

OS notifications are displayed in foreground and background by the worker. Settings badge remains accurate independent of preference; the push path suppresses a duplicate foreground toast/beep. Notifications contain only shop name/icon, version and the exact shop Settings review URL. They do not contain order/customer/payment data. Click focuses/messages an existing storefront without navigating or reloading an active checkout/form, or opens the exact tenant URL with #app-update. Clicking never calls skipWaiting or Update. Only explicit Update preserves drafts and cart and activates the waiting worker; active checkout/actions/files remain blocked.

## Reliable live-release gate

A separate workflow_run job runs ONLY after the main push Production readiness workflow succeeds, never a PR run/fork. It checks out that exact SHA, polls the existing Render service via API for that SHA's LIVE deployment, checks production health, backup health and version, then uses a private release token to confirm the release. Server checks the version matches its package and commit matches Render's automatic RENDER_GIT_COMMIT. An idempotent version-keyed transaction queues only currently enabled devices. Startup/restart never creates a release announcement. New subscribers do not receive a historical broadcast just because they opted in.

Delivery has one durable row per device/version, serialized batches, bounded exponential retries (five attempts, 429/5xx/transport), 404/410 disablement, seven-day release expiry, and skip for suspended/expired shops or disabled devices. HTTP acceptance does not prove device display. A lost acknowledgement can cause a transport retry; stable Web Push topic and notification tag with renotify:false collapse replacement notifications, but absolute exactly-once delivery across OS/network failures cannot be promised. Sound is controlled by OS notifications, Silent/Focus and user settings; no custom/guaranteed sound or silent-background push.

The explicit test button schedules ONE enabled capability-owned device after 30 seconds, requires a confirmed live release, and has a ten-minute cooldown. No broadcast test route. No real test notifications have been sent. Test jobs expire and are removed after a day. A crash during a test send fails closed rather than broadcasting/retrying to unrelated devices.

## Private setup (owner-only portion, consolidated)

Generated private settings are in the local `.env.web-push.local`, ignored by Git, chmod 0600. Script scripts/generate-web-push-keys.js creates once and refuses overwrite. Do not paste values into chat, PR, screenshots or logs; keep the key pair stable.

1. After review/release approval and backup gate resolution, add WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT, WEB_PUSH_RELEASE_TOKEN to the EXISTING Render service private Environment. Do not replace other variables, DATA_DIR, OAuth/session secrets, or bank details. Render supplies RENDER_GIT_COMMIT automatically; do not override it.
2. GitHub Settings → Environments → production-push: restrict deployment branches to main. Add private environment secrets RENDER_API_KEY (owner Render API credential) and the SAME WEB_PUSH_RELEASE_TOKEN. Do not put the VAPID private key into GitHub. Connected GitHub tools cannot write these secrets. No API credential has been requested in chat or generated as a paid account.
3. Merge/deploy only after exact-head CI and backup/rollback checks. The post-CI workflow will wait for Render Live, then confirm; missing secrets fail the gate without sending. If setup completes after a failed gate, rerun that failed job. Do not call confirmation from app startup. GitHub/Render CI status does not prove an iPhone received a notification.

## iPhone test after deployment/setup

Use iOS/iPadOS 16.4+ supported Home Screen Web Push. Safari → https://gearhub-industrial-1.onrender.com/shops/psm-test-shop/ → Share → Add to Home Screen. Open POLESTAR from its icon. Settings → Update app first if instructed; then Notifications → Allow. Toggle must remain on and show status. Tap the explicit THIS DEVICE test button, close the app, and wait about a minute. Confirm branded notification and normal sound only if OS allows. Tap notification: POLESTAR Settings/Update app opens, never GearHub root; no automatic activation. Test toggle off and confirm no further release push is sent to that device. A same-version test proves transport/click, not a newer-version badge; the next approved newer deployment proves the full badge/update flow. Keep an unsaved non-sensitive form/cart on another check and verify explicit update preservation. Actual iPhone delivery/sound remains UNVERIFIED until the owner does this.

Apple sources: https://webkit.org/blog/13878/ ; https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers ; https://webkit.org/blog/12945/meet-web-push/ . Library: https://github.com/web-push-libs/web-push . No Apple Developer paid membership/new paid push service is required by this implementation.

## Release and recovery gates

Production has not been modified by this branch, no real subscriptions/test sends or customer writes. Scheduled backup health was already 503 in production 1.1.6; owner status confirms last successful/off-site 2026-10-14T04:27:14.090Z and last failure 2026-10-15T13:31:29.304Z. Failure cause remains unverified (logs expose only Error); do not claim local archive creation succeeded or hide the alarm. Resolve/verify a current production recovery backup and capacity before this production migration/deploy. Do not reuse an old archive as a fresh current backup.

Migration: additive CREATE TABLE IF NOT EXISTS, replay safe; test data verifies existing shops/data unchanged. Before rollout take/verify a fresh snapshot with the existing private backup workflow. Rollback: revert code to 1c02eb1; do not drop push tables or restore over customer data. Before code rollback disable delivery by removing only private Web Push configuration after owner review and cancel queued jobs if needed through an audited maintenance action. Old subscriptions must not continue receiving update broadcasts while off. A code rollback leaves existing OS subscriptions registered but the old server has no push sender. Never rotate OAuth/session secrets for this feature.

## Verification

See PR for exact final commit/CI counts. Tests exercise provider validation, CSRF/capabilities, tenant ownership, disabled devices, live gate, retry/expiry/dedup, suspended shops, queue replay, worker background event/click, browser toggle/permission state, explicit Update/cart/draft safety. Worker/browser delivery tests are simulated, not actual APNs/FCM delivery. Dedicated Chrome fixture checks preserve catalogue/orders; no Google login or real phone permission is automated.

Final local validation: clean npm ci, 105/105 automated tests (0 skipped/failed), static 64 JavaScript/3 JSON, npm audit --omit=dev 0 vulnerabilities. Chrome fixture: 40 checks; mobile 320/390 and desktop 1440, iPhone user-agent Home Screen guidance only (not real iPhone delivery). New operational-table SQLite backup/restore integrity and repeat migration preserve legacy fixture products/orders and shops.
