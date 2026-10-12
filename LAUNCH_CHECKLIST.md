# Owner gates for a soft customer launch

The readiness review intentionally does not invent business policies, change bank
accounts, rotate passwords, alter customer/orders or delete the live database.
Apply the reviewed PR, verify CI, and complete the following gates before accepting
real customer payments.

## Customer-facing content

| Item | Review result | Owner action |
| --- | --- | --- |
| Privacy Policy | No published page/link in public source | Provide and approve text explaining actual data collection, receipts, storage and retention. |
| Terms & Conditions | Missing | Provide approved terms. |
| Shipping Policy | Missing | Provide coverage, fees, timelines and responsibilities. Checkout currently records zero delivery fee. |
| Return / Refund Policy | Missing | Specify eligibility and the actual manual refund process. Cancelling stock does not issue a refund. |
| Warranty Policy | Missing | Specify applicable supplier/product coverage and claims process. |
| Contact / Support | Footer exists | Verify the reference phone/email/address and 24/7 support claim; they were not verified as owner-controlled. |

No placeholder legal pages were published: blank or fabricated policies would be
misleading on a real storefront. Owner-supplied policy text is a launch blocker
under the requested review criteria, not a statement about a specific law.

## Inventory and payment

- Six currently active live products still contain the text “Initial sample stock
  and price”. Confirm real SKUs, prices, stock, availability, compatibility and
  product claims in Admin. This review does not remove or replace those rows.
- Live bank name, account name and account number fields are populated. This
  confirms presence only; verify ownership and payment instructions independently.
  Neither the values nor real customer/order records were copied into this report.
- Payment remains manual. Compare receipts and transaction references against the
  bank/wallet before marking paid. Review pending stock reservations promptly.
- If the existing admin password was ever six characters, rotate it through the
  owner-controlled reset flow. Existing hashes were not changed by this review.

## Render and deployment

- Keep one Node 22 process and one Render instance for SQLite. Set
  `WEB_CONCURRENCY=1`. Scaling horizontally requires a deliberate database design
  change; do not share one SQLite file between multiple services.
- Existing service has one instance and a 1 GB disk mounted at `/var/data/`.
  The live data filesystem reports about 1 GB capacity and ample free space.
  Keep the existing `DATA_DIR`, uploads and receipts on that disk. Do not repoint
  DATA_DIR to an empty location to bypass a validation failure.
- In Dashboard, change the current build command **`yarn`** to **`npm ci`** so
  production installs exactly the lockfile tested by CI. Start with `npm start`.
- Keep Render's health-check path `/api/health`. `/api/health/backups` and
  `/api/health/notifications` are alert endpoints, not instance restart triggers.
- Confirm NODE_ENV=production, a plain HTTPS PUBLIC_ORIGIN, an absolute DATA_DIR,
  a strong random SESSION_SECRET and writable/non-overlapping storage. Do not
  expose these values in logs, screenshots or commits. Startup and
  `npm run check:production` now reject detectable unsafe cases.
- The new workflow runs clean installs, static validation and tests for pushes
  and pull requests to main. Set the resulting check as a required branch check
  and select deployment only after checks pass where the Render setting allows.
  Current Render auto-deploy trigger is `commit`; CI alone is not a deployment gate.

## Recovery and monitoring

- Practice `npm run verify:restore -- /private/staging/gearhub-backup` on a received
  archive. The script reads a temporary copy and never changes the backup or live
  shop. Follow DEPLOYMENT.md for a stopped-service restore; preserve old database
  plus WAL/SHM together, never mix generations, and invalidate restored sessions
  and reset codes.
- Email recovery remains optional. When enabled, SMTP_USER, SMTP_APP_PASSWORD and
  PASSWORD_RESET_EMAIL must be configured. Keep BACKUP_EMAIL_ENABLED and
  ALERT_EMAIL_ENABLED only as explicitly authorized by the owner.
- Gmail archives over 18 MB fail safely; local archives remain and failure alerts
  are attempted. Check mailbox quota and Inbox/Spam and keep receipts private.
  Configure the retained S3/R2 support before email is outgrown.
- Alert state normally persists in SQLite. During database failure, a memory
  fallback sends/throttles alerts while the process is running; that fallback
  cannot persist across a restart if the database itself remains unavailable.
- **An independent external uptime monitor is required for whole-process/server
  outages.** Configure both destination and recovery alerts. Application timers
  cannot send while stopped; Render health checks are not a complete independent
  notification system. No paid monitoring service was added by this review.
- Run the manual purchase/cancellation/receipt/backup drill with controlled test
  orders on a staging/disposable environment. Do not modify real customer orders
  as part of that drill.
