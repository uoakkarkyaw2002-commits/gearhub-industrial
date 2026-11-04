# Initial confirmed seller build

`1.1.287.tar.gz` is the tracked `public/` directory from commit
`7997fef` (the live `/api/app-release` reported 1.1.287 when this feature was implemented).
It was created with:

```
git archive --format=tar.gz --output=release-seed/1.1.287.tar.gz 7997fef public
```

SHA-256: `387385b38963c1d657be7881c9c0f282fc2c5adbfa661373ddf0d7cc78545e71`.

This trusted bootstrap archive is required only when `platform_meta['shop-release']`
does not yet exist. It lets the first deployment of the confirmation feature keep
seller storefronts and admin pages on their existing build. Thereafter, each deployed
frontend is saved under `DATA_DIR/app-builds/<version>/`, and the confirmed version
is durable SQLite metadata. Keep this directory in backups; do not delete it while
pages from those builds may still be open.

On deploy, GearHub uses the deployed build. Seller HTML, scripts, styles, lazy-loaded
assets and service workers use the confirmed build, including for fresh visitors.
GearHub Settings exposes **Confirm update** only to the authenticated GearHub owner
(Google owner or GearHub admin login). The existing owner console release form uses
the same confirmation. Confirmation switches all sellers' next requests together;
open pages check once a minute and wait for active edits, files and checkout to finish.
Never reuse a version number for different app files.

This gates the **frontend**. The Node server, APIs and database still change at Render
deployment time and must remain compatible with confirmed frontends. An attached
Render disk still requires a service interruption during deployment. Eliminating that
interruption requires an architecture without that service-attached database/disk;
the confirmation button does not provide backend isolation or zero downtime.
