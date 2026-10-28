import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFoodProvider } from '../server/food-provider.js';
const args = { model: 'gemini-3.8-flash', apiKey: 'private-key', payload: { contents: [] } };
const reply = status => ({ status, ok: status === 200, json: async () => ({}) });
const methods = ['generateContent'];

test('successful generation uses a header credential and does not retry', async () => {
  let calls = 0;
  const result = await requestFoodProvider(args, { fetchImpl: async (url, opts) => {
    calls++; assert.ok(!url.includes(args.apiKey)); assert.equal(opts.headers['x-goog-api-key'], args.apiKey);
    assert.deepEqual(JSON.parse(opts.body), args.payload); return reply(200);
  } });
  assert.equal(result.status, 200); assert.equal(calls, 1);
});

test('temporary 503 is retried once with the same payload and shared deadline', async () => {
  const requests = [], waits = [];
  const result = await requestFoodProvider(args, {
    fetchImpl: async (url, opts) => { requests.push({url, ...opts}); return reply(requests.length === 1 ? 503 : 200); },
    sleep: async ms => waits.push(ms),
  });
  assert.equal(result.status, 200); assert.deepEqual(waits, [600]);
  assert.equal(requests[0].body, requests[1].body); assert.equal(requests[0].signal, requests[1].signal);
});

test('persistent 503 discovers a supported alternative instead of guessing model names', async () => {
  const urls = [];
  const result = await requestFoodProvider(args, { sleep: async () => {}, fetchImpl: async url => {
    urls.push(url);
    if (url.includes('/models?')) return { ok: true, json: async () => ({ models: [
      { name: 'models/gemini-9.0-flash-preview', supportedGenerationMethods: methods },
      { name: 'models/gemini-8.0-pro', supportedGenerationMethods: methods },
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: methods },
      { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-3.0-flash', supportedGenerationMethods: methods },
    ] }) };
    return reply(url.includes('gemini-3.0-flash:') ? 200 : 503);
  } });
  assert.equal(result.status, 200); assert.equal(urls.length, 4);
  assert.ok(urls.at(-1).includes('/gemini-3.0-flash:generateContent'));
});

for (const status of [400, 401, 403, 429]) test(`${status} is not retried or bypassed with another model`, async () => {
  let calls = 0;
  const result = await requestFoodProvider(args, { fetchImpl: async () => { calls++; return reply(status); } });
  assert.equal(result.status, status); assert.equal(calls, 1);
});

test('unavailable model uses discovery directly and stops after one fallback', async () => {
  let calls = 0;
  const result = await requestFoodProvider(args, { fetchImpl: async url => {
    calls++;
    return url.includes('/models?') ? { ok: true, json: async () => ({ models: [
      { name: 'models/gemini-3.0-flash', supportedGenerationMethods: methods },
    ] }) } : reply(404);
  } });
  assert.equal(result.status, 404); assert.equal(calls, 3);
});

test('failed discovery preserves the final generation error', async () => {
  const result = await requestFoodProvider(args, { sleep: async () => {}, fetchImpl: async () => reply(503) });
  assert.equal(result.status, 503);
});

test('one total deadline prevents retries from waiting indefinitely', async () => {
  await assert.rejects(requestFoodProvider(args, {
    timeoutMs: 1,
    fetchImpl: async () => reply(503),
    sleep: async (_, signal) => { await new Promise(resolve => setTimeout(resolve, 10)); signal.throwIfAborted(); },
  }), { name: 'TimeoutError' });
});
