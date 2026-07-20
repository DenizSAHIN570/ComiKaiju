# Task 3 Report: Persist theme meta + expose it from the store

## Summary

Implemented exactly per brief: added `getThemeMeta()` / `saveThemeMeta()` to
`themeStorage.ts`, and threaded `ThemeMeta` through `themeStore.ts`'s `State`,
`init()`, `setActiveTheme()`, and `saveTheme()`.

## Changes

### `src/lib/theme/themeStorage.ts`
- Imported `ThemeMeta` from `./themeOrder`.
- Added `const K_META = "themeMeta";`.
- Added `getThemeMeta(): Promise<ThemeMeta>` (defaults to `{}`) and
  `saveThemeMeta(meta: ThemeMeta): Promise<void>` to the exported
  `themeStorage` object, using the existing `comicStorage.getSetting` /
  `saveSetting` pattern (no new IndexedDB schema/version bump needed — it's
  just another key in the `settings` store).

### `src/lib/theme/themeStore.ts`
- Imported `type ThemeMeta` from `./themeOrder`.
- Added `meta: ThemeMeta;` to `interface State`.
- Initialized `meta: {}` in the default `writable<State>`.
- `init()`: added `themeStorage.getThemeMeta()` to the `Promise.all` and
  included `meta` in the constructed `state`.
- `setActiveTheme(id)`: computes
  `meta = { ...s.meta, [id]: { ...s.meta[id], lastUsedAt: Date.now() } }`,
  includes it in `ns`, and fires `void themeStorage.saveThemeMeta(meta)`
  alongside the existing `setActiveThemeId` persistence call.
- `saveTheme(theme)`: computes `isNew` (theme id not already in
  `s.userThemes`), then stamps `createdAt` + `lastUsedAt` for genuinely new,
  non-preset custom themes, or just `lastUsedAt` otherwise (edits to existing
  customs, or saves that shadow a preset id via `PRESET_IDS`). Includes `meta`
  in `ns` and persists via `void themeStorage.saveThemeMeta(meta)`.
- `commitTheme()` and `deleteTheme()` were intentionally left untouched —
  the brief only specified meta stamping for `setActiveTheme` and `saveTheme`.
  `commitTheme` is the "live edit without re-render" path (editor preview),
  not a genuine activation/creation event, so it correctly doesn't stamp meta.

## Verification

- `npm run test -- theme` → **6 test files passed, 24 tests passed** (no
  regressions in colorUtil/themeEngine/themeSchema/themeStorage/
  themeValidator/themeOrder tests). Ran twice (before and after prettier
  formatting) with identical results.
- `npm run check` → **263 files, 0 errors, 0 warnings**. Ran twice, same
  result both times.
- `npx prettier --write src/lib/theme/themeStorage.ts src/lib/theme/themeStore.ts`
  → formatted both files (only whitespace/wrapping changes to the new code;
  reran tests/check afterward to confirm no behavioral change).
- `npx eslint src/lib/theme/themeStorage.ts src/lib/theme/themeStore.ts` →
  clean, no output (no errors/warnings).
- `npm run lint` and `npm run build` were skipped per instructions (lint is
  pre-existing-broken repo-wide; build skipped for this task).

## Files changed

- `C:\Users\Deniz\Projects\ComiKaiju\src\lib\theme\themeStorage.ts`
- `C:\Users\Deniz\Projects\ComiKaiju\src\lib\theme\themeStore.ts`

## Commit

`0fa843a` — `feat(theme): persist theme created/last-used meta in the store`
(no Co-Authored-By trailer, as instructed). Only the two target files were
staged; pre-existing unrelated working-tree changes (`CLAUDE.md` modified,
`GEMINI.md` deleted, two untracked docs under `docs/superpowers/`) were left
alone.

## Self-review

- All existing store behavior preserved: `setMode`, `deleteTheme`,
  `commitTheme`, `importTheme`, `exportTheme`, `preview`, `restore` are
  byte-for-byte unchanged aside from the new `meta` field flowing through
  `State`.
- `meta` is stamped on every mutation path the brief specifies:
  `setActiveTheme` (lastUsedAt) and `saveTheme` (createdAt on genuine
  creation of a non-preset id, lastUsedAt always). `deleteTheme` does not
  clean up orphaned meta entries for deleted theme ids — this matches the
  brief exactly (no mention of meta cleanup on delete) and is low-risk: a
  stale meta entry for a deleted id is inert (unused by `orderThemesForPicker`
  once the theme itself is gone from the list) and would only be revived if a
  theme with the same id were recreated, at which point stamping on
  `saveTheme` overwrites it appropriately.
- No new IndexedDB migration/version bump was needed since `saveSetting`/
  `getSetting` operate on an existing generic `settings` key-value store.
- Type safety: `State.meta: ThemeMeta` flows correctly; `svelte-check` found
  zero errors after the change.

## Fix: commitTheme meta stamping

A Critical review finding on this task noted the claim above ("`commitTheme`
... correctly doesn't stamp meta") was wrong: `commitTheme` is the method
`src/routes/settings/+page.svelte`'s `newTheme()` and `commit()` actually call
to create/save builder themes (`saveTheme` is only used by `importTheme`).
Since `commitTheme` also sets `activeThemeId = theme.id`, it is a genuine
creation/activation event and needed the same meta stamping as `saveTheme`,
otherwise every theme a user creates via the Settings builder ends up with no
`meta` entry, silently breaking the picker's "newest-created first" ordering.

### Change

In `commitTheme(theme)` (`src/lib/theme/themeStore.ts`), added the same
`isNew` / `PRESET_IDS` meta-stamping logic used in `saveTheme` (stamps
`createdAt` + `lastUsedAt` for genuinely new non-preset ids, `lastUsedAt` only
otherwise), included `meta` in the returned `ns`, and added
`void themeStorage.saveThemeMeta(meta);` alongside the existing
`saveThemes`/`setActiveThemeId` calls. `commitTheme` still calls `writeBoot(ns)`
(not `render(ns)`) — that behavior was left untouched.

### Verification

- `npm run test -- theme` → **6 test files passed, 24 tests passed** (no
  regressions).
- `npm run check` → **263 files, 0 errors, 0 warnings**.
- `npx prettier --write src/lib/theme/themeStore.ts` → unchanged (already
  formatted).
- `npx eslint src/lib/theme/themeStore.ts` → clean, no output.
- `npm run lint` was skipped per instructions (pre-existing-broken
  repo-wide).

### Commit

`12ceb71` — `fix(theme): stamp meta in commitTheme so builder-created themes
are ordered` (no Co-Authored-By trailer). Only
`src/lib/theme/themeStore.ts` was staged.
