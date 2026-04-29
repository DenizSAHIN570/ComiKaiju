# ComiKaiju Roadmap

This roadmap outlines the future development phases for **ComiKaiju**, aimed at transforming it from a local file viewer into a comprehensive, cross-platform comic management ecosystem.

## 🚀 Current Status (v1.3.0)

- [x] **Enterprise Core**: Centralized logging, global error handling, and robust type safety.
- [x] **File Manager**: Hierarchical folders, bulk uploads, and OS-like navigation.
- [x] **Deduplication**: Content-addressable storage (SHA-256) to minimize disk usage.
- [x] **Theming**: Adaptive Light/Dark/System modes with semantic CSS variables.
- [x] **Universal Archive Support**: Client-side extraction for CBZ, CBR, ZIP, and RAR.

---

## 🔍 Search

Enhancing discoverability within large collections.

- **Global Search**: A unified search bar in the Library to find comics and folders by name.
- **Fuzzy Matching**: Implementation of fuzzy search logic to handle typos and partial titles.
- **Metadata Filters**: Advanced filtering by file size, upload date, and reading progress (e.g., "Show Unread").
- **Deep Indexing**: Fast indexing of local IndexedDB structures for near-instant results.

## ☁️ Cloud Storage Integration

Expanding beyond browser storage limits.

- **Provider Support**: Integration with major providers including **Google Drive**, **OneDrive**, **Dropbox**, and **Nextcloud (WebDAV)**.
- **Remote Browsing**: The ability to navigate cloud folders directly within the ComiKaiju UI.
- **On-Demand Streaming**: Reading comics directly from the cloud without requiring a full local download.
- **Auto-Sync**: Automatically back up the local Library database to a preferred cloud provider.

## 👤 Accounts

Enabling persistence and multi-device synchronization.

- **User Authentication**: Secure sign-in/sign-up flows (OAuth2, Email/Password).
- **Progress Sync**: Synchronize reading positions, bookmarks, and "Last Read" status across multiple browsers and devices.
- **Profile Management**: Custom user preferences, avatars, and reading statistics.
- **Library Portability**: Export and import account data to ensure users are never locked into a single instance.

## 💻 Native System Integration

Bridging the gap between the web and the local OS.

- **File System Access API**: Allow users to map local OS folders directly to the ComiKaiju Library without importing/copying files.
- **Direct Streaming**: Read high-resolution comics directly from the hard drive to bypass browser IndexedDB storage quotas.
- **File Associations**: Register ComiKaiju as a default handler for `.cbz` and `.cbr` files on supported operating systems.
- **Folder Watching**: Automatically detect new files added to mapped local folders.

## 📊 Telemetry

Understanding usage patterns and identifying pain points.

- **Anonymous Analytics**: Track page views and interaction counts (e.g., "how many times is the reader opened?") without collecting Personal Identifiable Information (PII).
- **Error Reporting**: Automatically aggregate global errors and crashes to prioritize bug fixes.
- **Performance Monitoring**: Measure load times for archives and page extraction to optimize the processing engine.
- **Opt-out Mechanism**: Provide a clear privacy toggle for users who prefer zero-telemetry.

## 🎨 Reader Experience

Refining the visual interface for maximum immersion.

### Dynamic Backgrounds

Ambient background coloring that reacts to the current page content.

- **Edge Sampling**: On each page view, draw the current page image to an offscreen `<canvas>` and sample pixel colors from the four edges (top, bottom, left, right strips — ~5px inward). Average each edge strip into a single dominant color.
- **Adaptive Mixing**: Blend sampled edge colors with a neutral base (e.g., 80% `#000` / 20% sampled) using CSS `color-mix()`. Apply the result as a CSS custom property (`--ambient-bg`) on the viewer container, with a `transition` for smooth cross-page fades.
- **Lazy Caching**: Compute colors on first view of each page. Store the 4-edge color array in IndexedDB (in the existing `comicPages` store alongside the page blob) keyed by `comicId-pageIndex`. On subsequent views, read from cache for instant application.
- **Performance**: Sampling runs on the already-loaded `HTMLImageElement` via a small offscreen canvas (no extra decode). Target < 5ms per sample. Skip sampling if the user has image filters active (the filter colors would skew the ambient result).

### Continuous Scroll

Support for both vertical and horizontal continuous reading modes.

- **Vertical Mode (Webtoon)**: Stack all pages in a single vertical scroll container. Pages load on-demand via an `IntersectionObserver` — extract and render pages as they enter a ~2-viewport prefetch zone above and below the current scroll position. Revoke blob URLs for pages that leave the prefetch zone to manage memory.
- **Horizontal Mode (Manga/Comic)**: Horizontal scroll container with snap points (`scroll-snap-type: x mandatory`). Support both LTR (Western comics) and RTL (manga) via a `direction` CSS toggle. Same `IntersectionObserver` prefetch strategy.
- **Scroll Position Tracking**: Debounced scroll handler updates `currentPageIndex` in the session store based on which page is most visible (≥50% intersection ratio). This keeps progress sync and the page counter in the UI accurate.
- **Mode Switching**: User can switch between single-page (current canvas-based viewer), vertical scroll, and horizontal scroll at any time from the view mode dropdown. The current page position is preserved across mode switches.

### Landscape Double-Page

Side-by-side page rendering for landscape orientation.

- **Layout**: When the device is in landscape orientation (or the user explicitly enables it), render two consecutive pages side-by-side in the canvas or scroll container. Pages are placed as `[N, N+1]` pairs in LTR mode, or `[N+1, N]` in RTL mode.
- **Orientation Detection**: Use `screen.orientation.type` (or `matchMedia('(orientation: landscape)')` as fallback) to auto-suggest double-page mode when landscape is detected. The user can override this in view settings.
- **Zoom & Pan**: In canvas mode, both pages are composited onto the same canvas with a configurable gutter (default ~8px). Zoom and pan operate on the combined spread. In scroll mode, the two pages sit in a flex row within each scroll snap section.
- **Odd Page Handling**: If the comic has an odd total page count, the last page renders alone (single-page) rather than paired with a blank.

---

## 🛠 Tech Stack Extensions

_To support the roadmap above, the following technologies will be explored:_

- **Auth**: Supabase or Firebase for rapid account implementation.
- **Search**: `FlexSearch` or `Fuse.js` for client-side indexing.
- **Cloud**: Integration with provider-specific SDKs (e.g., Google Picker API).
