import { describe, it, expect } from "vitest";
import { PRESETS, PALETTE_KEYS, DEFAULT_THEME_ID } from "./themeSchema";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("presets", () => {
  it("includes the default preset first", () => {
    expect(PRESETS[0].id).toBe(DEFAULT_THEME_ID);
  });
  it("every preset has all palette keys as valid hex in both modes", () => {
    for (const t of PRESETS) {
      for (const mode of ["light", "dark"] as const) {
        for (const k of PALETTE_KEYS) {
          expect(HEX.test(t[mode][k]), `${t.id}.${mode}.${k}=${t[mode][k]}`).toBe(
            true,
          );
        }
      }
    }
  });
  it("all presets are builtIn", () => {
    expect(PRESETS.every((t) => t.builtIn)).toBe(true);
  });
});
