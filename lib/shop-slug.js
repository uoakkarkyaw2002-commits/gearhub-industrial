// URL allocation runs synchronously with the SQLite write; no async gap exists.
function allocateSlug(db, name) {
  let base=String(name||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,35);
  if(base.length<3||['gearhub','admin','api','platform'].includes(base))base='shop';
  const taken=slug=>db.prepare('SELECT 1 FROM platform_shops WHERE slug=? UNION ALL SELECT 1 FROM platform_applications WHERE slug=? AND status IN (\'pending\',\'approved\') LIMIT 1').get(slug,slug);
  let slug=base,n=2;while(taken(slug))slug=base+'-'+n++;
  return slug;
}
module.exports={allocateSlug};
