## Task 13: `CoverCard.svelte` + Library rewrite (`src/routes/library/+page.svelte`)

**Files:**
- Create: `src/lib/ui/CoverCard.svelte`
- Modify: `src/routes/library/+page.svelte` (replace template + `<style>`; keep the `<script>` logic — `loadLibrary`, `openComic`, `deleteItem`, folder logic)
- Reference: mockup `home-and-library-v2.html` (`.libgrid`/`.card`/`.menu`/`.pbar`)

**Interfaces:**
- Consumes: `AppBar`, `SiteFooter`, `AddSheet`, `CoverArt`.
- Produces: `<CoverCard comic={item} progress={0..1} onopen ondelete />` where `item` is `FileSystemItem & { metadata?: ComicBook }`; renders full `CoverArt`, hover keyline, bottom progress sliver, `⋯` menu, and title + `Np · Size` meta below.

- [ ] **Step 1: Build `CoverCard.svelte`**

Port `.card`/`.cover`/`.menu`/`.pbar` from the mockup, tokens only; `CoverArt` fills the 2:3 `.cover`. Progress sliver width from `progress`. `⋯` calls `ondelete`; clicking the card calls `onopen`.

- [ ] **Step 2: Rewrite the Library template**

Keep the `<script>`. Add `AppBar active="library"`, a `.lib-sub` bar (`{items.length} comics` + a sort control — wire to a simple `sort` state over the existing `items`), a `.libgrid` of `<CoverCard>` for imported items, and — when `folderHandle` is set — a second labeled grid section (`Local · {folderHandle.name}`) of `<CoverCard>` for `folderFiles`. Add `SiteFooter` and an `AddSheet` (open via AppBar `onadd`). Delete old library styles.

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: grid shows all comics (including the last-read one), hover keyline + progress + `⋯` work, opening reads, deleting refreshes; a synced folder shows as its own labeled section. Sweep light/dark.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/CoverCard.svelte src/routes/library/+page.svelte
git commit -m "feat(library): full-cover grid with CoverCard + local folder section"
```

---

