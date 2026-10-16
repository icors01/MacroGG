import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateGoalRecommendation,
  balanceGoalCarbs,
  macroCalories,
  validateGoalDraft,
  goalExplanationPayload,
} from "../src/utils/goalRecommendations.js";
const input = {
  units: "imperial",
  age: 30,
  feet: 5,
  inches: 7,
  weight: 170,
  maintenanceMode: "estimate",
  equationSex: "male",
  activity: "light",
  goal: "maintain",
  pace: "gentle",
};

test("adult estimate uses Mifflin–St Jeor and equivalent imperial/metric inputs agree", () => {
  const result = calculateGoalRecommendation(input);
  const expected = Math.round(
    (10 * (170 * 0.45359237) + 6.25 * (67 * 2.54) - 5 * 30 + 5) * 1.375,
  );
  assert.equal(result.maintenance, expected);
  const metric = calculateGoalRecommendation({
    ...input,
    units: "metric",
    weight: 170 * 0.45359237,
    heightCm: 67 * 2.54,
  });
  assert.deepEqual(result, metric);
  assert.ok(Math.abs(macroCalories(result) - result.dailyGoal) <= 2);
});

test("known maintenance bypasses sex/activity estimation and preserves the entered starting point", () => {
  const result = calculateGoalRecommendation({
    ...input,
    maintenanceMode: "known",
    maintenance: 2400,
    equationSex: "",
    activity: "",
    goal: "cut",
  });
  assert.equal(result.maintenance, 2400);
  assert.equal(result.dailyGoal, 2150);
  assert.equal(result.adjustmentPercent, -10);
  assert.equal(result.method, "Your maintenance estimate");
  assert.equal(
    calculateGoalRecommendation({
      ...input,
      maintenanceMode: "known",
      maintenance: 2400,
      goal: "bulk",
      pace: "moderate",
    }).dailyGoal,
    2650,
  );
});

test("invalid metrics, unsupported circumstances and unsuitable weight-loss estimates are rejected", () => {
  for (const patch of [
    { age: 17 },
    { age: "" },
    { age: 100 },
    { weight: 0 },
    { weight: Infinity },
    { inches: 12 },
    { units: "unknown" },
    { equationSex: "" },
    { goal: "unknown" },
    { activity: "unknown" },
    { maintenanceMode: "known", maintenance: "" },
  ])
    assert.throws(() => calculateGoalRecommendation({ ...input, ...patch }));
  assert.throws(
    () => calculateGoalRecommendation({ ...input, weight: 100, goal: "cut" }),
    /weight-loss estimate/,
  );
  assert.throws(
    () =>
      calculateGoalRecommendation({
        ...input,
        maintenanceMode: "known",
        maintenance: 1200,
        goal: "cut",
      }),
    /calorie range/,
  );
});

test("editable macro balancing reports impossible budgets and validates blank/negative values", () => {
  const goals = {
    dailyGoal: 2000,
    proteinGoal: 150,
    carbGoal: 200,
    fatGoal: 60,
  };
  assert.equal(balanceGoalCarbs(goals), 215);
  assert.equal(balanceGoalCarbs({ ...goals, proteinGoal: 600 }), null);
  assert.equal(macroCalories(goals), 1940);
  assert.deepEqual(
    validateGoalDraft({
      dailyGoal: "2000",
      proteinGoal: "150",
      carbGoal: "200",
      fatGoal: "60",
    }),
    goals,
  );
  for (const patch of [
    { proteinGoal: "" },
    { fatGoal: -1 },
    { dailyGoal: 0 },
    { carbGoal: Infinity },
  ])
    assert.throws(() => validateGoalDraft({ ...goals, ...patch }));
});

test("Gemini receives only the calculation summary, not body metrics or account data", () => {
  const result = calculateGoalRecommendation(input);
  const payload = goalExplanationPayload({
    ...input,
    ...result,
    email: "private@example.com",
  });
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "dailyGoal",
      "proteinGoal",
      "carbGoal",
      "fatGoal",
      "maintenance",
      "method",
      "goal",
      "adjustmentPercent",
    ].sort(),
  );
});
