export const ACTIVITY_LEVELS = [
  { value: "low", label: "Mostly seated · little exercise", factor: 1.2 },
  {
    value: "light",
    label: "Lightly active · some walking or exercise",
    factor: 1.375,
  },
  {
    value: "moderate",
    label: "Moderately active · regular exercise",
    factor: 1.55,
  },
  {
    value: "high",
    label: "Very active · physical work or hard training",
    factor: 1.725,
  },
];
export const GOAL_LABELS = {
  cut: "Lose fat",
  maintain: "Maintain",
  bulk: "Gain muscle",
};
const number = (value, label, min, max) => {
  const parsed =
    typeof value === "number" || (typeof value === "string" && value.trim())
      ? Number(value)
      : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    throw new Error(
      `${label} must be between ${min} and ${max}. For other circumstances, use personalized manual goals.`,
    );
  return parsed;
};

export function calculateGoalRecommendation(input) {
  const age = number(input.age, "Age", 18, 85);
  const weightKg =
    input.units === "imperial"
      ? number(input.weight, "Weight (lb)", 77, 551) * 0.45359237
      : number(input.weight, "Weight (kg)", 35, 250);
  let heightCm;
  if (input.units === "imperial") {
    const feet = number(input.feet, "Height (feet)", 4, 7);
    const inches = number(input.inches, "Height (inches)", 0, 11.99);
    heightCm = (feet * 12 + inches) * 2.54;
  } else if (input.units === "metric")
    heightCm = number(input.heightCm, "Height (cm)", 130, 230);
  else throw new Error("Choose imperial or metric units.");
  if (heightCm < 130 || heightCm > 230)
    throw new Error(
      "This height is outside the supported estimate range. Use personalized manual goals.",
    );
  if (!Object.hasOwn(GOAL_LABELS, input.goal))
    throw new Error("Choose a goal.");
  if (!["gentle", "moderate"].includes(input.pace))
    throw new Error("Choose a pace.");
  if (input.goal === "cut" && weightKg / (heightCm / 100) ** 2 < 18.5)
    throw new Error(
      "A weight-loss estimate may not fit your current height and weight. Use maintenance or personalized guidance instead.",
    );
  let maintenance, method;
  if (input.maintenanceMode === "known") {
    maintenance = number(input.maintenance, "Maintenance calories", 1200, 6000);
    method = "Your maintenance estimate";
  } else if (input.maintenanceMode === "estimate") {
    if (!["female", "male"].includes(input.equationSex))
      throw new Error(
        "Choose the equation input, or enter your own maintenance estimate to skip it.",
      );
    const activity = ACTIVITY_LEVELS.find(
      (level) => level.value === input.activity,
    );
    if (!activity) throw new Error("Choose an activity level.");
    const resting =
      10 * weightKg +
      6.25 * heightCm -
      5 * age +
      (input.equationSex === "male" ? 5 : -161);
    maintenance = Math.round(resting * activity.factor);
    method = "Mifflin–St Jeor × activity factor";
  } else throw new Error("Choose how to find your maintenance calories.");
  const adjustment =
    input.goal === "maintain"
      ? 0
      : input.goal === "cut"
        ? input.pace === "gentle"
          ? -0.1
          : -0.15
        : input.pace === "gentle"
          ? 0.05
          : 0.1;
  const dailyGoal = Math.round((maintenance * (1 + adjustment)) / 25) * 25;
  if (dailyGoal < 1200 || dailyGoal > 6000)
    throw new Error(
      "This calculation falls outside the supported calorie range. Choose maintenance or use personalized manual goals.",
    );
  const proteinGoal = Math.round(
    Math.min(
      weightKg * (input.goal === "cut" ? 2 : input.goal === "bulk" ? 1.8 : 1.6),
      (dailyGoal * 0.35) / 4,
    ),
  );
  const fatGoal = Math.round((dailyGoal * 0.3) / 9);
  const carbGoal = Math.max(
    0,
    Math.round((dailyGoal - proteinGoal * 4 - fatGoal * 9) / 4),
  );
  return {
    dailyGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
    maintenance: Math.round(maintenance),
    method,
    goal: input.goal,
    adjustmentPercent: Math.round(adjustment * 100),
  };
}

export function balanceGoalCarbs(goals) {
  const remainder =
    Number(goals.dailyGoal) -
    Number(goals.proteinGoal) * 4 -
    Number(goals.fatGoal) * 9;
  return remainder >= 0 ? Math.round(remainder / 4) : null;
}
export function macroCalories(goals) {
  return (
    Number(goals.proteinGoal) * 4 +
    Number(goals.carbGoal) * 4 +
    Number(goals.fatGoal) * 9
  );
}
export function validateGoalDraft(goals) {
  number(goals.dailyGoal, "Calories", 1200, 6000);
  for (const [key, label] of [
    ["proteinGoal", "Protein"],
    ["carbGoal", "Carbs"],
    ["fatGoal", "Fat"],
  ])
    number(goals[key], label, 0, 1500);
  return Object.fromEntries(
    ["dailyGoal", "proteinGoal", "carbGoal", "fatGoal"].map((key) => [
      key,
      Number(goals[key]),
    ]),
  );
}
// Only calculation results go to the explanation endpoint, never raw body metrics.
export function goalExplanationPayload(result) {
  return {
    ...validateGoalDraft(result),
    maintenance: result.maintenance,
    method: result.method,
    goal: result.goal,
    adjustmentPercent: result.adjustmentPercent,
  };
}
