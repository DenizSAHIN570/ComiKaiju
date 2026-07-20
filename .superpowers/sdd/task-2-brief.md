## Task 2: Theme picker ordering logic (TDD)

**Files:**
- Create: `src/lib/theme/themeOrder.ts`
- Test: `src/lib/theme/themeOrder.test.ts`

**Interfaces:**
- Produces:
  - `export interface ThemeMetaEntry { createdAt?: number; lastUsedAt?: number }`
  - `export type ThemeMeta = Record<string, ThemeMetaEntry>`
  - `export function orderThemesForPicker(themes: Theme[], meta: ThemeMeta, presetIds: Set<string>, limit?: number): Theme[]` — returns at most `limit` (default 3) themes: user-made first (newest `createdAt` first), then remaining by most-recent `lastUsedAt`; with no user themes, purely most-recently-used (falling back to input order when no usage data).

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/themeOrder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { orderThemesForPicker, type ThemeMeta } from "./themeOrder";
import type { Theme } from "./themeSchema";

const t = (id: string): Theme =>
  ({ id, name: id, builtIn: false, light: {}, dark: {}, font: "system-sans" }) as unknown as Theme;

const presets = new Set(["preset-default", "preset-sepia", "preset-hc"]);
const D = t("preset-default"), S = t("preset-sepia"), H = t("preset-hc");

describe("orderThemesForPicker", () => {
  it("no custom, no usage → first 3 in input order", () => {
    const out = orderThemesForPicker([D, S, H], {}, presets);
    expect(out.map((x) => x.id)).toEqual(["preset-default", "preset-sepia", "preset-hc"]);
  });

  it("no custom → most-recently-used first", () => {
    const meta: ThemeMeta = {
      "preset-default": { lastUsedAt: 100 },
      "preset-sepia": { lastUsedAt: 300 },
      "preset-hc": { lastUsedAt: 200 },
    };
    const out = orderThemesForPicker([D, S, H], meta, presets);
    expect(out.map((x) => x.id)).toEqual(["preset-sepia", "preset-hc", "preset-default"]);
  });

  it("one custom → custom first, then recently used", () => {
    const C = t("custom-1");
    const meta: ThemeMeta = {
      "custom-1": { createdAt: 999 },
      "preset-default": { lastUsedAt: 300 },
      "preset-sepia": { lastUsedAt: 200 },
    };
    const out = orderThemesForPicker([D, S, H, C], meta, presets);
    expect(out.map((x) => x.id)).toEqual(["custom-1", "preset-default", "preset-sepia"]);
  });

  it("4+ custom → all custom newest-first, presets drop, capped at 3", () => {
    const c1 = t("c1"), c2 = t("c2"), c3 = t("c3"), c4 = t("c4");
    const meta: ThemeMeta = {
      c1: { createdAt: 1 }, c2: { createdAt: 2 }, c3: { createdAt: 3 }, c4: { createdAt: 4 },
    };
    const out = orderThemesForPicker([D, S, H, c1, c2, c3, c4], meta, presets);
    expect(out.map((x) => x.id)).toEqual(["c4", "c3", "c2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- themeOrder`
Expected: FAIL ("Cannot find module './themeOrder'").

- [ ] **Step 3: Write the implementation**

Create `src/lib/theme/themeOrder.ts`:

```ts
import type { Theme } from "./themeSchema";

export interface ThemeMetaEntry {
  createdAt?: number;
  lastUsedAt?: number;
}
export type ThemeMeta = Record<string, ThemeMetaEntry>;

/**
 * The quick theme picker shows at most `limit` themes.
 * User-made themes come first, newest-created first; remaining slots are filled
 * by most-recently-used themes. With no user themes it is purely most-recently-used
 * (input order preserved where there is no usage data, thanks to stable sort).
 */
export function orderThemesForPicker(
  themes: Theme[],
  meta: ThemeMeta,
  presetIds: Set<string>,
  limit = 3,
): Theme[] {
  const customs = themes
    .filter((th) => !presetIds.has(th.id))
    .sort((a, b) => (meta[b.id]?.createdAt ?? 0) - (meta[a.id]?.createdAt ?? 0));
  const seen = new Set(customs.map((th) => th.id));
  const rest = themes
    .filter((th) => !seen.has(th.id))
    .sort((a, b) => (meta[b.id]?.lastUsedAt ?? 0) - (meta[a.id]?.lastUsedAt ?? 0));
  return [...customs, ...rest].slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- themeOrder`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/themeOrder.ts src/lib/theme/themeOrder.test.ts
git commit -m "feat(theme): add tested 3-item theme picker ordering"
```

---

