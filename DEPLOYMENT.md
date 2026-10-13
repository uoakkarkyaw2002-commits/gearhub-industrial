# GearHub on Render: persistence, recovery and launch

This change targets the existing Render Node service, not a new service. SQLite
in WAL mode is suitable for a small shop on **one Node instance with a persistent
disk**. It must not use an ephemeral disk, a serverless filesystem or multiple
instances sharing one database file. If the shop later needs multiple instances,
migrate transactions to managed Postgres and uploaded media to private object
storage before scaling.

## Before deploying

1. Download `/api/admin/backup` while logged into the current admin. Save the
   archive off-site and confirm that it contains `gearhub.sqlite`, `uploads/`
   and `receipts/`. Keep the existing persistent disk and its mount path.
2. Confirm `DATA_DIR` still points to that disk (for example `/var/data`). Do not
   change it to an empty directory: the service would open a different database.
   Uploads default to `DATA_DIR/uploads`; preserve `UPLOAD_DIR` if already used.
3. Set `NODE_ENV=production`, `PUBLIC_ORIGIN=https://gearhub-industrial-1.onrender.com`
   and a random `SESSION_SECRET` of at least 32 characters. Do not paste secrets
   into a pull request or commit. `ADMIN_PASSWORD` is only for initial account
   creation; it does not overwrite the existing account. New passwords require
   16 characters and a maximum of 72 UTF-8 bytes. Existing passwords still work.
4. Set Render's build command to `npm ci` and start command to `npm start` with
   Node 22. Keep the service at one instance. Set health-check path `/api/health`.
   A persistent disk means deployments can briefly interrupt service.
5. Configure off-site backups below; run `npm run check:production` in the service
   environment. The code can verify configuration and free space, but cannot
   prove that an arbitrary `DATA_DIR` is actually mounted on a persistent disk.
6. Deploy the reviewed commit. Existing admin sessions must sign in again after
   the authentication-version migration. The storefront remains readable.
7. Confirm `/api/health` returns 200, log in, create and cancel a test order,
   verify stock, run a backup, and perform the restore drill before accepting
   real customer orders. Check actual catalog prices, contact/payment details
   and shipping/returns policy. Production no longer inserts demo inventory
   unless `SEED_DEMO=true` is explicitly configured.

## Automatic backup and off-site copy

A complete online SQLite backup plus product images and private receipts runs
at startup when a backup is due, then every `BACKUP_INTERVAL_HOURS` (default 24).
Local archives go to `DATA_DIR/backups`, permissions 0600. `BACKUP_RETENTION`
(default 7) bounds local copies even when the remote upload fails. Local copies
alone do not protect against losing the shop's disk or account.

Set these private environment variables for an S3-compatible bucket:

- `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION` (`auto` for R2; an AWS region for S3).
- `BACKUP_S3_ENDPOINT` for an S3-compatible provider; leave unset for AWS S3.
- `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, or an AWS role/default
  credential provider. Grant access only to the dedicated backup prefix.
- `BACKUP_S3_PREFIX=gearhub/`. Set `BACKUP_S3_FORCE_PATH_STYLE=true` only when
  required by the provider.
- Optionally `BACKUP_S3_ENCRYPTION=AES256` or `aws:kms` where supported. Enable
  bucket encryption, private access and an appropriate lifecycle/retention
  policy in the provider. Archives contain customer addresses, payment receipts,
  password hashes and sessions; never use a public bucket.

The admin **Backup & monitoring** panel reports the last success, off-site
success and failure, and can run or download a full backup. The SDK uploads only
to the configured bucket; this change does not provision a bucket or credentials.
A failed remote upload leaves a complete local archive and records the failure.
Off-site backups were tested with a mock S3 endpoint; verify your actual provider
with **Run backup now** and confirm the object exists in its console.

## Restore drill

1. Use a trusted GearHub archive. List contents with `tar -tzf archive.tar.gz`.
   Extract into an empty, private staging directory with `umask 077`, never over
   a running database. Verify before opening the staged database with another
   SQLite tool:

   ```sh
   npm run verify:restore -- /absolute/staging/gearhub-backup
   ```

   This script checks integrity, foreign keys, required tables and referenced
   product/site images and private receipts. It reads a private temporary copy
   of the database so it cannot modify the staged database or leave WAL/SHM there.
   It prints counts only and reports sessions/reset codes needing invalidation.
   It rejects sidecars already present in staging. It does not restore anything.
2. For an actual restore, stop the single shop process and verify it has exited.
   Preserve its current database **together with its WAL/SHM files**, uploads and
   receipts in a separate recovery location. Prefer downloading a fresh online
   backup before stopping. Do not discard a live WAL, because it can contain
   committed orders not yet copied into the database file.
3. Replace the stopped service's database/media with the verified staged files,
   preserving owners/permissions and configured paths. Keep the old WAL/SHM in
   the separate recovery location; do not leave old sidecars beside the restored
   database. Never combine two database generations.
4. In the **restored database while the service remains stopped**, invalidate old
   authentication material:

   ```sql
   DELETE FROM sessions;
   DELETE FROM password_reset_codes;
   ```

   Do not run these statements against the active production database as part
   of a verification-only drill. A restored backup can contain an older password
   hash: after restart, use the owner-controlled recovery flow to rotate it.
5. Restart with the original durable paths, check health and admin login,
   validate order totals, stock and images, and take a new off-site backup.
   Practice the entire procedure with a disposable copy before customer launch.

Disk snapshots are not a substitute for a verified database backup. The automated
archive uses SQLite's online backup API, including committed WAL data.

## Monitoring

- `/api/health` checks a database query and at least 100 MB of available disk
  space. Use this endpoint for Render's instance health check.
- `/api/health/backups` returns 503 for a backup failure, no successful backup,
  or a backup/off-site copy older than twice the configured interval. Monitor
  this endpoint for alerts; do not use it for Render's instance health check,
  because an off-site outage must not restart the storefront.
- Configure an external uptime monitor to check the live health URL and notify
  your operations contact. Render's health check handles unhealthy instances;
  it does not replace notification routing or off-site backups.
- Logs include `backup_success`, `backup_failure` and failed `http_response`
  events with a request ID and route. `REQUEST_LOGS=true` logs successful requests
  too. Request bodies, passwords and customer addresses are not logged by this
  middleware. Set alerts for backup failures, repeated 5xx responses and low disk.
- Check the backup panel after deployment and restore drills. Local archives,
  active uploads and receipts consume the disk; archive customer data according
  to your retention policy. Receipts are never exposed under public `/uploads`.

## Changed behavior to review

- Admin mutations, including login/reset and multipart uploads, require a
  same-origin request and a session-bound CSRF token. The admin page fetches and
  rotates it automatically. Programmatic clients must fetch `/api/admin/csrf`,
  retain the session cookie and send `X-CSRF-Token`.
- Password reset codes are HMAC-protected, expire after 10 minutes, have eight
  failed attempts, are consumed atomically and revoke all old admin sessions.
  Requests have rate limits and a one-minute global resend cooldown. The
  verification code remains six digits; the new password does not.
- Checkout sends an idempotency key so a retry after a dropped response returns
  the same order rather than reserving stock again. A changed payload with the
  same key returns 409. Older clients without a key retain their existing API.
- Cancelling an unshipped order restores stock once. Reopening a cancelled order
  requires all products to be active and sufficiently stocked. Processing,
  shipping and completion require paid status. Shipped/completed orders cannot
  be cancelled back into available stock; handle returns/refunds separately.
- Stock edits require `expectedStock` from the product as originally loaded;
  a stale admin form gets 409 instead of overwriting a customer purchase.
- Existing CSP confines scripts to this origin; translated storefront content
  continues to be escaped, allowing only line breaks. Inline styles are retained
  for the existing appearance editor. This is hardening, not a claim of a full
  security audit, automatic refunds or legal readiness.

References: [Render disks](https://render.com/docs/disks),
[Render free services](https://render.com/docs/free),
[OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html),
[OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Recovery Gmail backups and alerts

With the owner's explicit consent, set `BACKUP_EMAIL_ENABLED=true` and
`ALERT_EMAIL_ENABLED=true`. Delivery uses the existing `SMTP_USER`,
`SMTP_APP_PASSWORD` and `PASSWORD_RESET_EMAIL`; no additional storage account
is needed for the current email-size-compatible shop. SMTP uses TLS on port 465.
The first activation sends a monitoring-enabled message and a complete archive
when no off-site copy exists. Successful daily backups continue every 24 hours;
failed backups retry hourly. Alert events are throttled for one hour and the
throttle survives service restarts.

The Gmail copy contains the database, media and private receipts. It is accepted
as an off-site copy only when SMTP confirms the intended recipient accepted the
message. Acceptance does not guarantee inbox placement: check Spam and perform a
restore drill from a received attachment. Archives above 18 MB are not emailed;
the local copy remains and a failure alert is attempted. Use S3/R2 when archives
outgrow email. The mailbox's retention and storage quota need management.

Alerts cover backup failure, internal server errors, database/disk checks and
low free disk space. The app checks storage/database every five minutes.
`/api/health/notifications` reports configured/enabled flags and health without
exposing credentials or the recipient. When the process is entirely stopped it
cannot send SMTP alerts; Render's service-health/deploy notifications remain the
platform-level failure mechanism. An independent uptime monitor can be added for
full external outage coverage.

## Backup manifest version 2

Scheduled and manual-download archives both include `manifest.json` with version,
createdAt, components, database filename, media directory names and SHA-256 of
the snapshot. `verify:restore` validates this checksum before database inspection.
Legacy version 1 and manifest-less archives remain supported after integrity and
media checks; missing metadata is not permission to bypass those checks. The
manifest is not signed and cannot establish that an untrusted archive is safe.
See LAUNCH_REMAINING.md for pending Render settings, external monitoring and
owner-approved policy gates.
