import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolvePalette, applyTheme } from "./themeEngine";
import { PRESETS, CSS_VAR } from "./themeSchema";

const theme = PRESETS[0];

function stubMatchMediaDark() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }),
  );
}

describe("resolvePalette", () => {
  beforeEach(stubMatchMediaDark);
  it("returns dark half for dark mode", () => {
    expect(resolvePalette(theme, "dark").palette.bgMain).toBe(theme.dark.bgMain);
  });
  it("returns light half for light mode", () => {
    const r = resolvePalette(theme, "light");
    expect(r.isDark).toBe(false);
    expect(r.palette.bgMain).toBe(theme.light.bgMain);
  });
  it("resolves system via matchMedia", () => {
    expect(resolvePalette(theme, "system").isDark).toBe(true);
  });
});

describe("applyTheme", () => {
  beforeEach(() => {
    stubMatchMediaDark();
    document.documentElement.removeAttribute("style");
    document.documentElement.className = "";
    document.head.innerHTML = '<meta name="theme-color" content="#000">';
  });
  it("sets every color var + font + hover + class + meta", () => {
    applyTheme(theme, "dark");
    const s = document.documentElement.style;
    expect(s.getPropertyValue(CSS_VAR.bgMain).trim()).toBe(theme.dark.bgMain);
    expect(s.getPropertyValue("--color-primary-hover")).not.toBe("");
    expect(s.getPropertyValue("--font-base")).toContain("sans-serif");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(
      document
        .querySelector('meta[name="theme-color"]')!
        .getAttribute("content"),
    ).toBe(theme.dark.bgMain);
  });
});
