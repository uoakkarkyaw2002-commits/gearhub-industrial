// Shared by the GearHub store and every seller shop: large photos are served as
// a smaller WebP copy (max 1600px) made once next to the original and reused.
// Small images, other formats and anything sharp cannot read are left as is.
const fs = require("node:fs");
const crypto = require("node:crypto");
const sharp = require("sharp");

const MIN_BYTES = 200 * 1024;
const OPTIMIZABLE = /^image\/(jpeg|png|webp)$/;
const pending = new Map();

const variantPath = original => original + ".opt.webp";

async function optimizedImage(original, { bytes, mime }) {
  if (bytes < MIN_BYTES || !OPTIMIZABLE.test(mime)) return null;
  const variant = variantPath(original);
  if (fs.existsSync(variant)) return variant;
  if (!pending.has(variant)) {
    const temp = variant + "." + crypto.randomUUID() + ".tmp";
    pending.set(variant, sharp(original, { limitInputPixels: 40000000, animated: false })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(temp)
      .then(info => {
        if (info.size >= bytes) { fs.rmSync(temp, { force: true }); return null; }
        fs.renameSync(temp, variant);
        return variant;
      })
      .catch(() => { fs.rmSync(temp, { force: true }); return null; })
      .finally(() => pending.delete(variant)));
  }
  return pending.get(variant);
}

// Uploaded photos get a random name and are never overwritten, so they can be cached for a year.
const IMMUTABLE = "public, max-age=31536000, immutable";

module.exports = { optimizedImage, variantPath, IMMUTABLE };
