// Local fixtures only: no real Google credentials, no production data or email.
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { originGuard, pageSecurity } = require("../lib/security");
const { installTenantApps } = require("../lib/tenant-install");
const { createPlatform } = require("../lib/platform");
const model = require("../lib/platform-model");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gearhub-platform-demo-"));
const db = new Database(path.join(root, "gearhub.sqlite"));
db.pragma("foreign_keys=ON");
const app = express(),
  port = 8870,
  origin = "http://127.0.0.1:" + port;
app.use(pageSecurity({localHttp:true}));
app.use(express.json());
app.use(
  session({
    secret: require("node:crypto").randomBytes(48).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  }),
);
app.use("/api", originGuard(origin));
const identity = async (code, nonce) => {
  if (!["owner", "alice", "bob"].includes(code))
    throw Error("Demo fixture only.");
  return {
    sub: "demo-" + code,
    email: code + "@gmail.com",
    name: code,
    email_verified: true,
    nonce,
  };
};
identity.authorizationUrl = (state) =>
  "/demo/choose?state=" + encodeURIComponent(state);
app.use(
  "/api/platform",
  createPlatform({
    db,
    dataDir: root,
    publicOrigin: origin,
    env: { PLATFORM_OWNER_EMAIL: "owner@gmail.com" },
    identityProvider: identity,
  }),
);
app.get("/demo/choose", (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.query.state || "")) return res.sendStatus(400);
  res.send(
    "<h1>LOCAL FIXTURE — not real Google login</h1>" +
      ["owner", "alice", "bob"]
        .map(
          (n) =>
            '<p><a href="/api/platform/auth/callback?code=' +
            n +
            "&state=" +
            req.query.state +
            '">' +
            n +
            "</a></p>",
        )
        .join(""),
  );
});
app.get("/api/app-release", (_req, res) =>
  res.json({ ...model.release(db), platformEnabled: true }),
);
installTenantApps(app, { db, dataDir: root, publicDir: path.join(__dirname, "..", "public"), publicOrigin: origin });
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.redirect("/platform.html"));
app.use(express.static(path.join(__dirname, "..", "public")));
const server = app.listen(port, "127.0.0.1", () =>
  console.log(
    "LOCAL FIXTURE dashboard: " +
      origin +
      "/platform.html — owner/alice/bob, temporary data only.",
  ),
);
function stop() {
  server.close(() => {
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
    process.exit(0);
  });
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
