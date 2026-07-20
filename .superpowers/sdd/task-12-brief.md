## Task 12: Home page rewrite (`src/routes/+page.svelte`)

**Files:**
- Modify: `src/routes/+page.svelte` (replace template + `<style>`; keep the `<script>` data logic — `onMount`, `loadComics`, `openRecentComic`, `deleteComic`, `handleFile`, storage, etc.)
- Reference: mockups `home-and-library-v2.html` (populated) + `empty-home-v2.html` (empty)

**Interfaces:**
- Consumes: `AppBar`, `ContinueBand`, `ComicShelf`, `FeatureColophon`, `SiteFooter`, `AddSheet`, `ImportPanel`, `CoverArt`.

- [ ] **Step 1: Keep the data script, swap the markup**

Retain the existing `<script>` state/handlers. Derive:
- `lastRead` = the `recentComics` item with the most recent `metadata.lastRead`/`updatedAt` (the Continue comic), or `null`.
- `shelfComics` = `recentComics` excluding `lastRead.id`.
- `hasComics` = `recentComics.length > 0`.

Add `let addOpen = $state(false)`.

- [ ] **Step 2: Compose the populated layout**

```svelte
<AppBar active="home" onadd={() => (addOpen = true)} />
{#if hasComics}
  <ContinueBand comic={...lastRead.metadata} pageImage={lastReadPageImage}
    onresume={() => openRecentComic(lastRead)} onlibrary={() => goto(resolve('/library'))} />
  <ComicShelf comics={shelfComics} autoOpenFirst onopen={(id) => openById(id)} ondelete={(id) => deleteById(id)} />
{:else}
  <!-- Step 3 empty hero -->
{/if}
<FeatureColophon />
<SiteFooter />
<AddSheet open={addOpen} onclose={() => (addOpen = false)} oncomplete={loadComics} />
```

`lastReadPageImage = lastRead.metadata?.lastReadThumbnail ?? lastRead.metadata?.coverThumbnail ?? lastRead.thumbnail` (the real last-read page from Task 11, falling back to cover then item thumbnail). Provide `openById`/`deleteById` thin wrappers over the existing `openRecentComic`/`deleteComic` that look the item up by id.

- [ ] **Step 3: Compose the empty hero**

Port the `empty-home-v2.html` `.hero` section: the image-ready band (background hook + theme-safe scrim `color-mix(in srgb, var(--color-bg-main) 78%, transparent)`), centered headline `Read your comics right in your browser` with **Read** and **comics** wrapped in `<span style="color:var(--color-secondary)">`, the lead line, and `<ImportPanel oncomplete={loadComics} />` centered. Leave a documented CSS hook (e.g. `.home-hero { background-image: var(--home-hero-bg, none); }`) so the user can drop in their table photo without touching markup.

- [ ] **Step 4: Port page styles, tokens only**

Move the mockup's relevant CSS into the page `<style>`; delete all old Home styles (bookshelf, hero gradient, feature cards, navbar, storage widget, drop-zone, etc.). No `#000`/`white` — audit the final `<style>`.

- [ ] **Step 5: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: with comics → Continue + shelf (excludes last-read, first auto-open) + colophon + footer; with an empty DB → the centered empty hero; `Add` opens the sheet; importing refreshes the list. Compare to both mockups. Sweep light/dark.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(home): rebuild home in lean language (continue + shelf + empty state)"
```

---

