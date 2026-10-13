# Google OAuth — development setup, step by step

No merge/deploy/migration is authorized by this guide. Real Google credentials
are not created automatically. The localhost demo remains a mock fixture.

1. Open https://console.cloud.google.com/ using the designated platform-owner
   Google account. Create/select a separate **development** project.
2. Open **Google Auth Platform → Branding** (Get started if prompted). Set the
   GearHub development app name, owner-controlled support/developer email.
   Supply only actual owner-approved branding/domain/privacy information.
3. Under **Audience**, choose External for independent Gmail sellers and keep
   the development/testing configuration. Add designated owner/seller test
   accounts where the Console requests test users. Basic identity scopes have
   different testing/verification rules from sensitive Google API scopes.
4. Under **Data Access**, request only `openid`, `email`, `profile`. GearHub does
   not require Gmail inbox/Drive/Calendar API permissions.
5. Under **Clients → Create client**, choose **Web application**. Name it
   `GearHub development`. Register this exact authorized redirect URI:
   `http://localhost:3000/api/platform/auth/callback`.
   Use `PUBLIC_ORIGIN=http://localhost:3000` locally; do not alternate localhost
   and 127.0.0.1 unless separately registered and configured.
6. Copy the Client ID and keep the Client Secret securely when first displayed.
   Put them only into a private, Git-ignored staging `.env`:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   PUBLIC_ORIGIN=http://localhost:3000
   PLATFORM_ENABLED=true
   PLATFORM_OWNER_EMAIL=<the designated owner Gmail>
   GOOGLE_CLIENT_ID=<web client ID>
   GOOGLE_CLIENT_SECRET=<private client secret>
   DATA_DIR=<absolute empty disposable staging directory>
   SESSION_SECRET=<new random staging secret, at least 32 bytes>
   BACKUP_EMAIL_ENABLED=false
   ALERT_EMAIL_ENABLED=false
   BACKUP_S3_BUCKET=
   ```

   Do not copy production secrets, point to the live disk, or commit/paste the
   secret/client JSON. If using a disposable restored copy, invalidate restored
   sessions/reset codes on that copy only before startup.
7. With Node 22, run `npm ci`, then `npm start`. Open
   `http://localhost:3000/platform.html` and use Continue with Google.
   The designated verified owner should see the Owner Dashboard. A separate
   seller account should see an application, not an automatically created shop.
8. Approve a seller, verify starts/ends = approval plus two calendar months,
   test shop isolation and owner-only extension with separate browser profiles.
   This real Google round-trip remains an owner/staging check until credentials
   are configured; fixture tests do not substitute for it.
9. Production would require a separately reviewed client with callback
   `https://gearhub-industrial-1.onrender.com/api/platform/auth/callback`, actual
   approved consent branding/policies and explicit deployment/migration approval.
   Do not switch the production feature flag now.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Google consent configuration](https://developers.google.com/workspace/guides/configure-oauth-consent).
