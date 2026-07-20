# User-Facing UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Home, Library, and Settings pages (and the shared app chrome) into the lean, editorial, theme-token-only design language captured in the spec, replacing the generic "vibe-coded" UI.

**Architecture:** Introduce a set of small shared Svelte 5 components (`src/lib/ui/`) for the chrome (app bar, menu, footer, colophon), the comic surfaces (cover art, spine shelf, cover card, continue band), and the import flows (import panel, add sheet). The three route pages compose these components. One piece of pure logic — the menu's 3-item theme picker ordering — is added as a tested module and wired into the existing `themeStore`. Everything binds to CSS theme tokens; no hardcoded colors in chrome.

**Tech Stack:** SvelteKit 2 (static adapter, `prerender = true`), Svelte 5 runes (`$props`, `$state`, `$derived`), TailwindCSS v4 with CSS custom properties, TypeScript, Vitest (co-located `*.test.ts`, jsdom).

## Global Constraints

- **Scope:** Home (`src/routes/+page.svelte`), Library (`src/routes/library/+page.svelte`), Settings (`src/routes/settings/+page.svelte`), shared chrome. The Reader (`src/routes/reader/**`), storage, archive pipeline, and routing are **out of scope** — with ONE explicit exception: Task 11 adds a minimal last-read-page-thumbnail capture hook in the reader route + a new `ComicBook` field, to feed the Continue band background.
- **Colors:** UI chrome uses only these tokens — `--color-primary`/`--color-primary-hover`, `--color-secondary`/`--color-secondary-hover`, `--color-bg-main`, `--color-bg-surface`, `--color-bg-secondary`, `--color-text-main`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-status-error`, `--color-status-success`, `--color-status-warning`, `--font-base`. **No hardcoded hex/named colors** (including `#000`/`#fff`, `color: white/black`, `#000`-based shadows). Translucent tints via `color-mix(in srgb, var(--token) N%, transparent)`. Comic **cover/page imagery is exempt** (it is content, not chrome).
- **Design language:** flat (no glows/blur), hairline `1px var(--color-border)` rules for depth, `0` radius on covers/panels/grids/shelf and `3px` on buttons/inputs/chips/floating surfaces, typographic grid, small labels uppercase + letter-spaced, orange as a single accent.
- **Typography / font:** ALL text — headings, body, metadata, section labels, and the wordmark — uses `var(--font-base)` (the user's selected theme font). Do NOT introduce or use any monospace stack or a `--font-mono` token. Where the mockups render text in monospace (wordmark, metadata, labels), reproduce the same size/weight/uppercase/letter-spacing but in `var(--font-base)` so it tracks the theme font.
- **Formats:** advertise **CBZ · CBR only** in all user-facing copy; file-input `accept=".cbz,.cbr"`.
- **Logging/errors:** use `logger` (`$lib/services/logger`), push user-facing errors via `setError()` (`$lib/store/session`).
- **Verification gate (scoped — read carefully):** Do NOT run or gate on `npm run lint`. It is pre-existing-broken (Prettier reports ~70 unformatted `.ts`/`.md`/`.json`/config files, unrelated to this work) AND the repo has no Prettier config/plugin for `.svelte`, so `prettier --check .` skips Svelte files entirely. The real gates are:
  - `npm run check` (svelte-check) — must pass.
  - `npm run build` — must pass.
  - `npx eslint <the files this task touched>` — must be clean (this is the genuine Svelte lint via `eslint-plugin-svelte`).
  - For any non-Svelte files a task creates/edits (`.ts`), run `npx prettier --write <those files>` before committing so they don't add to the drift.
  - `npm run test` (vitest) for pure logic.
  There is no component-render test harness; visual components are verified by `check` + `build` + `eslint` + visual parity to the named mockup files. Pure logic is unit-tested.
- **Visual source of truth:** the committed mockups under `.superpowers/brainstorm/503-1784537809/content/` — `home-and-library-v2.html`, `menu-button-v3.html`, `empty-home-v2.html`, `empty-and-settings.html`. Port their markup/CSS into components, swapping placeholder content for real data bindings. Keep their class names/structure so parity is checkable.
- **Commits:** do NOT add a `Co-Authored-By` trailer. (Commit steps below are for the executor; the human may prefer to commit themselves.)

---

## File Structure

**New shared components** (`src/lib/ui/`):
- `CoverArt.svelte` — renders a comic cover: the real thumbnail when present, else a deterministic flat placeholder composition (color derived from title hash + title text). Used by shelf, card, continue band, empty-state preview.
- `AppMenu.svelte` — the multipurpose dropdown: light/dark/system mode switch, 3-item theme picker, Settings link, Install-app. Talks to `themeStore`.
- `AppBar.svelte` — masthead: centered wordmark, left nav, right `Search`/`Add`/`AppMenu`. Emits an `add` event.
- `SiteFooter.svelte` — the restored footer.
- `FeatureColophon.svelte` — the 3-column stealth feature strip.
- `ComicShelf.svelte` — the spine-accordion shelf (Home): slivers that open to cover + info panel.
- `ContinueBand.svelte` — Home "Continue reading" band over the last-read page image.
- `CoverCard.svelte` — Library full-cover grid card.
- `ImportPanel.svelte` — the centered import block (drop / choose file / paste link / sync folder) reused by the empty Home hero and the Add sheet.
- `AddSheet.svelte` — modal wrapper hosting `ImportPanel` for returning users.

**New logic:**
- `src/lib/theme/themeOrder.ts` + `src/lib/theme/themeOrder.test.ts` — pure picker-ordering function.

**Modified:**
- `src/routes/+layout.svelte` — replace hardcoded colors in loading overlay + error toast with tokens.
- `src/lib/theme/themeStorage.ts` — persist theme meta (createdAt/lastUsedAt).
- `src/lib/theme/themeStore.ts` — load meta, stamp lastUsedAt on activate + createdAt on create, expose meta in state.
- `src/routes/+page.svelte`, `src/routes/library/+page.svelte`, `src/routes/settings/+page.svelte` — rewrites composing the new components.
- `src/lib/services/comicProcessor.ts` — copy string CBZ·CBR only.

---

## Task 1: CSS foundation — de-hardcode layout colors

**Files:**
- Modify: `src/routes/+layout.svelte` (`<style>` block: `.loading-overlay`, `.loading-content`, `.global-error*`, ~lines 137-217)

**Interfaces:**
- Produces: nothing new; removes hardcoded colors from the global layout so the loading overlay + error toast honor the active theme. (No `--font-mono` token — see the Typography global constraint: all text uses `var(--font-base)`.)

- [ ] **Step 1: Replace hardcoded colors in `+layout.svelte` styles with tokens**

In the `<style>` block, make these exact replacements (keep everything else):
- `.loading-overlay { background: color-mix(in srgb, #000 70%, transparent); ... }` → `background: color-mix(in srgb, var(--color-text-main) 55%, transparent);`
- `.loading-content { box-shadow: 0 10px 25px -5px color-mix(in srgb, #000 10%, transparent), 0 8px 10px -6px color-mix(in srgb, #000 10%, transparent); ... }` → both `#000` → `var(--color-text-main)`.
- `.global-error.critical { background: color-mix(in srgb, var(--color-status-error) 60%, #000); color: white; }` → `background: color-mix(in srgb, var(--color-status-error) 78%, transparent); color: var(--color-bg-main);`
- `.global-error.error { background: var(--color-status-error); color: white; }` → `color: var(--color-bg-main);`
- `.global-error.warning { background: var(--color-status-warning); color: black; }` → `color: var(--color-bg-main);`
- `.global-error.info { background: var(--color-primary); color: white; }` → `color: var(--color-bg-main);`
- `.global-error { box-shadow: 0 4px 6px color-mix(in srgb, #000 10%, transparent); ... }` → `#000` → `var(--color-text-main)`.

- [ ] **Step 2: Verify types + lint + build**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS, no errors. Then open `npm run dev`, toggle light/dark, trigger a loading state and an error toast — both legible in both modes.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "fix(ui): de-hardcode layout overlay/toast colors to theme tokens"
```

---

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

## Task 3: Persist theme meta + expose it from the store

**Files:**
- Modify: `src/lib/theme/themeStorage.ts`
- Modify: `src/lib/theme/themeStore.ts`

**Interfaces:**
- Consumes: `ThemeMeta` from Task 2.
- Produces:
  - `themeStorage.getThemeMeta(): Promise<ThemeMeta>` and `themeStorage.saveThemeMeta(meta: ThemeMeta): Promise<void>`.
  - `themeStore` state gains `meta: ThemeMeta`; `setActiveTheme` stamps `lastUsedAt = Date.now()`; `saveTheme` stamps `createdAt` for a genuinely new custom id if absent. State shape consumed by `AppMenu` (Task 4): `{ mode, activeThemeId, userThemes, meta }`.

- [ ] **Step 1: Add meta persistence to `themeStorage.ts`**

Add the key constant `const K_META = "themeMeta";` and these methods to the exported object (import `ThemeMeta` from `./themeOrder`):

```ts
  async getThemeMeta(): Promise<ThemeMeta> {
    return (await comicStorage.getSetting<ThemeMeta>(K_META)) ?? {};
  },
  saveThemeMeta(meta: ThemeMeta): Promise<void> {
    return comicStorage.saveSetting(K_META, meta);
  },
```

- [ ] **Step 2: Thread meta through `themeStore.ts`**

- Add `meta: ThemeMeta;` to the `interface State` and `import type { ThemeMeta } from "./themeOrder";`.
- Initialize `meta: {}` in the `writable<State>` default.
- In `init()`, also `themeStorage.getThemeMeta()` in the `Promise.all` and include `meta` in the constructed `state`.
- In `setActiveTheme(id)`, before building `ns`, compute:
  ```ts
  const meta = { ...s.meta, [id]: { ...s.meta[id], lastUsedAt: Date.now() } };
  ```
  include `meta` in `ns`, and `void themeStorage.saveThemeMeta(meta);`.
- In `saveTheme(theme)` (the create/save path), stamp creation for new custom themes:
  ```ts
  const isNew = !s.userThemes.some((tt) => tt.id === theme.id);
  const meta = isNew && !PRESET_IDS.has(theme.id)
    ? { ...s.meta, [theme.id]: { ...s.meta[theme.id], createdAt: Date.now(), lastUsedAt: Date.now() } }
    : { ...s.meta, [theme.id]: { ...s.meta[theme.id], lastUsedAt: Date.now() } };
  ```
  include `meta` in `ns` and `void themeStorage.saveThemeMeta(meta);`.

- [ ] **Step 3: Verify types + existing theme tests still pass**

Run: `npm run check && npm run test -- theme`
Expected: PASS (existing `theme*` tests unaffected; no type errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme/themeStorage.ts src/lib/theme/themeStore.ts
git commit -m "feat(theme): persist theme created/last-used meta in the store"
```

---

## Task 4: `AppMenu.svelte` — mode switch + theme picker + links

**Files:**
- Create: `src/lib/ui/AppMenu.svelte`
- Reference (markup/CSS source): mockup `menu-button-v3.html`

**Interfaces:**
- Consumes: `themeStore` (`$themeStore` → `{ mode, activeThemeId, userThemes, meta }`), `allThemesFrom`, `getActiveTheme`, `PRESET_IDS` from `themeStore`; `orderThemesForPicker` from `themeOrder`; `resolve` from `$app/paths`; the 5 swatch keys `["primary","secondary","bgMain","bgSurface","textMain"]`.
- Produces: `<AppMenu />` (no props). Renders the hamburger button + dropdown.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/AppMenu.svelte`. Port the button + dropdown markup and `.menubtn/.dropdown/.seg/.themes/.theme/.dd-item` styles from `menu-button-v3.html`, converting hardcoded mockup colors to tokens per Global Constraints. Script contract:

```svelte
<script lang="ts">
  import { themeStore, allThemesFrom, getActiveTheme, PRESET_IDS } from "$lib/theme/themeStore";
  import { orderThemesForPicker } from "$lib/theme/themeOrder";
  import type { ThemeMode, Palette } from "$lib/theme/themeSchema";
  import { resolve } from "$app/paths";

  let open = $state(false);
  const swatchKeys: (keyof Palette)[] = ["primary", "secondary", "bgMain", "bgSurface", "textMain"];
  const state = $derived($themeStore);
  const active = $derived(getActiveTheme(state));
  const isDark = $derived(state.mode === "dark" || (state.mode === "system" &&
    typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches));
  const picker = $derived(
    orderThemesForPicker(allThemesFrom(state.userThemes), state.meta, PRESET_IDS, 3),
  );
  function setMode(m: ThemeMode) { themeStore.setMode(m); }
  function pick(id: string) { themeStore.setActiveTheme(id); }
  function close() { open = false; }
</script>

<svelte:window onclick={close} />
<!-- button toggles `open` with stopPropagation; dropdown items call setMode/pick; -->
<!-- theme rows render swatchKeys from (isDark ? t.dark : t.light); active row gets ✓; -->
<!-- tag = PRESET_IDS.has(t.id) ? 'Preset' : 'Yours'; "Builder →" and "Settings" -->
<!-- link to resolve('/settings'); "Install app" triggers the PWA prompt (see Step 2). -->
```

- [ ] **Step 2: Wire the Install-app affordance**

Add a `beforeinstallprompt` capture and a handler:

```ts
let deferredPrompt: any = $state(null);
$effect(() => {
  const h = (e: Event) => { e.preventDefault(); deferredPrompt = e; };
  window.addEventListener("beforeinstallprompt", h);
  return () => window.removeEventListener("beforeinstallprompt", h);
});
async function install() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } }
```

Show the Install-app row only when `deferredPrompt` is set.

- [ ] **Step 3: Verify types + lint + visual**

Run: `npm run check && npm run lint`
Expected: PASS. In `npm run dev`, temporarily drop `<AppMenu />` into `+layout.svelte` or a page: dropdown opens, mode switch changes theme live, theme rows show swatches and switch the active theme, `Settings`/`Builder` navigate to `/settings`. Compare to `menu-button-v3.html`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/AppMenu.svelte
git commit -m "feat(ui): add AppMenu (mode switch, theme picker, settings, install)"
```

---

## Task 5: `AppBar.svelte` — the masthead

**Files:**
- Create: `src/lib/ui/AppBar.svelte`
- Reference: mockup `home-and-library-v2.html` (`.mast`, `.nav`, `.word`, `.rule`)

**Interfaces:**
- Consumes: `AppMenu` (Task 4); `resolve` from `$app/paths`; `page` from `$app/state` for the active route (or an explicit prop).
- Produces: `<AppBar active="home" | "library" | "settings" onadd={() => ...} onsearch={() => ...} />`. Props:
  ```ts
  let { active = "home", onadd, onsearch }: {
    active?: "home" | "library" | "settings";
    onadd?: () => void;
    onsearch?: () => void;
  } = $props();
  ```

- [ ] **Step 1: Build the component**

Create `src/lib/ui/AppBar.svelte`. Port the `.mast` three-column grid (left nav `Home`/`Library`, centered `.word` wordmark set in `var(--font-base)`, uppercase letter-spaced, right `Search`/`Add` + `<AppMenu />`) and the `.rule` hairline from the mockup, tokens only. `Home`/`Library` are `<a href={resolve('/')}>` / `resolve('/library')`; the one matching `active` gets the orange-underline `active` class. `Search` calls `onsearch?.()`; `Add` calls `onadd?.()`.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/AppBar.svelte
git commit -m "feat(ui): add AppBar masthead with centered wordmark + nav"
```

---

## Task 6: `SiteFooter.svelte` and `FeatureColophon.svelte`

**Files:**
- Create: `src/lib/ui/SiteFooter.svelte`
- Create: `src/lib/ui/FeatureColophon.svelte`
- Reference: mockup `home-and-library-v2.html` (`footer`, `.colophon`/`.col`)

**Interfaces:**
- Produces: `<SiteFooter />` (renders `© {year} ComiKaiju. Built for readers.` computed via `new Date().getFullYear()`, and `Powered by Svelte` with the Svelte link in `--color-primary`); `<FeatureColophon />` (the fixed 3-column Offline/Private/Fast strip).

- [ ] **Step 1: Build `SiteFooter.svelte`**

Port the `footer` markup/CSS from the mockup, tokens only. Year is dynamic.

- [ ] **Step 2: Build `FeatureColophon.svelte`**

Port the `.colophon` 3-column strip (kickers `01 Offline` / `02 Private` / `03 Fast` with orange index, headline, one line each) verbatim in copy from the mockup, tokens only.

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/SiteFooter.svelte src/lib/ui/FeatureColophon.svelte
git commit -m "feat(ui): add SiteFooter and FeatureColophon"
```

---

## Task 7: `CoverArt.svelte` — real cover or flat placeholder

**Files:**
- Create: `src/lib/ui/CoverArt.svelte`
- Reference: mockup `.cv`/`.pcv` cover composition (`home-and-library-v2.html`, `empty-home-v2.html`)

**Interfaces:**
- Produces:
  ```ts
  let { title, thumbnail, index }: {
    title: string;
    thumbnail?: string; // data URL from FileSystemItem.thumbnail / ComicBook.coverThumbnail
    index?: number;     // shown as a mono #NNN glyph
  } = $props();
  ```
  Renders an absolutely-positioned fill (`position:absolute; inset:0`) so parents control the 2:3 box. When `thumbnail` is set → `<img>` cover-fit; else the flat placeholder composition (title text + a band), with a deterministic hue derived from the title so covers look distinct but stable.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/CoverArt.svelte`:

```svelte
<script lang="ts">
  let { title, thumbnail, index }: { title: string; thumbnail?: string; index?: number } = $props();
  // Deterministic hue from title (placeholder art only — content, not chrome).
  const hue = $derived([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
  const idx = $derived(index != null ? "#" + String(index).padStart(3, "0") : "");
</script>
```

Placeholder markup uses `hsl(var-free)` inline styles (allowed: cover art is content) — e.g. `background: hsl({hue} 45% 18%)` with a band at `hsl({hue} 60% 42%)` and the title in a bold uppercase overlay; port class names from `.cv`. When `thumbnail` present, render `<img src={thumbnail} alt={title} style="width:100%;height:100%;object-fit:cover" />` instead.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/CoverArt.svelte
git commit -m "feat(ui): add CoverArt (thumbnail or deterministic placeholder)"
```

---

## Task 8: `ImportPanel.svelte` and `AddSheet.svelte`

**Files:**
- Create: `src/lib/ui/ImportPanel.svelte`
- Create: `src/lib/ui/AddSheet.svelte`
- Reference: mockups `empty-home-v2.html` (`.import`, `.drop`, `.row2`, `.sync`) and `home-and-library-v2.html`

**Interfaces:**
- Consumes: `handleFile`, `handleUrlImport`, `isHttpUrl` from `$lib/services/comicProcessor`; `directoryService` from `$lib/services/directoryService`; `UrlImportConfirm` from `$lib/ui/UrlImportConfirm.svelte`.
- Produces:
  - `<ImportPanel oncomplete={() => ...} />` — drop target + Choose-file (`<input type="file" accept=".cbz,.cbr">`) + `or link` row + `or sync a folder` link. Calls `handleFile(file, oncomplete)` / surfaces `UrlImportConfirm` for links / `directoryService.openComicsFolder()` for folder. `accept=".cbz,.cbr"` only.
  - `<AddSheet open={boolean} onclose={() => ...} oncomplete={() => ...} />` — dim + centered sheet wrapping `<ImportPanel>`; closes on backdrop click / ✕ / Escape.

- [ ] **Step 1: Build `ImportPanel.svelte`**

Port `.import`/`.drop`/`.row2`/`.sync` markup from `empty-home-v2.html`, tokens only. Implement drag-over/drop (`handleFile(files[0], oncomplete)`), Choose-file input, URL submit (validate with `isHttpUrl`, then show `UrlImportConfirm`, confirm → `handleUrlImport(url, oncomplete)`), and folder sync (`directoryService.openComicsFolder()`; on unsupported — `!('showDirectoryPicker' in window)` — render the link disabled with the existing "Chrome/Edge" note). Copy: **CBZ · CBR** only.

- [ ] **Step 2: Build `AddSheet.svelte`**

A fixed-position dim layer + centered sheet (`.sheet` styling from mockups, tokens, 3px radius, `color-mix` shadow) containing `<ImportPanel oncomplete={oncomplete} />`. Close on backdrop click, ✕ button, and `Escape` (window keydown while `open`).

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ImportPanel.svelte src/lib/ui/AddSheet.svelte
git commit -m "feat(ui): add ImportPanel and AddSheet import flows (CBZ/CBR)"
```

---

## Task 9: `ComicShelf.svelte` — spine accordion

**Files:**
- Create: `src/lib/ui/ComicShelf.svelte`
- Reference: mockup `home-and-library-v2.html` (`.shelf`/`.spine`/`.art`/`.info`/`.num`)

**Interfaces:**
- Consumes: `CoverArt` (Task 7); comic list items shaped as the Home page's `recentComics` (`FileSystemItem & { metadata?: ComicBook }`).
- Produces:
  ```ts
  let { comics, autoOpenFirst = true, onopen, ondelete }: {
    comics: Array<{ id: string; name: string; size?: number; updatedAt?: number; thumbnail?: string;
                    metadata?: { title?: string; currentPage?: number; totalPages?: number; coverThumbnail?: string } }>;
    autoOpenFirst?: boolean;
    onopen?: (id: string) => void;
    ondelete?: (id: string) => void;
  } = $props();
  ```
  Renders the accordion; open unit shows `CoverArt` + info panel (kicker, title, mono spec table Pages/Size/Format/Added, progress + `page X / N · P%`, `Read →` + `⋯`). `Format` = filename extension uppercased; `Added` = `updatedAt` formatted; progress from `metadata.currentPage/totalPages`.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/ComicShelf.svelte`. Port `.shelf`/`.spine`/`.art`/`.info` markup + the `flex-basis/flex-grow` open transition and `5px` gap from the mockup (open unit `flex:0 0 490px`), tokens only. Use `let openId = $state<string | null>(autoOpenFirst ? comics[0]?.id ?? null : null)`.

- [ ] **Step 2: Make it accessible + touch-friendly (not hover-only)**

Each spine is a `<button>`/`role` element: hover OR focus OR click sets `openId`; the open card exposes `Read →` (calls `onopen(id)`) and `⋯` (calls `ondelete(id)`). Ensure keyboard focus opens the sliver (`onfocusin`), and a tap opens then a second tap of `Read` reads. Keep the CSS `:hover` expansion but also apply the open state via `openId` so focus/tap work without a pointer.

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ComicShelf.svelte
git commit -m "feat(ui): add ComicShelf spine accordion (hover/focus/tap)"
```

---

## Task 10: `ContinueBand.svelte`

**Files:**
- Create: `src/lib/ui/ContinueBand.svelte`
- Reference: mockup `home-and-library-v2.html` (`.continue`/`.pagebg`/`.scrim`/`.c-inner`)

**Interfaces:**
- Consumes: `CoverArt` optional; comic + last-page image.
- Produces:
  ```ts
  let { comic, pageImage, onresume, onlibrary }: {
    comic: { title: string; currentPage: number; totalPages: number; updatedAt?: number };
    pageImage?: string; // data URL of the last-read page; falls back to a token panel when absent
    onresume?: () => void;
    onlibrary?: () => void;
  } = $props();
  ```

- [ ] **Step 1: Build the component**

Port `.continue` layout: right ~62% shows `pageImage` (`background-size:cover`) or, when absent, the neutral panel-grid fallback from the mockup; a `.scrim` gradient fades it to `var(--color-bg-main)` on the left; left content shows mono `Continue reading`, title, `page X of N`, a single orange progress line (`width: currentPage/totalPages`), and `▶ Resume` (`onresume`) + `Library` (`onlibrary`). Tokens only; the scrim gradient uses `var(--color-bg-main)`.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/ContinueBand.svelte
git commit -m "feat(ui): add ContinueBand over last-read page"
```

---

## Task 11: Capture the last-read page thumbnail

**Files:**
- Modify: `src/types/comic.ts:12-24` (add field to `ComicBook`)
- Modify: `src/lib/services/comicProcessor.ts:48-105` (export + parameterize `createThumbnail`)
- Modify: `src/routes/reader/+page.svelte` (`saveProgress()` ~line 82)

**Interfaces:**
- Consumes: `onExtractPage(index: number): Promise<Blob>` (`src/routes/reader/+page.svelte:108`); `currentPageIndex` store (`$lib/store/session`); `comicStorage.saveComicMetadata` (`comicStorage.ts:436`); `logger` (`$lib/services/logger`).
- Produces:
  - `ComicBook.lastReadThumbnail?: string` — JPEG data URL of the last-read page.
  - `export async function createThumbnail(blob: Blob, maxWidth?: number, maxHeight?: number): Promise<string>` from `comicProcessor.ts` (defaults `200`/`300` so the existing cover call is unchanged).
  - Home (Task 12) reads `metadata.lastReadThumbnail` for the ContinueBand `pageImage`.

- [ ] **Step 1: Add the field to `ComicBook`**

In `src/types/comic.ts`, after `coverThumbnail?: string;`, add:

```ts
  lastReadThumbnail?: string; // data URL of the last-read page (Continue-band background)
```

No IndexedDB change: the `comicMetadata` store is schemaless and `dbVersion` stays `5`.

- [ ] **Step 2: Export + parameterize `createThumbnail`**

In `src/lib/services/comicProcessor.ts`, change the private helper signature `async function createThumbnail(blob: Blob): Promise<string>` to:

```ts
export async function createThumbnail(blob: Blob, maxWidth = 200, maxHeight = 300): Promise<string> {
```

and replace the hardcoded `200`/`300` in its fit math with `maxWidth`/`maxHeight`. The existing cover call `createThumbnail(pageBlob)` (~line 170) keeps working via defaults.

- [ ] **Step 3: Capture on leaving the page**

In `src/routes/reader/+page.svelte`, add imports (`import { createThumbnail } from "$lib/services/comicProcessor";`, `import { get } from "svelte/store";` if not present, and ensure `currentPageIndex` is imported from `$lib/store/session`). In `saveProgress()` (~line 82), immediately before the existing `saveComicMetadata(...)` call, add:

```ts
try {
  const pageBlob = await onExtractPage(get(currentPageIndex));
  if (pageBlob) comic.lastReadThumbnail = await createThumbnail(pageBlob, 640, 960);
} catch (e) {
  logger.warn("Reader", "Failed to capture last-read page thumbnail", e);
}
```

Capture ONLY here (fires on exit/`onDestroy`), NOT in the per-page-change `currentPageIndex.subscribe` callback — so we re-encode once when leaving, not on every page turn.

- [ ] **Step 4: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. (No unit test: `createThumbnail` needs `<canvas>`/`Image`, which jsdom doesn't render.) Manual in `npm run dev`: open a comic, advance a few pages, exit → the comic's `metadata.lastReadThumbnail` is set (inspect via devtools/IndexedDB), and the Home Continue band (after Task 12) shows that page.

- [ ] **Step 5: Commit**

```bash
git add src/types/comic.ts src/lib/services/comicProcessor.ts src/routes/reader/+page.svelte
git commit -m "feat(reader): capture last-read page thumbnail for Continue band"
```

---

## Task 12: Home page rewrite (`src/routes/+page.svelte`)

**Files:**
- Modify: `src/routes/+page.svelte` (replace template + `<style>`; keep the `<script>` data logic — `onMount`, `loadComics`, `openRecentComic`, `deleteComic`, `handleFile`, storage, etc.)
- Reference: mockups `home-and-library-v2.html` (populated) + `empty-home-v2.html` (empty)

**Interfaces:**
- Consumes: `AppBar`, `ContinueBand`, `ComicShelf`, `FeatureColophon`, `SiteFooter`, `AddSheet`, `ImportPanel`, `CoverArt`.

- [ ] **Step 1: Keep the data script, swap the markup**

Retain the existing `<script>` state/handlers. Derive:
- `lastRead` = the `recentComics` item with the most recent `metadata.lastRead`/`updatedAt` (the Continue comic), or `null`.
- `shelfComics` = `recentComics` excluding `lastRead.id`.
- `hasComics` = `recentComics.length > 0`.

Add `let addOpen = $state(false)`.

- [ ] **Step 2: Compose the populated layout**

```svelte
<AppBar active="home" onadd={() => (addOpen = true)} />
{#if hasComics}
  <ContinueBand comic={...lastRead.metadata} pageImage={lastReadPageImage}
    onresume={() => openRecentComic(lastRead)} onlibrary={() => goto(resolve('/library'))} />
  <ComicShelf comics={shelfComics} autoOpenFirst onopen={(id) => openById(id)} ondelete={(id) => deleteById(id)} />
{:else}
  <!-- Step 3 empty hero -->
{/if}
<FeatureColophon />
<SiteFooter />
<AddSheet open={addOpen} onclose={() => (addOpen = false)} oncomplete={loadComics} />
```

`lastReadPageImage = lastRead.metadata?.lastReadThumbnail ?? lastRead.metadata?.coverThumbnail ?? lastRead.thumbnail` (the real last-read page from Task 11, falling back to cover then item thumbnail). Provide `openById`/`deleteById` thin wrappers over the existing `openRecentComic`/`deleteComic` that look the item up by id.

- [ ] **Step 3: Compose the empty hero**

Port the `empty-home-v2.html` `.hero` section: the image-ready band (background hook + theme-safe scrim `color-mix(in srgb, var(--color-bg-main) 78%, transparent)`), centered headline `Read your comics right in your browser` with **Read** and **comics** wrapped in `<span style="color:var(--color-secondary)">`, the lead line, and `<ImportPanel oncomplete={loadComics} />` centered. Leave a documented CSS hook (e.g. `.home-hero { background-image: var(--home-hero-bg, none); }`) so the user can drop in their table photo without touching markup.

- [ ] **Step 4: Port page styles, tokens only**

Move the mockup's relevant CSS into the page `<style>`; delete all old Home styles (bookshelf, hero gradient, feature cards, navbar, storage widget, drop-zone, etc.). No `#000`/`white` — audit the final `<style>`.

- [ ] **Step 5: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: with comics → Continue + shelf (excludes last-read, first auto-open) + colophon + footer; with an empty DB → the centered empty hero; `Add` opens the sheet; importing refreshes the list. Compare to both mockups. Sweep light/dark.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(home): rebuild home in lean language (continue + shelf + empty state)"
```

---

## Task 13: `CoverCard.svelte` + Library rewrite (`src/routes/library/+page.svelte`)

**Files:**
- Create: `src/lib/ui/CoverCard.svelte`
- Modify: `src/routes/library/+page.svelte` (replace template + `<style>`; keep the `<script>` logic — `loadLibrary`, `openComic`, `deleteItem`, folder logic)
- Reference: mockup `home-and-library-v2.html` (`.libgrid`/`.card`/`.menu`/`.pbar`)

**Interfaces:**
- Consumes: `AppBar`, `SiteFooter`, `AddSheet`, `CoverArt`.
- Produces: `<CoverCard comic={item} progress={0..1} onopen ondelete />` where `item` is `FileSystemItem & { metadata?: ComicBook }`; renders full `CoverArt`, hover keyline, bottom progress sliver, `⋯` menu, and title + `Np · Size` meta below.

- [ ] **Step 1: Build `CoverCard.svelte`**

Port `.card`/`.cover`/`.menu`/`.pbar` from the mockup, tokens only; `CoverArt` fills the 2:3 `.cover`. Progress sliver width from `progress`. `⋯` calls `ondelete`; clicking the card calls `onopen`.

- [ ] **Step 2: Rewrite the Library template**

Keep the `<script>`. Add `AppBar active="library"`, a `.lib-sub` bar (`{items.length} comics` + a sort control — wire to a simple `sort` state over the existing `items`), a `.libgrid` of `<CoverCard>` for imported items, and — when `folderHandle` is set — a second labeled grid section (`Local · {folderHandle.name}`) of `<CoverCard>` for `folderFiles`. Add `SiteFooter` and an `AddSheet` (open via AppBar `onadd`). Delete old library styles.

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: grid shows all comics (including the last-read one), hover keyline + progress + `⋯` work, opening reads, deleting refreshes; a synced folder shows as its own labeled section. Sweep light/dark.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/CoverCard.svelte src/routes/library/+page.svelte
git commit -m "feat(library): full-cover grid with CoverCard + local folder section"
```

---

## Task 14: Settings restyle (`src/routes/settings/+page.svelte`)

**Files:**
- Modify: `src/routes/settings/+page.svelte` (replace `<style>` + adjust template chrome; **keep all logic** — theme builder, reader, filters handlers)
- Reference: mockup `empty-and-settings.html` (Settings windows)

**Interfaces:**
- Consumes: `AppBar`, `SiteFooter`.

- [ ] **Step 1: Add shared chrome + section nav**

Wrap the page with `<AppBar active="settings" />` and `<SiteFooter />`. Keep the existing `section` state and the `Themes`/`Reader`/`Filters` switch, restyling the left `.snav` per the mockup (mono labels, active orange left keyline).

- [ ] **Step 2: Restyle the three sections**

Replace the page `<style>` with the mockup's flat treatment: theme chips (swatches + name + `Preset`/`Yours` tag + `+ New`), the palette editor (Light/Dark tabs, grouped pickers using the exact token labels already in the file's `LABELS`/`GROUPS`, hex fields, font select + sample, Import/Export/Reset), the Reader radios + segmented control, and the Filters cards. **Do not change the script logic or handler names** — only markup classes and CSS. Tokens only; 3px radius; hairline rules.

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: theme editing still applies live and persists; reader/filter settings still save; matches the Settings mockups. Confirm `Builder →` from `AppMenu` lands here.

- [ ] **Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "feat(settings): restyle themes/reader/filters into lean language"
```

---

## Task 15: Format copy sweep (CBZ · CBR) + final QA

**Files:**
- Modify: `src/lib/services/comicProcessor.ts:114` (error copy)
- Audit: all touched pages/components for `.zip`/`.rar` copy and `accept` attributes

**Interfaces:** none.

- [ ] **Step 1: Fix the processor copy string**

In `comicProcessor.ts`, change the validation message at ~line 114 from `"Please select a CBZ, ZIP, CBR, or RAR file."` to `"Please select a CBZ or CBR file."` (Leave the extraction/regex logic and the internal RAR-version warning untouched — this is copy only; actual archive support is unchanged.)

- [ ] **Step 2: Grep for stray format copy + accept attributes**

Run: `git grep -niE "zip|rar|accept=" -- "src/routes" "src/lib/ui"`
Expected: every `accept` is `.cbz,.cbr`; no user-facing "ZIP"/"RAR" text remains in the redesigned pages/components. Fix any stragglers.

- [ ] **Step 3: Full verification sweep**

Run: `npm run check && npm run lint && npm run test && npm run build`
Expected: all PASS. Then in `npm run dev`, walk the acceptance checklist:
- Chrome: masthead + menu (mode switch, 3-item picker ordering, Settings/Builder links, Install when available) + footer on all three pages.
- Home populated + empty; Library grid + local folder; Settings all three sections editing live.
- Shelf works by hover **and** keyboard focus **and** tap.
- Theme sweep: apply Default, Sepia, High Contrast and a custom theme, in light/dark/system — no unreadable text, no stray hardcoded colors (spot-check via devtools that chrome colors resolve from tokens).
- Narrow viewport: masthead collapses, shelf becomes a scroll/stack, grid reflows, no horizontal page scroll.

- [ ] **Step 4: Commit**

Stage explicitly the files you changed in this task (e.g. `comicProcessor.ts` plus any straggler component/page files you fixed in Step 2). Do NOT use `git add -A` — unrelated planning docs and the pre-existing `GEMINI.md` deletion are intentionally left uncommitted.

```bash
git add src/lib/services/comicProcessor.ts   # + any other files you edited in this task
git commit -m "chore(ui): CBZ/CBR copy sweep and final redesign QA"
```

---

## Self-Review Notes (coverage map)

- Spec §2 design language / tokens → Tasks 1, 7, and enforced in every component task.
- §3 shared chrome (masthead, menu, theme picker ordering, footer) → Tasks 2–6.
- §3.3 ordering rule incl. 4+ custom → Task 2 (tested) + Task 3 (data).
- §4 Home (Continue, shelf, colophon, empty state) → Tasks 6, 9, 10, 12; Continue background page via Task 11.
- §5 Library full-cover grid + local folder → Task 13.
- §6 Add flow → Task 8.
- §7 Settings restyle → Task 14.
- §8 CBZ·CBR copy + accept → Tasks 8, 12 (input), 15.
- §9 accessibility (shelf not hover-only) + responsive + theme contrast → Tasks 9, 12, 15.
- §2.1 de-hardcode existing offenders (layout toast/overlay) → Task 1; page-level offenders removed during each rewrite.
