import test from 'node:test';
import assert from 'node:assert/strict';
import { providerError } from '../server/provider-error.js';
for (const [status, reason, expected] of [
  [400, 'API_KEY_INVALID', 'AI_KEY_INVALID'],
  [401, null, 'AI_KEY_INVALID'],
  [403, 'API_KEY_SERVICE_BLOCKED', 'AI_ACCESS_BLOCKED'],
  [400, 'SERVICE_DISABLED', 'AI_ACCESS_BLOCKED'],
  [429, null, 'AI_QUOTA_EXCEEDED'],
  [404, null, 'AI_MODEL_UNAVAILABLE'],
  [500, null, 'AI_PROVIDER_ERROR'],
]) test(`provider ${status}/${reason} reports a safe actionable error`, async () => {
  const result = await providerError({ status, json: async () => ({ error: {
    message: 'private-key-secret https://private.example', details: [{ reason, metadata: { secret: 'private-key-secret' } }],
  } }) });
  assert.equal(result.code, expected);
  assert.ok(!JSON.stringify(result).includes('private-key-secret'));
  assert.ok(!JSON.stringify(result).includes('private.example'));
});
test('non-JSON provider errors remain sanitized', async () => {
  assert.equal((await providerError({ status: 502, json: async () => { throw new Error('secret'); } })).code, 'AI_PROVIDER_ERROR');
});
