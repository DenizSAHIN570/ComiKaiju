# Theme Builder — Design

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation
**Branch:** `theme-builder` (off `development`)

## Overview

A standard theme builder for ComiKaiju: **color pickers + a font picker** that produce named, saved themes. Each theme carries a **light half and a dark half**; the existing Light / Dark / System toggle selects which half renders. Users pick from built-in presets or build their own in a library, with JSON export/import for sharing and portability.

This is **not** an extension of the image-filter schema. It is a conventional theming system built on CSS custom properties. Its hard prerequisite is **globalizing color and font usage** so every surface actually responds to the active theme.

### Goals

- Let users fully recolor the app (12 semantic color roles) and choose a font.
- Preserve the Light / Dark / System model; each theme defines both light and dark palettes; System follows the OS live.
- Ship built-in presets and a manageable library of user themes.
- Export/import themes as validated JSON.
- Route **every** color and the base font through CSS variables so themes reach the whole app, including the reader.

### Non-goals

- No spacing, radius, or layout customization.
- No bundled/downloaded fonts or external font requests (offline + privacy).
- No raw CSS/SVG input from users (injection surface). Only typed values.
- No server sync (tracked separately on the roadmap).

---

## A. Color token vocabulary

The complete, final token set. Every color in the app resolves to one of these per mode. Values are 6-digit hex strings.

| Group        | Tokens                                   | Role                                                                                                                                                   |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Brand**    | `primary`, `secondary`                   | `primary` = main brand color (orange today). `secondary` = side accent — **new**; applied to secondary buttons / accents / links during globalization. |
| **Surfaces** | `bgMain`, `bgSurface`, `bgSecondary`     | page background → panels/cards → insets                                                                                                                |
| **Text**     | `textMain`, `textSecondary`, `textMuted` | primary → secondary → muted text                                                                                                                       |
| **Lines**    | `border`                                 | borders/dividers                                                                                                                                       |
| **Semantic** | `error`, `success`, `warning`            | destructive/delete, confirm/accept, caution                                                                                                            |

**12 pickers per mode, 24 per theme.**

**Derived shades (not exposed as pickers):** `primaryHover`, `secondaryHover` are computed from `primary`/`secondary` (lighten in dark mode, darken in light mode by ~12% in HSL). This keeps the builder to the roles users actually think about.

These map to CSS custom properties `--color-<kebab>` (e.g. `--color-bg-main`, `--color-primary-hover`), matching the names already used in `app.css` and the Tailwind v4 `@theme` block. A single font token `--font-base` is introduced.

---

## B. Data model

```ts
// src/lib/theme/themeSchema.ts
export type ThemeMode = "light" | "dark" | "system";
export type FontId =
  "system-sans" | "system-serif" | "mono" | "rounded" | "humanist";

export interface Palette {
  primary: string;
  secondary: string;
  bgMain: string;
  bgSurface: string;
  bgSecondary: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  id: string; // 'preset-default' | `custom-${uuid}`
  name: string;
  builtIn: boolean; // presets: read-only, cannot delete; "edit" clones
  light: Palette;
  dark: Palette;
  font: FontId; // one font for the whole theme, both modes
}
```

`PALETTE_KEYS` (array of the 12 keys) and `FONT_STACKS: Record<FontId, string>` are exported for the engine, validator, and UI to share.

### Font stacks (system/web-safe only)

| FontId         | Stack                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| `system-sans`  | `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` |
| `system-serif` | `ui-serif, Georgia, Cambria, 'Times New Roman', serif`                                      |
| `mono`         | `ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', Menlo, Consolas, monospace`       |
| `rounded`      | `ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif`                           |
| `humanist`     | `'Segoe UI', Candara, 'Trebuchet MS', Verdana, system-ui, sans-serif`                       |

---

## C. Built-in presets

All `builtIn: true` (read-only; "Edit" clones into a new `custom-*` theme).

- **Default** — reproduces the current palette exactly, so nothing changes visually until a user picks otherwise. `font: system-sans`.
  - Dark: `primary #ff6600`, `secondary #4f9cf9`, `bgMain #000000`, `bgSurface #0a0a0a`, `bgSecondary #111111`, `textMain #ffffff`, `textSecondary #a1a1aa`, `textMuted #52525b`, `border #1f1f1f`, `error #ef4444`, `success #22c55e`, `warning #eab308`.
  - Light: `primary #ff6600`, `secondary #2563eb`, `bgMain #ffffff`, `bgSurface #f9fafb`, `bgSecondary #f3f4f6`, `textMain #000000`, `textSecondary #4b5563`, `textMuted #9ca3af`, `border #e5e7eb`, `error #ef4444`, `success #22c55e`, `warning #eab308`.
  - (`secondary` is newly introduced; defaults chosen to complement the orange without clashing.)
- **Sepia** — warm paper tones for comfortable reading. Font `system-serif`.
  - Light: `primary #a0522d`, `secondary #8a6d3b`, `bgMain #f4ecd8`, `bgSurface #ede0c8`, `bgSecondary #e4d5b7`, `textMain #3b2f2f`, `textSecondary #5c4a3a`, `textMuted #8a7a63`, `border #d9c7a3`, `error #b23c3c`, `success #5c7a3a`, `warning #b8860b`.
  - Dark: `primary #d2894f`, `secondary #b89968`, `bgMain #1c1712`, `bgSurface #241d16`, `bgSecondary #2d251b`, `textMain #ece0cc`, `textSecondary #c4b299`, `textMuted #8a7a63`, `border #3a2f22`, `error #d9736b`, `success #9cae72`, `warning #d9a441`.
- **High Contrast** — maximal contrast for accessibility. Font `system-sans`.
  - Light: `primary #b34700`, `secondary #0033cc`, `bgMain #ffffff`, `bgSurface #ffffff`, `bgSecondary #f0f0f0`, `textMain #000000`, `textSecondary #1a1a1a`, `textMuted #404040`, `border #000000`, `error #cc0000`, `success #006600`, `warning #a65f00`.
  - Dark: `primary #ff8c1a`, `secondary #66aaff`, `bgMain #000000`, `bgSurface #000000`, `bgSecondary #141414`, `textMain #ffffff`, `textSecondary #e6e6e6`, `textMuted #bfbfbf`, `border #ffffff`, `error #ff5555`, `success #33cc33`, `warning #ffb84d`.

Presets are defined as constants in `themeSchema.ts` (never persisted; always present).

---

## D. Globalization (prerequisite phase — the bulk of the work)

Every hardcoded color and font must route through the tokens above. Migrate literals → `var(--color-*)` / `var(--font-base)` in:

- `src/lib/ui/ReaderShell.svelte`
- `src/lib/ui/ScrollViewer.svelte`
- `src/lib/ui/CanvasViewer.svelte`
- `src/lib/ui/FilterEditor.svelte`
- `src/lib/ui/FilterButton.svelte`
- `src/routes/reader/+page.svelte`
- `src/routes/+page.svelte`
- `src/routes/library/+page.svelte`
- `src/routes/+layout.svelte` (error-banner `.critical` and shadow literals)
- `src/app.html` (`<meta name="theme-color">` becomes dynamic — see Engine)
- `src/app.css` — restructure `:root` / `[class~="light"]` to hold the **Default** theme's dark/light palettes as the pre-hydration fallback, add `--font-base`, add `--color-secondary`/`-hover`, and route `body`/component fonts through `--font-base`.

Where a literal has no exact token match, map it to the nearest semantic role (e.g. reader chrome greys → `bgSurface`/`bgSecondary`/`border`; brand oranges → `primary`/`primaryHover`; the two green literals in `+page.svelte` → `success`). Brand-tinted `rgba()` overlays become `color-mix(in srgb, var(--color-primary) N%, transparent)`.

**Verification:** visually diff each migrated surface in **both** light and dark against current `main`; the Default theme must be pixel-equivalent to today.

---

## E. Engine & application layer

New module `src/lib/theme/themeEngine.ts` (pure, DOM-facing; no Svelte):

- `resolvePalette(theme, mode): { palette: Palette, isDark: boolean }` — picks `light`/`dark`, resolving `system` via `matchMedia('(prefers-color-scheme: dark)')`.
- `applyTheme(theme, mode): void` — writes each token as an inline custom property on `document.documentElement` (`style.setProperty('--color-bg-main', …)`), sets derived `--color-primary-hover`/`--color-secondary-hover`, sets `--font-base` from `FONT_STACKS[theme.font]`, toggles the `light`/`dark` class (kept for compatibility), and updates the `<meta name="theme-color">` content to the resolved `bgMain`. Inline properties win over `app.css`, so the active theme fully controls colors.
- `deriveHover(hex, isDark): string` — HSL lighten/darken helper (small internal color util: hex↔HSL).
- `startSystemWatch(getState, apply)` / `stopSystemWatch()` — subscribes to `matchMedia` `change` events so **System mode live-updates** when the OS theme flips (fixes the current gap). Active only while mode is `system`.

The engine has no storage or Svelte dependency; it is unit-testable with a jsdom `document`.

### Store

`src/lib/theme/themeStore.ts` — Svelte store replacing the color role of the old `theme.ts`:

- State: `{ mode: ThemeMode, activeThemeId: string, themes: Theme[] /* user themes */ }`. Built-in presets are merged in via a derived `allThemes`.
- `init()` — loads persisted mode, activeThemeId, and user themes (validated; invalid dropped), applies via engine, starts system watch if needed, mirrors to localStorage.
- `setMode(mode)`, `setActiveTheme(id)`, `saveTheme(theme)` (upsert user theme, read-after-write), `deleteTheme(id)` (falls back to Default if the active one is deleted), `importTheme(json)` (validate → add), `exportTheme(id): string`.
- Every mutation: re-apply via engine + persist + refresh the localStorage mirror.

The old `src/lib/services/theme.ts` is superseded; `ThemeToggle` and its two call sites migrate to the new store (mode only).

---

## F. Persistence

- **IndexedDB** (existing `settings` store, via the already-public `comicStorage.saveSetting`/`getSetting`) through a thin `src/lib/theme/themeStorage.ts`:
  - `themes` → `Theme[]` (user themes only)
  - `activeThemeId` → `string`
  - `themeMode` → `ThemeMode`
  - Loads are validated; malformed entries are discarded. No changes needed to `comicStorage.ts` (generic setting methods already exist).
- **localStorage mirror** for pre-paint (FOUC): key `ck-theme-boot` holds `{ mode, font: stack, light: Palette, dark: Palette }` for the active theme. Written on every mutation. This is the only thing the boot script needs.

---

## G. FOUC fix (pre-paint script)

Add a small **inline, blocking** script in `<head>` of `src/app.html` (SSR is off, so nothing sets colors server-side today, causing a dark flash for light-mode users). It:

1. Reads `localStorage['ck-theme-boot']`.
2. Resolves mode (`system` → `matchMedia`).
3. `setProperty` for each color token + derived hovers + `--font-base`, and sets the `light`/`dark` class and `theme-color` meta — all before first paint.
4. Falls back silently to the CSS defaults (Default theme, baked into `app.css`) if the key is absent or unparseable.

The token key list is inlined in the script (kept in sync with `PALETTE_KEYS`).

---

## H. Builder UI

### Entry point — `src/lib/ui/ThemeMenu.svelte`

Replaces the single cycling `ThemeToggle` at its call sites (`+page.svelte`, `+error.svelte`). A dropdown containing:

- A **mode** segmented control: Light / Dark / System.
- A **theme list**: presets (Default, Sepia, High Contrast) then "My Themes" (each with edit ✎ / delete 🗑), active one highlighted. Selecting applies immediately.
- **Create theme** and **Import** actions.

`ThemeToggle.svelte` is removed (its mode-cycling behavior folds into the menu's segmented control). `+error.svelte` gets the mode segment only (no builder needed on the error page — keep it light).

### Editor — `src/lib/ui/ThemeBuilder.svelte` (modal, FilterEditor-style)

- **Name** input.
- **Mode tabs** (Light / Dark) selecting which half is being edited; the app previews that half live.
- **Grouped color controls** (Brand / Surfaces / Text / Lines / Semantic). Each row: native `<input type="color">` + a hex text field (two-way bound, validated). Native color input = a real picker with **zero dependencies**, offline-safe.
- **Font** dropdown (the five `FontId`s).
- **Actions:** Save, Cancel, Delete (only when editing a `custom-*` theme), Export (download JSON), Import (paste/upload JSON).

### Live preview model

While the builder is open, edits apply to `:root` immediately via the engine using the in-progress theme and the selected mode tab (what-you-see-is-what-you-get across the whole app behind the modal). **Cancel** restores the previously active theme; **Save** persists the theme, makes it active, and closes.

---

## I. Validation — `src/lib/theme/themeValidator.ts`

Singleton `themeValidator` with `validate(theme): { valid, errors[] }` and `validateOrThrow`. Enforces the typed-only invariant (the injection guard):

- Every `PALETTE_KEYS` entry present in both `light` and `dark`, each a **strict 6-digit hex** (`/^#[0-9a-fA-F]{6}$/`) — this is what prevents arbitrary strings reaching a CSS var.
- `font` ∈ `FontId`.
- `name` non-empty, ≤ 60 chars.
- `id` present; `builtIn` boolean.

Run before **save**, **import** (reject with a clear message), and **load-from-storage** (drop invalid, fall back to Default).

---

## J. Export / import

- **Export:** `exportTheme(id)` serializes the `Theme` to pretty JSON; UI triggers a `theme-<name>.json` download.
- **Import:** accept file upload or pasted text → parse → `themeValidator.validate` → on success add to the library (new `custom-*` id, `builtIn: false`) and offer to activate; on failure show the validation errors.

---

## K. Testing

- **Unit (Vitest — add if the repo has no runner):**
  - `themeValidator`: accepts a valid theme; rejects bad hex, out-of-enum font, missing keys, empty/overlong name; import rejects malformed JSON.
  - `themeEngine`: `resolvePalette` picks the right half per mode (incl. system via a stubbed `matchMedia`); `applyTheme` sets every expected `--color-*` and `--font-base` (jsdom); `deriveHover` lightens in dark / darkens in light.
- **Manual / build verification:**
  - `npm run check` and `npm run lint` clean.
  - `npm run dev`: Default theme visually identical to `main` in light **and** dark on home, library, reader (both viewers), filter editor, error toast. Create → save → switch → delete a custom theme. Export → import round-trips. Reload shows no flash of wrong theme. System mode flips live when the OS theme changes.
  - `npm run build` succeeds (static adapter).

---

## L. Phasing (for the implementation plan)

1. **Schema + validator + presets** (`themeSchema.ts`, `themeValidator.ts`) — pure, test-first.
2. **Engine** (`themeEngine.ts` + color util) — pure/DOM, test-first.
3. **Globalization** — migrate all listed files + `app.css` restructure; verify Default == current in both modes. Largest, riskiest phase; its own verification pass.
4. **Persistence + store** (`themeStorage.ts`, `themeStore.ts`), retire `services/theme.ts`, wire `init()` in `+layout.svelte`.
5. **FOUC boot script** in `app.html` + localStorage mirror.
6. **UI**: `ThemeMenu.svelte` (replace `ThemeToggle`), `ThemeBuilder.svelte` modal, export/import.
7. **Full verification** per section K.

## M. Risks

- **Globalization coverage** — the main risk is missing a hardcoded literal, leaving a surface that ignores the theme. Mitigate by grepping each file for `#`, `rgb`, and `font-family` after migration and by the two-mode visual diff.
- **FOUC script drift** — the inlined key list in `app.html` must stay in sync with `PALETTE_KEYS`; a comment in both files cross-references this.
- **`secondary` application** — being new, it needs judicious placement (secondary buttons/links) rather than blanket use; conservative by default.
