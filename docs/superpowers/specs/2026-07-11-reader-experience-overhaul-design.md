# Reader Experience Overhaul — Planning Doc

**Date:** 2026-07-11
**Status:** 🚧 Brainstorm paused — scoping captured, design not yet finalized
**Resume from:** "Open Questions" section at the bottom.

This doc consolidates one connected body of work in the `/reader`: a **UX/UI usability overhaul** (the immediate user pain) plus three **roadmap reader features** (continuous scroll, double-page, ambient backgrounds). They are grouped here as one initiative per request, but each is intended to ship as its own spec → plan → build cycle. Recommended ordering is in [Sequencing](#sequencing).

---

## Motivation

> "The thing I see the most is people have the hardest time in the reader."

Concrete pain points raised:

1. **Top bar is hard to open, page turns fire by accident.** To reveal the top bar you tap near the top, but if the tap lands even slightly left or right it triggers a page change instead.
2. **The info snackbar/bubble is too small** to be a useful affordance.
3. **No onboarding.** First-time users don't know what any screen region does.
4. **No way to re-learn the controls** once dismissed.

---

## Workstreams

### 1. Reader UX/UI Overhaul _(top priority — the stated pain)_

Four cohesive, self-contained fixes:

#### 1a. Fix tap-zone geometry
- **Root cause:** `src/lib/ui/CanvasViewer.svelte:278-316` (`handleTap`). Tap zones are full-height vertical columns: left third → previous page, right third → next page, center third → toggle UI (`isUiPinned`). There is **no dedicated top region**, so a tap near the top only reveals the bar if it lands in the narrow center column; otherwise it turns the page.
- **Direction (to finalize):** carve out a **top band** (and likely a bottom band) that reveals chrome instead of turning pages, so "tap near the top" reliably opens the top bar regardless of horizontal position. Keep left/right page-turn zones for the middle vertical band only. Exact band heights + whether the center tap still toggles UI is an open question.
- Note RTL already inverts left/right correctly here and in keyboard nav (`CanvasViewer.svelte:151-190, 294-308`) — preserve that.
- Tap is distinguished from drag/pinch via the `ignoreNextTap` flag (`CanvasViewer.svelte:37, 211, 232-234, 279-282`) and a 2px movement threshold. Any new geometry must keep this.

#### 1b. Bigger / clearer info affordance
- Current affordance is `.help-overlay` at `CanvasViewer.svelte:547-553` (styles `623-642`): a small pill at bottom-center, `font-size: 0.75rem`, auto-hides with the UI. Too small to be useful.
- Redesign into something legible; likely folds into the onboarding/help system below rather than existing as a standalone tiny pill.

#### 1c. First-run onboarding overlay
- Full-screen coach-mark style overlay shown the **first time the reader is ever opened**, highlighting each screen region (tap zones, zoom, mode switch, filters, back) and what it does — like a new-app walkthrough.
- **Persistence:** store a "seen" flag via the existing settings store — `comicStorage.saveSetting(key, value)` / `getSetting<T>(key)` (`src/lib/storage/comicStorage.ts:566-590`). Mirror the `readerSettings` pattern (`src/lib/reader/readerSettings.ts`) which already persists a JSON blob under a single key in the `settings` object store.
- Must adapt its region labels to reading mode (horizontal vs vertical) and RTL/LTR.

#### 1d. Persistent "info" button to re-show onboarding
- Small always-available button (in the top overlay, `ReaderShell.svelte` header, `src/lib/ui/ReaderShell.svelte:239-282`) that re-opens the onboarding/help overlay on demand.

**Files in play:** `CanvasViewer.svelte` (tap zones, help overlay), `ReaderShell.svelte` (top overlay/header, info button), a new onboarding component, `comicStorage` settings for the seen-flag.

---

### 2. Enhanced Continuous Scroll _(roadmap)_

Roadmap spec: webtoon vertical + horizontal modes, `IntersectionObserver` prefetch, RTL support, position preserved across mode switches.

**Current state — partially built** in `src/lib/ui/ScrollViewer.svelte`:
- Vertical webtoon scroll exists, with **two `IntersectionObserver`s**: a `lazyObserver` (`rootMargin: '1500px'`) for on-demand page load (`ScrollViewer.svelte:255-268`) and a `progressObserver` (thresholds `[0,0.5,1]`) that updates `currentPageIndex` by best intersection ratio (`270-294`).
- Fit modes (fit-width/height/original) + pinch/wheel zoom already handled (`37-47, 206-244`).
- **Gaps vs roadmap:** no **horizontal** scroll-snap mode (`scroll-snap-type: x mandatory` + `direction` toggle for LTR/RTL); no blob-URL revocation for pages leaving the prefetch zone (currently URLs are only revoked on destroy, `317-321` — memory grows across a long comic); the roadmap's ~2-viewport prefetch zone differs from the current fixed `1500px`.
- Mode switch today is only vertical↔horizontal *page* mode (`ReaderShell.svelte:188-192`); a third "horizontal scroll" mode would extend `viewSettings.readingMode` (currently just `"horizontal" | "vertical"`, `src/lib/store/session.ts:30`).

---

### 3. Landscape Double-Page Spreads _(roadmap)_

Not started. Roadmap spec:
- Render two consecutive pages side-by-side in landscape (auto-detect via `screen.orientation.type` / `matchMedia`, user-overridable).
- Pairing `[N, N+1]` in LTR, `[N+1, N]` in RTL. Odd last page renders alone.
- Canvas mode: zoom/pan on the combined spread, ~8px configurable gutter. Scroll mode: flex-row layout.
- Touches `CanvasViewer` (draw two images into one spread; `drawCurrentImage` at `CanvasViewer.svelte:498-522` currently draws a single `renderSource`) and page-index math (a "page" becomes a spread of 1-2 indices).

---

### 4. Dynamic Ambient Backgrounds _(roadmap)_

Not started. Roadmap spec:
- On each page view, sample edge-strip colors (top/bottom/left/right ~5px inward) from an offscreen canvas draw of the current page; average each strip to a dominant color.
- Blend with a neutral base (~80% `#000` / 20% sampled) via CSS `color-mix()`, applied as `--ambient-bg` with a cross-page fade transition. (Current reader bg is a flat `var(--color-bg-main)`, e.g. `ReaderShell.svelte:305`, `CanvasViewer.svelte:567`.)
- Cache the 4-edge color array in IndexedDB (existing `comicPages` store, key `comicId-pageIndex`) after first compute.
- Target < 5ms/sample using the already-decoded `HTMLImageElement` (available as `currentImage` in `CanvasViewer.svelte:24`). **Skip sampling when a filter is active** — filter colors would skew the result (`customFilterConfig` is already threaded through both viewers).

---

## Sequencing

Recommended build order (each its own spec/plan/PR):

1. **Reader UX/UI Overhaul (#1)** — highest user value, self-contained, no dependency on the others. Do first.
2. **Enhanced Continuous Scroll (#2)** — extends existing `ScrollViewer`; introduces the horizontal-scroll mode that later features can reuse.
3. **Landscape Double-Page (#3)** — larger change to canvas draw + page-index model.
4. **Dynamic Ambient Backgrounds (#4)** — pure polish, cleanly layered on top; depends on stable page-load hooks in the viewers.

---

## Shared Technical Anchors

- **Viewer split:** `ReaderShell.svelte` owns the top overlay + chrome and switches between `CanvasViewer` (page mode) and `ScrollViewer` (vertical). UI auto-hide logic (`UI_HIDE_DELAY = 2200`, `showUi/hideUi`) lives in `ReaderShell.svelte:17,55-76`; scroll mode keeps UI always visible.
- **State:** `viewSettings` store (`src/lib/store/session.ts:26-33`) holds `fitMode`, `readingMode`, `readingDirection`, `zoomLevel`. `currentPageIndex` + `setPage()` track progress.
- **Persisted defaults:** `readerSettings` (`src/lib/reader/readerSettings.ts`) persists global reader defaults to the `settings` IndexedDB store and applies them to `viewSettings`. New persisted prefs (onboarding-seen flag, double-page toggle, ambient toggle, scroll-mode choice) should follow this same pattern.
- **Settings persistence API:** `comicStorage.saveSetting(key, value)` / `getSetting<T>(key)` (`comicStorage.ts:566-590`), DB version currently 5.
- **Conventions (from CLAUDE.md):** use `$lib/services/logger` not `console.log`; push user-facing errors through `setError()`; TailwindCSS v4 + CSS custom properties for theming; static/prerendered, fully client-side.

---

## Open Questions _(resolve when resuming)_

**Workstream 1 (UX overhaul):**
1. Tap-zone layout: what are the exact regions? Proposal — a top band (reveal chrome) + bottom band (page counter/quick controls?), with left/right page-turn zones confined to the middle vertical band. Confirm band heights and whether a center tap still toggles UI.
2. Onboarding style: full-screen dimmed overlay with pointer callouts to each region, vs. a multi-step carousel, vs. a single annotated diagram? Does it need a "don't show again" vs. always-first-time-only?
3. Should onboarding re-trigger when a *new* reading mode is used for the first time (e.g. first time in vertical scroll), or only once globally?
4. Info button placement + icon — top overlay alongside Back/zoom controls?
5. Does the info affordance (1b) survive as a separate element, or is it fully replaced by the onboarding + info button?

**Cross-cutting:**
6. Do we want a single unified "reading mode" selector (page / vertical-scroll / horizontal-scroll) once #2 lands, replacing the current binary toggle in `ReaderShell.svelte:272-274`?
7. Mobile vs desktop: several controls hide under `max-width: 768px` (`ReaderShell.svelte:468-480`). Onboarding + tap zones must be validated on touch specifically, since that's where the pain is.

---

## Roadmap Cross-Reference

`roadmap.md` → "Reader Experience": Continuous scroll & page layout (#2), Landscape double-page (#3), Dynamic ambient backgrounds (#4). Update roadmap "Already shipped" section as each ships. The UX overhaul (#1) is not currently a roadmap line item — consider adding it.
