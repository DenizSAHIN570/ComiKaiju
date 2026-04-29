# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComiKaiju is a client-side SvelteKit PWA for reading comic book archives (CBZ/CBR/ZIP/RAR) in the browser. All processing happens client-side — no backend server. Comics are stored in IndexedDB with content-hash deduplication for offline access.

## Commands

- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Production build to `build/` (static adapter, fully pre-rendered)
- `npm run check` — TypeScript type checking via svelte-check
- `npm run lint` — Prettier + ESLint check
- `npm run format` — Auto-format with Prettier

**Setup note:** `npm install` triggers a `postinstall` script that copies `libarchive.js` worker files to `static/libarchive/`. If the archive worker fails to load at runtime, verify this directory is populated.

## Architecture

### Data Flow

1. User uploads a file on `/` (home page)
2. `comicProcessor.ts` validates the file, checks for duplicates via content hash, extracts pages using `ArchiveManager`, generates a thumbnail
3. `comicStorage.ts` saves the raw file blob and metadata into IndexedDB (with ref-counted deduplication)
4. `/reader` retrieves page blobs from IndexedDB on demand for viewing

### Key Layers

- **Archive extraction** (`src/lib/archive/archiveManager.ts`): Wraps `libarchive.js` (WASM-based) to open CBZ/CBR/ZIP/RAR files and extract individual pages. Uses a web worker at `/libarchive/worker-bundle.js`.
- **Storage** (`src/lib/storage/comicStorage.ts`): Single `ComicStorageManager` class managing all IndexedDB operations. Uses multiple object stores: `items` (file metadata), `blobs` (content-addressed with refCount), `comicMetadata` (reading progress), `comicPages` (cached page blobs), `settings`. DB version is currently 5.
- **Session state** (`src/lib/store/session.ts`): Svelte writable stores for `currentComic`, `currentFile`, `currentPageIndex`, `viewSettings`, `isLoading`, and `error`. Helper functions like `setComic()`, `setError()`, `setLoading()` manage state transitions.
- **Processing** (`src/lib/services/comicProcessor.ts`): Orchestrates the full upload-to-reader pipeline — duplicate detection, archive opening, thumbnail creation, storage, and navigation to `/reader`.

### Routes

- `/` — Home page with file upload (drag & drop) and recent comics
- `/library` — Browse and manage all stored comics
- `/reader` — Full-screen comic viewer with zoom, pan, navigation controls

### Error Handling

Errors flow through the `session` store via `setError()` and display as a toast in `+layout.svelte`. Non-critical errors auto-dismiss after 10 seconds. Global `window.onerror` and `onunhandledrejection` are captured in the layout.

## Coding Conventions

- Use the `logger` service (`$lib/services/logger`) instead of `console.log`
- Push errors to the session store (`setError()`) for UI display — don't handle them silently
- All comic-related types are defined in `src/types/comic.ts`
- Use Svelte stores in `src/lib/store/` for global reactive state
- Prefer `async/await` over promise chains
- Styling uses TailwindCSS v4 with CSS custom properties for theming (light/dark)
- Static adapter — the app is fully static with no SSR; `src/routes/+layout.ts` sets `export const prerender = true`
