// 1.1.291 owner: "User show" — the shop owner chooses what visitors of the shop see of every product
// (SKU, Part No, price, stock, description, and how many photos from the first). Saved in the shop's
// settings as visitorView. Hidden text and extra photos are left out of what visitors receive; price and
// stock stay in the data (the cart needs them) and are hidden on the page.
const FIELDS = ['sku', 'partNo', 'price', 'stock', 'description'];
const MAX_PHOTOS = 50;
function normalize(v) {
  const out = {};
  for (const f of FIELDS) out[f] = v?.[f] !== false;
  const n = Number(v?.photos);
  out.photos = Number.isSafeInteger(n) && n > 0 && n <= MAX_PHOTOS ? n : 0;
  return out;
}
const parse = value => { try { const r = JSON.parse(value || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; } };
// One platform_products row as a visitor may see it.
function forVisitor(p, view) {
  const v = normalize(view), d = parse(p.details), out = { ...p };
  if (!v.sku) out.sku = '';
  if (!v.partNo) delete d.partNo;
  if (!v.description) { out.description = ''; delete d.descriptionMy; }
  if (v.photos) {
    const ids = [...new Set([...(Array.isArray(d.imageIds) && d.imageIds.length ? d.imageIds : [p.image_id])].filter(Boolean))].slice(0, v.photos);
    if (Array.isArray(d.imageIds)) d.imageIds = ids;
    if (!ids.includes(out.image_id)) out.image_id = ids[0] || null;
  }
  out.details = JSON.stringify(d);
  return out;
}
// The same for GearHub's own store (products table: part_no, description_en/my, imageUrls).
function forVisitorMain(p, view) {
  const v = normalize(view), out = { ...p };
  if (!v.sku) out.sku = '';
  if (!v.partNo) out.part_no = '';
  if (!v.description) { out.description_en = ''; out.description_my = ''; }
  if (v.photos && Array.isArray(out.imageUrls)) out.imageUrls = out.imageUrls.slice(0, v.photos);
  return out;
}
// The fields a visitor's page hides (sent with the shop's config).
const hidden = view => { const v = normalize(view); return FIELDS.filter(f => !v[f]); };
module.exports = { FIELDS, MAX_PHOTOS, normalize, forVisitor, forVisitorMain, hidden };
