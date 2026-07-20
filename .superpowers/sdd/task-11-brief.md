## Task 11: Capture the last-read page thumbnail

**Files:**
- Modify: `src/types/comic.ts:12-24` (add field to `ComicBook`)
- Modify: `src/lib/services/comicProcessor.ts:48-105` (export + parameterize `createThumbnail`)
- Modify: `src/routes/reader/+page.svelte` (`saveProgress()` ~line 82)

**Interfaces:**
- Consumes: `onExtractPage(index: number): Promise<Blob>` (`src/routes/reader/+page.svelte:108`); `currentPageIndex` store (`$lib/store/session`); `comicStorage.saveComicMetadata` (`comicStorage.ts:436`); `logger` (`$lib/services/logger`).
- Produces:
  - `ComicBook.lastReadThumbnail?: string` — JPEG data URL of the last-read page.
  - `export async function createThumbnail(blob: Blob, maxWidth?: number, maxHeight?: number): Promise<string>` from `comicProcessor.ts` (defaults `200`/`300` so the existing cover call is unchanged).
  - Home (Task 12) reads `metadata.lastReadThumbnail` for the ContinueBand `pageImage`.

- [ ] **Step 1: Add the field to `ComicBook`**

In `src/types/comic.ts`, after `coverThumbnail?: string;`, add:

```ts
  lastReadThumbnail?: string; // data URL of the last-read page (Continue-band background)
```

No IndexedDB change: the `comicMetadata` store is schemaless and `dbVersion` stays `5`.

- [ ] **Step 2: Export + parameterize `createThumbnail`**

In `src/lib/services/comicProcessor.ts`, change the private helper signature `async function createThumbnail(blob: Blob): Promise<string>` to:

```ts
export async function createThumbnail(blob: Blob, maxWidth = 200, maxHeight = 300): Promise<string> {
```

and replace the hardcoded `200`/`300` in its fit math with `maxWidth`/`maxHeight`. The existing cover call `createThumbnail(pageBlob)` (~line 170) keeps working via defaults.

- [ ] **Step 3: Capture on leaving the page**

In `src/routes/reader/+page.svelte`, add imports (`import { createThumbnail } from "$lib/services/comicProcessor";`, `import { get } from "svelte/store";` if not present, and ensure `currentPageIndex` is imported from `$lib/store/session`). In `saveProgress()` (~line 82), immediately before the existing `saveComicMetadata(...)` call, add:

```ts
try {
  const pageBlob = await onExtractPage(get(currentPageIndex));
  if (pageBlob) comic.lastReadThumbnail = await createThumbnail(pageBlob, 640, 960);
} catch (e) {
  logger.warn("Reader", "Failed to capture last-read page thumbnail", e);
}
```

Capture ONLY here (fires on exit/`onDestroy`), NOT in the per-page-change `currentPageIndex.subscribe` callback — so we re-encode once when leaving, not on every page turn.

- [ ] **Step 4: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. (No unit test: `createThumbnail` needs `<canvas>`/`Image`, which jsdom doesn't render.) Manual in `npm run dev`: open a comic, advance a few pages, exit → the comic's `metadata.lastReadThumbnail` is set (inspect via devtools/IndexedDB), and the Home Continue band (after Task 12) shows that page.

- [ ] **Step 5: Commit**

```bash
git add src/types/comic.ts src/lib/services/comicProcessor.ts src/routes/reader/+page.svelte
git commit -m "feat(reader): capture last-read page thumbnail for Continue band"
```

---

