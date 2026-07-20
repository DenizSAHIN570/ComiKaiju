# Empty-Home Animated Cover Wall — Design Spec

**Date:** 2026-07-20
**Branch:** `feature/ui-redesign`
**Scope:** The first-run / empty-state hero on Home (`/`) only — the section shown when the library has no comics. Adds an animated, blurred background wall of comic covers behind the existing headline + import panel.
**Out of scope:** the populated Home (Continue band + shelf), Library, Settings, Reader, storage schema, the service worker.

---

## 1. Goal

Give the empty-state hero a living background: a slowly scrolling, slightly blurred wall of comic covers that reads as ambient colored texture behind a strong scrim — not a focal, clearly-readable carousel. It must stay consistent with the app's flat/editorial identity, remain legible in every theme, and never contradict the panel's own promise ("no account, no server, works offline").

## 2. Source strategy

- A small constant array of comic ISBNs (the 8 provided: Killing Joke, Watchmen, Infinity Gauntlet, Civil War, Saga v1, V for Vendetta, Miles Morales, Court of Owls). Real covers come from `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`.
- The wall renders a fixed count of tiles (~24 across the rows). Real covers and generated SVG covers are **shuffled together**, so the wall never visibly repeats just 8 images; online it leans real, offline it is entirely generated.
- **Per-tile fallback is the correctness guarantee:** each real-cover tile has an `onerror` handler that swaps it to a generated SVG. This covers offline (all tiles error → all SVG), 404s, and Open Library's blank-pixel responses — independently, per tile. There is no global `navigator.onLine` branch.

## 3. Generated SVG cover

A crude comic-like placeholder echoing the app's existing `CoverArt` placeholder so it looks native: a colored field (deterministic hue per tile), a title band, a couple of panel rules, and a mono issue number. Randomly-but-deterministically colored per tile index so the offline wall still looks varied.

## 4. Animation & visual treatment

- 2–3 rows; each row is a horizontal strip of tiles translating right→left via a CSS `transform` keyframe loop. The strip content is duplicated so the loop is seamless.
- Rows run at slightly different speeds (parallax depth).
- The whole wall is blurred (~4px) and dimmed, sitting **behind** the theme-safe scrim.
- **Scrim:** shift the current flat 78% `--color-bg-main` overlay to a radial gradient — most opaque at the center (headline + import panel stay crisp), lighter at the edges (blurred covers breathe). Still derived from `--color-bg-main`, so it tints correctly in light and dark themes.

## 5. Caching

Best-effort enhancement, not a correctness requirement (the fallback already makes offline safe):
- During implementation, test whether `covers.openlibrary.org` sends CORS headers.
- If CORS allows it: fetch each cover as a blob and persist in IndexedDB (via a dedicated key/store), so a later offline visit still shows the real covers; read cache-first on mount.
- If CORS blocks blob reads: load covers directly as `<img>` and rely on the browser/service-worker HTTP cache; offline-after-online may fall back to SVGs, which is acceptable.

## 6. Component structure

- New `src/lib/ui/HeroCoverWall.svelte`, self-contained: owns the ISBN list, tile generation, shuffle, per-tile fallback, rows/animation, and reduced-motion handling.
- Rendered inside the `.home-hero` section in `src/routes/+page.svelte`, absolutely positioned behind `.hero-inner` (which keeps `z-index: 2`). The scrim change is a small CSS edit in `+page.svelte`.
- The wall is `aria-hidden="true"` — pure decoration.

## 7. Accessibility & performance

- `prefers-reduced-motion: reduce` → animation frozen (static wall), no scrolling.
- Only `transform` animates (GPU-composited). Blur is painted once on a static layer, never per-frame. No layout thrash.
- Wall is decorative and excluded from the accessibility tree; focus order and the import panel are untouched.

## 8. Non-goals / YAGNI

- No user-facing toggle or setting for the background.
- No infinite/lazy catalog — the fixed shuffled set is sufficient for ambient texture.
- No change to the populated Home, and no change to the service worker's caching logic in this scope (IndexedDB caching, if used, is self-contained in the component).
