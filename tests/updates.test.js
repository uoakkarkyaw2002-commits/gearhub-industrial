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

test("an update with a waiting new version always finishes (no stop at 80%)", async () => {
  const store = (map) => ({ getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) });
  const run = async (switches) => {
    let reloads = 0;
    const handlers = {}, swHandlers = {}, posted = [];
    const registration = { waiting: { postMessage: (m) => posted.push(m.type) }, update: async () => {}, addEventListener() {} };
    const window = { addEventListener: (type, fn) => { handlers[type] = fn; } };
    const serviceWorker = {
      register: async () => registration,
      addEventListener: (type, fn) => { (swHandlers[type] ||= []).push(fn); },
    };
    const context = {
      window, document: { querySelectorAll: () => [], getElementById: () => null }, navigator: { serviceWorker },
      isSecureContext: true, sessionStorage: store(new Map()), localStorage: store(new Map()),
      location: { pathname: "/shops/fixture/", reload: () => reloads++ },
      fetch: async () => ({ ok: true, json: async () => ({ version: "9.9.9" }) }),
      setInterval() {}, setTimeout, clearTimeout,
    };
    vm.runInNewContext(fs.readFileSync(require.resolve("../public/updates.js"), "utf8"), context);
    await handlers.load(); // finds the waiting version and installs it by itself (autoApply)
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(posted, ["APPLY_UPDATE"]);
    assert.equal(reloads, 0, "still waiting for the switch");
    // The new worker takes control: every controllerchange listener runs, like the browser does.
    if (switches) for (const fn of swHandlers.controllerchange || []) await fn();
    else await new Promise((resolve) => setTimeout(resolve, 4200));
    return reloads;
  };
  assert.equal(await run(true), 1, "reloads once when the new version takes over");
  assert.equal(await run(false), 1, "reloads anyway when the switch never comes");
});
