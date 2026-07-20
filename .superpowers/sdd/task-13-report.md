# Task 13 Report: CoverCard.svelte + Library page rewrite

## Summary

Created `src/lib/ui/CoverCard.svelte` implementing the requested prop signature
(`title`, `thumbnail`, `index`, `meta`, `progress`, `onopen`, `ondelete`) and
rewrote `src/routes/library/+page.svelte` to compose `AppBar` / `CoverCard` /
`AddSheet` / `SiteFooter`, preserving all existing data logic.

## `src/lib/ui/CoverCard.svelte`

- `.card` (role="button", tabindex, Enter/Space → `onopen`) wraps a `.cover`
  (2:3 `aspect-ratio`, 1px `var(--color-border)` → `var(--color-primary)` on
  hover/focus-visible), containing `<CoverArt title thumbnail index />`.
- `⋯` `.menu` button, top-right, opacity 0 → 1 on card hover/focus, only
  rendered when `ondelete` is passed; stops propagation before calling
  `ondelete` so it never also triggers `onopen`.
- Bottom `.pbar` progress sliver rendered only when `progress > 0`; width is
  `progress` clamped to `[0,1]` and rounded to a percent. Track uses
  `color-mix(in srgb, var(--color-text-main) 35%, transparent)`, fill is
  `var(--color-primary)`.
- Title (`.t`, weight 650) + `meta` line (`.m`, `var(--color-text-muted)`)
  below the cover. All text uses `var(--font-base)` — no monospace.
- Radius: `.cover` is 0; `.menu` is 3px. `⋯` menu background is
  `color-mix(in srgb, var(--color-text-main) 55%, transparent)` (no raw
  `#000`/`rgba(0,0,0,…)`), hover switches to `var(--color-status-error)`.

## `src/routes/library/+page.svelte`

**Kept unchanged (data logic):** `loadLibrary()` core (extended, see below),
`items`, `openComic(item)`, folder logic (`folderHandle`, `folderFiles`,
`folderLoading`, `checkStoredFolder()`, `openFolder()`, `openLocalFile(file)`),
`formatSize`.

**Minimal necessary extensions to data logic:**
- `loadLibrary()` now also fetches `comicStorage.getComicMetadata(item.id)`
  for every item in parallel (mirrors the existing pattern already used on
  the home page, `src/routes/+page.svelte`) and stores results in
  `metadataMap` (`Record<string, ComicBook>` — used a plain object rather
  than `Map` to satisfy the `svelte/prefer-svelte-reactivity` ESLint rule).
  This powers the `Np · Size` meta line and the progress sliver.
- `deleteItem(item)` — dropped the `MouseEvent` parameter; `CoverCard`'s
  `⋯` button now does `stopPropagation`/`preventDefault` itself, so the
  page's `ondelete` callback is a plain no-arg call.
- Added `stripExt`, `itemMeta`, `itemProgress` helpers and a `sort` state
  (`'recent' | 'name' | 'size'`) with a derived `sortedItems` (default
  `recent` sorts by `updatedAt` desc, matching prior `getAllFiles()` order).

**Template:**
- `<AppBar active="library" onadd={() => addOpen = true} />` +
  `<AddSheet open={addOpen} onclose oncomplete={loadLibrary} />`.
- `.lib-sub` bar: `{items.length} comics` + a `<select>` sort control.
- `.libgrid` (6-col grid, responsive to 4/2 cols) of `<CoverCard>` for
  `sortedItems`: title = extension-stripped name, thumbnail, 1-based index,
  `meta` = `Np · Size` (page count only if metadata is loaded, else just
  size), `progress` from `currentPage/totalPages`, `onopen`/`ondelete` wired.
- When `folderHandle` is set, a second labeled section "`Local · {folder
  name}`" renders `<CoverCard>` for `folderFiles` (no thumbnail → CoverArt
  placeholder, no `ondelete`, `meta="Local file"`). Loading/empty states
  shown inline. When no folder is synced yet, an "Open folder" affordance
  is shown instead.
- Empty state ("No comics yet" → link to `/`) restyled, no dead markup.
- `<SiteFooter />` at the bottom. All old header/back-link/folder-btn/
  card/placeholder styles removed.

## Verification

- `npm run check` — 0 errors, 0 warnings (273 files).
- `npm run build` — succeeds (static adapter, prerendered).
- `npx eslint src/lib/ui/CoverCard.svelte src/routes/library/+page.svelte` —
  clean (one initial `svelte/prefer-svelte-reactivity` error on a `Map` was
  fixed by switching `metadataMap` to a plain object; final run is clean).
- Did not run `npm run lint` per instructions (skipped by request).

## Self-review checklist

- [x] Grid shows all items including the most-recently-read one (no
      separate "continue" carve-out — `loadLibrary`/`getAllFiles` returns
      the full list, and `sortedItems` includes everything).
- [x] Hover keyline (`.cover` border → `var(--color-primary)`), progress
      sliver, and `⋯` delete all wired through `CoverCard`.
- [x] Local-folder section appears (labeled `Local · {name}`) once
      `folderHandle` is set from `checkStoredFolder()`/`openFolder()`.
- [x] Sort control (`recent`/`name`/`size`) reorders the grid via
      `sortedItems`.
- [x] Empty state present, restyled, links to `/`.
- [x] Colors: audited — only `var(--color-*)` tokens and `color-mix(...,
      var(--color-text-main) N%, transparent)`; no raw hex/rgba.
- [x] Font: only `var(--font-base)` throughout both files; no
      `--font-mono`/monospace anywhere.
- [x] Radius: covers/grid 0; buttons (`⋯`, folder button, select) 3px.
- [x] No dead old markup/styles left (`.library-container`, `.comic-grid`,
      `.card-cover`, `.delete-btn`, `.placeholder`, back-link, etc. all
      removed).

## Concerns / notes

- Fetching `getComicMetadata` for every item on every `loadLibrary()` call
  (including after each delete) adds N extra IndexedDB reads. This mirrors
  what the home page already does for its (smaller) recent list; for a very
  large library this could be optimized later (e.g. a bulk getAll on the
  `comicMetadata` store), but was out of scope here and functionally fine.
- Manual `npm run dev` visual sweep (light/dark, real IndexedDB data) was not
  performed in this session — only `check`/`build`/`eslint` gates were run,
  per the verification gate specified in the task. Recommend a quick manual
  pass before merging if visual regressions matter.
