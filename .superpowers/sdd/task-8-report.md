# Task 8 Report: ImportPanel.svelte + AddSheet.svelte

## Summary

Implemented `src/lib/ui/ImportPanel.svelte` and `src/lib/ui/AddSheet.svelte` per brief, using Svelte 5 runes, porting the `.import`/`.drop`/`.row2`/`.sync` markup and layout from `empty-home-v2.html`, and a dim-backdrop centered sheet for `AddSheet` inspired by `home-and-library-v2.html`'s `.sheet` concept.

## API verification

All listed signatures matched the actual exports, with one nuance handled:

- `handleFile(file: File, loadComics: () => Promise<void>)` and `handleUrlImport(url: string, loadComics: () => Promise<void>)` in `src/lib/services/comicProcessor.ts` take a **required, non-optional** callback (they `await loadComics()` / `await onComplete()` unconditionally with no guard). Since `ImportPanel`'s `oncomplete` prop is optional (`() => void | Promise<void>`), a local wrapper was added:

  ```ts
  async function complete() {
    await oncomplete?.();
  }
  ```

  This wrapper (not `oncomplete` directly) is passed to `handleFile`/`handleUrlImport`, which also resolves the `void | Promise<void>` → `Promise<void>` type mismatch. Everything else (`isHttpUrl`, `directoryService.openComicsFolder`, `UrlImportConfirm` props) matched exactly as documented in the brief.

## ImportPanel.svelte

- Drop target (`ondragover`/`ondragleave`/`ondrop`) + "Choose file" button opening a hidden `<input type="file" accept=".cbz,.cbr">`; both paths call `handleFile(file, complete)`.
- URL row: text input + Add button/Enter-to-submit. Invalid non-http(s) input shows an inline red hint (`.hint`, `var(--color-status-error)`) and does not import. Valid URL sets `pendingUrl` and renders `<UrlImportConfirm url={pendingUrl} onConfirm={...} onCancel={...} />`; confirm calls `handleUrlImport(pendingUrl, complete)` then clears `pendingUrl`; cancel just clears it.
- Folder sync: feature-detected via `typeof window !== "undefined" && "showDirectoryPicker" in window`. When supported, a `.sync` button calls `directoryService.openComicsFolder()` and, if a handle was returned (not cancelled), calls `complete()`. When unsupported, renders a disabled, non-interactive span in place of the button plus the note "Requires a Chromium browser (Chrome/Edge)."
- Copy: "CBZ · CBR" only; `accept=".cbz,.cbr"` only (per brief, not the wider set used on the current home page).

## AddSheet.svelte

- Props: `open`, `onclose`, `oncomplete`. When `open`, renders a `fixed inset:0` backdrop (`color-mix(in srgb, var(--color-text-main) 45%, transparent)`) with a centered `.sheet` (header "Add comics" + ✕, then `<ImportPanel {oncomplete} />` in a `.body` wrapper).
- Close wiring: backdrop `onclick` → `close()`; ✕ button `onclick` → `close()`; `<svelte:window onkeydown>` closes on `Escape` while `open` is true. Clicks inside `.sheet` call `event.stopPropagation()` via `onSheetClick` so they don't bubble to the backdrop and close the sheet.
- Two `<!-- svelte-ignore -->` comments suppress a11y warnings (`a11y_click_events_have_key_events`, `a11y_interactive_supports_focus`) on the `.sheet` div's `onclick` — it's a `role="dialog"` container whose only job is to stop propagation, not an interactive control; this is the standard modal pattern and matches how `svelte-check` treats it (0 warnings after the ignore comments).

## Design constraints

- Colors: only `var(--color-*)` tokens throughout; backdrop dim and sheet shadow use `color-mix(in srgb, var(--color-text-main) N%, transparent)` — no raw hex/`rgba(0,0,0,...)` anywhere. Verified via grep (`#[0-9a-f]{3,6}|rgba(` → no matches in either file).
- Font: every rule uses `var(--font-base)`; no `--font-mono` reference (verified via grep, no matches).
- Radius: 3px on `.import`, `.btn`, `.add`, `.row2 input`, `.sync` icon box, `.sheet`, `.close` button — matches mockup + brief.
- Hairline borders (`1px solid var(--color-border)`, dashed divider between drop/row2) preserved from mockup.

## Verification gate results

- `npm run check` → `0 ERRORS 0 WARNINGS` (270 files).
- `npm run build` → succeeded, static adapter wrote `build/`.
- `npx eslint src/lib/ui/ImportPanel.svelte src/lib/ui/AddSheet.svelte` → clean, no output.
- `npm run lint` was intentionally NOT run per instructions.

## Commit

`5b0c85b` — `feat(ui): add ImportPanel and AddSheet import flows (CBZ/CBR)`
Only the two target files staged and committed (`git add src/lib/ui/ImportPanel.svelte src/lib/ui/AddSheet.svelte`); other unrelated working-tree changes (`CLAUDE.md` modified, `GEMINI.md` deleted, two untracked docs files) were left untouched. No Co-Authored-By trailer.

## Self-review checklist

- [x] Drag/drop wired to `handleFile(file, complete)`.
- [x] Choose-file button + hidden input wired to `handleFile(file, complete)`.
- [x] URL row validates with `isHttpUrl`, shows `UrlImportConfirm`, confirm wired to `handleUrlImport(pendingUrl, complete)`, cancel just clears.
- [x] Folder sync wired to `directoryService.openComicsFolder()`, calls `oncomplete` on success, disabled + note when `showDirectoryPicker` unsupported.
- [x] `accept=".cbz,.cbr"` exactly; copy says "CBZ · CBR" only.
- [x] Only `var(--color-*)` tokens; no hardcoded hex/named colors (checked via grep).
- [x] No `--font-mono` / monospace; all text `var(--font-base)`.
- [x] `AddSheet` closes on backdrop click, ✕ click, and `Escape`; clicking inside the sheet does not close it (verified via `stopPropagation`).
- [x] `UrlImportConfirm` used with the exact documented props (`url`, `onConfirm`, `onCancel`).

## Concerns

- None blocking. Minor note: `UrlImportConfirm.svelte` (pre-existing, not touched by this task) still uses raw `rgba(0,0,0,...)` for its own overlay/shadow — out of scope for Task 8 since it's an existing shared component, but worth flagging if a later token-cleanup pass covers it.
