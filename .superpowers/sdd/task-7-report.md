# Task 7: CoverArt.svelte — Report

## Implementation Summary

Created `src/lib/ui/CoverArt.svelte` (Svelte 5 runes) with dual rendering paths:
- **Thumbnail path**: Renders `<img>` with `object-fit:cover` when `thumbnail` prop is provided
- **Placeholder path**: Flat composition (solid background + colored band + uppercase title + optional index glyph) when `thumbnail` is absent

## Component Specification

### Props
- `title: string` — Comic title (required)
- `thumbnail?: string` — Data URL (optional, from FileSystemItem.thumbnail)
- `index?: number` — Index for display as `#NNN` glyph (optional, zero-padded)

### Rendering Logic

**Thumbnail Mode:**
- Displays the provided thumbnail image with `object-fit:cover` (scales to fill parent while preserving aspect ratio)

**Placeholder Mode:**
1. **Background**: Solid color derived from title hash via HSL formula
   - `background: hsl(var(--hue) 45% 18%)` — dark, muted base color
2. **Band**: Colored stripe at 32% from top
   - `background: hsl(var(--hue) 60% 42%)` — more saturated, mid-tone accent
3. **Title**: Bold uppercase overlay, centered vertically
   - Font: `var(--font-base)` (no monospace)
   - Weight: 900, text-transform: uppercase
   - Color: `hsl(var(--hue) 30% 92%)` — light, high-contrast text
   - Size: 2.4rem (matches mockup)
4. **Index Glyph**: Top-left position when `index != null`
   - Format: `#NNN` (e.g., `#001`, `#042`)
   - Font: `var(--font-base)`, 0.58rem, opacity 0.85

### Layout
- Root container: `position:absolute; inset:0` (fills parent)
- Band: 32% height, positioned at 32% from top
- Title: Centered vertically, 14px horizontal padding
- Index: Fixed top-left (14px left, 12px top)

## Deterministic Color Generation

```ts
const hue = $derived([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
const idx = $derived(index != null ? "#" + String(index).padStart(3, "0") : "");
```

- **Hue**: Initialized to 7, each character multiplied by 31 and added to the charCode, modulo 360
- **Stability**: Same title always produces the same hue and color palette
- **Distinctiveness**: Different titles produce visually distinct covers

## Verification Results

✓ **npm run check**: 0 ERRORS, 0 WARNINGS — TypeScript type checking passed  
✓ **npm run build**: Built successfully in 322ms — production build verified  
✓ **npx eslint src/lib/ui/CoverArt.svelte**: No output (clean) — ESLint passed  

## Self-Review Checklist

- ✓ Thumbnail rendering: `<img src={thumbnail} alt={title} style="width:100%;height:100%;object-fit:cover" />`
- ✓ Placeholder rendering: Flat composition with background, band, title, index
- ✓ Deterministic hue: Formula produces stable colors from title alone
- ✓ No monospace fonts: All text uses `var(--font-base)`
- ✓ Fills parent: `position:absolute; inset:0` on cover container
- ✓ HSL colors: Background, band, and text use `hsl()` formulas as specified
- ✓ Title styling: Bold (900), uppercase, centered vertically
- ✓ Index glyph: `#NNN` format, zero-padded, top-left when present
- ✓ Band placement: 32% from top, full width
- ✓ Component structure: Svelte 5 `$props()` runes, scoped styles, clean markup

## Design Decisions

1. **HSL color formula**: Chosen for perceptual consistency—saturation and lightness values create distinct but readable covers across different hues
2. **Band positioning**: At 32% from top to match mockup compositions (Verdant Line, Tidewatch, etc.)
3. **Index positioning**: Top-left to mirror typical file/index conventions (page numbers, archive indices)
4. **No state mutations**: All derived values use `$derived()` for reactivity and performance
5. **Conditional rendering**: Index glyph only renders when `index != null` to avoid empty elements

## Notes

- The component is fully content-aware: colors are intentionally NOT pulled from UI tokens (--color-*) because they represent cover artwork, not chrome
- Inline HSL styles are permissible per CLAUDE.md guidance: "cover ART is CONTENT/imagery... may use non-token colors"
- The placeholder covers are deterministic and stable, ensuring users see consistent visual identity across sessions for the same comic

---

**Commit**: `5bafe57` — feat(ui): add CoverArt (thumbnail or deterministic placeholder)  
**Files**: `src/lib/ui/CoverArt.svelte` (70 lines, created)
