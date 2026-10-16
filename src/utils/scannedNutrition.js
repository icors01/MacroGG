export const NUTRIENTS = ["calories", "protein", "carbs", "fat"];
export const MAX_LABEL_IMAGE_BYTES = 3_000_000;
export const LABEL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const NUTRITION_BASES = [
  "per_serving",
  "per_100g",
  "per_100ml",
  "per_package",
  "unknown",
];

const amount = (value) =>
  (typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "")) &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0
    ? Number(value)
    : null;

export function validateLabelImage(body) {
  if (!LABEL_IMAGE_TYPES.includes(body?.mimeType))
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  if (
    typeof body.image !== "string" ||
    !body.image ||
    body.image.length > Math.ceil(MAX_LABEL_IMAGE_BYTES / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image) ||
    body.image.length % 4 !== 0
  ) {
    throw new Error("Use a photo smaller than 3 MB after resizing.");
  }
  return { mimeType: body.mimeType, image: body.image };
}

export function normalizeLabelResult(result) {
  if (result?.isNutritionLabel !== true)
    throw new Error(
      "No readable nutrition label found. Try a clearer photo of the full panel.",
    );
  const nutrients = Object.fromEntries(
    NUTRIENTS.map((key) => [key, amount(result[key])]),
  );
  if (NUTRIENTS.every((key) => nutrients[key] === null))
    throw new Error(
      "The nutrition values could not be read. Try a closer photo.",
    );
  return {
    name:
      typeof result.name === "string" ? result.name.trim().slice(0, 150) : "",
    servingSize:
      typeof result.servingSize === "string"
        ? result.servingSize.trim().slice(0, 150)
        : "",
    nutritionBasis: NUTRITION_BASES.includes(result.nutritionBasis)
      ? result.nutritionBasis
      : "unknown",
    ...nutrients,
    warnings: Array.isArray(result.warnings)
      ? result.warnings
          .filter((w) => typeof w === "string")
          .slice(0, 4)
          .map((w) => w.slice(0, 250))
      : [],
    source: "label",
  };
}

export function productNutrition(product) {
  const n = product.nutriments || {};
  const energy = (suffix) => {
    const kcal = amount(n["energy-kcal_" + suffix]);
    if (kcal !== null) return kcal;
    const kj = amount(n["energy-kj_" + suffix]);
    if (kj !== null) return kj / 4.184;
    const generic = amount(n["energy_" + suffix]);
    return generic === null
      ? null
      : n.energy_unit === "kcal"
        ? generic
        : generic / 4.184;
  };
  const read = (suffix) => ({
    calories: energy(suffix),
    protein: amount(n["proteins_" + suffix]),
    carbs: amount(n["carbohydrates_" + suffix]),
    fat: amount(n["fat_" + suffix]),
  });
  const perServing = read("serving");
  const hasServing = NUTRIENTS.some((key) => perServing[key] !== null);
  const values = hasServing ? perServing : read("100g");
  if (NUTRIENTS.every((key) => values[key] === null))
    throw new Error(
      "This barcode has no nutrition data. Photograph the label instead.",
    );
  return {
    name: product.product_name || "",
    servingSize: hasServing
      ? product.serving_size || "1 serving (check the package)"
      : "100 g / 100 ml (check the package)",
    nutritionBasis: hasServing ? "per_serving" : "unknown",
    ...values,
    warnings: [
      hasServing
        ? "Check the serving size against your package."
        : "Database values are per 100 g or 100 ml. Confirm the unit and portion before adding.",
    ],
    source: "barcode",
  };
}

export function reviewedScanItem(draft, servings) {
  if (!draft.name?.trim()) throw new Error("Enter a meal name.");
  if (
    !NUTRITION_BASES.includes(draft.nutritionBasis) ||
    draft.nutritionBasis === "unknown"
  )
    throw new Error("Confirm which portion the nutrition values describe.");
  if (!draft.servingSize?.trim())
    throw new Error("Enter the portion size shown on the label.");
  const count = amount(servings);
  if (count === null || count <= 0 || count > 1000)
    throw new Error(
      "Enter a portion count greater than 0 and no more than 1,000.",
    );
  const values = Object.fromEntries(
    NUTRIENTS.map((key) => {
      const value = amount(draft[key]);
      if (value === null)
        throw new Error(
          "Review every macro. Enter 0 when the label shows zero.",
        );
      const total = Math.round(value * count * 10) / 10;
      if (!Number.isFinite(total))
        throw new Error("The nutrition values are too large.");
      return [key, total];
    }),
  );
  return { food: draft.name.trim(), ...values, servings: count };
}

export function combineScannedItems(items) {
  return {
    food: items
      .map(
        (item) =>
          `${item.food}${item.servings !== 1 ? ` (${item.servings}×)` : ""}`,
      )
      .join(" + "),
    ...Object.fromEntries(
      NUTRIENTS.map((key) => [
        key,
        Math.round(items.reduce((sum, item) => sum + item[key], 0) * 10) / 10,
      ]),
    ),
  };
}
