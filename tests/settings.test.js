import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeSettings } from '../src/utils/settings.js';

const meal = { id: 'saved', name: 'Breakfast', calories: 450, protein: 30, carbs: 40, fat: 19 };
function transactionFor(settings, legacy) {
  const writes = [];
  return {
    writes,
    async get(ref) {
      const value = ref === 'settings' ? settings : legacy;
      return { exists: () => value !== undefined, data: () => value };
    },
    set(ref, data) { writes.push({ ref, data }); },
  };
}

test('reopening an existing account never writes empty meals over saved meals', async () => {
  const transaction = transactionFor({ customMeals: [meal] });
  assert.equal(await initializeSettings(transaction, 'settings', 'legacy'), null);
  assert.deepEqual(transaction.writes, []);
});

test('initialization recovers legacy meals and macros instead of writing an empty list', async () => {
  const legacy = { customMeals: [meal], dailyGoal: 2400, entries: [{ food: 'Lunch' }] };
  const transaction = transactionFor(undefined, legacy);
  assert.equal(await initializeSettings(transaction, 'settings', 'legacy'), legacy);
  assert.deepEqual(transaction.writes[0].data.customMeals, [meal]);
  assert.equal(transaction.writes[0].data.dailyGoal, 2400);
  assert.equal(transaction.writes[0].data.entries, undefined);
});

test('unfinished migration preserves newer settings and meals', async () => {
  const transaction = transactionFor(
    { migrated: false, customMeals: [meal], dailyGoal: 1800 },
    { customMeals: [], dailyGoal: 2200 }
  );
  await initializeSettings(transaction, 'settings', 'legacy');
  assert.deepEqual(transaction.writes[0].data.customMeals, [meal]);
  assert.equal(transaction.writes[0].data.dailyGoal, 1800);
  assert.equal(transaction.writes[0].data.migrated, true);
});

test('new accounts initialize once; later initialization preserves saved meals', async () => {
  const transaction = transactionFor();
  await initializeSettings(transaction, 'settings', 'legacy');
  assert.deepEqual(transaction.writes[0].data.customMeals, []);
  const reopened = transactionFor({ ...transaction.writes[0].data, customMeals: [meal] });
  await initializeSettings(reopened, 'settings', 'legacy');
  assert.deepEqual(reopened.writes, []);
});

test('failed server reads never schedule destructive default writes', async () => {
  const transaction = transactionFor();
  transaction.get = async () => { throw new Error('offline'); };
  await assert.rejects(initializeSettings(transaction, 'settings', 'legacy'), /offline/);
  assert.deepEqual(transaction.writes, []);
});
