import { generateKeyPairSync, sign } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-signing-key' };
export function token(overrides = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'RS256', kid: jwk.kid })}.${encode({
    aud: 'test-project', iss: 'https://securetoken.google.com/test-project',
    sub: 'test-user', iat: now - 10, auth_time: now - 10, exp: now + 3600,
    ...overrides,
  })}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key).toString('base64url')}`;
}
export const headers = () => ({ authorization: `Bearer ${token()}` });
export const isKeysUrl = url => String(url).startsWith('https://www.googleapis.com/service_accounts/');
export const keyReply = () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
