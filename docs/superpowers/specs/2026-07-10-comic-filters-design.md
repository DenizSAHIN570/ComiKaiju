# Comic Filters — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## Overview

The reader supports two kinds of image filters, both applied client-side on the
canvas:

1. **Premade filters** — one-click, fixed effects that are not editable.
2. **Custom filters** — user-built adjustments (RGB Channels, Gamma, Vibrance,
   White Balance) that can be named, saved to a reusable global library, edited,
   and deleted.

Everything is represented as a single `FilterConfig` and executed by one
`FilterEngine`. This is a rework of a half-integrated filter system that shipped
broken (premade menu items were parameter-sets at neutral defaults, so clicking
them did nothing; custom filters could not be saved).

## Requirements

- Premade filters (one-click, fixed): **Monochrome, Color Correction, Vintage,
  Vibrant, Protanopia, Deuteranopia, Tritanopia**, plus **None**.
  - The three colorblind filters are **daltonize (assist)** — they remap colors
    to help a colorblind reader distinguish them (not simulation).
- Custom editor combines **all four** adjustment groups (RGB Channels, Gamma,
  Vibrance, White Balance) in one editor, with a live preview of the current
  comic page, a name field, **Save** (to library) and **Apply** (to comic).
- Saved custom filters live in a **global reusable library**, appear in the menu
  for every comic, and support **edit + delete**.
- The active filter is persisted **per comic** (reopening restores it).

## Architecture

One engine, config-driven. Three sources feed the same apply / persist / render
pipeline:

- **Premade filters** — code constants in `filterConfig.ts` (`premadeFilters`).
- **Custom filters** — user configs stored in an IndexedDB library, surfaced
  through a reactive `customFilterStore`.
- **Active-per-comic** — a full `FilterConfig` *snapshot* stored on the comic
  record (`comic.customFilter`).

`CanvasViewer` (offscreen prerender) and `ScrollViewer` (filtered blob URLs)
already render any `FilterConfig`, so they are **unchanged**.

## Engine operations (`FilterEngine`)

Dispatch remains an explicit `switch` allowlist (no dynamic `this[name]`).
Parameter values are read from `parameters[key].default`.

Existing (unchanged):
- `applyRgbAdjustment` — per-channel scale by `value / 255`.
- `applyGammaCorrection` — LUT of `255 * (v/255)^gamma`.
- `applyVibrance` — `saturation = 1 + vibrance/100`; push each channel from luma.
- `applyWhiteBalance` — temperature/tint multipliers.

New:
- `applyContrast` — `out = (v - 128) * (contrast/100) + 128`, per channel.
- `applySepia` — fixed matrix:
  - `r' = 0.393r + 0.769g + 0.189b`
  - `g' = 0.349r + 0.686g + 0.168b`
  - `b' = 0.272r + 0.534g + 0.131b`
- `applyDaltonize` — reads numeric `mode` (0 = Protanopia, 1 = Deuteranopia,
  2 = Tritanopia). Algorithm per pixel:
  1. Simulate dichromacy with the type's matrix `S` → `sim`.
  2. `error = rgb - sim`.
  3. Redistribute error into visible channels:
     `r' = r; g' = g + 0.7*error.r + error.g; b' = b + 0.7*error.r + error.b`
  4. `out = clamp(rgb + shifted error)` (Uint8Clamped handles clamping).

  Simulation matrices (Viénot 1999, sRGB, applied directly — a widely used
  approximation; daltonization has no single canonical formula):
  - Protanopia: `[[0.567,0.433,0],[0.558,0.442,0],[0,0.242,0.758]]`
  - Deuteranopia: `[[0.625,0.375,0],[0.7,0.3,0],[0,0.3,0.7]]`
  - Tritanopia: `[[0.95,0.05,0],[0,0.433,0.567],[0,0.475,0.525]]`

Grayscale needs no dedicated op: Monochrome is `applyVibrance` at `-100`.

Allowlist after this change: `applyRgbAdjustment`, `applyGammaCorrection`,
`applyVibrance`, `applyWhiteBalance`, `applyContrast`, `applySepia`,
`applyDaltonize`.

## Premade definitions

| Filter           | canvasFunctions                    | params                     |
|------------------|------------------------------------|----------------------------|
| Monochrome       | `applyVibrance`                    | vibrance −100              |
| Color Correction | `applyContrast`, `applyVibrance`   | contrast 110, vibrance 15  |
| Vintage          | `applySepia`                       | —                          |
| Vibrant          | `applyVibrance`                    | vibrance +50               |
| Protanopia       | `applyDaltonize`                   | mode 0                     |
| Deuteranopia     | `applyDaltonize`                   | mode 1                     |
| Tritanopia       | `applyDaltonize`                   | mode 2                     |

## Data model

`FilterConfig` (unchanged shape):

```ts
interface FilterConfig {
  id: string;
  name: string;
  description?: string;
  type: string;              // descriptive only; engine dispatches on canvasFunctions
  parameters: { [key: string]: FilterParameter }; // numeric only
  canvasFunctions?: string[];
}
```

- Premades: `id` is a stable slug (e.g. `monochrome`, `deuteranopia`).
- Custom: `id` is `custom-<uuid>`; `canvasFunctions` is the four-op chain; params
  `red/green/blue/gamma/vibrance/temperature/tint`.
- "Is this a custom filter?" → `id.startsWith('custom-')`.

## Storage

- **Library**: `settings` object store, key `customFilters` → `FilterConfig[]`.
  New `comicStorage` methods:
  - `getCustomFilters(): Promise<FilterConfig[]>`
  - `saveCustomFilter(config): Promise<void>` — upsert by `id`
  - `deleteCustomFilter(id): Promise<void>`
- A `customFilterStore` (Svelte writable) wraps these with `init()`, `save()`,
  `remove()` so the menu updates reactively.
- **Active-per-comic**: existing `comic.customFilter` snapshot via
  `saveFilterConfig(comicId, config | null)` / `loadFilterConfig(comicId)`.
- **Snapshot semantics**: applying stores a copy on the comic. Editing or
  deleting a library filter does NOT retroactively change comics already using
  it; they keep working until re-applied. Documented, intentional.

## UI

### Menu (`FilterButton`)
```
None
── Premade ──   Monochrome · Color Correction · Vintage · Vibrant
                Protanopia · Deuteranopia · Tritanopia
── My Filters ──  <name>  ✎ 🗑        (section shown only if the library is non-empty)
────────────
⚙️ Create Custom Filter
```
- Active entry highlighted (by `id`).
- Props: `activeConfig`, `customFilters`, `onSelect(config|null)`,
  `onEdit(config)`, `onDelete(id)`, `onOpenEditor()`.

### Editor (`FilterEditor`)
- Name text field.
- Four slider sections: RGB Channels (R/G/B), Gamma, Vibrance,
  White Balance (Temperature/Tint).
- Live preview: the current comic page rendered through the combined filter
  (ReaderShell supplies the current page as a `Blob`; falls back to a synthetic
  pattern if unavailable).
- Buttons: **Apply** (apply to comic, no library write), **Save** (requires a
  non-empty name; upsert to library + apply), **Delete** (only when editing an
  existing custom filter).
- Opens blank for Create, pre-filled for Edit.

## Validation & keyboard

- `configValidator`: add the new function names (`applyContrast`, `applySepia`,
  `applyDaltonize`) to the allowlist; accept premade `type` strings. Reject
  empty custom names on Save.
- Keyboard: `Ctrl+Shift+F` toggles the editor, `Ctrl+Shift+0` clears,
  `Ctrl+Shift+1…7` apply premades by index.

## Testing

- Node type-strip unit tests for `FilterEngine`, one per op:
  - Monochrome → all three channels equal (grayscale).
  - Vibrant → saturation increased vs original.
  - Color Correction → contrast + saturation change, finite.
  - Sepia → warm tone (r > g > b on a neutral input).
  - Daltonize (each mode) → finite output, red/green channel shift for a
    red-vs-green input.
  - Custom composite chain → finite, applies each group.
- Keep the adversarial bounded-dispatch test (arbitrary/recursive names ignored).
- Live browser check: premades + custom Save/Apply/Edit/Delete, in both page and
  scroll modes, plus persistence across reopen.

## Files touched

- `src/types/filterConfig.ts` — rename `builtinFilters` → `premadeFilters`;
  add premade defs + daltonize/sepia data.
- `src/lib/services/filterEngine.ts` — add `applyContrast`, `applySepia`,
  `applyDaltonize`.
- `src/lib/services/configValidator.ts` — extend allowlists.
- `src/lib/storage/comicStorage.ts` — library CRUD methods.
- `src/lib/store/filterStore.ts` — export `premadeFilters`; add
  `customFilterStore`.
- `src/lib/ui/FilterButton.svelte` — reworked menu.
- `src/lib/ui/FilterEditor.svelte` — reworked editor (name, 4 sections, preview,
  Save/Apply/Delete).
- `src/lib/ui/ReaderShell.svelte` — wire library store, preview blob, handlers.
- `src/lib/services/keyboardShortcuts.ts` — premade-by-index shortcuts.
- `CanvasViewer.svelte` / `ScrollViewer.svelte` — unchanged.
