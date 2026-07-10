# Dynamic Ambient Backgrounds Implementation

## Feature Overview

Sample edge colors from pages and blend with neutral base for dynamic ambient backgrounds.

## Requirements

### Color Sampling

- On each page view, sample edge-strip colors (top/bottom/left/right, ~5px inward)
- Use offscreen canvas draw of current page image
- Average each strip to a dominant color

### Color Blending

- Blend with neutral base (e.g., 80% `#000` / 20% sampled)
- Use CSS `color-mix()` for blending
- Apply as `--ambient-bg` CSS custom property
- Add transition for cross-page fades

### Caching

- Cache the 4-edge color array in IndexedDB
- Use existing `comicPages` store, keyed by `comicId-pageIndex`
- Cache after first computation

### Performance Target

- Target < 5ms/sample
- Use already-decoded `HTMLImageElement`
- Skip sampling when image filters are active (filter colors would skew result)

## Technical Implementation

- Create offscreen canvas for edge sampling
- Use `drawImage()` with offset to sample edges
- Average pixel colors in each edge strip
- Store color array in IndexedDB for reuse
- Apply via CSS custom property with transition

## Edge Cases

- Skip sampling when filters are active
- Handle images with very small dimensions
- Cache invalidation on page change or filter change
