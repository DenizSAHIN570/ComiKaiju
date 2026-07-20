# Task 12 report — Home page rewrite (`src/routes/+page.svelte`)

## What I kept
- `onMount` init flow (storage init, `loadComics()`), including the `?url=` query-param
  auto-import behavior (`pendingImportUrl` → `UrlImportConfirm` → `handleUrlImport`).
- `loadComics()` (now just fetches `getRecentFiles` + per-item `getComicMetadata`; dropped
  the storage-usage/quota calculation since nothing in the new design displays it — the old
  storage widget lived only in the removed navbar).
- `openRecentComic(item)` — unchanged logic (archive open/parse fallback, `setComic`, navigate
  to `/reader`).
- `deleteComic(item, event?)` — same delete-with-confirm logic; loosened `event` to optional
  so it can be called from the new `ondelete={(id) => …}` callback (which only carries an id,
  not a `MouseEvent`) without synthesizing a fake event object.

## What I replaced / removed
- Old navbar (brand/logo, `ThemeMenu`, settings link, storage widget) → `AppBar`.
- Old 3D "bookshelf" recent-imports section + dropdown menu (`openMenuId`/`toggleMenu`/
  `closeMenu`) → `ContinueBand` + `ComicShelf` (which owns its own hover/open state and its
  own size/date formatters, so `formatFileSize`/`formatDate` were dropped from the page).
- Old hero (gradient headline, page-level drop-zone, paste-a-link row, sync-folder button) →
  either `ComicShelf`'s populated flow, or the new empty-state hero + `ImportPanel` (which
  already owns file input, drag/drop, URL paste, and folder-sync internally). This made the
  page-level `fileInput`, `dragActive`, `handleDragOver/Leave/Drop`, `handleFileInput`,
  `urlInputValue`, `submitUrlInput` dead code once the old markup was gone, so I removed them.
- Old 3 marketing feature-cards → `FeatureColophon`.
- Old inline `<footer>` → `SiteFooter`.

## Local-folder-sync scoping decision (flagging this explicitly)
The task framing said to preserve "local-folder logic" as part of the existing script. I
looked at what that logic did: `directoryService`-backed browsing of an already-picked local
folder, rendered as its own on-page "Local: <folder>" bookshelf with `openLocalFolder`/
`openLocalComic`/`localFiles`/`localFolderHandle`/`fileSystemSupported`. Neither
`home-and-library-v2.html` nor `empty-home-v2.html` has any such section, and none of the new
components (`ContinueBand`, `ComicShelf`, `AppBar`, `FeatureColophon`, `SiteFooter`,
`ImportPanel`, `AddSheet`) render or accept local-folder-browsing data — `ImportPanel` only
exposes "sync a folder from your disk" as a one-shot entry point (calls
`directoryService.openComicsFolder()` then `oncomplete`), it doesn't list/browse already-synced
files.

Keeping the old local-folder browsing functions in the script with no template reference to
call them would be genuinely dead code — `@typescript-eslint/no-unused-vars` is configured as
`"error"` in `eslint.config.js`, so unused top-level functions fail `npx eslint` outright. Since
"npx eslint … clean" is a hard verification gate and neither mockup has a home for this UI, I
removed the local-folder browsing state/functions (`localFiles`, `localFolderHandle`,
`fileSystemSupported`, `loadLocalLibrary`, `openLocalFolder`, `openLocalComic`, the
`directoryService`/`DirectoryFile` imports) rather than leave them unreferenced. The "sync a
folder" entry point itself is still available to users via `ImportPanel` (used inside both
`AddSheet` and the empty-state hero). If browsing already-synced local files inline on Home is
still wanted, it needs a design slot in a follow-up task — it isn't in either source-of-truth
mockup.

## Derived state added
```ts
const hasComics = $derived(recentComics.length > 0);

const lastRead = $derived.by(() => {
  if (recentComics.length === 0) return null;
  return recentComics.reduce((best, item) => {
    const itemTime = item.metadata?.lastRead ? new Date(item.metadata.lastRead).getTime() : item.updatedAt;
    const bestTime = best.metadata?.lastRead ? new Date(best.metadata.lastRead).getTime() : best.updatedAt;
    return itemTime > bestTime ? item : best;
  });
});

const shelfComics = $derived(recentComics.filter((c) => c.id !== lastRead?.id));

const lastReadComic = $derived(
  lastRead
    ? {
        title: lastRead.metadata?.title ?? lastRead.name.replace(/\.(cbz|zip|cbr|rar)$/i, ''),
        currentPage: lastRead.metadata?.currentPage ?? 0,
        totalPages: lastRead.metadata?.totalPages ?? 0,
        updatedAt: lastRead.metadata?.lastRead
          ? new Date(lastRead.metadata.lastRead).getTime()
          : lastRead.updatedAt
      }
    : null
);

const lastReadPageImage = $derived(
  lastRead?.metadata?.lastReadThumbnail ?? lastRead?.metadata?.coverThumbnail ?? lastRead?.thumbnail
);

function openById(id: string) {
  const item = recentComics.find((c) => c.id === id);
  if (item) openRecentComic(item);
}

function deleteById(id: string) {
  const item = recentComics.find((c) => c.id === id);
  if (item) deleteComic(item);
}
```

`ComicBook.lastRead` is typed as `Date` (not epoch ms), so `lastRead`-vs-`updatedAt` comparisons
and the `ContinueBand` `updatedAt` prop both go through `new Date(...).getTime()` to normalize
to epoch ms alongside `FileSystemItem.updatedAt: number`.

## Layout implemented
```svelte
<div class="page">
  <AppBar active="home" onadd={() => (addOpen = true)} />
  {#if hasComics && lastRead && lastReadComic}
    <ContinueBand comic={lastReadComic} pageImage={lastReadPageImage}
      onresume={() => openById(lastRead.id)} onlibrary={() => goto(resolve('/library'))} />
    <ComicShelf comics={shelfComics} autoOpenFirst onopen={openById} ondelete={deleteById} />
  {:else}
    <section class="home-hero"> <!-- scrim + centered headline + ImportPanel --> </section>
  {/if}
  <FeatureColophon />
  <SiteFooter />
</div>
<AddSheet open={addOpen} onclose={() => (addOpen = false)} oncomplete={loadComics} />
{#if pendingImportUrl}
  <UrlImportConfirm url={pendingImportUrl} onConfirm={confirmUrlImport} onCancel={cancelUrlImport} />
{/if}
```

Empty hero ports `empty-home-v2.html`'s `.hero`: `"Read"` and `"comics"` wrapped in
`<span style="color:var(--color-secondary)">`, the lead line, and a centered
`<ImportPanel oncomplete={loadComics} />`. CSS hook for a background image is documented inline:

```css
.home-hero {
  background-image: var(--home-hero-bg, none);
  background-size: cover;
  background-position: center;
}
.hero-scrim {
  background: color-mix(in srgb, var(--color-bg-main) 78%, transparent);
}
```

## Verification
- `npx eslint src/routes/+page.svelte` → no output (clean).
- `npm run check` → `COMPLETED 272 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.
- `npm run build` → succeeded, static output written to `build/`.
- Did not run `npm run dev` interactively in this sandboxed session (no browser available here);
  verified both branches of the `{#if hasComics}` logically by reading the derived-state code
  paths against `ComicShelf`/`ContinueBand`'s prop contracts and by confirming the build/type
  gates pass with both an empty and non-empty `recentComics` typing. Recommend a manual
  `npm run dev` sweep (populated IndexedDB vs. cleared IndexedDB, light + dark theme) before
  merging, since I could not drive a browser in this session.
- Tokens-only audit: `grep -n "#000|white|black|--font-mono"` over the new `<style>` block —
  zero matches. All colors go through `var(--color-*)` or `color-mix(...)` of a `--color-*`
  token; all typography uses `var(--font-base)`.

## Concerns
1. **Local-folder browsing UI dropped from Home** (see decision above) — functionally this is a
   regression for users who had synced a local folder and browsed it from the home page; the
   "connect a folder" action still works via `ImportPanel`, but there's currently no page that
   lists files already reachable through a synced handle. Flagging for a follow-up task/design
   decision rather than silently keeping dead code or silently dropping the capability without
   a note.
2. `getStorageEstimate()`/`storageInfo` tracking was dropped along with the storage widget; if a
   later task wants that back (e.g. a settings-page storage meter), it'll need to be
   reintroduced there rather than recovered from this diff.
3. I did not manually drive `npm run dev` in a browser in this sandboxed session — recommend a
   manual light/dark, populated/empty sweep before merge.
