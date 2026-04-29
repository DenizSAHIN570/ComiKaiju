# ComiKaiju Project Context

## Project Overview

**ComiKaiju** is a client-side SvelteKit application designed for reading comic book archives (CBZ, CBR, ZIP, RAR) directly in the browser. It features offline capabilities using IndexedDB for storage and `libarchive.js` for handling archive extraction. The app is designed as a Progressive Web App (PWA).

## Key Technologies

- **Framework:** SvelteKit (Svelte 5)
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS (via PostCSS)
- **Storage:** IndexedDB (Custom wrapper in `src/lib/storage`)
- **Archive Handling:** `libarchive.js` (Web Assembly/Worker based)
- **Compression:** `fflate`

## Architecture

The application follows a standard SvelteKit directory structure with a focus on service-based logic for heavy lifting.

### Directory Structure

- `src/lib/archive/`: Handles interaction with `libarchive.js`.
- `src/lib/services/`: Core business logic.
  - `comicProcessor.ts`: Orchestrates file parsing, thumbnail generation, and saving.
  - `logger.ts`: Centralized logging utility.
  - `theme.ts`: Manages application theming.
- `src/lib/storage/`: IndexedDB interaction layer.
  - `comicStorage.ts`: Manages comic metadata and page blobs.
  - `fileSystem.ts`: Handles raw file IO operations.
- `src/lib/store/`: Svelte stores for reactive state management (`session`, `filterStore`).
- `src/lib/ui/`: Reusable Svelte components (`Viewer`, `FilterButton`, etc.).
- `src/routes/`: Application routes.
  - `/`: Home/Upload page.
  - `/library`: Library view of stored comics.
  - `/reader`: The actual comic reading interface.

### Data Flow

1.  **Input:** User uploads a file via `src/routes/+page.svelte`.
2.  **Processing:** `comicProcessor.ts` validates the file, extracts metadata/pages using `ArchiveManager`, and generates a thumbnail.
3.  **Storage:** `comicStorage.ts` saves the raw file and metadata into IndexedDB.
4.  **Reading:** `src/routes/reader/+page.svelte` retrieves page blobs from IndexedDB on demand.

## Development & Build

### Key Commands

- **Install Dependencies:** `npm install` (Triggers `setup:libarchive` to copy worker files)
- **Start Dev Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Linting:** `npm run lint`
- **Formatting:** `npm run format`
- **Type Check:** `npm run check`

### Setup Note

The `postinstall` script (`setup:libarchive`) is critical. It copies `libarchive.js` worker files from `node_modules` to `static/libarchive/`. If the worker fails to load, ensure this folder exists and is populated.

## Coding Conventions

- **Logging:** Use the `logger` service (`$lib/services/logger`) instead of `console.log`.
- **State Management:** Use Svelte stores located in `src/lib/store/` for global state.
- **Error Handling:** Errors should be pushed to the `session` store (`setError`) to be displayed by the global error handler in `+layout.svelte`.
- **Types:** All data structures related to comics should be defined in `src/types/comic.ts`.
- **Async/Await:** Prefer `async/await` over promise chaining.

## Critical Files

- `src/lib/services/comicProcessor.ts`: Main entry point for file handling logic.
- `src/lib/storage/comicStorage.ts`: IndexedDB schema and data access layer.
- `src/types/comic.ts`: Core type definitions (`ComicBook`, `ComicPage`, etc.).
- `src/routes/+layout.svelte`: Global layout, error handling, and theme initialization.
