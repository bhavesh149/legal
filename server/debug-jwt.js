/**
 * Run this to debug JWT verification:
 *   node debug-jwt.js <token>
 *
 * Get the token from browser DevTools → Application → Cookies
 * Look for a cookie named "sb-aejbftdvaeksmkocbjfp-auth-token" or similar.
 * The value is a JSON object – the access_token is inside it.
 *
 * Or from DevTools console:
 *   (await fetch('/api/auth-check')).text()  -- won't work
 *
 * Easiest: Network tab → pick any failing request → Request Headers → Authorization → copy token after "Bearer "
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.SUPABASE_JWT_SECRET;
const token = process.argv[2];

if (!token) {
  console.error('Usage: node debug-jwt.js <supabase_access_token>');
  process.exit(1);
}

console.log('\n=== Token Header + Payload (no verification) ===');
const decoded = jwt.decode(token, { complete: true });
console.log('Algorithm:', decoded?.header?.alg);
console.log('Payload sub:', decoded?.payload?.sub);
console.log('Payload email:', decoded?.payload?.email);
console.log('Payload aud:', decoded?.payload?.aud);
console.log('Expires:', new Date((decoded?.payload?.exp ?? 0) * 1000).toISOString());

console.log('\n=== Verification attempt 1: raw string secret ===');
try {
  const v1 = jwt.verify(token, secret, { algorithms: ['HS256', 'HS512'] });
  console.log('✅  SUCCESS with raw string secret');
  console.log('sub:', v1.sub, '  email:', v1.email);
} catch (e) {
  console.log('❌  FAILED:', e.message);
}

console.log('\n=== Verification attempt 2: base64-decoded secret ===');
try {
  const v2 = jwt.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256', 'HS512'] });
  console.log('✅  SUCCESS with base64-decoded secret');
  console.log('sub:', v2.sub, '  email:', v2.email);
} catch (e) {
  console.log('❌  FAILED:', e.message);
}
