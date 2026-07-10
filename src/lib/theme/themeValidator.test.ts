import { describe, it, expect } from "vitest";
import { themeValidator } from "./themeValidator";
import { PRESETS } from "./themeSchema";

const good = PRESETS[0];

describe("themeValidator", () => {
  it("accepts a valid theme", () => {
    expect(themeValidator.validate(good).valid).toBe(true);
  });
  it("rejects a bad hex value", () => {
    const bad = structuredClone(good);
    bad.light.primary = "red";
    const r = themeValidator.validate(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toContain("primary");
  });
  it("rejects an out-of-enum font", () => {
    const bad = structuredClone(good) as unknown as Record<string, unknown>;
    bad.font = "comic-sans";
    expect(themeValidator.validate(bad).valid).toBe(false);
  });
  it("rejects a missing palette key", () => {
    const bad = structuredClone(good) as unknown as {
      dark: Record<string, unknown>;
    };
    delete bad.dark.border;
    expect(themeValidator.validate(bad).valid).toBe(false);
  });
  it("rejects empty and overlong names", () => {
    const empty = { ...structuredClone(good), name: "" };
    const long = { ...structuredClone(good), name: "x".repeat(61) };
    expect(themeValidator.validate(empty).valid).toBe(false);
    expect(themeValidator.validate(long).valid).toBe(false);
  });
  it("rejects non-objects", () => {
    expect(themeValidator.validate(null).valid).toBe(false);
    expect(themeValidator.validate("nope").valid).toBe(false);
  });
  it("validateOrThrow throws on invalid", () => {
    expect(() => themeValidator.validateOrThrow(null)).toThrow();
  });
});
