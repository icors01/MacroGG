import test from "node:test";
import assert from "node:assert/strict";
import {
  productNutrition,
  normalizeLabelResult,
  reviewedScanItem,
  combineScannedItems,
  validateLabelImage,
  MAX_LABEL_IMAGE_BYTES,
} from "../src/utils/scannedNutrition.js";

const draft = {
  name: "Yogurt",
  servingSize: "1 pot (170 g)",
  nutritionBasis: "per_serving",
  calories: 120,
  protein: 17,
  carbs: 8,
  fat: 0,
};

test("barcode lookup preserves actual zeros and leaves missing values for review", () => {
  const result = productNutrition({
    product_name: "Yogurt",
    serving_size: "170 g",
    nutriments: {
      "energy-kcal_serving": 120,
      fat_serving: 0,
      proteins_serving: 17,
      carbohydrates_100g: 5,
    },
  });
  assert.equal(result.fat, 0);
  assert.equal(result.carbs, null); // Never mix per-serving and per-100g columns.
  assert.equal(result.nutritionBasis, "per_serving");
  assert.throws(() => reviewedScanItem(result, 1), /Review every macro/);
});

test("per-100 barcode values do not invent a serving and kJ is converted to kcal", () => {
  const result = productNutrition({
    serving_size: "one biscuit",
    nutriments: {
      energy_100g: 418.4,
      proteins_100g: 2,
      carbohydrates_100g: 20,
      fat_100g: 0,
    },
  });
  assert.ok(Math.abs(result.calories - 100) < 0.0001);
  assert.equal(result.nutritionBasis, "unknown");
  assert.throws(
    () => reviewedScanItem({ ...result, name: "Biscuit" }, 1),
    /Confirm which portion/,
  );
  assert.throws(
    () => productNutrition({ nutriments: {} }),
    /no nutrition data/,
  );
});

test("label reading rejects non-labels and keeps unreadable macros blank rather than zero", () => {
  const result = normalizeLabelResult({
    ...draft,
    isNutritionLabel: true,
    protein: null,
    warnings: ["Protein is blurred."],
  });
  assert.equal(result.protein, null);
  assert.equal(result.fat, 0);
  assert.throws(() => reviewedScanItem(result, 1), /Review every macro/);
  assert.throws(
    () => normalizeLabelResult({ isNutritionLabel: false }),
    /No readable/,
  );
  assert.throws(
    () => normalizeLabelResult({ isNutritionLabel: true }),
    /could not be read/,
  );
});

test("review scales only the chosen column, supports decimals, and combines reviewed items", () => {
  const first = reviewedScanItem(draft, 1.5);
  assert.equal(first.calories, 180);
  assert.equal(first.protein, 25.5);
  const second = reviewedScanItem(
    {
      ...draft,
      name: "Milk",
      nutritionBasis: "per_100ml",
      servingSize: "100 ml",
    },
    0.5,
  );
  assert.deepEqual(combineScannedItems([first, second]), {
    food: "Yogurt (1.5×) + Milk (0.5×)",
    calories: 240,
    protein: 34,
    carbs: 16,
    fat: 0,
  });
  for (const value of ["", -1, Infinity, "oops"])
    assert.throws(() => reviewedScanItem({ ...draft, protein: value }, 1));
  for (const value of ["", 0, -1, Infinity, 1001])
    assert.throws(() => reviewedScanItem(draft, value));
});

test("label uploads reject unsupported types and oversized or malformed base64 before using AI", () => {
  assert.deepEqual(
    validateLabelImage({ mimeType: "image/jpeg", image: "YWJj" }),
    { mimeType: "image/jpeg", image: "YWJj" },
  );
  assert.throws(() =>
    validateLabelImage({ mimeType: "image/heic", image: "YWJj" }),
  );
  assert.throws(() =>
    validateLabelImage({ mimeType: "image/jpeg", image: "bad!!" }),
  );
  assert.throws(() =>
    validateLabelImage({
      mimeType: "image/jpeg",
      image: "A".repeat(Math.ceil(MAX_LABEL_IMAGE_BYTES / 3) * 4 + 4),
    }),
  );
});
