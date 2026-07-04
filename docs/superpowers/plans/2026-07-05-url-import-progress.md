# Download Progress for URL Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show download progress (percentage when known, bytes-downloaded when not) in the loading overlay while a comic is being downloaded via any of the three URL-import entry points (drop-a-link, `?url=` param, paste-a-link textbox).

**Architecture:** Add a `downloadProgress` store to `session.ts` that only `handleUrlImport` ever sets. Rewrite `handleUrlImport`'s blob-fetching to a manual stream read via `response.body.getReader()`, updating the store per chunk. The global loading overlay in `+layout.svelte` renders a progress bar/text when the store is non-null, and is unchanged for every other loading state in the app (where the store stays `null`).

**Tech Stack:** SvelteKit 2 / Svelte 5 (runes for components, Svelte stores for `session.ts` — this file already uses the store API, not runes), TypeScript, native `ReadableStreamDefaultReader`. No new dependencies.

## Global Constraints

- Percentage requires `Content-Length` on the response (and, for cross-origin responses, that header must be exposed via CORS) — when it's absent, fall back to showing bytes downloaded instead of a percentage, never break or show `NaN%`.
- No regression to any other existing loading state (file upload, archive processing, folder sync) — those never set `downloadProgress`, so the overlay must render exactly as it does today when the store is `null`.
- No new test framework — this repo has none (only `svelte-check` + `eslint`). Verify via `npm run check` / `npm run lint` plus manual/browser verification.
- Follow existing conventions: `logger` service, `setError`/session-store patterns, 2-space indentation in `.ts` files, tabs in `src/routes/+layout.svelte` and `src/routes/+page.svelte` (match each file's existing style).
- No commits without being explicitly told to — implementers make changes but do not commit; the controller asks the user before committing each task.

---

## Task 1: `downloadProgress` store and `formatBytes` utility

**Files:**
- Modify: `src/lib/store/session.ts`
- Create: `src/lib/utils/format.ts`

**Interfaces:**
- Produces: `export interface DownloadProgress { loaded: number; total: number | null; }`
- Produces: `export const downloadProgress: Writable<DownloadProgress | null>`
- Produces: `export function setDownloadProgress(progress: DownloadProgress | null): void`
- Produces: `export function formatBytes(bytes: number): string`

- [ ] **Step 1: Add the `downloadProgress` store to `session.ts`**

Open `src/lib/store/session.ts`. Add this after the existing `loadingMessage` store declaration (`export const loadingMessage = writable<string>("");`):

```ts
export interface DownloadProgress {
  loaded: number;
  total: number | null;
}

export const downloadProgress = writable<DownloadProgress | null>(null);
```

Add this near the other helper functions (e.g. right after `setPage`, or anywhere alongside the other `set*` helpers in the file):

```ts
export function setDownloadProgress(progress: DownloadProgress | null) {
  downloadProgress.set(progress);
}
```

- [ ] **Step 2: Create `formatBytes` utility**

Create `src/lib/utils/format.ts`:

```ts
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run check && npx eslint src/lib/store/session.ts src/lib/utils/format.ts`
Expected: `npm run check` reports 0 errors/0 warnings; the targeted `eslint` call reports no output (clean).

- [ ] **Step 4: Manually verify in the browser console**

Run `npm run dev`, open `http://localhost:5173` in a browser, open devtools console, run:

```js
const m = await import('/src/lib/utils/format.ts');
m.formatBytes(0);        // "0 Bytes"
m.formatBytes(1024);     // "1 KB"
m.formatBytes(2097152);  // "2 MB"
m.formatBytes(512);      // "512 Bytes"
```

Expected: results match the comments above.

- [ ] **Step 5: Stop — do not commit**

Report the diff to the controller and wait for explicit go-ahead before committing (project policy: no auto-commits).

---

## Task 2: Stream-read `handleUrlImport` with progress reporting

**Files:**
- Modify: `src/lib/services/comicProcessor.ts`

**Interfaces:**
- Consumes: `setDownloadProgress`, `DownloadProgress` from `$lib/store/session.js` (Task 1).
- Produces: no change to `handleUrlImport`'s external signature (`(url: string, loadComics: () => Promise<void>) => Promise<void>`) — only its internal implementation changes.

The current implementation of `handleUrlImport` (for reference — you are replacing the code between the two `try` blocks and the fetch call):

```ts
export async function handleUrlImport(
  url: string,
  loadComics: () => Promise<void>,
) {
  clearError();
  setLoading(true, "Downloading...");

  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (err) {
    logger.error("ComicProcessor", "Failed to download from URL", err);
    setError(
      "Couldn't download from that link. The site may not allow direct downloads.",
    );
    setLoading(false);
    return;
  }

  try {
    const blob = await response.blob();
    const filename = deriveFilenameFromUrl(url);
    const file = new File([blob], filename, { type: blob.type });

    await handleFile(file, loadComics);
  } catch (err) {
    logger.error("ComicProcessor", "Failed to read downloaded file", err);
    setError("Couldn't read the downloaded file.");
    setLoading(false);
  }
}
```

- [ ] **Step 1: Update the import line**

In `src/lib/services/comicProcessor.ts`, find:

```ts
import {
  setComic,
  setLoading,
  setError,
  clearError,
} from "$lib/store/session.js";
```

Replace with:

```ts
import {
  setComic,
  setLoading,
  setError,
  clearError,
  setDownloadProgress,
} from "$lib/store/session.js";
```

- [ ] **Step 2: Replace `handleUrlImport`'s body**

Replace the entire `handleUrlImport` function with:

```ts
export async function handleUrlImport(
  url: string,
  loadComics: () => Promise<void>,
) {
  clearError();
  setLoading(true, "Downloading...");
  setDownloadProgress(null);

  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (err) {
    logger.error("ComicProcessor", "Failed to download from URL", err);
    setError(
      "Couldn't download from that link. The site may not allow direct downloads.",
    );
    setDownloadProgress(null);
    setLoading(false);
    return;
  }

  try {
    const contentLengthHeader = response.headers.get("Content-Length");
    const total = contentLengthHeader ? Number(contentLengthHeader) : null;
    const contentType = response.headers.get("Content-Type") || "";

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          setDownloadProgress({ loaded, total: total && !Number.isNaN(total) ? total : null });
        }
      }
    }

    const blob = chunks.length > 0 ? new Blob(chunks, { type: contentType }) : await response.blob();
    const filename = deriveFilenameFromUrl(url);
    const file = new File([blob], filename, { type: blob.type });

    setDownloadProgress(null);
    await handleFile(file, loadComics);
  } catch (err) {
    logger.error("ComicProcessor", "Failed to read downloaded file", err);
    setError("Couldn't read the downloaded file.");
    setDownloadProgress(null);
    setLoading(false);
  }
}
```

Note: `response.body` can be `undefined` in environments without stream support (not expected in this app's target browsers, but the `reader ? ... : await response.blob()` fallback keeps behavior identical to before in that case — no progress reported, but the download still completes).

- [ ] **Step 3: Type-check and lint**

Run: `npm run check && npx eslint src/lib/services/comicProcessor.ts`
Expected: `npm run check` reports 0 errors/0 warnings. The targeted `eslint` call should report only the 3 pre-existing issues already known from prior review (2 `svelte/no-navigation-without-resolve` errors on the `goto("/reader")` calls in `handleFile`, 1 `no-explicit-any` warning on `cleanPages`) — no new issues.

- [ ] **Step 4: Manually verify progress updates fire**

Build a small test fixture and serve it locally to confirm the store updates:

```bash
mkdir -p /tmp/comikaiju-progress-fixture && cd /tmp/comikaiju-progress-fixture
python3 -c "
import struct, zlib
def png(path, color):
    sig = b'\x89PNG\r\n\x1a\n'
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    raw = b'\x00' + bytes(color)
    idat = zlib.compress(raw)
    with open(path, 'wb') as f:
        f.write(sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b''))
png('page1.png', (255, 0, 0))
png('page2.png', (0, 255, 0))
"
zip sample.cbz page1.png page2.png
mkdir -p /home/deniz/Documents/Projects/ComiKaiju/static/test-fixtures
cp sample.cbz /home/deniz/Documents/Projects/ComiKaiju/static/test-fixtures/sample.cbz
```

Run `npm run dev`, open `http://localhost:5173` in a browser, open devtools console, and run:

```js
const session = await import('/src/lib/services/comicProcessor.ts');
const store = await import('/src/lib/store/session.ts');
const unsub = store.downloadProgress.subscribe(p => console.log('progress:', p));
await session.handleUrlImport('http://localhost:5173/test-fixtures/sample.cbz', async () => {});
unsub();
```

Expected: console logs show at least one `progress: { loaded: <number>, total: <number or null> }` entry with `loaded > 0` while downloading, then `progress: null` once complete (from the reset before `handleFile` and/or the `handleFile` navigating away).

Clean up: `rm -rf /home/deniz/Documents/Projects/ComiKaiju/static/test-fixtures /tmp/comikaiju-progress-fixture`.

- [ ] **Step 5: Stop — do not commit**

Report the diff to the controller and wait for explicit go-ahead before committing.

---

## Task 3: Loading overlay progress UI

**Files:**
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `downloadProgress` store and `DownloadProgress` type from `$lib/store/session.js` (Task 1); `formatBytes` from `$lib/utils/format.js` (Task 1).

Current relevant markup (for reference — `src/routes/+layout.svelte` lines 75-82):

```svelte
{#if $isLoading}
	<div class="loading-overlay" role="status" aria-label="Loading">
		<div class="loading-content bg-bg-surface text-text-main">
			<div class="loading-spinner border-border border-t-primary"></div>
			<p>{$loadingMessage || 'Loading...'}</p>
		</div>
	</div>
{/if}
```

This file uses **tabs** for indentation — match that.

- [ ] **Step 1: Update the import line**

Find (near the top of the `<script>` block):

```ts
import { error, clearError, isLoading, loadingMessage, setError } from '$lib/store/session.js';
```

Replace with:

```ts
import { error, clearError, isLoading, loadingMessage, downloadProgress, setError } from '$lib/store/session.js';
import { formatBytes } from '$lib/utils/format.js';
```

- [ ] **Step 2: Replace the loading-overlay markup**

Replace the `{#if $isLoading} ... {/if}` block shown above with:

```svelte
{#if $isLoading}
	<div class="loading-overlay" role="status" aria-label="Loading">
		<div class="loading-content bg-bg-surface text-text-main">
			<div class="loading-spinner border-border border-t-primary"></div>
			<p>{$loadingMessage || 'Loading...'}</p>
			{#if $downloadProgress}
				{#if $downloadProgress.total}
					<div class="download-progress-bar">
						<div
							class="download-progress-fill"
							style="width: {Math.min(100, Math.round(($downloadProgress.loaded / $downloadProgress.total) * 100))}%"
						></div>
					</div>
					<p class="download-progress-label">
						{Math.min(100, Math.round(($downloadProgress.loaded / $downloadProgress.total) * 100))}%
					</p>
				{:else}
					<div class="download-progress-bar indefinite">
						<div class="download-progress-fill"></div>
					</div>
					<p class="download-progress-label">{formatBytes($downloadProgress.loaded)} downloaded</p>
				{/if}
			{/if}
		</div>
	</div>
{/if}
```

- [ ] **Step 3: Add the progress bar styles**

In the `<style>` block, add this right after the existing `.loading-spinner { ... }` rule:

```css
	.download-progress-bar {
		width: 100%;
		height: 6px;
		background-color: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 0.75rem;
	}

	.download-progress-fill {
		height: 100%;
		background-color: var(--color-primary);
		transition: width 0.2s ease;
	}

	.download-progress-bar.indefinite .download-progress-fill {
		width: 40%;
		animation: download-indefinite 1.2s ease-in-out infinite;
	}

	@keyframes download-indefinite {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(250%); }
	}

	.download-progress-label {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--color-text-main);
	}
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run check && npx eslint src/routes/+layout.svelte`
Expected: `npm run check` reports 0 errors/0 warnings; targeted `eslint` reports no output (clean) — this file had no pre-existing lint issues.

- [ ] **Step 5: Manually verify in the browser**

Reuse the fixture-building commands from Task 2 Step 4 to create `static/test-fixtures/sample.cbz` (skip if it's still present from Task 2's verification). With `npm run dev` running, visit:

`http://localhost:5173/?url=http://localhost:5173/test-fixtures/sample.cbz`

Confirm the import, and while the "Downloading..." overlay is showing, observe:
- Since this is a same-origin request, `Content-Length` should be available and exposed → expect a filling progress bar and a percentage label (e.g. "100%") — the file is tiny so this may complete in well under a second; if needed, throttle the network in devtools (Network tab → "Slow 3G") before confirming, to see the bar animate from 0% upward.
- To see the bytes-downloaded fallback, serve the same fixture from a plain `python3 -m http.server` on a different port (e.g. 8099) from `/tmp/comikaiju-progress-fixture`, without CORS `Access-Control-Expose-Headers` — but note that host will fail the CORS check entirely (no `Access-Control-Allow-Origin`) before any progress could show, since this app requires CORS-permissive hosts to fetch at all. Instead, verify the bytes-downloaded fallback path by testing directly in the console (as in Task 2 Step 4) with a synthetic `Response` object that has no `Content-Length`:

```js
const store = await import('/src/lib/store/session.ts');
store.setDownloadProgress({ loaded: 2200000, total: null });
```

Then check the loading overlay is NOT shown for this console-only test (that's expected — `isLoading` wasn't set), but instead directly verify the label logic by checking `formatBytes` produces the right text (already done in Task 1 Step 4), and rely on the Task 2 Step 4 console log showing `total: null` when Content-Length is absent as the functional proof this branch is reachable. Take a screenshot of the same-origin percentage-bar case as the primary visual verification.

Clean up: `rm -rf /home/deniz/Documents/Projects/ComiKaiju/static/test-fixtures /tmp/comikaiju-progress-fixture` if not already removed.

- [ ] **Step 6: Stop — do not commit**

Report the diff to the controller and wait for explicit go-ahead before committing.

---

## Self-Review Notes

- **Spec coverage:** progress bar + percentage when total known ✅ (Task 3 Step 2, `{#if $downloadProgress.total}` branch), bytes-downloaded fallback when total unknown ✅ (Task 3 Step 2, `{:else}` branch using `formatBytes`), no regression to other loading states ✅ (`downloadProgress` only ever set by `handleUrlImport`, overlay's `{#if $downloadProgress}` guard means it renders nothing extra when null), progress reset before `handleFile` takeover ✅ (Task 2 Step 2, `setDownloadProgress(null)` right before `await handleFile(...)`), progress cleared on all error paths ✅ (both catch blocks in Task 2 Step 2 call `setDownloadProgress(null)`).
- **No placeholders:** all steps contain complete, runnable code and exact commands.
- **Type consistency:** `DownloadProgress` (`{ loaded: number; total: number | null }`) defined in Task 1 is used identically in Task 2's `setDownloadProgress({ loaded, total })` calls and Task 3's `$downloadProgress.total` / `$downloadProgress.loaded` reads — no shape mismatch.
