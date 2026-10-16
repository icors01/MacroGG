import test from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_SCHEMES,
  DEFAULT_SCHEME_ID,
  getColorScheme,
  getSchemeSettings,
  getThemeStyle,
  isColorScheme,
} from "../src/utils/colorSchemes.js";

const luminance = (hex) => {
  const channels = hex
    .match(/[a-f\d]{2}/gi)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a, b) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);

test("every named palette supplies a complete light and dark theme", () => {
  assert.equal(
    new Set(COLOR_SCHEMES.map((scheme) => scheme.id)).size,
    COLOR_SCHEMES.length,
  );
  assert.equal(
    new Set(COLOR_SCHEMES.map((scheme) => scheme.name)).size,
    COLOR_SCHEMES.length,
  );
  for (const scheme of COLOR_SCHEMES) {
    for (const mode of ["light", "dark"]) {
      assert.deepEqual(
        Object.keys(scheme[mode]),
        Object.keys(COLOR_SCHEMES[0].light),
      );
      for (const color of Object.values(scheme[mode]))
        assert.match(color, /^#[\da-f]{6}$/i);
      const styles = getThemeStyle(scheme.id, mode === "dark");
      assert.equal(styles["--page-bg"], scheme[mode].pageBg);
      assert.equal(styles["--accent"], scheme[mode].accent);
      assert.equal(styles["--surface-soft"], scheme[mode].surfaceSoft);
    }
  }
});

test("palette text and primary buttons have at least 4.5:1 contrast", () => {
  for (const scheme of COLOR_SCHEMES) {
    for (const mode of ["light", "dark"]) {
      const colors = scheme[mode];
      for (const [foreground, background] of [
        [colors.text, colors.surface],
        [colors.muted, colors.surface],
        [colors.text, colors.pageBg],
        [colors.accentText, colors.surface],
        ["#ffffff", colors.accent],
      ]) {
        assert.ok(
          contrast(foreground, background) >= 4.5,
          `${scheme.name} ${mode}: ${foreground} on ${background}`,
        );
      }
    }
  }
});

test("unrecognized scheme IDs fall back for rendering and never overwrite legacy preferences", () => {
  assert.equal(isColorScheme("missing"), false);
  assert.equal(getColorScheme("missing").id, DEFAULT_SCHEME_ID);
  assert.deepEqual(getSchemeSettings(null), {});
  assert.deepEqual(getSchemeSettings("missing"), {});
});

test("scheme compatibility settings do not include user data or unrelated preferences", () => {
  const settings = getSchemeSettings("ember");
  assert.equal(settings.primaryColor, getColorScheme("ember").light.accent);
  assert.equal(settings.backgroundColor, getColorScheme("ember").dark.pageBg);
  assert.equal(settings.nameGlowIntensity, 0);
  assert.equal("customMeals" in settings, false);
  assert.equal("dailyGoal" in settings, false);
  assert.equal("username" in settings, false);
});

test("preview theme objects are independent of saved scheme definitions", () => {
  const preview = getThemeStyle("atlantic");
  preview["--accent"] = "#000000";
  assert.equal(getThemeStyle("atlantic")["--accent"], "#315f8a");
});
