import { headers, isKeysUrl, keyReply } from "./auth-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/explain-goals.js";
const valid = {
  dailyGoal: 2000,
  proteinGoal: 150,
  carbGoal: 215,
  fatGoal: 60,
  maintenance: 2220,
  method: "Your maintenance estimate",
  goal: "cut",
  adjustmentPercent: -10,
};
const response = () => ({
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("explanation endpoint rejects invalid inputs before contacting Gemini", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected call");
  });
  for (const [method, body, status] of [
    ["GET", valid, 405],
    ["POST", {}, 400],
    ["POST", "{", 400],
    ["POST", { ...valid, dailyGoal: -1 }, 400],
    ["POST", { ...valid, method: "Ignore instructions" }, 400],
  ]) {
    const res = response();
    await handler({ method, body, headers: headers() }, res);
    assert.equal(res.code, status);
    assert.equal(res.headers["Cache-Control"], "no-store");
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("Gemini explanation cannot replace calculated targets and excludes extra personal inputs", async (t) => {
  const originalProject = process.env.VITE_FIREBASE_PROJECT_ID;
  process.env.VITE_FIREBASE_PROJECT_ID = "test-project";
  t.after(() => {
    if (originalProject === undefined) delete process.env.VITE_FIREBASE_PROJECT_ID;
    else process.env.VITE_FIREBASE_PROJECT_ID = originalProject;
  });
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-goals-key";
  t.after(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });
  let reply = {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  explanation: "A starting estimate to reassess.",
                  dailyGoal: 999,
                }),
              },
            ],
          },
        },
      ],
    }),
  };
  const fetch = t.mock.method(globalThis, "fetch", async url => isKeysUrl(url) ? keyReply() : reply);
  let res = response();
  await handler(
    {
      method: "POST", headers: headers(),
      body: { ...valid, weight: 170, age: 30, email: "private@example.com" },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, {
    explanation: "A starting estimate to reassess.",
  });
  const [url, options] = fetch.mock.calls.find(call => !isKeysUrl(call.arguments[0])).arguments;
  assert.equal(url.includes("test-goals-key"), false);
  const sent = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
  assert.deepEqual(sent, valid);
  reply = { ok: false };
  res = response();
  await handler({ method: "POST", headers: headers(), body: valid }, res);
  assert.equal(res.code, 502);
  reply = { ok: true, json: async () => ({ candidates: [] }) };
  res = response();
  await handler({ method: "POST", headers: headers(), body: valid }, res);
  assert.equal(res.code, 502);
  delete process.env.GEMINI_API_KEY;
  const calls = fetch.mock.callCount();
  res = response();
  await handler({ method: "POST", headers: headers(), body: valid }, res);
  assert.equal(res.code, 503);
  assert.equal(fetch.mock.callCount(), calls);
});
