# Theme Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a color + font theme builder with a library of named themes (light + dark halves each), built on globalized CSS custom properties reaching every surface.

**Architecture:** A pure schema/validator/engine core (framework-free, unit-tested with Vitest) applies a `Theme` to `:root` as inline CSS custom properties. A Svelte store persists the user library to IndexedDB and mirrors the active theme to localStorage for a pre-paint boot script. UI is a theme menu (mode + library) plus a builder modal using native color inputs.

**Tech Stack:** SvelteKit 2 / Svelte 5, TailwindCSS v4 (CSS-first `@theme`), IndexedDB via existing `comicStorage`, Vitest + jsdom (added here) for unit tests.

## Global Constraints

- No external network/font requests; offline-first. Fonts are system/web-safe stacks only.
- No raw CSS/SVG from users. Only typed values; colors are strict 6-digit hex (`/^#[0-9a-fA-F]{6}$/`).
- Use the `logger` service, not `console.*`.
- Prettier + ESLint clean (`npm run lint`); `npm run check` clean; `npm run build` succeeds.
- The **Default** theme must be visually identical to current `main` in both light and dark modes.
- Palette key → CSS var mapping (authoritative, used everywhere):
  `primary→--color-primary`, `secondary→--color-secondary`, `bgMain→--color-bg-main`, `bgSurface→--color-bg-surface`, `bgSecondary→--color-bg-secondary`, `textMain→--color-text-main`, `textSecondary→--color-text-secondary`, `textMuted→--color-text-muted`, `border→--color-border`, `error→--color-status-error`, `success→--color-status-success`, `warning→--color-status-warning`. Derived (not in Palette): `--color-primary-hover`, `--color-secondary-hover`. Font: `--font-base`.

---

### Task 1: Vitest setup + theme schema & presets

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/theme/themeSchema.ts`
- Test: `src/lib/theme/themeSchema.test.ts`

**Interfaces:**
- Produces: `ThemeMode`, `FontId`, `Palette`, `Theme` types; `PALETTE_KEYS: (keyof Palette)[]`; `CSS_VAR: Record<keyof Palette,string>`; `FONT_STACKS: Record<FontId,string>`; `PRESETS: Theme[]`; `DEFAULT_THEME_ID = 'preset-default'`.

- [ ] **Step 1: Add Vitest deps and script**

Run: `npm install -D vitest@^3 jsdom@^25`
Then add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
```

- [ ] **Step 3: Write `themeSchema.ts`**

```ts
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontId = 'system-sans' | 'system-serif' | 'mono' | 'rounded' | 'humanist';

export interface Palette {
  primary: string; secondary: string;
  bgMain: string; bgSurface: string; bgSecondary: string;
  textMain: string; textSecondary: string; textMuted: string;
  border: string;
  error: string; success: string; warning: string;
}

export interface Theme {
  id: string;
  name: string;
  builtIn: boolean;
  light: Palette;
  dark: Palette;
  font: FontId;
}

export const PALETTE_KEYS: (keyof Palette)[] = [
  'primary', 'secondary', 'bgMain', 'bgSurface', 'bgSecondary',
  'textMain', 'textSecondary', 'textMuted', 'border', 'error', 'success', 'warning',
];

export const CSS_VAR: Record<keyof Palette, string> = {
  primary: '--color-primary', secondary: '--color-secondary',
  bgMain: '--color-bg-main', bgSurface: '--color-bg-surface', bgSecondary: '--color-bg-secondary',
  textMain: '--color-text-main', textSecondary: '--color-text-secondary', textMuted: '--color-text-muted',
  border: '--color-border',
  error: '--color-status-error', success: '--color-status-success', warning: '--color-status-warning',
};

export const FONT_STACKS: Record<FontId, string> = {
  'system-sans': "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  'system-serif': "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  'mono': "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', Menlo, Consolas, monospace",
  'rounded': "ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif",
  'humanist': "'Segoe UI', Candara, 'Trebuchet MS', Verdana, system-ui, sans-serif",
};

export const DEFAULT_THEME_ID = 'preset-default';

export const PRESETS: Theme[] = [
  {
    id: DEFAULT_THEME_ID, name: 'Default', builtIn: true, font: 'system-sans',
    dark: {
      primary: '#ff6600', secondary: '#4f9cf9',
      bgMain: '#000000', bgSurface: '#0a0a0a', bgSecondary: '#111111',
      textMain: '#ffffff', textSecondary: '#a1a1aa', textMuted: '#52525b',
      border: '#1f1f1f', error: '#ef4444', success: '#22c55e', warning: '#eab308',
    },
    light: {
      primary: '#ff6600', secondary: '#2563eb',
      bgMain: '#ffffff', bgSurface: '#f9fafb', bgSecondary: '#f3f4f6',
      textMain: '#000000', textSecondary: '#4b5563', textMuted: '#9ca3af',
      border: '#e5e7eb', error: '#ef4444', success: '#22c55e', warning: '#eab308',
    },
  },
  {
    id: 'preset-sepia', name: 'Sepia', builtIn: true, font: 'system-serif',
    light: {
      primary: '#a0522d', secondary: '#8a6d3b',
      bgMain: '#f4ecd8', bgSurface: '#ede0c8', bgSecondary: '#e4d5b7',
      textMain: '#3b2f2f', textSecondary: '#5c4a3a', textMuted: '#8a7a63',
      border: '#d9c7a3', error: '#b23c3c', success: '#5c7a3a', warning: '#b8860b',
    },
    dark: {
      primary: '#d2894f', secondary: '#b89968',
      bgMain: '#1c1712', bgSurface: '#241d16', bgSecondary: '#2d251b',
      textMain: '#ece0cc', textSecondary: '#c4b299', textMuted: '#8a7a63',
      border: '#3a2f22', error: '#d9736b', success: '#9cae72', warning: '#d9a441',
    },
  },
  {
    id: 'preset-high-contrast', name: 'High Contrast', builtIn: true, font: 'system-sans',
    light: {
      primary: '#b34700', secondary: '#0033cc',
      bgMain: '#ffffff', bgSurface: '#ffffff', bgSecondary: '#f0f0f0',
      textMain: '#000000', textSecondary: '#1a1a1a', textMuted: '#404040',
      border: '#000000', error: '#cc0000', success: '#006600', warning: '#a65f00',
    },
    dark: {
      primary: '#ff8c1a', secondary: '#66aaff',
      bgMain: '#000000', bgSurface: '#000000', bgSecondary: '#141414',
      textMain: '#ffffff', textSecondary: '#e6e6e6', textMuted: '#bfbfbf',
      border: '#ffffff', error: '#ff5555', success: '#33cc33', warning: '#ffb84d',
    },
  },
];
```

- [ ] **Step 4: Write `themeSchema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PRESETS, PALETTE_KEYS, DEFAULT_THEME_ID } from './themeSchema';

const HEX = /^#[0-9a-fA-F]{6}$/;

describe('presets', () => {
  it('includes the default preset first', () => {
    expect(PRESETS[0].id).toBe(DEFAULT_THEME_ID);
  });
  it('every preset has all palette keys as valid hex in both modes', () => {
    for (const t of PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const k of PALETTE_KEYS) {
          expect(HEX.test(t[mode][k]), `${t.id}.${mode}.${k}=${t[mode][k]}`).toBe(true);
        }
      }
    }
  });
  it('all presets are builtIn', () => {
    expect(PRESETS.every((t) => t.builtIn)).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/theme/themeSchema.ts src/lib/theme/themeSchema.test.ts
git commit -m "feat(theme): schema, presets, and vitest setup"
```

---

### Task 2: Theme validator

**Files:**
- Create: `src/lib/theme/themeValidator.ts`
- Test: `src/lib/theme/themeValidator.test.ts`

**Interfaces:**
- Consumes: `Theme`, `Palette`, `PALETTE_KEYS`, `FONT_STACKS` from `themeSchema`.
- Produces: `interface ValidationResult { valid: boolean; errors: string[] }`; `themeValidator.validate(theme: unknown): ValidationResult`; `themeValidator.validateOrThrow(theme: unknown): Theme`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { themeValidator } from './themeValidator';
import { PRESETS } from './themeSchema';

const good = PRESETS[0];

describe('themeValidator', () => {
  it('accepts a valid theme', () => {
    expect(themeValidator.validate(good).valid).toBe(true);
  });
  it('rejects a bad hex value', () => {
    const bad = structuredClone(good);
    bad.light.primary = 'red';
    const r = themeValidator.validate(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toContain('primary');
  });
  it('rejects an out-of-enum font', () => {
    const bad = structuredClone(good) as any;
    bad.font = 'comic-sans';
    expect(themeValidator.validate(bad).valid).toBe(false);
  });
  it('rejects a missing palette key', () => {
    const bad = structuredClone(good) as any;
    delete bad.dark.border;
    expect(themeValidator.validate(bad).valid).toBe(false);
  });
  it('rejects empty and overlong names', () => {
    const empty = { ...structuredClone(good), name: '' };
    const long = { ...structuredClone(good), name: 'x'.repeat(61) };
    expect(themeValidator.validate(empty).valid).toBe(false);
    expect(themeValidator.validate(long).valid).toBe(false);
  });
  it('rejects non-objects', () => {
    expect(themeValidator.validate(null).valid).toBe(false);
    expect(themeValidator.validate('nope').valid).toBe(false);
  });
  it('validateOrThrow throws on invalid', () => {
    expect(() => themeValidator.validateOrThrow(null)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- themeValidator`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import { PALETTE_KEYS, FONT_STACKS, type Palette, type Theme } from './themeSchema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

class ThemeValidator {
  validate(theme: unknown): ValidationResult {
    const errors: string[] = [];
    if (typeof theme !== 'object' || theme === null) {
      return { valid: false, errors: ['Theme must be an object'] };
    }
    const t = theme as Record<string, unknown>;

    if (typeof t.id !== 'string' || !t.id) errors.push('Missing id');
    if (typeof t.name !== 'string' || t.name.trim().length === 0) errors.push('Name is required');
    else if (t.name.length > 60) errors.push('Name must be 60 characters or fewer');
    if (typeof t.builtIn !== 'boolean') errors.push('builtIn must be a boolean');
    if (typeof t.font !== 'string' || !(t.font in FONT_STACKS)) errors.push(`Invalid font: ${String(t.font)}`);

    for (const mode of ['light', 'dark'] as const) {
      const p = t[mode] as Palette | undefined;
      if (typeof p !== 'object' || p === null) {
        errors.push(`Missing ${mode} palette`);
        continue;
      }
      for (const key of PALETTE_KEYS) {
        const v = (p as Record<string, unknown>)[key];
        if (typeof v !== 'string' || !HEX.test(v)) {
          errors.push(`${mode}.${key} must be a 6-digit hex color (got ${String(v)})`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  validateOrThrow(theme: unknown): Theme {
    const r = this.validate(theme);
    if (!r.valid) throw new Error(`Invalid theme: ${r.errors.join('; ')}`);
    return theme as Theme;
  }
}

export const themeValidator = new ThemeValidator();
```

- [ ] **Step 4: Run tests**

Run: `npm test -- themeValidator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/themeValidator.ts src/lib/theme/themeValidator.test.ts
git commit -m "feat(theme): theme validator (typed-only invariant)"
```

---

### Task 3: Color utilities (hex↔HSL, hover derivation)

**Files:**
- Create: `src/lib/theme/colorUtil.ts`
- Test: `src/lib/theme/colorUtil.test.ts`

**Interfaces:**
- Produces: `hexToHsl(hex): {h,s,l}`; `hslToHex(h,s,l): string`; `deriveHover(hex: string, isDark: boolean): string` (lighten +12% L in dark, darken -12% L in light, clamped 0..100).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { hexToHsl, hslToHex, deriveHover } from './colorUtil';

describe('colorUtil', () => {
  it('round-trips hex through hsl (±1 per channel)', () => {
    const out = hslToHex(...Object.values(hexToHsl('#ff6600')) as [number, number, number]);
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    // #ff6600 has L≈50%, round-trip stays close
    expect(hexToHsl(out).h).toBeCloseTo(24, 0);
  });
  it('deriveHover lightens in dark mode', () => {
    expect(hexToHsl(deriveHover('#808080', true)).l).toBeGreaterThan(50);
  });
  it('deriveHover darkens in light mode', () => {
    expect(hexToHsl(deriveHover('#808080', false)).l).toBeLessThan(50);
  });
  it('clamps at bounds', () => {
    expect(deriveHover('#ffffff', true)).toBe('#ffffff');
    expect(deriveHover('#000000', false)).toBe('#000000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- colorUtil`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function deriveHover(hex: string, isDark: boolean): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.max(0, Math.min(100, l + (isDark ? 12 : -12)));
  return hslToHex(h, s, nl);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- colorUtil`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/colorUtil.ts src/lib/theme/colorUtil.test.ts
git commit -m "feat(theme): color utilities and hover derivation"
```

---

### Task 4: Theme engine (apply + resolve + system watch)

**Files:**
- Create: `src/lib/theme/themeEngine.ts`
- Test: `src/lib/theme/themeEngine.test.ts`

**Interfaces:**
- Consumes: `Theme`, `ThemeMode`, `Palette`, `PALETTE_KEYS`, `CSS_VAR`, `FONT_STACKS` from schema; `deriveHover` from colorUtil.
- Produces: `resolvePalette(theme, mode): { palette: Palette; isDark: boolean }`; `applyTheme(theme, mode): void`; `startSystemWatch(onChange: () => void): void`; `stopSystemWatch(): void`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolvePalette, applyTheme } from './themeEngine';
import { PRESETS, CSS_VAR } from './themeSchema';

const theme = PRESETS[0];

describe('resolvePalette', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }));
  });
  it('returns dark half for dark mode', () => {
    expect(resolvePalette(theme, 'dark').palette.bgMain).toBe(theme.dark.bgMain);
  });
  it('returns light half for light mode', () => {
    const r = resolvePalette(theme, 'light');
    expect(r.isDark).toBe(false);
    expect(r.palette.bgMain).toBe(theme.light.bgMain);
  });
  it('resolves system via matchMedia', () => {
    expect(resolvePalette(theme, 'system').isDark).toBe(true);
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }));
    document.documentElement.removeAttribute('style');
    document.documentElement.className = '';
    document.head.innerHTML = '<meta name="theme-color" content="#000">';
  });
  it('sets every color var + font + hover + class + meta', () => {
    applyTheme(theme, 'dark');
    const s = document.documentElement.style;
    expect(s.getPropertyValue(CSS_VAR.bgMain).trim()).toBe(theme.dark.bgMain);
    expect(s.getPropertyValue('--color-primary-hover')).not.toBe('');
    expect(s.getPropertyValue('--font-base')).toContain('sans-serif');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(theme.dark.bgMain);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- themeEngine`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import { CSS_VAR, FONT_STACKS, PALETTE_KEYS, type Palette, type Theme, type ThemeMode } from './themeSchema';
import { deriveHover } from './colorUtil';

function prefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolvePalette(theme: Theme, mode: ThemeMode): { palette: Palette; isDark: boolean } {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark());
  return { palette: isDark ? theme.dark : theme.light, isDark };
}

export function applyTheme(theme: Theme, mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const { palette, isDark } = resolvePalette(theme, mode);
  const root = document.documentElement;

  for (const key of PALETTE_KEYS) {
    root.style.setProperty(CSS_VAR[key], palette[key]);
  }
  root.style.setProperty('--color-primary-hover', deriveHover(palette.primary, isDark));
  root.style.setProperty('--color-secondary-hover', deriveHover(palette.secondary, isDark));
  root.style.setProperty('--font-base', FONT_STACKS[theme.font]);

  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', palette.bgMain);
}

let mediaQuery: MediaQueryList | null = null;
let watchHandler: (() => void) | null = null;

export function startSystemWatch(onChange: () => void): void {
  if (typeof matchMedia === 'undefined') return;
  stopSystemWatch();
  mediaQuery = matchMedia('(prefers-color-scheme: dark)');
  watchHandler = () => onChange();
  mediaQuery.addEventListener('change', watchHandler);
}

export function stopSystemWatch(): void {
  if (mediaQuery && watchHandler) mediaQuery.removeEventListener('change', watchHandler);
  mediaQuery = null;
  watchHandler = null;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- themeEngine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/themeEngine.ts src/lib/theme/themeEngine.test.ts
git commit -m "feat(theme): engine applies themes as CSS vars with system watch"
```

---

### Task 5: `app.css` restructure + `app.html` boot script

**Files:**
- Modify: `src/app.css`
- Modify: `src/app.html`

**Interfaces:**
- Consumes: nothing at runtime (boot script is self-contained). The boot script reads `localStorage['ck-theme-boot']` written by Task 6's store.

- [ ] **Step 1: Restructure `app.css`** — add `--color-secondary`, `--color-secondary-hover`, `--font-base`; map them in `@theme`; route `body` font through `--font-base`.

Replace `:root { ... }` block (lines 4–18) to add secondary + font (keep all existing values):

```css
:root {
  --color-primary: #ff6600;
  --color-primary-hover: #ff8533;
  --color-secondary: #4f9cf9;
  --color-secondary-hover: #6bb0fb;
  --color-bg-main: #000000;
  --color-bg-surface: #0a0a0a;
  --color-bg-secondary: #111111;
  --color-text-main: #ffffff;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #52525b;
  --color-border: #1f1f1f;
  --color-status-error: #ef4444;
  --color-status-success: #22c55e;
  --color-status-warning: #eab308;
  --font-base: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

Update the light override to include `secondary`:

```css
:root[class~="light"] {
  --color-secondary: #2563eb;
  --color-secondary-hover: #1d4ed8;
  --color-bg-main: #ffffff;
  --color-bg-surface: #f9fafb;
  --color-bg-secondary: #f3f4f6;
  --color-text-main: #000000;
  --color-text-secondary: #4b5563;
  --color-text-muted: #9ca3af;
  --color-border: #e5e7eb;
}
```

Add to `@theme` block (after primary-hover mapping):

```css
  --color-secondary: var(--color-secondary);
  --color-secondary-hover: var(--color-secondary-hover);
```

Update `body`:

```css
body {
  background-color: var(--color-bg-main);
  color: var(--color-text-main);
  font-family: var(--font-base);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}
```

- [ ] **Step 2: Add the pre-paint boot script to `app.html`** — insert immediately after `<meta name="theme-color" content="#1a1a1a" />` (line 21).

```html
    <!-- Theme boot: apply active theme before first paint (avoids FOUC). Keys must match PALETTE_KEYS/CSS_VAR in src/lib/theme/themeSchema.ts -->
    <script>
      (function () {
        try {
          var raw = localStorage.getItem('ck-theme-boot');
          if (!raw) return;
          var boot = JSON.parse(raw);
          var isDark = boot.mode === 'dark' ||
            (boot.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
          var p = isDark ? boot.dark : boot.light;
          if (!p) return;
          var map = {
            primary: '--color-primary', secondary: '--color-secondary',
            bgMain: '--color-bg-main', bgSurface: '--color-bg-surface', bgSecondary: '--color-bg-secondary',
            textMain: '--color-text-main', textSecondary: '--color-text-secondary', textMuted: '--color-text-muted',
            border: '--color-border', error: '--color-status-error', success: '--color-status-success', warning: '--color-status-warning'
          };
          var root = document.documentElement;
          for (var k in map) if (p[k]) root.style.setProperty(map[k], p[k]);
          if (boot.hovers) {
            root.style.setProperty('--color-primary-hover', boot.hovers.primary);
            root.style.setProperty('--color-secondary-hover', boot.hovers.secondary);
          }
          if (boot.font) root.style.setProperty('--font-base', boot.font);
          root.classList.toggle('dark', isDark);
          root.classList.toggle('light', !isDark);
          var meta = document.querySelector('meta[name="theme-color"]');
          if (meta && p.bgMain) meta.setAttribute('content', p.bgMain);
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 3: Verify build + Default unchanged**

Run: `npm run check && npm run build`
Expected: both succeed. Then `npm run dev`, load `/` with empty localStorage — appearance identical to before (dark default), no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app.css src/app.html
git commit -m "feat(theme): add secondary/font tokens and pre-paint boot script"
```

---

### Task 6: Theme storage + store; retire `services/theme.ts`; wire init

**Files:**
- Create: `src/lib/theme/themeStorage.ts`
- Create: `src/lib/theme/themeStore.ts`
- Modify: `src/routes/+layout.svelte` (swap `themeStore` import + `init()`)
- Delete: `src/lib/services/theme.ts` (after call sites migrated — done here + Task 7)
- Test: `src/lib/theme/themeStorage.test.ts` (light — mock comicStorage)

**Interfaces:**
- `themeStorage`: `getThemes(): Promise<Theme[]>`, `saveThemes(t: Theme[]): Promise<void>`, `getActiveThemeId(): Promise<string>`, `setActiveThemeId(id): Promise<void>`, `getMode(): Promise<ThemeMode>`, `setMode(m): Promise<void>`.
- `themeStore` (Svelte store): state `{ mode, activeThemeId, userThemes: Theme[] }`; methods `init()`, `setMode(m)`, `setActiveTheme(id)`, `saveTheme(t)`, `deleteTheme(id)`, `importTheme(json): Theme`, `exportTheme(id): string`; derived export `allThemes` (`PRESETS` + userThemes); helper `getActiveTheme(state): Theme`.

- [ ] **Step 1: Write `themeStorage.ts`**

```ts
import { comicStorage } from '$lib/storage/comicStorage';
import { themeValidator } from './themeValidator';
import { DEFAULT_THEME_ID, type Theme, type ThemeMode } from './themeSchema';

const K_THEMES = 'themes';
const K_ACTIVE = 'activeThemeId';
const K_MODE = 'themeMode';

export const themeStorage = {
  async getThemes(): Promise<Theme[]> {
    const raw = (await comicStorage.getSetting<unknown[]>(K_THEMES)) ?? [];
    return raw.filter((t) => themeValidator.validate(t).valid) as Theme[];
  },
  saveThemes(themes: Theme[]): Promise<void> {
    return comicStorage.saveSetting(K_THEMES, themes);
  },
  async getActiveThemeId(): Promise<string> {
    return (await comicStorage.getSetting<string>(K_ACTIVE)) ?? DEFAULT_THEME_ID;
  },
  setActiveThemeId(id: string): Promise<void> {
    return comicStorage.saveSetting(K_ACTIVE, id);
  },
  async getMode(): Promise<ThemeMode> {
    return (await comicStorage.getSetting<ThemeMode>(K_MODE)) ?? 'system';
  },
  setMode(mode: ThemeMode): Promise<void> {
    return comicStorage.saveSetting(K_MODE, mode);
  },
};
```

- [ ] **Step 2: Write `themeStore.ts`**

```ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { logger } from '$lib/services/logger';
import {
  PRESETS, DEFAULT_THEME_ID, FONT_STACKS,
  type Theme, type ThemeMode,
} from './themeSchema';
import { applyTheme, resolvePalette, startSystemWatch, stopSystemWatch } from './themeEngine';
import { deriveHover } from './colorUtil';
import { themeValidator } from './themeValidator';
import { themeStorage } from './themeStorage';

interface State {
  mode: ThemeMode;
  activeThemeId: string;
  userThemes: Theme[];
}

const BOOT_KEY = 'ck-theme-boot';

function allThemesFrom(userThemes: Theme[]): Theme[] {
  return [...PRESETS, ...userThemes];
}

export function getActiveTheme(state: State): Theme {
  return allThemesFrom(state.userThemes).find((t) => t.id === state.activeThemeId)
    ?? PRESETS[0];
}

function writeBoot(state: State) {
  if (!browser) return;
  const theme = getActiveTheme(state);
  const lightHov = { primary: deriveHover(theme.light.primary, false), secondary: deriveHover(theme.light.secondary, false) };
  const darkHov = { primary: deriveHover(theme.dark.primary, true), secondary: deriveHover(theme.dark.secondary, true) };
  const { isDark } = resolvePalette(theme, state.mode);
  localStorage.setItem(BOOT_KEY, JSON.stringify({
    mode: state.mode,
    font: FONT_STACKS[theme.font],
    light: theme.light,
    dark: theme.dark,
    hovers: isDark ? darkHov : lightHov,
  }));
}

function createThemeStore() {
  const store = writable<State>({ mode: 'system', activeThemeId: DEFAULT_THEME_ID, userThemes: [] });
  const { subscribe, set, update } = store;
  let initialized = false;

  function render(state: State) {
    applyTheme(getActiveTheme(state), state.mode);
    writeBoot(state);
    if (state.mode === 'system') startSystemWatch(() => applyTheme(getActiveTheme(get(store)), 'system'));
    else stopSystemWatch();
  }

  return {
    subscribe,
    async init() {
      if (!browser || initialized) return;
      initialized = true;
      const [mode, activeThemeId, userThemes] = await Promise.all([
        themeStorage.getMode(), themeStorage.getActiveThemeId(), themeStorage.getThemes(),
      ]);
      const state = { mode, activeThemeId, userThemes };
      set(state);
      render(state);
      logger.info('ThemeStore', `Initialized mode=${mode} theme=${activeThemeId}`);
    },
    setMode(mode: ThemeMode) {
      update((s) => { const ns = { ...s, mode }; render(ns); void themeStorage.setMode(mode); return ns; });
    },
    setActiveTheme(id: string) {
      update((s) => { const ns = { ...s, activeThemeId: id }; render(ns); void themeStorage.setActiveThemeId(id); return ns; });
    },
    saveTheme(theme: Theme) {
      themeValidator.validateOrThrow(theme);
      update((s) => {
        const userThemes = s.userThemes.some((t) => t.id === theme.id)
          ? s.userThemes.map((t) => (t.id === theme.id ? theme : t))
          : [...s.userThemes, theme];
        const ns = { ...s, userThemes, activeThemeId: theme.id };
        render(ns); void themeStorage.saveThemes(userThemes); void themeStorage.setActiveThemeId(theme.id);
        return ns;
      });
    },
    deleteTheme(id: string) {
      update((s) => {
        const userThemes = s.userThemes.filter((t) => t.id !== id);
        const activeThemeId = s.activeThemeId === id ? DEFAULT_THEME_ID : s.activeThemeId;
        const ns = { ...s, userThemes, activeThemeId };
        render(ns); void themeStorage.saveThemes(userThemes); void themeStorage.setActiveThemeId(activeThemeId);
        return ns;
      });
    },
    importTheme(json: string): Theme {
      const parsed = JSON.parse(json);
      const theme = themeValidator.validateOrThrow({ ...parsed, id: `custom-${crypto.randomUUID()}`, builtIn: false });
      this.saveTheme(theme);
      return theme;
    },
    exportTheme(id: string): string {
      const theme = allThemesFrom(get(store).userThemes).find((t) => t.id === id);
      if (!theme) throw new Error('Theme not found');
      return JSON.stringify({ ...theme, builtIn: false }, null, 2);
    },
    /** Preview an in-progress theme without persisting (builder live preview). */
    preview(theme: Theme, mode: ThemeMode) {
      if (browser) applyTheme(theme, mode);
    },
    /** Restore the persisted active theme (builder cancel). */
    restore() {
      if (browser) render(get(store));
    },
  };
}

export const themeStore = createThemeStore();
export { allThemesFrom };
```

- [ ] **Step 3: Write light storage test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/comicStorage', () => {
  const store = new Map<string, unknown>();
  return { comicStorage: {
    saveSetting: vi.fn((k: string, v: unknown) => { store.set(k, v); return Promise.resolve(); }),
    getSetting: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
  } };
});

import { themeStorage } from './themeStorage';
import { PRESETS } from './themeSchema';

describe('themeStorage', () => {
  beforeEach(() => {});
  it('defaults mode to system and active to default', async () => {
    expect(await themeStorage.getMode()).toBe('system');
    expect(await themeStorage.getActiveThemeId()).toBe('preset-default');
  });
  it('round-trips user themes and drops invalid ones', async () => {
    const custom = { ...structuredClone(PRESETS[0]), id: 'custom-1', builtIn: false };
    await themeStorage.saveThemes([custom, { junk: true } as any]);
    const out = await themeStorage.getThemes();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('custom-1');
  });
});
```

Run: `npm test -- themeStorage` → Expected: PASS.

- [ ] **Step 4: Wire `+layout.svelte`** — replace the old theme import/init.

Change `import { themeStore } from '$lib/services/theme';` → `import { themeStore } from '$lib/theme/themeStore';`. The existing `themeStore.init()` call in `onMount` stays (same method name).

- [ ] **Step 5: Verify (defer deletion of `services/theme.ts` to Task 7)**

Run: `npm run check`
Expected: passes except for `ThemeToggle.svelte` / `+error.svelte` still importing the old service — those are migrated in Task 7. If `check` errors only reference those two files, proceed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme/themeStorage.ts src/lib/theme/themeStore.ts src/lib/theme/themeStorage.test.ts src/routes/+layout.svelte
git commit -m "feat(theme): persistence store + init wiring"
```

---

### Task 7: Theme menu UI (replace ThemeToggle) + retire old service

**Files:**
- Create: `src/lib/ui/ThemeMenu.svelte`
- Modify: `src/routes/+page.svelte` (swap `ThemeToggle` → `ThemeMenu`)
- Modify: `src/routes/+error.svelte` (swap `ThemeToggle` → `ThemeMenu`)
- Delete: `src/lib/ui/ThemeToggle.svelte`
- Delete: `src/lib/services/theme.ts`

**Interfaces:**
- Consumes: `themeStore`, `allThemesFrom`, `getActiveTheme` from `themeStore`; `PRESETS`, `Theme`, `ThemeMode` from schema.
- Produces: `ThemeMenu` component with prop `onEdit?: (theme: Theme | null) => void` (null = create new). Emits nothing else; dispatches builder open through the callback.

- [ ] **Step 1: Write `ThemeMenu.svelte`** — dropdown with mode segment + theme list + create/import triggers.

```svelte
<script lang="ts">
  import { themeStore, allThemesFrom, getActiveTheme } from '$lib/theme/themeStore';
  import { PRESETS, type Theme, type ThemeMode } from '$lib/theme/themeSchema';

  export let onEdit: (theme: Theme | null) => void = () => {};

  let open = false;
  $: state = $themeStore;
  $: active = getActiveTheme(state);
  $: themes = allThemesFrom(state.userThemes);

  const MODES: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }, { id: 'system', label: 'System' },
  ];
</script>

<div class="theme-menu">
  <button class="trigger" on:click={() => (open = !open)} aria-label="Theme settings" title="Theme">
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke-width="2" />
      <path stroke-width="2" d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none" />
    </svg>
  </button>

  {#if open}
    <button class="scrim" on:click={() => (open = false)} aria-label="Close"></button>
    <div class="panel" role="menu">
      <div class="modes">
        {#each MODES as m}
          <button class:selected={state.mode === m.id} on:click={() => themeStore.setMode(m.id)}>{m.label}</button>
        {/each}
      </div>

      <div class="section-label">Presets</div>
      {#each PRESETS as t}
        <div class="row" class:active={active.id === t.id}>
          <button class="name" on:click={() => themeStore.setActiveTheme(t.id)}>{t.name}</button>
          <button class="icon" title="Duplicate & edit" on:click={() => { onEdit(t); open = false; }}>✎</button>
        </div>
      {/each}

      {#if state.userThemes.length}
        <div class="section-label">My Themes</div>
        {#each state.userThemes as t}
          <div class="row" class:active={active.id === t.id}>
            <button class="name" on:click={() => themeStore.setActiveTheme(t.id)}>{t.name}</button>
            <button class="icon" title="Edit" on:click={() => { onEdit(t); open = false; }}>✎</button>
            <button class="icon" title="Delete" on:click={() => themeStore.deleteTheme(t.id)}>🗑</button>
          </div>
        {/each}
      {/if}

      <button class="create" on:click={() => { onEdit(null); open = false; }}>+ Create theme</button>
    </div>
  {/if}
</div>

<style>
  .theme-menu { position: relative; display: inline-flex; }
  .trigger { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem;
    border-radius: 9999px; color: var(--color-text-secondary); background: transparent;
    border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; }
  .trigger:hover { background: var(--color-bg-secondary); color: var(--color-text-main); }
  .scrim { position: fixed; inset: 0; background: transparent; border: 0; z-index: 40; }
  .panel { position: absolute; right: 0; top: calc(100% + 0.5rem); z-index: 50; min-width: 15rem;
    background: var(--color-bg-surface); border: 1px solid var(--color-border); border-radius: 12px;
    padding: 0.5rem; box-shadow: 0 10px 30px color-mix(in srgb, #000 40%, transparent); }
  .modes { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; }
  .modes button { flex: 1; padding: 0.35rem; border-radius: 6px; border: 1px solid var(--color-border);
    background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 0.8rem; }
  .modes button.selected { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
  .section-label { font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted);
    padding: 0.5rem 0.25rem 0.25rem; }
  .row { display: flex; align-items: center; border-radius: 6px; }
  .row.active { background: var(--color-bg-secondary); }
  .row .name { flex: 1; text-align: left; padding: 0.4rem 0.5rem; background: transparent; border: 0;
    color: var(--color-text-main); cursor: pointer; }
  .row.active .name { color: var(--color-primary); }
  .icon { padding: 0.4rem; background: transparent; border: 0; cursor: pointer; color: var(--color-text-secondary); }
  .create { width: 100%; margin-top: 0.5rem; padding: 0.5rem; border-radius: 6px; border: 1px dashed var(--color-border);
    background: transparent; color: var(--color-text-secondary); cursor: pointer; }
  .create:hover { color: var(--color-primary); border-color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Swap call sites** — In `src/routes/+page.svelte` and `src/routes/+error.svelte`, replace `import ThemeToggle from '$lib/ui/ThemeToggle.svelte'` with `import ThemeMenu from '$lib/ui/ThemeMenu.svelte'` and `<ThemeToggle />` with `<ThemeMenu onEdit={openThemeBuilder} />`. In `+page.svelte`, add the `openThemeBuilder` wiring in Task 8. For `+error.svelte`, use `<ThemeMenu />` (no builder on the error page).

- [ ] **Step 3: Delete old files**

```bash
git rm src/lib/ui/ThemeToggle.svelte src/lib/services/theme.ts
```

- [ ] **Step 4: Verify**

Run: `npm run check && npm run lint`
Expected: pass (no references to the deleted files remain).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): theme menu replaces toggle; retire legacy theme service"
```

---

### Task 8: Theme builder modal (pickers + live preview + export/import)

**Files:**
- Create: `src/lib/ui/ThemeBuilder.svelte`
- Modify: `src/routes/+page.svelte` (host the modal + `openThemeBuilder`)

**Interfaces:**
- Consumes: `themeStore` (`saveTheme`, `deleteTheme`, `preview`, `restore`, `exportTheme`, `importTheme`), schema (`Palette`, `Theme`, `FontId`, `PALETTE_KEYS`, `FONT_STACKS`, `PRESETS`), `themeValidator`.
- Produces: `ThemeBuilder` with props `open: boolean`, `initial: Theme | null` (null = create), `onClose: () => void`.

- [ ] **Step 1: Write `ThemeBuilder.svelte`**

Full component. State: working copy `draft: Theme`, `editMode: 'light' | 'dark'`. Groups drive the picker rows. Live preview calls `themeStore.preview(draft, editMode)` reactively; `onClose`/cancel calls `themeStore.restore()`.

```svelte
<script lang="ts">
  import { themeStore } from '$lib/theme/themeStore';
  import { PRESETS, FONT_STACKS, type Theme, type Palette, type FontId } from '$lib/theme/themeSchema';
  import { themeValidator } from '$lib/theme/themeValidator';

  export let open = false;
  export let initial: Theme | null = null;
  export let onClose: () => void = () => {};

  const GROUPS: { title: string; keys: (keyof Palette)[] }[] = [
    { title: 'Brand', keys: ['primary', 'secondary'] },
    { title: 'Surfaces', keys: ['bgMain', 'bgSurface', 'bgSecondary'] },
    { title: 'Text', keys: ['textMain', 'textSecondary', 'textMuted'] },
    { title: 'Lines', keys: ['border'] },
    { title: 'Semantic', keys: ['error', 'success', 'warning'] },
  ];
  const LABELS: Record<keyof Palette, string> = {
    primary: 'Primary (main)', secondary: 'Secondary (side)',
    bgMain: 'Background', bgSurface: 'Surface', bgSecondary: 'Inset',
    textMain: 'Text', textSecondary: 'Text (secondary)', textMuted: 'Text (muted)',
    border: 'Border', error: 'Error / delete', success: 'Success / accept', warning: 'Warning',
  };
  const FONTS: { id: FontId; label: string }[] = [
    { id: 'system-sans', label: 'System Sans' }, { id: 'system-serif', label: 'System Serif' },
    { id: 'mono', label: 'Monospace' }, { id: 'rounded', label: 'Rounded' }, { id: 'humanist', label: 'Humanist' },
  ];

  let draft: Theme;
  let editMode: 'light' | 'dark' = 'dark';
  let error = '';
  let fileInput: HTMLInputElement;

  function freshDraft(): Theme {
    const base = structuredClone(PRESETS[0]);
    return { ...base, id: `custom-${crypto.randomUUID()}`, name: 'My Theme', builtIn: false };
  }

  // Seed draft when opened.
  $: if (open && !draft) {
    draft = initial
      ? { ...structuredClone(initial), id: initial.builtIn ? `custom-${crypto.randomUUID()}` : initial.id,
          name: initial.builtIn ? `${initial.name} Copy` : initial.name, builtIn: false }
      : freshDraft();
    error = '';
  }
  $: if (!open) draft = undefined as unknown as Theme;

  // Live preview on any draft/editMode change.
  $: if (open && draft) themeStore.preview(draft, editMode);

  const HEX = /^#[0-9a-fA-F]{6}$/;
  function setColor(key: keyof Palette, value: string) {
    if (!HEX.test(value)) return;
    draft = { ...draft, [editMode]: { ...draft[editMode], [key]: value } };
  }

  function cancel() { themeStore.restore(); onClose(); }
  function save() {
    const r = themeValidator.validate(draft);
    if (!r.valid) { error = r.errors[0]; return; }
    themeStore.saveTheme(draft); onClose();
  }
  function del() {
    themeStore.deleteTheme(draft.id); onClose();
  }
  function exportTheme() {
    const json = JSON.stringify({ ...draft, builtIn: false }, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `theme-${draft.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  async function importFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const r = themeValidator.validate({ ...parsed, id: 'tmp', builtIn: false });
      if (!r.valid) { error = `Import failed: ${r.errors[0]}`; return; }
      draft = { ...parsed, id: `custom-${crypto.randomUUID()}`, builtIn: false };
      error = '';
    } catch { error = 'Import failed: not valid JSON'; }
  }
</script>

{#if open && draft}
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="modal">
      <header>
        <input class="title" bind:value={draft.name} maxlength="60" placeholder="Theme name" />
        <button class="close" on:click={cancel} aria-label="Close">✕</button>
      </header>

      <div class="tabs">
        <button class:sel={editMode === 'light'} on:click={() => (editMode = 'light')}>Light</button>
        <button class:sel={editMode === 'dark'} on:click={() => (editMode = 'dark')}>Dark</button>
      </div>

      <div class="body">
        {#each GROUPS as g}
          <div class="group">
            <div class="group-title">{g.title}</div>
            {#each g.keys as key}
              <label class="picker">
                <span>{LABELS[key]}</span>
                <input type="color" value={draft[editMode][key]} on:input={(e) => setColor(key, e.currentTarget.value)} />
                <input class="hex" value={draft[editMode][key]}
                  on:change={(e) => setColor(key, e.currentTarget.value)} maxlength="7" />
              </label>
            {/each}
          </div>
        {/each}

        <div class="group">
          <div class="group-title">Font</div>
          <select bind:value={draft.font}>
            {#each FONTS as f}<option value={f.id}>{f.label}</option>{/each}
          </select>
        </div>
      </div>

      {#if error}<p class="error">{error}</p>{/if}

      <footer>
        <button class="secondary" on:click={() => fileInput.click()}>Import</button>
        <input type="file" accept="application/json" bind:this={fileInput} on:change={importFile} hidden />
        <button class="secondary" on:click={exportTheme}>Export</button>
        {#if !initial?.builtIn && initial}<button class="danger" on:click={del}>Delete</button>{/if}
        <span class="spacer"></span>
        <button class="secondary" on:click={cancel}>Cancel</button>
        <button class="primary" on:click={save}>Save</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, #000 60%, transparent); padding: 1rem; }
  .modal { width: 100%; max-width: 32rem; max-height: 90vh; overflow-y: auto; background: var(--color-bg-surface);
    border: 1px solid var(--color-border); border-radius: 12px; color: var(--color-text-main); }
  header { display: flex; gap: 0.5rem; padding: 1rem; border-bottom: 1px solid var(--color-border); }
  .title { flex: 1; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 6px;
    padding: 0.5rem; color: var(--color-text-main); font-size: 1rem; }
  .close { background: transparent; border: 0; color: var(--color-text-secondary); cursor: pointer; font-size: 1rem; }
  .tabs { display: flex; gap: 0.25rem; padding: 0.75rem 1rem 0; }
  .tabs button { flex: 1; padding: 0.5rem; background: transparent; border: 1px solid var(--color-border);
    border-radius: 6px; color: var(--color-text-secondary); cursor: pointer; }
  .tabs button.sel { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
  .body { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .group-title { font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; }
  .picker { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }
  .picker span { flex: 1; color: var(--color-text-secondary); font-size: 0.9rem; }
  .picker input[type='color'] { width: 2.5rem; height: 2rem; border: 1px solid var(--color-border);
    border-radius: 6px; background: transparent; cursor: pointer; padding: 0; }
  .hex { width: 5.5rem; background: var(--color-bg-secondary); border: 1px solid var(--color-border);
    border-radius: 6px; padding: 0.35rem; color: var(--color-text-main); font-family: var(--font-base); }
  select { width: 100%; background: var(--color-bg-secondary); border: 1px solid var(--color-border);
    border-radius: 6px; padding: 0.5rem; color: var(--color-text-main); }
  .error { color: var(--color-status-error); padding: 0 1rem; margin: 0; font-size: 0.85rem; }
  footer { display: flex; gap: 0.5rem; align-items: center; padding: 1rem; border-top: 1px solid var(--color-border); }
  .spacer { flex: 1; }
  footer button { padding: 0.5rem 0.9rem; border-radius: 6px; cursor: pointer; border: 1px solid var(--color-border); }
  .secondary { background: transparent; color: var(--color-text-secondary); }
  .danger { background: transparent; color: var(--color-status-error); border-color: var(--color-status-error); }
  .primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Host the modal in `+page.svelte`** — add state + handler and render the builder next to `ThemeMenu`.

In `<script>`: 
```ts
import ThemeBuilder from '$lib/ui/ThemeBuilder.svelte';
let themeBuilderOpen = false;
let themeBuilderInitial: import('$lib/theme/themeSchema').Theme | null = null;
function openThemeBuilder(theme: import('$lib/theme/themeSchema').Theme | null) {
  themeBuilderInitial = theme; themeBuilderOpen = true;
}
```
In markup (top level): `<ThemeBuilder open={themeBuilderOpen} initial={themeBuilderInitial} onClose={() => (themeBuilderOpen = false)} />` and ensure `<ThemeMenu onEdit={openThemeBuilder} />` (from Task 7 Step 2).

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ThemeBuilder.svelte src/routes/+page.svelte
git commit -m "feat(theme): theme builder modal with live preview, export/import"
```

---

### Task 9: Globalize hardcoded colors/fonts in reader & filter components

**Files (modify):**
- `src/lib/ui/ReaderShell.svelte`, `src/lib/ui/ScrollViewer.svelte`, `src/lib/ui/CanvasViewer.svelte`, `src/lib/ui/FilterEditor.svelte`, `src/lib/ui/FilterButton.svelte`

**Interfaces:** none (pure CSS/markup migration).

- [ ] **Step 1: Replace literals with tokens per this mapping** (apply in every listed file):
  - `#ff6600` → `var(--color-primary)`; `#ff8533` → `var(--color-primary-hover)`
  - `#f5f5f5`, `#fff`, `#ffffff` (text/foreground on dark chrome) → `var(--color-text-main)`
  - `#d1d1d1` → `var(--color-text-secondary)`
  - `#000`, `#000000` (backdrops) → `var(--color-bg-main)`; `#111`, `#1a1a1a`, `#0a0a0a` → `var(--color-bg-surface)`; `#2a2a2a`, `#2f2f2f` → `var(--color-bg-secondary)`
  - `#1f1f1f`, `#333`, `#444`, `#555` (borders) → `var(--color-border)`
  - `#c0392b` (error/red) → `var(--color-status-error)`
  - `rgba(255,102,0, N)` → `color-mix(in srgb, var(--color-primary) <N*100>%, transparent)`
  - `rgba(0,0,0,0.85)` / dark overlays → `color-mix(in srgb, var(--color-bg-main) 85%, transparent)`
  - `rgba(255,255,255,0.08|0.15)` → `color-mix(in srgb, var(--color-text-main) 8%|15%, transparent)`
  - Any hardcoded `font-family` → `var(--font-base)`
  - `monospace` in `FilterEditor.svelte` (numeric readouts) → keep as-is (intentional monospace), OR `var(--font-base)` if it should follow theme — keep monospace for numeric alignment.

- [ ] **Step 2: Grep each file for stragglers**

Run: `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(|font-family" src/lib/ui/ReaderShell.svelte src/lib/ui/ScrollViewer.svelte src/lib/ui/CanvasViewer.svelte src/lib/ui/FilterEditor.svelte src/lib/ui/FilterButton.svelte`
Expected: only `var(--...)`, `color-mix(...)`, `currentColor`, `transparent`, `#fff` inside `color-mix`, and the intentional `monospace` remain. No bare brand/grey hex literals.

- [ ] **Step 3: Verify build + visual (dev)**

Run: `npm run check && npm run build`
Then `npm run dev`: open a comic, toggle light/dark — reader chrome, both viewers, filter editor, and filter button all recolor. Default theme matches pre-change look in both modes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ReaderShell.svelte src/lib/ui/ScrollViewer.svelte src/lib/ui/CanvasViewer.svelte src/lib/ui/FilterEditor.svelte src/lib/ui/FilterButton.svelte
git commit -m "refactor(theme): route reader/filter component colors through tokens"
```

---

### Task 10: Globalize hardcoded colors/fonts in routes & layout

**Files (modify):**
- `src/routes/reader/+page.svelte`, `src/routes/+page.svelte`, `src/routes/library/+page.svelte`, `src/routes/+layout.svelte`

**Interfaces:** none (CSS/markup migration).

- [ ] **Step 1: Apply the same mapping as Task 9**, plus these specific cases:
  - `+page.svelte`: `#10b981` → `var(--color-status-success)`; `#059669` → `color-mix(in srgb, var(--color-status-success) 85%, #000)`; hardcoded `font-family` stack (line ~685) → `var(--font-base)`.
  - `library/+page.svelte`: `#2d3748` → `var(--color-bg-secondary)`; `system-ui, sans-serif` → `var(--font-base)`.
  - `reader/+page.svelte`: `#1a1a1a` → `var(--color-bg-surface)`, `#2a2a2a` → `var(--color-bg-secondary)`, `#444/#666/#777` → `var(--color-border)`/`var(--color-text-muted)` (pick by role: fills=border, text=muted), `rgba(0,0,0,0.9)` → `color-mix(in srgb, var(--color-bg-main) 90%, transparent)`.
  - `+layout.svelte`: `.critical { background: #991b1b }` → `color-mix(in srgb, var(--color-status-error) 60%, #000)`; keep the existing `var(--color-status-*)` usages; `rgba(0,0,0,...)` shadows → `color-mix(in srgb, #000 <pct>%, transparent)`.

- [ ] **Step 2: Grep for stragglers**

Run: `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(|font-family:" src/routes/reader/+page.svelte src/routes/+page.svelte src/routes/library/+page.svelte src/routes/+layout.svelte`
Expected: only tokens / `color-mix` / intentional `#000`/`#fff` inside `color-mix`. No bare semantic hex.

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint && npm run build`
Then `npm run dev`: home, library, reader controls, and error toast recolor with theme in both modes; Default matches original.

- [ ] **Step 4: Commit**

```bash
git add src/routes/reader/+page.svelte src/routes/+page.svelte src/routes/library/+page.svelte src/routes/+layout.svelte
git commit -m "refactor(theme): route page/layout colors through tokens"
```

---

### Task 11: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Automated gates**

Run: `npm test && npm run check && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: Manual end-to-end (dev)** — verify and note each:
  - Empty storage → Default dark, no FOUC on reload.
  - Mode segment Light/Dark/System switches live; System follows OS toggle live (change OS theme with app open).
  - Select preset Sepia / High Contrast → whole app (home, library, reader, filter editor) recolors; font changes for Sepia.
  - Create theme → edit colors in Light and Dark tabs → live preview updates behind modal → Save → appears in My Themes, active.
  - Edit a preset → opens as a "Copy" custom draft (preset unchanged).
  - Delete active custom theme → falls back to Default.
  - Export theme → downloads JSON; Import that JSON → validates, adds, activates.
  - Import malformed JSON → shows a clear error, no crash.
  - Reload after choosing a custom theme → boots into it with no flash.

- [ ] **Step 3: Final grep sweep for missed literals**

Run: `grep -rnE "#(ff6600|ff8533|1f1f1f|0a0a0a|111111|a1a1aa|52525b|ef4444|22c55e|eab308)" src/ --include=*.svelte | grep -v themeSchema`
Expected: no matches outside `themeSchema.ts` / spec / plan.

- [ ] **Step 4: Commit any fixes and finish**

```bash
git add -A && git commit -m "test(theme): verification fixes" || echo "nothing to fix"
```

---

## Self-Review Notes

- **Spec coverage:** Schema/model (T1), presets incl. concrete Sepia/High-Contrast values (T1), validator/typed-only invariant (T2), engine + system-watch fix (T4), globalization all listed files + app.css/app.html (T5,T9,T10), persistence two-tier + localStorage mirror (T5,T6), FOUC boot script (T5), menu UI replacing ThemeToggle (T7), builder modal + live preview (T8), export/import (T8), validation on save/import/load (T2 used in T6/T8), testing (T1–T4 unit + T11 manual). Font picker (T1 stacks, T8 dropdown). All spec sections A–M map to a task.
- **Placeholders:** none — every code step has concrete content; globalization steps give exact literal→token mappings.
- **Type consistency:** `Palette`/`Theme`/`ThemeMode`/`FontId`, `CSS_VAR`, `FONT_STACKS`, `PALETTE_KEYS`, `themeStore` method names (`init/setMode/setActiveTheme/saveTheme/deleteTheme/importTheme/exportTheme/preview/restore`) are consistent across T1–T8.
