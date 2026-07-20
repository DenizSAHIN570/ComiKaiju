# Final-Review Fixes Report

Branch: `feature/ui-redesign`
Commit: `c74d18a` — `fix(ui): address final-review findings (reader capture race, dead controls, menu/progress/a11y polish)`

## FIX 1 — Reliable last-read-page capture
File: `src/routes/reader/+page.svelte`

- `onDestroy` no longer calls `archiveManager.cleanup()` synchronously. It now chains cleanup after `saveProgress()` settles: `void saveProgress().finally(() => { if (archiveManager) archiveManager.cleanup(); });`. Unsubscribes still run immediately (they don't touch the archive).
- `exitReader()` already did `await saveProgress(); await goto(...)` — verified correct, no change needed there.
- The try/catch inside `saveProgress()` around the thumbnail extraction (`onExtractPage`) was left untouched.
- Verified no other caller of `saveProgress()`/`archiveManager.cleanup()` exists that would break with the reordering (`currentPageIndex` subscription writes progress independently and doesn't touch `archiveManager`).

## FIX 2 — No dead masthead controls
File: `src/lib/ui/AppBar.svelte`

- Wrapped the Search button in `{#if onsearch}` and the Add button in `{#if onadd}`.
- Verified callers: Home and Library pass `onadd` only (Add shows, Search hidden). Settings passes neither (only the `AppMenu` shows). No caller currently passes `onsearch`.

## FIX 3 — AppMenu shouldn't close on mode/theme selection
File: `src/lib/ui/AppMenu.svelte`

- Added `onclick={(e) => e.stopPropagation()}` to the `.dropdown` container so in-menu clicks (Light/Dark/System, theme picker) don't bubble to the `<svelte:window onclick={close} />` handler.
- Added `<!-- svelte-ignore a11y_click_events_have_key_events -->` / `<!-- svelte-ignore a11y_no_static_element_interactions -->` above the div to keep `svelte-check` at 0 warnings (the div is a non-interactive click-stopping container, not a control itself).
- Settings/Builder links still navigate; Install still triggers the browser install prompt and can close afterward via the outer handlers.
- Verified the menu toggle button retains its own `stopPropagation` in `toggle()`, so open/close via the button itself is unaffected.

## FIX 4 — Consistent progress semantics

### (a) `src/lib/ui/ContinueBand.svelte`
- Replaced the naive `progressPercent` derivation with `progressCaption()` / `progressPct()` helpers matching `ComicShelf`'s finished-first / not-started logic:
  - `!total` → empty caption / 0%
  - `current + 1 >= total` → `"finished"` / 100%
  - `current == null || current === 0` → `"not started"` / 0%
  - otherwise → `` `page ${current+1} of ${total}` `` / `((current+1)/total)*100`
- Added a `subLine` derived value that joins the caption with `left off <relative time>` (only when both/either present) so the "left off" suffix behavior is preserved for the finished/not-started cases too.
- The progress-fill (`<div class="c-line"><i style="width:{progressPercent}%">`) now uses the corrected percent.

### (b) `src/routes/+page.svelte`
- `lastRead` (the Continue candidate) is now computed only from comics where `metadata?.currentPage > 0`; if none qualify, it's `null`.
- `shelfComics` now falls back to *all* `recentComics` when there's no qualifying candidate (previously it always excluded the most-recent item even if never opened).
- Template restructured: `{#if hasComics}` now wraps both the (optional) `ContinueBand` and the `ComicShelf`, so `hasComics` still exclusively gates the empty-state hero, independent of whether a Continue candidate exists.
- pageImage fallback chain (`lastReadThumbnail ?? coverThumbnail ?? thumbnail`) left unchanged.

## FIX 5 — Correct aria-label on the delete control
Files: `src/lib/ui/ComicShelf.svelte`, `src/lib/ui/CoverCard.svelte`

- Both `⋯` buttons (which trigger delete with a `confirm()`) now have `aria-label="Delete"` instead of `"More options"`. Glyph unchanged.

## FIX 6 — Scope CoverArt's CSS custom props
File: `src/lib/ui/CoverArt.svelte`

- Removed the app-wide `:global([style*="--hue"]) { --bg: ...; --band: ...; --text: ...; }` rule.
- Added `$derived` hsl strings in the script (`bg`, `band`, `text`, using the same formulas: `hsl(hue 45% 18%)`, `hsl(hue 60% 42%)`, `hsl(hue 30% 92%)`) and a combined `coverStyle` string applied via `style={coverStyle}` on the `.cover` placeholder element (replacing the old `style="--hue:{hue}"`).
- No visual change — identical hsl values, now scoped to the single placeholder element instead of leaking to any element in the app with a `--hue` inline style.

## Verification

- `npm run check` — **273 files, 0 errors, 0 warnings** (initially 2 a11y warnings from the FIX 3 stopPropagation div; resolved with `svelte-ignore` comments).
- `npm run build` — passes, static adapter output written to `build/`.
- `npm run test` — **24/24 tests passed** (6 test files).
- `npx eslint` on every changed file (`src/routes/reader/+page.svelte`, `src/lib/ui/AppBar.svelte`, `src/lib/ui/AppMenu.svelte`, `src/lib/ui/ContinueBand.svelte`, `src/routes/+page.svelte`, `src/lib/ui/ComicShelf.svelte`, `src/lib/ui/CoverCard.svelte`, `src/lib/ui/CoverArt.svelte`) — clean, no output/errors.

## Commit

Staged exactly the 8 changed files (not `CLAUDE.md`, `GEMINI.md` deletion, or the two untracked planning docs, which were left as they were found):

```
src/lib/ui/AppBar.svelte
src/lib/ui/AppMenu.svelte
src/lib/ui/ComicShelf.svelte
src/lib/ui/ContinueBand.svelte
src/lib/ui/CoverArt.svelte
src/lib/ui/CoverCard.svelte
src/routes/+page.svelte
src/routes/reader/+page.svelte
```

Commit `c74d18a`: `fix(ui): address final-review findings (reader capture race, dead controls, menu/progress/a11y polish)` (no Co-Authored-By trailer).

## Notes / deviations

- None of the six fixes required an architectural change beyond what was specified; all were completed as scoped. No `NEEDS_CONTEXT` items.
- `CLAUDE.md` had a pre-existing uncommitted modification (documenting the `/settings` route) present before this session started; it was left untouched and unstaged per the "stage exactly the files you changed" instruction.
