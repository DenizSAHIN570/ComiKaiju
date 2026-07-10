import { describe, it, expect, vi } from "vitest";

vi.mock("$lib/storage/comicStorage", () => {
  const store = new Map<string, unknown>();
  return {
    comicStorage: {
      saveSetting: vi.fn((k: string, v: unknown) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      getSetting: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    },
  };
});

import { themeStorage } from "./themeStorage";
import { PRESETS } from "./themeSchema";

describe("themeStorage", () => {
  it("defaults mode to system and active to default", async () => {
    expect(await themeStorage.getMode()).toBe("system");
    expect(await themeStorage.getActiveThemeId()).toBe("preset-default");
  });
  it("round-trips user themes and drops invalid ones", async () => {
    const custom = {
      ...structuredClone(PRESETS[0]),
      id: "custom-1",
      builtIn: false,
    };
    await themeStorage.saveThemes([custom, { junk: true } as never]);
    const out = await themeStorage.getThemes();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("custom-1");
  });
});
