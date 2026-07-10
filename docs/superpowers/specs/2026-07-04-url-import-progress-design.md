# Download Progress for URL Import — Design

## Purpose

Show download progress (percentage, or bytes downloaded when the total size is unknown) while a comic is being downloaded via any of the three URL-import entry points (drop-a-link, `?url=` param, or the paste-a-link textbox added to the home page). All three already funnel through `handleUrlImport` in `comicProcessor.ts`, so this is a single implementation point.

## Constraints

- Percentage requires the server to send a `Content-Length` header, and for cross-origin responses, that header must additionally be exposed via `Access-Control-Expose-Headers: Content-Length` — many CORS-permissive hosts don't do this. When the total size is unknown, fall back to showing bytes downloaded instead of a percentage.
- No regression to any other existing loading state in the app (file upload, archive processing, folder sync, etc.) — those must render exactly as they do today.

## Architecture

### `src/lib/store/session.ts`

Add a new store, additive only (no changes to `isLoading`/`loadingMessage`):

```ts
export interface DownloadProgress {
  loaded: number;
  total: number | null;
}

export const downloadProgress = writable<DownloadProgress | null>(null);

export function setDownloadProgress(progress: DownloadProgress | null) {
  downloadProgress.set(progress);
}
```

Only `handleUrlImport` ever sets this to a non-null value. Every other loading path in the app never touches it, so it stays `null` and the loading overlay's rendering for those paths is unchanged.

### `src/lib/utils/format.ts` (new file)

```ts
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
```

(Same formatting convention already used by `formatFileSize` in `+page.svelte` — kept as a separate small utility rather than refactoring that existing local function, to avoid unrelated scope creep.)

### `comicProcessor.ts` — `handleUrlImport` changes

Replace the current `const blob = await response.blob();` with a manual stream read:

1. Before the fetch: `setDownloadProgress(null)` (reset any stale value from a prior run).
2. After a successful (`response.ok`) fetch: read `Content-Length` from `response.headers`, parse to a number or `null` if absent/unparseable.
3. Get a reader via `response.body.getReader()`. Loop reading chunks into an array of `Uint8Array`, accumulating `loaded` bytes; after each chunk call `setDownloadProgress({ loaded, total })`.
4. On loop completion, build a `Blob` from the accumulated chunks (using the existing `Content-Type`/`blob.type` handling already in place).
5. Immediately before delegating to `handleFile`, call `setDownloadProgress(null)` so the progress UI doesn't bleed into the "Processing archive..." step.
6. On any error (fetch rejection/non-2xx, or an error thrown during the read loop — already wrapped in the existing try/catch from the prior implementation), call `setDownloadProgress(null)` alongside the existing `setLoading(false)` / `setError(...)` calls.

### `src/routes/+layout.svelte` — loading overlay changes

Subscribe to `$downloadProgress` alongside the existing `$isLoading`/`$loadingMessage`. Inside the existing `.loading-overlay` block:

- If `$downloadProgress` is `null`: render exactly as today (spinner + `$loadingMessage` text only).
- If `$downloadProgress` is non-null and `total` is a number: render a progress bar filled to `(loaded / total) * 100%`, with text like `Downloading... 42%`.
- If `$downloadProgress` is non-null and `total` is `null`: render the bar in an indefinite/pulsing state (no fixed fill percentage), with text like `Downloading... 2.1 MB downloaded` (using `formatBytes`).

## Data Flow

1. User confirms a URL import (from any of the 3 entry points) → `handleUrlImport` runs.
2. `setLoading(true, "Downloading...")` and `setDownloadProgress(null)` fire.
3. Fetch resolves; stream-read loop updates `downloadProgress` per chunk; overlay reactively re-renders the bar/text on each update.
4. Read completes → `setDownloadProgress(null)` → `handleFile` takes over exactly as before (its own `"Processing archive..."` loading message, no progress UI shown during this phase).
5. On any failure at any point → `setDownloadProgress(null)`, `setLoading(false)`, `setError(...)` — matching the existing error-handling pattern already in place.

## Error Handling

No new error paths — this only adds progress _reporting_ to the existing fetch/read flow. The existing try/catch structure in `handleUrlImport` (established during the original URL-import review, which added a try/catch around the post-fetch blob/File/handleFile section) is extended to also clear `downloadProgress` on any failure, so the progress UI never gets stuck if a read fails partway through.

## Out of Scope (YAGNI)

- No progress reporting for archive extraction/processing (`handleFile`'s "Processing archive..." phase) — only the network download phase.
- No pause/resume/cancel of an in-progress download.
- No progress reporting for local file uploads (drag-drop/click-to-browse) — those are local reads, not network downloads, and were never in scope for a progress indicator.
