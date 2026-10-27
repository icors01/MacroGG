import { createPublicKey, verify } from 'node:crypto';

const keysUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let keyCache;
let loadingKeys;
const usage = new Map();

async function signingKeys() {
  if (keyCache?.expires > Date.now()) return keyCache.keys;
  if (!loadingKeys) loadingKeys = (async () => {
    const response = await fetch(keysUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Key service unavailable');
    const { keys } = await response.json();
    if (!Array.isArray(keys) || !keys.length) throw new Error('Missing signing keys');
    keyCache = { keys, expires: Date.now() + 3600_000 };
    return keys;
  })().finally(() => { loadingKeys = undefined; });
  return loadingKeys;
}

export async function verifyFirebaseToken(token) {
  const project = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!project) throw new Error('Authentication unavailable');
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
  } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}` ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now ||
      !Number.isFinite(claims.auth_time) || claims.auth_time > now) return null;
  const jwk = (await signingKeys()).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) return null;
  try {
    if (!verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) return null;
  } catch { return null; }
  return claims.sub;
}

// Per-instance protection only. Use a shared edge/WAF limit for distributed abuse.
export async function requireApiUser(req, res) {
  const header = req.headers?.authorization;
  if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_.-]{1,8192}$/.test(header)) {
    res.status(401).json({ error: 'Please sign in before using AI features.' });
    return false;
  }
  let uid;
  try { uid = await verifyFirebaseToken(header.slice(7)); }
  catch {
    res.status(503).json({ error: 'Authentication is temporarily unavailable. Please try again.' });
    return false;
  }
  if (!uid) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return false;
  }
  const now = Date.now();
  for (const [key, value] of usage) if (value.reset <= now) usage.delete(key);
  const count = usage.get(uid) || { count: 0, reset: now + 60_000 };
  if (count.count >= 10 || (!usage.has(uid) && usage.size >= 10_000)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many AI requests. Please wait a minute.' });
    return false;
  }
  count.count++;
  usage.set(uid, count);
  return true;
}
