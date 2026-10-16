import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  collection,
  documentId,
  query,
  where,
  queryEqual,
} from "firebase/firestore";
import { buildUsualFoodsQuery } from "../src/hooks/useUsualFoods.js";
import {
  getUsualFoodsWindow,
  rankUsualFoods,
} from "../src/utils/usualFoods.js";

const today = "2026-10-16";
const food = (name = "Oats", overrides = {}) => ({
  food: name,
  calories: 385,
  protein: 22,
  carbs: 52,
  fat: 10,
  ...overrides,
});
const day = (date, entries) => ({ date, entries });

test("the rolling window includes exactly 30 local calendar dates across month and leap-year boundaries", () => {
  assert.deepEqual(getUsualFoodsWindow(today), {
    start: "2026-09-17",
    end: today,
  });
  assert.deepEqual(getUsualFoodsWindow("2024-03-01"), {
    start: "2024-02-01",
    end: "2024-03-01",
  });
  assert.throws(() => getUsualFoodsWindow("2026-02-30"));
});

test("history query is scoped to one account and bounded by document dates", async () => {
  const app = initializeApp({ projectId: "usuals-test" }, "usuals-test");
  const db = getFirestore(app);
  const expected = query(
    collection(db, "artifacts/app/users/user-a/logs"),
    where(documentId(), ">=", "2026-09-17"),
    where(documentId(), "<=", today),
  );
  assert.equal(
    queryEqual(buildUsualFoodsQuery(db, "app", "user-a", today), expected),
    true,
  );
  assert.equal(
    queryEqual(buildUsualFoodsQuery(db, "app", "user-b", today), expected),
    false,
  );
  await deleteApp(app);
});

test("one-off foods do not create a usual and multiple logs on one day cannot count as a habit", () => {
  assert.deepEqual(
    rankUsualFoods([day(today, [food(), food(), food("Banana")])], today),
    [],
  );
});

test("normalizes casing and spaces, keeps confirmed macros, and counts actual log entries", () => {
  const results = rankUsualFoods(
    [
      day("2026-10-14", [food("  OATS  ")]),
      day(today, [food("Oats"), food("Oats")]),
    ],
    today,
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].food, "Oats");
  assert.equal(results[0].count, 3);
  assert.equal(results[0].daysLogged, 2);
  assert.equal(results[0].calories, 385);
  assert.equal(results[0].lastLoggedDate, today);
});

test("different portions never get merged or have their macros averaged", () => {
  const results = rankUsualFoods(
    [
      day("2026-10-15", [
        food(),
        food("Oats", { calories: 770, protein: 44, carbs: 104, fat: 20 }),
      ]),
      day(today, [
        food(),
        food("Oats", { calories: 770, protein: 44, carbs: 104, fat: 20 }),
      ]),
    ],
    today,
  );
  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map((item) => item.calories).sort((a, b) => a - b),
    [385, 770],
  );
  assert.ok(results.every((item) => item.count === 2));
});

test("a frequently logged food ranks above a less frequent food of the same recency", () => {
  const days = [
    day("2026-10-12", [food("Frequent")]),
    day("2026-10-14", [food("Frequent"), food("Occasional")]),
    day(today, [food("Frequent"), food("Occasional")]),
  ];
  assert.equal(rankUsualFoods(days, today)[0].food, "Frequent");
});

test("recent habits outrank equally frequent older habits, capped at three suggestions", () => {
  const days = [
    day("2026-09-18", [food("Older")]),
    day("2026-09-19", [food("Older")]),
    day("2026-10-15", [food("Recent"), food("B"), food("C")]),
    day(today, [food("Recent"), food("B"), food("C")]),
  ];
  const results = rankUsualFoods(days, today);
  assert.equal(results.length, 3);
  assert.equal(
    results.some((item) => item.food === "Older"),
    false,
  );
});

test("repeated taps today do not outrank a habit spanning more days", () => {
  const days = [
    day("2026-10-14", [food("Steady")]),
    day("2026-10-15", [food("Steady"), food("Repeated today")]),
    day(today, [
      food("Steady"),
      ...Array.from({ length: 20 }, () => food("Repeated today")),
    ]),
  ];
  assert.equal(rankUsualFoods(days, today)[0].food, "Steady");
});

test("old, future, malformed, and invalid nutrition entries are ignored", () => {
  const days = [
    day("2026-09-16", [food()]),
    day("2026-10-17", [food()]),
    day("2026-02-30", [food()]),
    day(today, [
      food("", {}),
      food("Invalid", { calories: -1 }),
      food("Invalid", { protein: Infinity }),
      food(),
      { food: {} },
    ]),
  ];
  assert.deepEqual(rankUsualFoods(days, today), []);
});

test("the inclusive cutoff date contributes, and removing/undoing an entry updates learning", () => {
  const before = [day("2026-09-17", [food()]), day(today, [food()])];
  assert.equal(rankUsualFoods(before, today).length, 1);
  const deleted = [before[0], day(today, [])];
  assert.deepEqual(rankUsualFoods(deleted, today), []);
  assert.equal(rankUsualFoods(before, today)[0].count, 2);
});

test("recommendations still exist when today is empty and do not mutate saved logs", () => {
  const logs = [
    day("2026-10-14", [food()]),
    day("2026-10-15", [food()]),
    day(today, []),
  ];
  const original = structuredClone(logs);
  assert.equal(rankUsualFoods(logs, today).length, 1);
  assert.deepEqual(logs, original);
});

test("retry duplicates with the same entry ID only count once per day", () => {
  const logs = [
    day("2026-10-15", [food("Oats", { id: "one" })]),
    day(today, [food("Oats", { id: "two" }), food("Oats", { id: "two" })]),
  ];
  assert.equal(rankUsualFoods(logs, today)[0].count, 2);
});
