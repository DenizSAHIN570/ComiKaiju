import { describe, it, expect } from "vitest";
import { orderThemesForPicker, type ThemeMeta } from "./themeOrder";
import type { Theme } from "./themeSchema";

const t = (id: string): Theme =>
  ({
    id,
    name: id,
    builtIn: false,
    light: {},
    dark: {},
    font: "system-sans",
  }) as unknown as Theme;

const presets = new Set(["preset-default", "preset-sepia", "preset-hc"]);
const D = t("preset-default"),
  S = t("preset-sepia"),
  H = t("preset-hc");

describe("orderThemesForPicker", () => {
  it("no custom, no usage → first 3 in input order", () => {
    const out = orderThemesForPicker([D, S, H], {}, presets);
    expect(out.map((x) => x.id)).toEqual([
      "preset-default",
      "preset-sepia",
      "preset-hc",
    ]);
  });

  it("no custom → most-recently-used first", () => {
    const meta: ThemeMeta = {
      "preset-default": { lastUsedAt: 100 },
      "preset-sepia": { lastUsedAt: 300 },
      "preset-hc": { lastUsedAt: 200 },
    };
    const out = orderThemesForPicker([D, S, H], meta, presets);
    expect(out.map((x) => x.id)).toEqual([
      "preset-sepia",
      "preset-hc",
      "preset-default",
    ]);
  });

  it("one custom → custom first, then recently used", () => {
    const C = t("custom-1");
    const meta: ThemeMeta = {
      "custom-1": { createdAt: 999 },
      "preset-default": { lastUsedAt: 300 },
      "preset-sepia": { lastUsedAt: 200 },
    };
    const out = orderThemesForPicker([D, S, H, C], meta, presets);
    expect(out.map((x) => x.id)).toEqual([
      "custom-1",
      "preset-default",
      "preset-sepia",
    ]);
  });

  it("4+ custom → all custom newest-first, presets drop, capped at 3", () => {
    const c1 = t("c1"),
      c2 = t("c2"),
      c3 = t("c3"),
      c4 = t("c4");
    const meta: ThemeMeta = {
      c1: { createdAt: 1 },
      c2: { createdAt: 2 },
      c3: { createdAt: 3 },
      c4: { createdAt: 4 },
    };
    const out = orderThemesForPicker([D, S, H, c1, c2, c3, c4], meta, presets);
    expect(out.map((x) => x.id)).toEqual(["c4", "c3", "c2"]);
  });
});
