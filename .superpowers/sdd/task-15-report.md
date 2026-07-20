# Task 15 Report — format-copy sweep + deferred polish + final QA

Branch: `feature/ui-redesign`

## Part A — CBZ/CBR copy sweep

1. `src/lib/services/comicProcessor.ts:114` — changed:
   `"Please select a CBZ, ZIP, CBR, or RAR file."` → `"Please select a CBZ or CBR file."`
   Extraction regex, `isSupported()` logic, and the internal RAR-version warning were left untouched.

2. Grep sweep: `git grep -niE "zip|rar|accept=" -- src/routes src/lib/ui`
   Findings:
   - `src/lib/ui/ImportPanel.svelte:119` — `accept=".cbz,.cbr"` — already correct, no change needed.
   - `src/routes/+page.svelte`, `src/routes/library/+page.svelte` — `.replace(/\.(cbz|zip|cbr|rar)$/i, '')` — extension-stripping regex, explicitly allowed to remain per task brief (not user-facing copy).
   - `src/routes/reader/+page.svelte:247` — `accept=".cbz,.zip,.cbr,.rar"` — reader route, explicitly out of scope per task instructions (left untouched).
   - `src/routes/settings/+page.svelte:363` — `accept="application/json"` — theme import/export, not a comic-file accept; left untouched.
   - No other stray user-facing "ZIP"/"RAR" copy found in the redesigned pages/components (Home, Library, Settings, `src/lib/ui/*`).

   No fixes were needed beyond comicProcessor.ts — the sweep was already clean.

## Part B — deferred polish fixes

3. `src/lib/ui/UrlImportConfirm.svelte` — replaced hardcoded colors with tokens:
   - `background: rgba(0, 0, 0, 0.7)` → `background: color-mix(in srgb, var(--color-text-main) 70%, transparent)` (overlay scrim)
   - `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` → same shadow using `color-mix(in srgb, var(--color-text-main) 10%, transparent)` for both layers
   - `.url-import-confirm { color: white; }` → `color: var(--color-bg-main)` (on-accent text token, consistent with AppMenu/ComicShelf/settings buttons)

4. `src/lib/ui/ImportPanel.svelte` — `syncFolder()`: added `import { setError } from "$lib/store/session";` and `import { logger } from "$lib/services/logger";`, and a `catch (err)` block before the existing `finally`:
   ```ts
   } catch (err) {
     logger.error("ImportPanel", "Failed to sync folder", err);
     setError("Failed to sync folder. Please try again.");
   } finally {
     syncing = false;
   }
   ```
   Verified `directoryService.openComicsFolder()` returns `null` (not a throw) on user cancel (`AbortError` is caught internally and swallowed), so this catch only fires for genuine errors — cancel is not misreported as an error.

5. `src/lib/ui/ImportPanel.svelte` — `.drop` `onkeydown` now handles both Enter and Space, with `preventDefault()` on Space to avoid page scroll:
   ```ts
   onkeydown={(e) => {
     if (e.key === "Enter" || e.key === " ") {
       if (e.key === " ") e.preventDefault();
       openFilePicker();
     }
   }}
   ```

6. `src/routes/settings/+page.svelte`:
   - `.btn-primary`, `.modetabs button.sel`, `.segmented button.sel`: `color: #fff` → `color: var(--color-bg-main)`
   - `.editor`, `.fcard`: `border-radius: 4px` → `3px`

## Part C — final code-level QA audit

**Step 7 — hardcoded chrome colors:**
`git grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(|: *white|: *black" -- src/routes/+page.svelte src/routes/library/+page.svelte src/routes/settings/+page.svelte src/lib/ui/AppBar.svelte src/lib/ui/AppMenu.svelte src/lib/ui/SiteFooter.svelte src/lib/ui/FeatureColophon.svelte src/lib/ui/CoverCard.svelte src/lib/ui/ComicShelf.svelte src/lib/ui/ContinueBand.svelte src/lib/ui/ImportPanel.svelte src/lib/ui/AddSheet.svelte`

Raw grep also matched `{#each ...}` blocks as false positives (`#eac` reads as 3 hex digits) — filtered those out. After filtering, the only remaining hit was `AppMenu.svelte:109` — `<span class="chk">&#10003;</span>`, an HTML numeric entity (checkmark glyph), not a color.

One real hardcoded color was found and fixed as part of the audit (beyond the 3 explicitly named in Part B item 6): `src/routes/settings/+page.svelte` `.danger:hover { color: #fff; }` — same on-accent-background pattern as the other `.sel`/`.btn-primary` rules. Fixed to `color: var(--color-bg-main)`.

Conclusion: **clean** after the fix above — no remaining hardcoded chrome colors in the audited files. Expected legitimate exclusions (CoverArt.svelte cover-art palette, AppMenu/settings theme-swatch hex data) were not in the audited file list and were not touched.

**Step 8 — monospace leakage:**
`git grep -nE "font-mono|ui-monospace|monospace" -- src/routes src/lib/ui`

One hit: `src/lib/ui/FilterEditor.svelte:308` — `.value-display { font-family: monospace; ... }`, used for a numeric parameter readout in the reader's filter editor panel.

Assessment: `FilterEditor.svelte` is not part of the UI-redesign task list (Tasks 1–14) or the redesign plan/spec (`docs/superpowers/plans/2026-07-20-user-facing-ui-redesign.md` has no mention of it) — it's the pre-existing reader filter panel, out of scope for this visual redesign. The monospace usage there is for aligning a live numeric value, which is a reasonable, likely-intentional choice rather than a straggler from the redesign. Per the task's guidance to report ambiguous items rather than guess, I left it unfixed and am flagging it here for a maintainer decision if the FilterEditor is ever brought into the redesigned surface.

No other monospace leakage found in `src/routes` or `src/lib/ui`.

## Verification gate

- `npm run check` — **PASS**: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` (273 files).
- `npm run build` — **PASS**: built and wrote static site to `build/` with no errors.
- `npx eslint` on all 4 modified files (`src/lib/services/comicProcessor.ts`, `src/lib/ui/ImportPanel.svelte`, `src/lib/ui/UrlImportConfirm.svelte`, `src/routes/settings/+page.svelte`) — 1 warning, in `comicProcessor.ts:41` (`Unexpected any` on the pre-existing `cleanPages(pages: any[])` signature). Confirmed via `git diff` that line 41 is untouched by this task's one-line edit (only line 114 changed) — pre-existing, out of scope.
- `npm run test` — **PASS**: 6 test files, 24 tests, all passed.

## Commit

Staged exactly:
- `src/lib/services/comicProcessor.ts`
- `src/lib/ui/ImportPanel.svelte`
- `src/lib/ui/UrlImportConfirm.svelte`
- `src/routes/settings/+page.svelte`

Left uncommitted (as instructed): `CLAUDE.md` (modified), `GEMINI.md` (deleted), and the two untracked planning docs under `docs/superpowers/`.

Commit message: `chore(ui): CBZ/CBR copy sweep, de-hardcode stragglers, a11y polish` (no Co-Authored-By trailer).
