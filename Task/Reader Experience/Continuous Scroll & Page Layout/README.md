# Continuous Scroll & Page Layout Implementation

## Feature Overview

Implement continuous scroll and page layout modes with RTL support.

## Requirements

### Vertical Mode (Webtoon)

- Stack all pages in a single vertical scroll container
- Load pages on-demand via `IntersectionObserver`
- Extract/render pages entering a ~2-viewport prefetch zone above and below current scroll position
- Revoke blob URLs for pages leaving the prefetch zone to manage memory

### Horizontal Mode (Manga/Comic)

- Horizontal scroll container with `scroll-snap-type: x mandatory`
- Support both LTR (Western comics) and RTL (manga)
- Use `direction` CSS toggle for RTL page order
- RTL support satisfies the standalone "RTL page order" requirement

### Scroll Position Tracking

- Debounced scroll handler updates `currentPageIndex`
- Track which page is ≥50% visible
- Keep progress sync and page counter accurate

### Mode Switching

- Switch between single-page (canvas-based), vertical scroll, and horizontal scroll at any time
- Preserve current position across mode switches

### Status

- Basic version of single/double page + webtoon scroll is already shipped
- Enhancement in progress (including RTL support)

## Technical Notes

- Use IntersectionObserver for prefetching
- Manage memory by revoking blob URLs for off-screen pages
- CSS direction toggle for LTR/RTL switching
- Debounce scroll events to avoid excessive updates
