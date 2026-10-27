import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { verifyFirebaseToken, requireApiUser } from '../server/api-security.js';
import food from '../api/ai-food-entry.js';
import label from '../api/scan-nutrition-label.js';
import goals from '../api/explain-goals.js';
import email from '../api/send-email.js';
import { token, headers, keyReply, isKeysUrl } from './auth-fixture.js';
const response = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

function mockEnv(t, key, value) {
  const original = process.env[key]; process.env[key] = value;
  t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
}

test('Firebase tokens require a trusted signature, project, issuer and valid lifetime', async t => {
  mockEnv(t, 'VITE_FIREBASE_PROJECT_ID', 'test-project');
  t.mock.method(globalThis, 'fetch', async url => { assert.ok(isKeysUrl(url)); return keyReply(); });
  assert.equal(await verifyFirebaseToken(token()), 'test-user');
  for (const changes of [{ aud: 'other' }, { iss: 'https://attacker.example' }, { exp: 1 }, { iat: 9999999999 }, { auth_time: 9999999999 }, { sub: '' }])
    assert.equal(await verifyFirebaseToken(token(changes)), null);
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.equal(await verifyFirebaseToken(token({}, privateKey)), null);
  assert.equal(await verifyFirebaseToken('bad.token'), null);
});

test('all AI endpoints reject unauthenticated valid requests without provider calls', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected outbound call'); });
  for (const [handler, body] of [
    [food, { input: 'chicken' }],
    [label, { mimeType: 'image/jpeg', image: 'YWJj' }],
    [goals, { dailyGoal: 2000, proteinGoal: 150, carbGoal: 215, fatGoal: 60,
      maintenance: 2220, method: 'Your maintenance estimate', goal: 'cut', adjustmentPercent: -10 }],
  ]) {
    const res = response(); await handler({ method: 'POST', body }, res);
    assert.equal(res.code, 401);
  }
  const res = response(); await email({ method: 'POST', body: { email: 'someone@example.com', verificationCode: '123456' } }, res);
  assert.equal(res.code, 410);
  assert.equal(fetch.mock.callCount(), 0);
});

test('API limit is enforced on the server for authenticated users', async t => {
  mockEnv(t, 'VITE_FIREBASE_PROJECT_ID', 'test-project');
  t.mock.method(globalThis, 'fetch', async () => keyReply());
  const req = { headers: { authorization: `Bearer ${token({ sub: 'rate-limit-user' })}` } };
  for (let i = 0; i < 10; i++) assert.equal(await requireApiUser(req, response()), true);
  const res = response(); assert.equal(await requireApiUser(req, res), false);
  assert.equal(res.code, 429);
});

test('AI food input/output bounds and provider errors cannot expose credentials', async t => {
  mockEnv(t, 'VITE_FIREBASE_PROJECT_ID', 'test-project');
  mockEnv(t, 'GEMINI_API_KEY', 'test-private-key');
  let reply = { ok: false, text: async () => 'test-private-key provider internal details' };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (isKeysUrl(url)) return keyReply(); calls.push({ url, options }); return reply;
  });
  let res = response(); await food({ method: 'POST', headers: headers(), body: { input: 'x'.repeat(2001) } }, res);
  assert.equal(res.code, 400); assert.equal(calls.length, 0);
  res = response(); await food({ method: 'POST', headers: headers(), body: { input: 'chicken' } }, res);
  assert.equal(res.code, 502); assert.ok(!JSON.stringify(res.body).includes('test-private-key'));
  assert.ok(!calls[0].url.includes('test-private-key')); assert.ok(calls[0].options.signal);
  const data = { description: 'Chicken', calories: 200, protein: 30, carbs: 0, fat: 5, extra: 'ignored' };
  reply = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }) };
  res = response(); await food({ method: 'POST', headers: headers(), body: { input: 'chicken' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.extra, undefined);
  data.calories = -1;
  res = response(); await food({ method: 'POST', headers: headers(), body: { input: 'chicken' } }, res);
  assert.equal(res.code, 502);
});
