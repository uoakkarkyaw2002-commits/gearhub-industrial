# Shop Home Screen identity — release 1.1.4

## Cause and change

The shared storefront HTML linked the root GearHub manifest/Apple icon. Runtime shop branding did not replace the manifest identity, and the worker could fall back to the root shell for an offline shop navigation. Shop installs now get public server-rendered HTML metadata and a unique manifest derived solely from the requested URL, never the logged-in account.

- Canonical shop URL ends in `/`: `/shops/<slug>/`; the old URL redirects safely.
- Manifest `id`, `start_url`, `scope` are that exact shop prefix; root GearHub identity remains `/`.
- Server HTML includes shop title, Apple app title, scoped manifest, canonical URL and PNG Apple icon before JavaScript runs.
- Public 180/192/512px PNGs use this shop's app icon, then its logo, then a neutral storefront icon. Foreign-tenant files, symlinks, unsafe filenames and private receipts cannot be selected. Sharp limits decoded image pixels and strips metadata when producing square opaque PNGs. Derived icons are not persisted and do not add stored quota usage; the original upload remains counted.
- Runtime storefront settings preserve the server Apple icon. Install instructions/settings use the URL-selected shop name. No automatic navigation to a shop based on Google account.
- Offline HTML lookup is exact-URL and tenant scoped; missing tenant shell returns an offline message instead of GearHub or another shop. Offline save excludes admin pages, root HTML and other shops for a tenant client. The existing shared update activation/draft/cart behavior is unchanged. Shared worker cache generation is v50 for 1.1.4.

## Evidence

Owner supplied `/shops/psm-test-shop`; unauthenticated production store API confirms its current name/brand is POLESTAR, logo configured, separate app icon not configured. The current production HTML still has root metadata until this release is approved/deployed.

Local Node22: 77/77 tests, 0 failures/skips; static validation 54 JavaScript / 3 JSON; clean npm ci; npm audit 0 vulnerabilities. New tests cover A/B/root identity, server head, escaped names, correct PNG size/type, foreign icon rejection, own-logo fallback, neutral fallback, disabled shops, offline navigation isolation and offline save URL filtering. Browser checks against a disposable local fixture: server-selected name/title and Apple icon preserved after JS; desktop/mobile screenshots reviewed. No customer data or real OAuth session used.

Chrome could not create managed contexts through the current CDP endpoint, so the additional fixture screenshots used a fresh test tab and direct CDP. This is not a native iPhone Add to Home Screen sheet test. That final device check remains unverified.

## Release and rollback

No schema/data migration, environment changes or production data writes. Existing shop/admin URLs remain valid; existing GearHub install identity stays unchanged. Merge/deploy requires approval for this PR. Normal Render build installs the pinned Sharp dependency on Node22. If deployment fails, retain the current running version; if a regression appears, redeploy the previous main commit 2c944d34f35010e86522ea2e5f8fbe87605c73a0. No database restore is needed for this change. Do not run a destructive restore.

After deploy, anonymously verify canonical response, HTML head, manifest, all PNG sizes and root identity; then open the POLESTAR canonical URL in iPhone Safari and inspect a fresh Add to Home Screen sheet before adding. Existing GearHub-installed shortcuts have the root identity; they cannot be assumed to become POLESTAR when logging in. Add a separate shop shortcut first and confirm its launch URL before optionally removing an unwanted old shortcut. Do not clear all website data (cart/drafts may be lost).

POLESTAR canonical install URL after deploy: https://gearhub-industrial-1.onrender.com/shops/psm-test-shop/

Primary platform references:
- Apple, Configuring Web Applications: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- WebKit, Web Push for Web Apps on iOS and iPadOS (Apple touch icon precedence, manifest ID): https://webkit.org/blog/13878/
- web.dev, Web app manifest (same-origin identities, start URL and scope): https://web.dev/learn/pwa/web-app-manifest
