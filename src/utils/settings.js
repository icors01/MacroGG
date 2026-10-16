// Only server-backed transaction reads may decide that persistent settings
// are missing. Snapshot cache misses are not permission to replace user data.
export async function initializeSettings(transaction, settingsRef, oldLogRef) {
  const settings = await transaction.get(settingsRef);
  if (settings.exists() && settings.data().migrated !== false) return null;

  const legacy = await transaction.get(oldLogRef);
  const oldData = legacy.exists() ? legacy.data() : null;
  const defaults = {
    dailyGoal: 2000,
    proteinGoal: 150,
    carbGoal: 250,
    fatGoal: 70,
    customMeals: [],
    isTrackingCarbs: false,
    isTrackingFat: false,
  };
  const migratedSettings = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, oldData?.[key] ?? fallback])
  );
  transaction.set(settingsRef, {
    ...migratedSettings,
    ...(settings.exists() ? settings.data() : {}),
    migrated: true,
  });
  return oldData;
}
