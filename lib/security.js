const crypto = require('node:crypto');
const MIN_PASSWORD_LENGTH = 16;
function passwordError(password) {
 if (typeof password !== 'string' || [...password].length < MIN_PASSWORD_LENGTH) return 'Use a password or passphrase with at least 16 characters.';
 if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be at most 72 UTF-8 bytes (bcrypt limit).';
 if (password.includes('\0')) return 'Password cannot contain a null character.';
 return '';
}
function csrfToken(req) {
 if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
 return req.session.csrfToken;
}
function validToken(expected, actual) {
 return typeof expected === 'string' && typeof actual === 'string' && /^[a-f0-9]{64}$/.test(actual) && expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
function originGuard(publicOrigin) {
 return (req, res, next) => {
  if (!['POST','PATCH','PUT','DELETE'].includes(req.method)) return next();
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({error:'Cross-site request blocked.'});
  const source = req.get('origin') || req.get('referer');
  try {
   const expected = publicOrigin || `${req.protocol}://${req.get('host')}`;
   if (!source || new URL(source).origin !== expected) return res.status(403).json({error:'Same-origin request required.'});
  } catch { return res.status(403).json({error:'Invalid request origin.'}); }
  next();
 };
}
module.exports = {passwordError, csrfToken, validToken, originGuard};
