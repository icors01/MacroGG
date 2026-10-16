export const USUAL_FOODS_WINDOW_DAYS = 30;
const DAY_MS = 86400000;
const MACROS = ["calories", "protein", "carbs", "fat"];

export function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayNumber(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const time = Date.parse(value + "T00:00:00Z");
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    return null;
  return time / DAY_MS;
}

export function getUsualFoodsWindow(today) {
  const end = dayNumber(today);
  if (end === null) throw new Error("Expected a valid YYYY-MM-DD journal date");
  return {
    start: new Date((end - USUAL_FOODS_WINDOW_DAYS + 1) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    end: today,
  };
}

// This is derived from existing log documents, never a separate learning write.
// Undo, deletion, and edits therefore update the recommendations automatically.
export function rankUsualFoods(days, today) {
  const { start } = getUsualFoodsWindow(today);
  const currentDay = dayNumber(today);
  const groups = new Map();
  const seenIds = new Set();
  for (const day of days) {
    if (
      dayNumber(day.date) === null ||
      day.date < start ||
      day.date > today ||
      !Array.isArray(day.entries)
    )
      continue;
    for (const entry of day.entries) {
      if (!entry || typeof entry.food !== "string") continue;
      const food = entry.food.normalize("NFKC").trim().replace(/\s+/g, " ");
      if (!food) continue;
      const values = MACROS.map((key) => Number(entry[key] ?? 0));
      if (values.some((value) => !Number.isFinite(value) || value < 0))
        continue;
      if (entry.id) {
        const id = `${day.date}/${entry.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      // Keep different portions distinct instead of guessing that names alone
      // identify the same meal. Existing entries already hold confirmed macros.
      const key = JSON.stringify([food.toLowerCase(), ...values]);
      const normalized = {
        food,
        ...Object.fromEntries(
          MACROS.map((macro, index) => [macro, values[index]]),
        ),
      };
      const group = groups.get(key) || {
        key,
        dates: new Set(),
        count: 0,
        lastLoggedDate: "",
        entry: normalized,
      };
      group.count++;
      group.dates.add(day.date);
      if (day.date >= group.lastLoggedDate) {
        group.lastLoggedDate = day.date;
        group.entry = normalized;
      }
      groups.set(key, group);
    }
  }
  return (
    [...groups.values()]
      // A usual is a food logged on at least two different days. One-off entries
      // do not create an extra section for new users.
      .filter((group) => group.dates.size >= 2)
      .map((group) => ({
        ...group.entry,
        key: group.key,
        count: group.count,
        daysLogged: group.dates.size,
        lastLoggedDate: group.lastLoggedDate,
        // Each day contributes at most once; recent days have more weight with a
        // two-week half-life. Repeated taps in one day cannot dominate the rank.
        score: [...group.dates].reduce(
          (sum, date) => sum + 2 ** (-(currentDay - dayNumber(date)) / 14),
          0,
        ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.lastLoggedDate.localeCompare(a.lastLoggedDate) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, 3)
  );
}
