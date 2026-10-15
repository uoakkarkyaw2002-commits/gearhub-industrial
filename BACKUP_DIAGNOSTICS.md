# Backup failure diagnostics

Review-only change; production has not been changed. The current production backup health failure is unresolved. Existing generic Error logs do not prove the cause.

Each new attempt records its stage, an allowlisted reason code, whether a complete local archive was created, and its byte count. The authenticated root operations panel displays the result; runtime logs retain the same sanitized fields. Raw exception messages, credentials, paths, endpoints, and customer data are excluded. Unknown error codes become BACKUP_FAILED. Attempt details are process-local and reset on restart; existing durable success/failure timestamps remain unchanged.

BACKUP_EMAIL_TOO_LARGE identifies the existing 18 MB email cap; it does not raise that cap. S3 delivery, retention and archive failures remain distinct stages. Failed off-site delivery remains a failed backup health check even when a local archive exists.

No new database columns, scheduling changes, billing, automatic recovery, or archive deletion behavior. Rollback is a code rollback to the prior commit, without database restore. Before any production deployment, obtain a current verified recovery archive and release approval. After deployment, inspect the next attempt in Admin → Backup/Operations or sanitized Render logs; resolve the identified failure and verify off-site success plus backup health 200 before announcing releases.
