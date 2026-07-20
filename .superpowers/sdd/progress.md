# Progress Ledger — User-Facing UI Redesign

Plan: docs/superpowers/plans/2026-07-20-user-facing-ui-redesign.md
Branch: feature/ui-redesign
Base (branch start): 41289d8

Uncommitted-on-purpose: planning docs (spec, plan), CLAUDE.md route edit, pre-existing GEMINI.md deletion. Per-task implementers stage explicit paths only.

## Tasks
- [x] Task 1: CSS foundation (de-hardcode layout colors) — complete (41289d8..c3e2d1d, review clean; repo-wide prettier drift is pre-existing/out of scope)
- [x] Task 2: Theme picker ordering logic (TDD) — complete (c3e2d1d..a5c6e42, review clean, 4/4)
- [x] Task 3: Persist theme meta + expose from store — complete (a5c6e42..12ceb71, incl. commitTheme fix, review clean, 24/24)
- [x] Task 4: AppMenu (mode switch + theme picker + links) — complete (12ceb71..5757fac, incl. radius fix, review clean)
- [x] Task 5: AppBar masthead — complete (5757fac..cac9c76, review clean). Declined reviewer's "3px on .nav button" finding: those buttons are transparent border-less text links (Search/Add), radius is visually moot; the 3px rule targets real button surfaces.
- [x] Task 6: SiteFooter + FeatureColophon — complete (cac9c76..d6fe7a3, review clean)
- [x] Task 7: CoverArt — complete (d6fe7a3..5bafe57, review clean)
- [x] Task 8: ImportPanel + AddSheet — complete (5bafe57..5b0c85b, review clean w/ minors deferred)

### Deferred Minor findings (triage in Task 15 QA / final review)
- UrlImportConfirm.svelte (pre-existing, out of scope): raw `rgba(0,0,0,...)` — de-hardcode to token.
- ImportPanel.svelte syncFolder(): no catch → non-cancel folder errors become unhandled rejection; should `setError()` per convention.
- ImportPanel.svelte .drop role=button: onkeydown handles Enter but not Space.
- ImportPanel.svelte: real <button> nested inside role="button" .drop (a11y anti-pattern; works via stopPropagation).
- settings/+page.svelte: `color: #fff` on `.btn-primary` / `.modetabs button.sel` / `.segmented button.sel` → `var(--color-bg-main)` (on-accent token, consistent with AppMenu/ComicShelf).
- settings/+page.svelte: `.editor` and `.fcard` border-radius 4px → 3px.
- [x] Task 9: ComicShelf spine accordion — complete (5b0c85b..12272c6, incl. fix, review clean, check pristine)
- [x] Task 10: ContinueBand — complete (12272c6..3fb5ec8, review clean)
- [x] Task 11: Capture last-read page thumbnail (reader hook) — complete (3fb5ec8..eba9058, review clean)
- [x] Task 12: Home page rewrite — complete (eba9058..b3d3bae, review clean). NOTE for user: storage-usage display dropped entirely (not in locked mockups) — consider surfacing in Settings later. Local-folder browsing moved off Home → Library (Task 13).
- [x] Task 13: CoverCard + Library rewrite — complete (b3d3bae..735d94b, review clean)
- [x] Task 14: Settings restyle — complete (735d94b..e2c91c6, review clean, logic preserved). Deferred: settings `color:#fff` on filled buttons → var(--color-bg-main); `.editor`/`.fcard` 4px → 3px (fold into Task 15).
- [x] Task 15: Format copy sweep + deferred polish + QA — complete (e2c91c6..4c1e4dc, review clean). NOTE for user: reader route file input still `accept=".cbz,.zip,.cbr,.rar"` (out of redesign scope) — flag for follow-up if CBZ/CBR-only should apply there too.

## Log
All 15 tasks complete + task-reviewed. Whole-branch review (opus): "Ready to merge, with fixes" — all findings fixed in c74d18a and re-reviewed clean.
Branch feature/ui-redesign: 41289d8 (base) .. c74d18a (head), 19 commits.
Gates at head: check pristine (0/0), build pass, test 24/24, eslint clean on all touched files.
Uncommitted (user's call): CLAUDE.md (/settings route), docs/superpowers/specs+plans, .superpowers/ ledger; pre-existing GEMINI.md deletion.
Remaining = human-only: in-browser visual/theme/responsive sweep; decisions on merge/PR + committing docs.
Out-of-scope notes for user: storage-usage widget dropped (consider Settings later); reader route file input still accepts zip/rar; FilterEditor.svelte uses monospace.
