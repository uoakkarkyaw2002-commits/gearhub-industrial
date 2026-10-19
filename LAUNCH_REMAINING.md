# Remaining launch gates — 13 October 2026

## Production values — do not expose secrets

Existing Render service: gearhub-industrial-1, srv-db4q992jnfac73858fu0, owner-confirmed My Workspace.

| Setting | Exact required value | Verification |
| --- | --- | --- |
| DATA_DIR | /var/data | Owner must confirm actual env; disk mount /var/data/ exists (1 GB). Do not repoint an existing data subdirectory without inspecting/migrating safely. |
| NODE_ENV | production | Owner confirmation required; startup performs production validation when enabled. |
| PUBLIC_ORIGIN | https://gearhub-industrial-1.onrender.com | No path/query/credentials. Owner env confirmation required. |
| SESSION_SECRET | Existing strong private random secret, >=32 bytes | Do not print or rotate; check privately. Code rejects obvious weak values. |
| WEB_CONCURRENCY | 1 | Set in prior authorized deployment; one Render instance confirmed. |
| SEED_DEMO | false | Set previously; existing sample products still need owner review. |
| Runtime | Node 22 | Prior deploy logs confirmed 22.23.3; package and CI use 22. |
| Health path | /api/health | Confirmed in service inspection. |
| Start command | npm start (existing npm run start equivalent) | Confirmed existing. |
| Build command | npm ci | Current yarn; manual change required. |
| Auto-Deploy | After CI Checks Pass | Current On Commit; manual change required. |

The connected Render tools expose env updates but not existing-service build or auto-deploy setting updates. No secrets were retrieved/changed in this continuation. Env values not visible through service metadata are not claimed verified. `npm run check:production` can validate private config without printing values; passing it does not prove a mount or owner bank verification.

## Exact deployment and branch gate steps

1. Open https://dashboard.render.com/web/srv-db4q992jnfac73858fu0/settings in My Workspace.
2. In Build & Deploy, edit Build Command to `npm ci`; save. Keep start command and persistent disk/data path.
3. Set Auto-Deploy to **After CI Checks Pass**; save. Confirm the service remains linked to main. Render will wait for GitHub checks and will not deploy a commit with failed checks or no detected checks. It treats success/neutral/skipped as passed, so keep this unconditional test job (no skip filters).
4. GitHub repo → Settings → Branches → Add branch protection rule for `main` (or equivalent active branch ruleset). Enable **Require a pull request before merging**, **Require status checks to pass before merging**, select **node22** from Production readiness, and **Require branches to be up to date before merging**. Prevent bypasses/direct pushes as appropriate for the owner's account. Save and verify a failing check blocks merge. If the repo/account plan does not offer required-check enforcement, keep Render's checks gate and use only reviewed green PRs; document the limitation.
5. Confirm the next main push has a successful Production readiness run and Render starts only after it completes. Do not use manual deploy hooks to bypass the gate during routine releases.

Existing workflow is pinned and runs push and pull_request to main with Node 22: npm ci, npm run check, npm test, no production secrets. Branch protection cannot be updated with the connected GitHub tools.

Sources: [Render deployment settings](https://render.com/docs/deploys).

## External monitor — setup only, not created

Recommended: UptimeRobot Free HTTP(s) monitor (5-minute checks, suitable for a small shop). No account/service was created.

1. Sign up or log in at https://uptimerobot.com using an owner-controlled email and choose Free.
2. Click **Add New Monitor**, choose **HTTP(s)**.
3. URL: `https://gearhub-industrial-1.onrender.com/api/health`; friendly name: `GearHub production health`.
4. Set interval to **5 minutes**, GET method if selectable, and keep TLS verification enabled. Do not enter admin credentials or secrets.
5. Add/verify the owner recovery email as a notification contact, attach it to this monitor, and enable DOWN and recovery/UP notifications where selectable. Do not select paid SMS/voice options.
6. Create Monitor and confirm it reports UP. Use the notification contact's test feature if available, confirm receipt in Inbox/Spam, and verify notification routing without stopping the live shop. Monitor setup is incomplete until alert delivery is confirmed.

Sources: [UptimeRobot setup](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide), [Free plan](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan).

## Owner business inputs (all need confirmation)

- Actual product catalogue, SKU/compatibility details, real stock quantities and prices.
- Payment/bank account ownership and accurate manual-payment instructions.
- Real contact phone, owner-controlled email and physical/service address; actual support hours.
- Shipping coverage, fees and expected delivery timelines.
- Returns/refund eligibility and actual manual refund procedure.
- Product/supplier warranty coverage and claims procedure.
- Privacy details: actual data use/sharing, retention, receipt protection, recovery copies and contact for requests.
- Owner-approved Terms, Privacy, Shipping, Returns/Refund and Warranty policy text.

## Policy structures and backup metadata

Owner-approved policies are live at `/policies.html` (Terms, Privacy, Delivery & returns, Seller rules; Myanmar + English; GearHub free for now). The old `/policies/*.html` placeholder URLs now redirect there. Delivery, returns and warranty are set by each shop.

Both scheduled and admin-download archives now use a shared manifest writer. Version 2 includes createdAt, components, database filename, uploads/receipts directory names and SHA-256 of the completed database snapshot. It does not list customer data or receipt filenames. Restore verification checks v2 database checksum, accepts old v1 metadata and accepts manifest-less archives after existing integrity/media validation. Checksum is corruption detection, not a signature or proof of trust. Media is still checked for presence; not all media has cryptographic hashes.

Current code improvements are in a review PR until merged/deployed. Existing archives are untouched. Soft launch is blocked until persistent storage/private env settings, CI/deployment gate, working external alerts and owner business/payment/contact verification are confirmed, and policies approved. Prior real restore succeeded.
