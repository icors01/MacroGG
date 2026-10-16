export const MAX_PINNED_MEALS = 3;

// IDs keep pins connected to the latest saved name and portion when edited.
export function getPinnedMeals(meals, ids) {
  const byId = new Map(
    (Array.isArray(meals) ? meals : []).map((meal) => [meal.id, meal]),
  );
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .filter((id) => typeof id === "string" && byId.has(id))
    .slice(0, MAX_PINNED_MEALS)
    .map((id) => byId.get(id));
}

export function togglePinnedMeal(settings, mealId) {
  const meals = Array.isArray(settings.customMeals) ? settings.customMeals : [];
  if (!meals.some((meal) => meal.id === mealId)) {
    throw new Error("This saved meal is no longer available.");
  }
  const ids = getPinnedMeals(meals, settings.pinnedMealIds).map(
    (meal) => meal.id,
  );
  if (ids.includes(mealId)) return ids.filter((id) => id !== mealId);
  if (ids.length >= MAX_PINNED_MEALS) {
    throw new Error(
      "Unpin a meal before pinning another. You can pin up to 3.",
    );
  }
  return [...ids, mealId];
}

export function foodSignature(food) {
  return JSON.stringify([
    (food.food ?? food.name ?? "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase(),
    ...["calories", "protein", "carbs", "fat"].map((key) =>
      Number(food[key] ?? 0),
    ),
  ]);
}
