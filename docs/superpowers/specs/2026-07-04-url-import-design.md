# Import Comic from URL — Design

## Purpose

Let users add a comic without a local file, by either:
- Dragging/dropping a download link (URL) onto the home page dropzone.
- Visiting `comikaiju.com/?url=<downloadUrl>`.

The app downloads the file client-side and feeds it into the existing upload pipeline, so it's treated exactly like a manually selected file (dedup, thumbnail, storage, reader navigation).

## Constraints

- **No backend.** ComiKaiju is a fully static, client-side PWA (see CLAUDE.md). All fetching happens in the browser via `fetch()`.
- **CORS applies.** A remote URL will only be fetchable if the host sends permissive CORS headers, or the URL is same-origin. No proxy will be added to work around this — a failed cross-origin fetch surfaces as a clear, user-facing error rather than being silently worked around.

## Architecture

No new services beyond one small UI component; everything else extends existing modules.

### `comicProcessor.ts`

Add:

```ts
export async function handleUrlImport(url: string, loadComics: () => Promise<void>)
```

Behavior:
1. `setLoading(true, "Downloading...")`.
2. `fetch(url)`. On failure (network error, CORS rejection, non-2xx status), `setError(...)` with a message explaining the link may not allow direct downloads, then return.
3. Read the response as a `Blob`.
4. Derive a filename from the URL (see "Filename derivation" below).
5. Construct `new File([blob], filename)`.
6. Delegate to the existing `handleFile(file, loadComics)` unchanged — this is the same function manual uploads use, so duplicate detection, extension validation (`archiveManager.isSupported`), thumbnailing, IndexedDB storage, and `goto("/reader")` are all reused as-is with zero duplication.

`handleUrlImport` does not itself validate the extension — it lets `handleFile`'s existing `isSupported()` check reject unsupported files with the existing error message. This avoids introducing a second, parallel validation path.

### `UrlImportConfirm.svelte` (new component)

A small confirmation card rendered on the home page:
- Shows the pending URL (truncated if long).
- "Download & Open" button → calls `handleUrlImport(url, loadComics)`.
- "Cancel" button → clears the pending URL, dismisses the card.

Used for **both** entry points (drop and `?url=`) — dropping a link and visiting a `?url=` link both show this same confirmation step before any network request fires. This is a deliberate consistency choice: a query-param link can be shared by a third party without the user directly choosing to drop something, so it needs a confirm step; keeping the drop path identical avoids having two different UX flows for the same underlying action.

### `+page.svelte` changes

- `onMount`: read `$page.url.searchParams.get('url')`. If present and it parses as a valid `http(s)://` URL, set it as the pending URL for `UrlImportConfirm` (do not auto-fetch). Then strip `?url=` from the address bar via `replaceState` so a refresh or back-navigation doesn't re-trigger the prompt.
- Drop handler: in addition to the existing `event.dataTransfer.files` handling, check `event.dataTransfer.getData('text/uri-list')` (falling back to `text/plain`). If it parses as an `http(s)://` URL, set it as the pending URL for `UrlImportConfirm` instead of treating the drop as a file.

## Data Flow

1. URL enters via drop or `?url=` → `UrlImportConfirm` shows the URL, awaits user action.
2. On confirm → `handleUrlImport` runs: download → wrap as `File` → `handleFile`.
3. From `handleFile` onward, behavior is identical to a manual file upload: duplicate check, archive extraction, thumbnail, IndexedDB save, navigate to `/reader`.
4. On cancel → pending URL is discarded, no network request is made.

## Error Handling

Reuses the existing `setError()` / toast mechanism — no new UI for errors.

- Fetch throws or returns non-2xx (CORS failure, network error, 404, etc.) → `"Couldn't download from that link. The site may not allow direct downloads."`
- Downloaded file's derived filename doesn't match a supported extension → existing `handleFile` message: `"Please select a CBZ, ZIP, CBR, or RAR file."`
- No retry logic, no partial-download resume — matches the simplicity of the existing manual-upload error handling.

## Filename Derivation

- Take the last path segment of the URL, URL-decoded (e.g. `https://example.com/comics/Batman%20001.cbz` → `Batman 001.cbz`).
- If the URL has a query string, it's ignored for filename purposes (path only).
- No reliance on `Content-Disposition` — it's frequently not exposed cross-origin (`Access-Control-Expose-Headers`), so it can't be depended on. The URL path is the single source of truth for the derived filename.
- If the derived filename has no recognized extension, it's passed to `handleFile` as-is, which will reject it via the existing `isSupported()` check. No separate error path is introduced for this case.

## Loading State

Reuses the existing `isLoading` / `loadingMessage` stores:
- `"Downloading..."` while `fetch` is in flight.
- Switches to the existing `"Processing archive..."` message once `handleFile` takes over (already set inside `handleFile`).

## Out of Scope (YAGNI)

- No CORS proxy or backend of any kind.
- No download progress bar / percentage (indefinite spinner only).
- No retry/resume for failed or partial downloads.
- No URL history or "recently imported from" list beyond what the normal recent-comics list already shows.
