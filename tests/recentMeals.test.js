import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  collection,
  documentId,
  limit,
  orderBy,
  query,
  queryEqual,
  where,
} from "firebase/firestore";
import { buildRecentMealsQuery } from "../src/hooks/useRecentMeals.js";
import {
  recentUniqueMeals,
  matchRecentMeals,
} from "../src/utils/recentMeals.js";
const meal = (food, overrides = {}) => ({
  food,
  calories: 250,
  protein: 12.5,
  carbs: 30,
  fat: 8,
  ...overrides,
});
const today = "2026-11-01";

test("last 30 unique portions are ordered newest first, including older history", () => {
  const entries = Array.from({ length: 35 }, (_, i) => meal(`Meal ${i}`));
  const result = recentUniqueMeals(
    [
      { date: "2026-01-01", entries },
      { date: today, entries: [meal("New meal"), meal("Meal 34")] },
    ],
    today,
  );
  assert.equal(result.length, 30);
  assert.equal(result[0].food, "Meal 34");
  assert.equal(result[1].food, "New meal");
  assert.equal(result[2].food, "Meal 33");
});

test("normalizes repeats, keeps different portions and decimals, ignores invalid/future records", () => {
  const days = [
    {
      date: today,
      entries: [
        meal(" OATS "),
        meal("oats"),
        meal("Oats", { calories: 300 }),
        meal("Bad", { fat: -1 }),
        meal("Bad", { protein: "wrong" }),
        meal(""),
      ],
    },
    { date: "2027-01-01", entries: [meal("Future")] },
    { date: "invalid", entries: [meal("Invalid")] },
  ];
  const original = structuredClone(days);
  const result = recentUniqueMeals(days, today);
  assert.equal(result.length, 2);
  assert.equal(result[0].calories, 300);
  assert.equal(result[1].protein, 12.5);
  assert.equal(result[1].food, "oats");
  assert.deepEqual(days, original);
});

test("two-letter matching is case insensitive, prefix first then recency, maximum five", () => {
  const entries = [
    "Chicken",
    "Chicken rice",
    "Chicken bowl",
    "Chicken soup",
    "Chicken salad",
    "Chicken wrap",
    "Roast chicken",
  ];
  const recent = recentUniqueMeals(
    [{ date: today, entries: entries.map((name) => meal(name)) }],
    today,
  );
  assert.deepEqual(matchRecentMeals(recent, "c"), []);
  const result = matchRecentMeals(recent, "  CHI  ");
  assert.equal(result.length, 5);
  assert.equal(result[0].food, "Chicken wrap");
  assert.ok(result.every((item) => item.food.startsWith("Chicken")));
  assert.deepEqual(matchRecentMeals(recent, "nonexistent"), []);
});

test("undo/deletion removes the suggestion unless an earlier matching portion exists", () => {
  assert.deepEqual(
    recentUniqueMeals([{ date: today, entries: [] }], today),
    [],
  );
  const result = recentUniqueMeals(
    [
      { date: "2026-10-01", entries: [meal("Oats")] },
      { date: today, entries: [] },
    ],
    today,
  );
  assert.equal(result.length, 1);
});

test("recent query is account scoped, newest first and paged in 30-document batches", async () => {
  const app = initializeApp(
    { projectId: "test-recent-meals" },
    "recent-meals-test",
  );
  try {
    const db = getFirestore(app);
    const expected = query(
      collection(db, "artifacts/test/users/owner/logs"),
      where(documentId(), "<=", today),
      orderBy(documentId(), "desc"),
      limit(30),
    );
    assert.ok(
      queryEqual(buildRecentMealsQuery(db, "test", "owner", today), expected),
    );
    assert.ok(
      !queryEqual(buildRecentMealsQuery(db, "test", "other", today), expected),
    );
  } finally {
    await deleteApp(app);
  }
});
