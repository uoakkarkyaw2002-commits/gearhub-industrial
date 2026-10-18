// One promotion rule for GearHub and every seller shop: a promotion price
// counts only when it is a whole number above 0 and below the normal price.
function promotionPrice(price, promo) {
  if (promo === null || promo === undefined || promo === "") return null;
  const value = Number(promo), original = Number(price);
  return Number.isSafeInteger(value) && value > 0 && Number.isSafeInteger(original) && value < original ? value : null;
}
const salePrice = (price, promo) => promotionPrice(price, promo) ?? Number(price);
module.exports = { promotionPrice, salePrice };
