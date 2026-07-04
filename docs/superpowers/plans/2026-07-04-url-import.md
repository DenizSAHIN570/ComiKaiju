# URL Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add a comic by dropping a download link on the home page dropzone, or visiting `comikaiju.com/?url=<downloadUrl>`, downloading it client-side and feeding it into the existing upload pipeline.

**Architecture:** Add a `handleUrlImport()` function to the existing `comicProcessor.ts` that downloads a URL into a `File` and delegates to the existing `handleFile()` — reusing dedup, thumbnailing, storage, and reader navigation untouched. Add one new component, `UrlImportConfirm.svelte`, that both new entry points (drop-a-link and `?url=`) render to get explicit user confirmation before any network request fires.

**Tech Stack:** SvelteKit 2 / Svelte 5 (runes), TypeScript, native `fetch`/`File`/`Blob` APIs. No new dependencies.

## Global Constraints

- No backend/proxy of any kind — this is a fully static, client-side PWA (see CLAUDE.md). All fetching happens via browser `fetch()`.
- Cross-origin downloads are subject to CORS; a failed cross-origin fetch must surface as a clear user-facing error, never be silently worked around.
- Both entry points (drag-drop of a link, and `?url=` param) show the **same** confirmation card before downloading — no auto-download on page load.
- No new test framework — this repo has none today (only `svelte-check` + `eslint`). Verify each task manually via the dev server, plus `npm run check` / `npm run lint` as the automated gate.
- Use the `logger` service instead of `console.log`; push errors through `setError()`; follow existing store/service patterns (see `src/lib/services/comicProcessor.ts`, `src/lib/store/session.ts`).

---

## Task 1: URL helpers and `handleUrlImport` in `comicProcessor.ts`

**Files:**
- Modify: `src/lib/services/comicProcessor.ts`

**Interfaces:**
- Produces: `export function isHttpUrl(value: string): boolean`
- Produces: `export function deriveFilenameFromUrl(url: string): string`
- Produces: `export async function handleUrlImport(url: string, loadComics: () => Promise<void>): Promise<void>`
- Consumes (already in file): `setLoading`, `setError`, `clearError` from `$lib/store/session.js`; `logger` from `./logger.js`; `handleFile` (same file).

- [ ] **Step 1: Add `isHttpUrl` and `deriveFilenameFromUrl` helpers**

Add near the top of `src/lib/services/comicProcessor.ts`, after the existing imports:

```ts
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function deriveFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      return decodeURIComponent(last);
    }
  } catch {
    // fall through to default below
  }
  return "comic.cbz";
}
```

- [ ] **Step 2: Add `handleUrlImport`**

Add after `handleFile` (before `cleanupComicProcessor`) in the same file:

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

  const blob = await response.blob();
  const filename = deriveFilenameFromUrl(url);
  const file = new File([blob], filename, { type: blob.type });

  await handleFile(file, loadComics);
}
```

`handleFile` already manages its own `setLoading`/`setError`/`clearError` calls once it takes over, so no duplicate cleanup is needed here beyond the early-return case above.

- [ ] **Step 3: Type-check and lint**

Run: `npm run check && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 4: Manually verify the helpers in isolation**

Run: `npm run dev`, then open `http://localhost:5173` in a browser and open the devtools console. Run:

```js
const m = await import('/src/lib/services/comicProcessor.ts');
m.isHttpUrl('https://example.com/comic.cbz'); // true
m.isHttpUrl('not a url');                     // false
m.isHttpUrl('ftp://example.com/x');           // false
m.deriveFilenameFromUrl('https://example.com/comics/Batman%20001.cbz'); // "Batman 001.cbz"
m.deriveFilenameFromUrl('https://example.com/');                        // "comic.cbz"
```

Expected: results match the comments above.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/comicProcessor.ts
git commit -m "feat: add handleUrlImport for downloading comics from a URL"
```

---

## Task 2: `UrlImportConfirm.svelte` component

**Files:**
- Create: `src/lib/ui/UrlImportConfirm.svelte`

**Interfaces:**
- Produces: a component with props `{ url: string; onConfirm: () => void; onCancel: () => void }`, rendered as a fixed-position overlay card (same visual family as the existing `.loading-overlay` / `.global-error` overlays in `src/routes/+layout.svelte`).
- Consumes: none (pure presentational component).

- [ ] **Step 1: Write the component**

Create `src/lib/ui/UrlImportConfirm.svelte`:

```svelte
<script lang="ts">
  interface Props {
    url: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { url, onConfirm, onCancel }: Props = $props();
</script>

<div class="url-import-overlay" role="dialog" aria-modal="true" aria-label="Confirm import from URL">
  <div class="url-import-card">
    <h3>Import comic from link?</h3>
    <p class="url-import-url">{url}</p>
    <div class="url-import-actions">
      <button class="url-import-cancel" onclick={onCancel}>Cancel</button>
      <button class="url-import-confirm" onclick={onConfirm}>Download & Open</button>
    </div>
  </div>
</div>

<style>
  .url-import-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(2px);
  }

  .url-import-card {
    background-color: var(--color-bg-surface);
    color: var(--color-text-main);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 90vw;
    width: 420px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }

  .url-import-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
  }

  .url-import-url {
    word-break: break-all;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    margin: 0 0 1.25rem;
  }

  .url-import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .url-import-cancel,
  .url-import-confirm {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .url-import-cancel {
    background: transparent;
    color: var(--color-text-main);
    border: 1px solid var(--color-border);
  }

  .url-import-confirm {
    background: var(--color-primary);
    color: white;
  }
</style>
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run check && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/UrlImportConfirm.svelte
git commit -m "feat: add UrlImportConfirm confirmation card component"
```

---

## Task 3: Wire drop-a-link and `?url=` into `src/routes/+page.svelte`

**Files:**
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `isHttpUrl`, `handleUrlImport` from `$lib/services/comicProcessor.js` (Task 1); `UrlImportConfirm` from `$lib/ui/UrlImportConfirm.svelte` (Task 2); existing `handleFile`, `loadComics`, `dragActive` in this file.

- [ ] **Step 1: Import the new helpers and component**

At the top of the `<script>` block in `src/routes/+page.svelte`, alongside the existing imports:

```ts
import { handleFile, cleanupComicProcessor, handleUrlImport, isHttpUrl } from '$lib/services/comicProcessor.js';
import UrlImportConfirm from '$lib/ui/UrlImportConfirm.svelte';
```

(This replaces the existing `import { handleFile, cleanupComicProcessor } from '$lib/services/comicProcessor.js';` line — add the two new named imports to it rather than duplicating the import statement.)

- [ ] **Step 2: Add pending-URL state and confirm/cancel handlers**

Near the other `$state` declarations (next to `let dragActive = $state(false);`):

```ts
let pendingImportUrl = $state<string | null>(null);
```

Near `handleDrop`/`handleDragOver` (after `handleDrop`'s current definition):

```ts
async function confirmUrlImport() {
  const url = pendingImportUrl;
  pendingImportUrl = null;
  if (url) {
    await handleUrlImport(url, loadComics);
  }
}

function cancelUrlImport() {
  pendingImportUrl = null;
}
```

- [ ] **Step 3: Detect a dropped link in `handleDrop`**

Replace the existing `handleDrop` function:

```ts
async function handleDrop(event: DragEvent) {
  event.preventDefault();
  dragActive = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    await handleFile(files[0], loadComics);
    return;
  }

  const droppedText =
    event.dataTransfer?.getData('text/uri-list') ||
    event.dataTransfer?.getData('text/plain') ||
    '';
  if (droppedText && isHttpUrl(droppedText)) {
    pendingImportUrl = droppedText.trim();
  }
}
```

- [ ] **Step 4: Read `?url=` on mount and strip it from the address bar**

In the existing `onMount(async () => { ... })` block, add at the top (before the existing `try` block, or as the first statement inside it — place it before the `try` so it runs even if the rest of init fails):

```ts
const urlParam = new URL(window.location.href).searchParams.get('url');
if (urlParam && isHttpUrl(urlParam)) {
  pendingImportUrl = urlParam;
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('url');
  window.history.replaceState({}, '', cleanUrl.toString());
}
```

- [ ] **Step 5: Render the confirmation card**

Near the end of the markup, alongside other top-level conditional overlays (add just before the closing of the root markup, e.g. right after the `<input type="file" ...>` block that follows the drop-zone `<div>`):

```svelte
{#if pendingImportUrl}
  <UrlImportConfirm url={pendingImportUrl} onConfirm={confirmUrlImport} onCancel={cancelUrlImport} />
{/if}
```

- [ ] **Step 6: Type-check and lint**

Run: `npm run check && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 7: Build a local test fixture (not committed)**

```bash
mkdir -p /tmp/comikaiju-test-fixture && cd /tmp/comikaiju-test-fixture
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

- [ ] **Step 8: Manually verify the `?url=` flow (same-origin, should succeed)**

Run: `npm run dev`, then visit:
`http://localhost:5173/?url=http://localhost:5173/test-fixtures/sample.cbz`

Expected:
- The confirm card appears showing that URL, before any network request happens.
- The address bar no longer shows `?url=...` (stripped via `replaceState`).
- Clicking "Download & Open" shows the "Downloading..." loading state, then "Processing archive...", then navigates to `/reader` with the 2-page comic loaded.
- The comic now appears in the recent comics list on `/`.

- [ ] **Step 9: Manually verify the drop-a-link flow**

With the dev server still running, open a second browser tab to `http://localhost:5173/test-fixtures/sample.cbz` (it will download or show as a file, depending on the browser), then drag the address-bar URL from that tab onto the home page's dropzone.

Expected: same confirm card appears with the URL; confirming downloads and opens the comic exactly as in Step 8.

- [ ] **Step 10: Manually verify the cancel path**

Repeat Step 8, but click "Cancel" instead of "Download & Open".

Expected: the card disappears, no loading state appears, no network request is made (check the Network tab in devtools — no request to `sample.cbz`).

- [ ] **Step 11: Manually verify the CORS-failure error path**

In a separate terminal, serve the fixture from a different origin without CORS headers:

```bash
cd /tmp/comikaiju-test-fixture && python3 -m http.server 8099
```

Visit `http://localhost:5173/?url=http://localhost:8099/sample.cbz` and confirm the import.

Expected: after a brief loading state, the toast shows "Couldn't download from that link. The site may not allow direct downloads." — no crash, no unhandled rejection in the console.

- [ ] **Step 12: Manually verify the unsupported-extension path**

Visit `http://localhost:5173/?url=https://example.com/not-a-comic` (any reachable URL without a `.cbz/.zip/.cbr/.rar` filename) and confirm the import.

Expected: existing `handleFile` message "Please select a CBZ, ZIP, CBR, or RAR file." is shown as the error toast.

- [ ] **Step 13: Clean up the test fixture**

```bash
rm -rf /home/deniz/Documents/Projects/ComiKaiju/static/test-fixtures
rm -rf /tmp/comikaiju-test-fixture
```

Confirm `git status` shows no changes under `static/` before continuing.

- [ ] **Step 14: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: wire drag-drop link and ?url= param into the home page import flow"
```

---

## Self-Review Notes

- **Spec coverage:** drop-a-link ✅ (Task 3 Step 3), `?url=` param ✅ (Task 3 Step 4), shared confirmation card for both ✅ (Task 2 + Task 3 Step 5), reuse of `handleFile`/dedup/thumbnail/storage ✅ (Task 1 Step 2 delegates directly), CORS failure error message ✅ (Task 1 Step 2, verified Task 3 Step 11), unsupported extension error ✅ (verified Task 3 Step 12), filename derivation from URL path only ✅ (Task 1 Step 1), `?url=` stripped from address bar ✅ (Task 3 Step 4), loading state messages ✅ (Task 1 Step 2 sets "Downloading...", `handleFile` already sets "Processing archive...").
- **No placeholders:** all steps contain complete, runnable code and exact commands.
- **Type consistency:** `handleUrlImport(url: string, loadComics: () => Promise<void>)` signature matches its one call site in Task 3 Step 2; `UrlImportConfirm` props (`url`, `onConfirm`, `onCancel`) match its usage in Task 3 Step 5.
