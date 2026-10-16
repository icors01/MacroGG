export const DEFAULT_SCHEME_ID = "fieldwork";

const theme = (
  pageBg,
  surface,
  surfaceSoft,
  text,
  muted,
  line,
  accent,
  accentText,
  accentSoft,
  secondaryAccent,
) => ({
  pageBg,
  surface,
  surfaceSoft,
  text,
  muted,
  line,
  accent,
  accentText,
  accentSoft,
  secondaryAccent,
  proteinColor: "#6a8aaf",
  carbColor: "#c7a36a",
  fatColor: "#aa8e9d",
});

export const COLOR_SCHEMES = [
  {
    id: "fieldwork",
    name: "Fieldwork",
    description: "Forest green & warm neutrals",
    light: theme(
      "#f6f7f3",
      "#ffffff",
      "#f4f6f2",
      "#242d27",
      "#687168",
      "#e4e8e0",
      "#24634d",
      "#24634d",
      "#eaf1e9",
      "#496f8b",
    ),
    dark: theme(
      "#171c19",
      "#202722",
      "#29312b",
      "#e8eee8",
      "#a4b0a6",
      "#354038",
      "#3f7459",
      "#b1cdbb",
      "#2b3b2f",
      "#7c9ab7",
    ),
  },
  {
    id: "atlantic",
    name: "Atlantic",
    description: "Coastal blue & cool whites",
    light: theme(
      "#f3f6f8",
      "#ffffff",
      "#edf2f7",
      "#243342",
      "#647488",
      "#e0e7ef",
      "#315f8a",
      "#315f8a",
      "#e7eff7",
      "#657b98",
    ),
    dark: theme(
      "#131d28",
      "#1d2937",
      "#273546",
      "#e4edf7",
      "#9eafc1",
      "#34475c",
      "#416e98",
      "#b3cee6",
      "#22374d",
      "#9db0c9",
    ),
  },
  {
    id: "ember",
    name: "Ember",
    description: "Terracotta & soft sand",
    light: theme(
      "#fbf5ef",
      "#fffcf8",
      "#f5ebe2",
      "#3d302b",
      "#806c60",
      "#eaded2",
      "#98452f",
      "#98452f",
      "#f3e3d7",
      "#8a7055",
    ),
    dark: theme(
      "#241a17",
      "#30231e",
      "#3b2b24",
      "#f2e7dd",
      "#c0aa9a",
      "#4c3830",
      "#9c503b",
      "#e9b6a3",
      "#473026",
      "#c7a78b",
    ),
  },
  {
    id: "afterhours",
    name: "Afterhours",
    description: "Plum & muted lavender",
    light: theme(
      "#f7f3f9",
      "#ffffff",
      "#f0eaf5",
      "#372e40",
      "#74667e",
      "#e7deec",
      "#704c83",
      "#704c83",
      "#ede3f2",
      "#7d729a",
    ),
    dark: theme(
      "#1c1724",
      "#282032",
      "#342941",
      "#eee7f4",
      "#b3a4c0",
      "#453550",
      "#785184",
      "#d4b6df",
      "#3a2946",
      "#b6a5cc",
    ),
  },
  {
    id: "sunroom",
    name: "Sunroom",
    description: "Ochre & warm cream",
    light: theme(
      "#fbf8ef",
      "#fffdf7",
      "#f5efdd",
      "#3d3527",
      "#7b705c",
      "#e9e1cd",
      "#80601f",
      "#80601f",
      "#f3e9c9",
      "#857d55",
    ),
    dark: theme(
      "#201d16",
      "#2b271d",
      "#373124",
      "#efe9da",
      "#bfb49c",
      "#49412f",
      "#80611f",
      "#e4cb8d",
      "#3e3420",
      "#b5aa80",
    ),
  },
  {
    id: "slate",
    name: "Slate",
    description: "Charcoal & soft silver",
    light: theme(
      "#f5f6f7",
      "#ffffff",
      "#eff1f3",
      "#2e3339",
      "#6b737b",
      "#e1e5e9",
      "#4b5869",
      "#4b5869",
      "#e8ecf0",
      "#64748b",
    ),
    dark: theme(
      "#181b20",
      "#22262d",
      "#2d333c",
      "#e7ebf1",
      "#a6b0be",
      "#3c444f",
      "#526174",
      "#c1ccd9",
      "#303a47",
      "#9ba9bc",
    ),
  },
];

export const isColorScheme = (id) =>
  COLOR_SCHEMES.some((scheme) => scheme.id === id);
export const getColorScheme = (id) =>
  COLOR_SCHEMES.find((scheme) => scheme.id === id) || COLOR_SCHEMES[0];

export function getThemeStyle(id, isDarkMode = false) {
  return Object.fromEntries(
    Object.entries(getColorScheme(id)[isDarkMode ? "dark" : "light"]).map(
      ([key, value]) => [
        "--" + key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()),
        value,
      ],
    ),
  );
}

// Keep the old fields in sync for clients that have not upgraded yet. A null
// scheme preserves existing custom colors until the user explicitly picks one.
export function getSchemeSettings(id) {
  if (!isColorScheme(id)) return {};
  const { light, dark } = getColorScheme(id);
  return {
    primaryColor: light.accent,
    secondaryColor: light.secondaryAccent,
    backgroundColor: dark.pageBg,
    windowColor: dark.surface,
    nameGradientStart: light.accent,
    nameGradientMiddle: light.accent,
    nameGradientEnd: light.accent,
    nameGlow: light.accent,
    nameGlowIntensity: 0,
  };
}
