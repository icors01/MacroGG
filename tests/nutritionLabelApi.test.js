import { headers, isKeysUrl, keyReply } from "./auth-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/scan-nutrition-label.js";

const photo = { mimeType: "image/jpeg", image: "YWJj" };
const nutrition = {
  isNutritionLabel: true,
  name: "Cereal",
  servingSize: "100 g",
  nutritionBasis: "per_100g",
  calories: 360,
  protein: null,
  carbs: 70,
  fat: 0,
  warnings: ["Protein is unreadable."],
};
function response() {
  return {
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
  };
}

test("label endpoint validates requests without making provider calls", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected provider call");
  });
  for (const [method, body, status] of [
    ["GET", photo, 405],
    ["POST", "{", 400],
    ["POST", { mimeType: "image/heic", image: "YWJj" }, 400],
    ["POST", {}, 400],
  ]) {
    const res = response();
    await handler({ method, body, headers: headers() }, res);
    assert.equal(res.code, status);
    assert.equal(res.headers["Cache-Control"], "no-store");
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("label endpoint returns review data, handles failures, and never exposes provider credentials", async (t) => {
  const originalProject = process.env.VITE_FIREBASE_PROJECT_ID;
  process.env.VITE_FIREBASE_PROJECT_ID = "test-project";
  t.after(() => {
    if (originalProject === undefined) delete process.env.VITE_FIREBASE_PROJECT_ID;
    else process.env.VITE_FIREBASE_PROJECT_ID = originalProject;
  });
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-label-key";
  t.after(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });
  let reply = {
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(nutrition) }] } },
      ],
    }),
  };
  const fetch = t.mock.method(globalThis, "fetch", async url => isKeysUrl(url) ? keyReply() : reply);
  let res = response();
  await handler({ method: "POST", headers: headers(), body: photo }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.protein, null);
  assert.equal(res.body.fat, 0);
  assert.equal(res.body.nutritionBasis, "per_100g");
  const [url, options] = fetch.mock.calls.find(call => !isKeysUrl(call.arguments[0])).arguments;
  assert.equal(url.includes("test-label-key"), false);
  assert.equal(options.headers["x-goog-api-key"], "test-label-key");
  assert.deepEqual(JSON.parse(options.body).contents[0].parts[1].inlineData, {
    mimeType: "image/jpeg",
    data: "YWJj",
  });
  reply = { ok: false };
  res = response();
  await handler({ method: "POST", headers: headers(), body: photo }, res);
  assert.equal(res.code, 502);
  assert.equal(JSON.stringify(res.body).includes("test-label-key"), false);
  reply = {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "{not json" }] } }],
    }),
  };
  res = response();
  await handler({ method: "POST", headers: headers(), body: photo }, res);
  assert.equal(res.code, 422);
  reply = {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ isNutritionLabel: false }) }],
          },
        },
      ],
    }),
  };
  res = response();
  await handler({ method: "POST", headers: headers(), body: photo }, res);
  assert.equal(res.code, 422);
  delete process.env.GEMINI_API_KEY;
  const calls = fetch.mock.callCount();
  res = response();
  await handler({ method: "POST", headers: headers(), body: photo }, res);
  assert.equal(res.code, 503);
  assert.equal(fetch.mock.callCount(), calls);
});
