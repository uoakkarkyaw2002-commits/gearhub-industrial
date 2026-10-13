const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
test("update saves non-password drafts, retains cart, and blocks pending orders/files", async () => {
  const drafts = new Map(),
    local = new Map([["gh-cart", '{"7":2}']]);
  let reloads = 0;
  const field = {
      name: "customer",
      id: "customer",
      type: "text",
      value: "Unsaved fixture",
      form: { id: "checkout" },
    },
    password = {
      name: "password",
      type: "password",
      value: "Must never persist",
    },
    file = { type: "file", files: [] };
  const form = { querySelectorAll: () => [field, password, file] };
  const document = {
    querySelectorAll: (q) =>
      q === "input,textarea,select"
        ? [field, password, file]
        : q === "input[type=file]"
          ? [file]
          : [],
    getElementById: (id) => (id === "checkout" ? form : null),
  };
  const store = (map) => ({
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  });
  const window = { addEventListener() {}, __gearhubCheckoutPending: false };
  const context = {
    window,
    document,
    navigator: {},
    sessionStorage: store(drafts),
    localStorage: store(local),
    location: { pathname: "/shops/fixture", reload: () => reloads++ },
    setInterval() {},
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(
    fs.readFileSync(require.resolve("../public/updates.js"), "utf8"),
    context,
  );
  assert.equal(await window.GearHubUpdates.apply(), true);
  assert.equal(reloads, 1);
  assert.equal(local.get("gh-cart"), '{"7":2}');
  assert.ok(![...drafts.values()].join().includes("Must never persist"));
  field.value = "";
  window.GearHubUpdates.restore();
  assert.equal(field.value, "Unsaved fixture");
  window.__gearhubCheckoutPending = true;
  assert.equal(await window.GearHubUpdates.apply(), false);
  assert.equal(reloads, 1);
  window.__gearhubCheckoutPending = false;
  window.__gearhubPlatformPending=true;
  assert.equal(await window.GearHubUpdates.apply(),false);
  assert.equal(reloads,1);
  window.__gearhubPlatformPending=false;
  file.files = [{}];
  assert.equal(window.GearHubUpdates.blocked(), true);
});
