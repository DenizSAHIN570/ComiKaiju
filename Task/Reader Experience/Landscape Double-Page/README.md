# Landscape Double-Page Implementation

## Feature Overview

Render two consecutive pages side-by-side in landscape orientation.

## Requirements

### Auto-Detection

- Detect landscape orientation via `screen.orientation.type`
- Use `matchMedia` for reliable detection
- Allow user override if needed

### Page Pairing

- Pair consecutive pages as `[N, N+1]` in LTR
- Pair as `[N+1, N]` in RTL (reverse order)
- Odd page counts: render last page alone (don't pair with blank)

### Rendering Modes

- **Canvas mode**: Zoom/pan operates on combined spread (configurable ~8px gutter)
- **Scroll mode**: Flex-row layout for side-by-side pages

### Implementation Notes

- Check orientation on page load and when orientation changes
- Allow user preference to toggle landscape mode
- Preserve individual page rendering logic
- Handle edge cases for odd page counts

## Technical Considerations

- Use CSS Grid or Flexbox for side-by-side layout
- Maintain separate zoom/pan state for combined spread
- Cache paired page blobs efficiently
- Handle high-DPI displays correctly
