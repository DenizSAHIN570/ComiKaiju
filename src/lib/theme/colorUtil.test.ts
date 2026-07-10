import { describe, it, expect } from "vitest";
import { hexToHsl, hslToHex, deriveHover } from "./colorUtil";

describe("colorUtil", () => {
  it("round-trips hex through hsl (hue preserved)", () => {
    const hsl = hexToHsl("#ff6600");
    const out = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    expect(hexToHsl(out).h).toBeCloseTo(24, 0);
  });
  it("deriveHover lightens in dark mode", () => {
    expect(hexToHsl(deriveHover("#808080", true)).l).toBeGreaterThan(50);
  });
  it("deriveHover darkens in light mode", () => {
    expect(hexToHsl(deriveHover("#808080", false)).l).toBeLessThan(50);
  });
  it("clamps at bounds", () => {
    expect(deriveHover("#ffffff", true)).toBe("#ffffff");
    expect(deriveHover("#000000", false)).toBe("#000000");
  });
});
