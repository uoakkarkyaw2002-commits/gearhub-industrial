// Pure helpers for the owner's "Manage Seller Shops" dashboard (no DOM access).
(() => {
  const DAY = 864e5,
    EXPIRING_DAYS = 14,
    ZONE = "Asia/Yangon";
  const daysLeft = (iso, now = Date.now()) =>
    iso ? Math.ceil((Date.parse(iso) - now) / DAY) : null;
  // Server limits.subscriptionState already accounts for suspension and the expiry date.
  function state(shop, now = Date.now()) {
    const s = shop.limits?.subscriptionState || shop.subscription_status;
    if (shop.status === "suspended" || s === "suspended") return "suspended";
    if (["expired", "inactive"].includes(s)) return "expired";
    if (s === "scheduled") return "scheduled";
    const left = daysLeft(shop.ends_at, now);
    return left !== null && left <= EXPIRING_DAYS ? "expiring" : "active";
  }
  const yangonDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: ZONE }) : "";
  // Date inputs are Myanmar calendar days: start at 00:00, expire at the end of the day.
  const fromYangonDate = (day, endOfDay) =>
    day ? `${day}T${endOfDay ? "23:59:59" : "00:00:00"}+06:30` : null;
  function expiryLabel(iso, now = Date.now()) {
    const left = daysLeft(iso, now);
    if (left === null) return "No expiry";
    if (left < 0) return `Expired ${-left} day${left === -1 ? "" : "s"} ago`;
    if (left === 0) return "Expires today";
    return `${left} day${left === 1 ? "" : "s"} left`;
  }
  const usagePercent = (limits) =>
    Math.min(100, Math.round((limits.usedBytes / Math.max(limits.storageLimit, 1)) * 100));
  function matches(row, view) {
    const q = view.q.trim().toLowerCase();
    if (q && !row.text.toLowerCase().includes(q)) return false;
    if (view.plan !== "all" && row.plan !== view.plan) return false;
    const wanted = view.status !== "all" ? view.status : view.tab;
    if (["all", "pending", "rejected"].includes(wanted)) return true;
    if (wanted === "active") return ["active", "expiring"].includes(row.state);
    return row.state === wanted;
  }
  const api = { EXPIRING_DAYS, daysLeft, state, yangonDate, fromYangonDate, expiryLabel, usagePercent, matches };
  if (typeof module === "object" && module.exports) module.exports = api;
  else window.GearHubSellerManager = api;
})();
