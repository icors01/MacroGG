import { foodSignature } from "./pinnedMeals.js";
const macros = ["calories", "protein", "carbs", "fat"];
export const normalizeMealSearch = (value) =>
  String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

// Daily entries are append-only in chronological order. Different portions keep
// their own signatures; a later repeat supplies the latest display spelling.
export function recentUniqueMeals(days, today, limit = 30) {
  const result = [],
    seen = new Set();
  const sorted = [...days]
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && day.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sorted) {
    if (!Array.isArray(day.entries)) continue;
    for (const entry of [...day.entries].reverse()) {
      if (!entry || typeof entry.food !== "string" || !entry.food.trim())
        continue;
      const values = macros.map((key) => Number(entry[key] ?? 0));
      if (values.some((value) => !Number.isFinite(value) || value < 0))
        continue;
      const meal = {
        food: entry.food.normalize("NFKC").trim().replace(/\s+/g, " "),
        ...Object.fromEntries(macros.map((key, i) => [key, values[i]])),
      };
      const key = foodSignature(meal);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...meal, key });
      if (result.length >= limit) return result;
    }
  }
  return result;
}

export function matchRecentMeals(meals, input) {
  const search = normalizeMealSearch(input);
  if (search.length < 2) return [];
  return meals
    .filter((meal) => normalizeMealSearch(meal.food).includes(search))
    .sort(
      (a, b) =>
        Number(normalizeMealSearch(b.food).startsWith(search)) -
        Number(normalizeMealSearch(a.food).startsWith(search)),
    )
    .slice(0, 5);
}
