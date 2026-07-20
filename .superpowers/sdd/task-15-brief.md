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
