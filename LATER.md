# Later — things the owner wants, waiting for money or time

Owner's list of work to do later. Newest first. When the owner says "go", do it and remove the line.

## 2026-11-08 — Best background removal (BiRefNet) — waiting for the $25 Render plan

- Today: Render compute is $7/month (0.5 CPU, 512 MB RAM), so "Remove background" uses the fast model
  (silueta). Most photos come out clean; background seen through closed loops (the table inside a pump's
  pipe loop) can stay.
- Ready in code since 1.1.229 (`lib/bg-remove.js`): with ≥1.8 GB RAM the server downloads BiRefNet-lite
  (224 MB, MIT) once into `DATA_DIR/models` and uses it by itself — every photo finishes with one tap,
  ~1 minute per photo on 1 CPU.
- To turn it on: Render → gearhub-industrial-1 → **Compute** → Edit → **$25/month, 1 CPU, 2 GB RAM**.
  Nothing else to change. Owner said the cost is too high for now (2026-11-08).
