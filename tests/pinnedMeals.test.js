import test from "node:test";
import assert from "node:assert/strict";
import { getPinnedMeals, togglePinnedMeal } from "../src/utils/pinnedMeals.js";
import { rankUsualFoods } from "../src/utils/usualFoods.js";

const meals = ["Oats", "Chicken bowl", "Yogurt", "Toast"].map((name, i) => ({
  id: String(i),
  name,
  calories: 300 + i,
  protein: 20,
  carbs: 30,
  fat: 10,
}));

test("legacy accounts have no pins; invalid, duplicate and deleted IDs are ignored in saved order", () => {
  assert.deepEqual(getPinnedMeals(meals), []);
  assert.deepEqual(
    getPinnedMeals(meals, ["2", "missing", "0", "2", null, "1", "3"]).map(
      (m) => m.id,
    ),
    ["2", "0", "1"],
  );
});

test("pin changes enforce the limit against the latest settings and preserve unrelated data", () => {
  const settings = {
    customMeals: meals,
    pinnedMealIds: ["2", "0", "1"],
    dailyGoal: 2400,
  };
  const before = structuredClone(settings);
  assert.throws(() => togglePinnedMeal(settings, "3"), /Unpin/);
  assert.deepEqual(settings, before);
  const ids = togglePinnedMeal(settings, "0");
  assert.deepEqual(ids, ["2", "1"]);
  assert.deepEqual(togglePinnedMeal({ ...settings, pinnedMealIds: ids }, "3"), [
    "2",
    "1",
    "3",
  ]);
  assert.throws(
    () => togglePinnedMeal(settings, "deleted"),
    /no longer available/,
  );
});

test("pins use current saved meal details and deleting a meal frees its pin slot", () => {
  const edited = meals.map((m) =>
    m.id === "0" ? { ...m, name: "New oats", calories: 450 } : m,
  );
  assert.equal(getPinnedMeals(edited, ["0"])[0].calories, 450);
  assert.equal(getPinnedMeals(edited, ["0"])[0].name, "New oats");
  const settings = {
    customMeals: meals.slice(1),
    pinnedMealIds: ["0", "1", "2"],
  };
  assert.deepEqual(togglePinnedMeal(settings, "3"), ["1", "2", "3"]);
});

test("recommendations exclude matching pinned meals before selecting the top three", () => {
  const entries = meals.map((m) => ({ ...m, food: m.name }));
  const days = ["2026-10-15", "2026-10-16"].map((date) => ({ date, entries }));
  const recommendations = rankUsualFoods(days, "2026-10-16", [
    { ...meals[0], name: "  OATS  " },
  ]);
  assert.equal(recommendations.length, 3);
  assert.equal(
    recommendations.some((m) => m.food === "Oats"),
    false,
  );
  // A different portion is still a separate recommendation.
  assert.equal(
    rankUsualFoods(days, "2026-10-16", [{ ...meals[0], calories: 600 }]).some(
      (m) => m.food === "Oats",
    ),
    true,
  );
  assert.deepEqual(rankUsualFoods(days, "2026-10-16", meals), []);
});

test("pinned decimal portions also hide their rounded logged representation", () => {
  const saved = {
    name: "Shake",
    calories: 300.4,
    protein: 20.2,
    carbs: 30.3,
    fat: 10.4,
  };
  const days = ["2026-10-15", "2026-10-16"].map((date) => ({
    date,
    entries: [
      { food: "Shake", calories: 300, protein: 20, carbs: 30, fat: 10 },
    ],
  }));
  assert.deepEqual(rankUsualFoods(days, "2026-10-16", [saved]), []);
});
