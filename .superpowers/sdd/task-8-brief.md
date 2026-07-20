## Task 8: `ImportPanel.svelte` and `AddSheet.svelte`

**Files:**
- Create: `src/lib/ui/ImportPanel.svelte`
- Create: `src/lib/ui/AddSheet.svelte`
- Reference: mockups `empty-home-v2.html` (`.import`, `.drop`, `.row2`, `.sync`) and `home-and-library-v2.html`

**Interfaces:**
- Consumes: `handleFile`, `handleUrlImport`, `isHttpUrl` from `$lib/services/comicProcessor`; `directoryService` from `$lib/services/directoryService`; `UrlImportConfirm` from `$lib/ui/UrlImportConfirm.svelte`.
- Produces:
  - `<ImportPanel oncomplete={() => ...} />` — drop target + Choose-file (`<input type="file" accept=".cbz,.cbr">`) + `or link` row + `or sync a folder` link. Calls `handleFile(file, oncomplete)` / surfaces `UrlImportConfirm` for links / `directoryService.openComicsFolder()` for folder. `accept=".cbz,.cbr"` only.
  - `<AddSheet open={boolean} onclose={() => ...} oncomplete={() => ...} />` — dim + centered sheet wrapping `<ImportPanel>`; closes on backdrop click / ✕ / Escape.

- [ ] **Step 1: Build `ImportPanel.svelte`**

Port `.import`/`.drop`/`.row2`/`.sync` markup from `empty-home-v2.html`, tokens only. Implement drag-over/drop (`handleFile(files[0], oncomplete)`), Choose-file input, URL submit (validate with `isHttpUrl`, then show `UrlImportConfirm`, confirm → `handleUrlImport(url, oncomplete)`), and folder sync (`directoryService.openComicsFolder()`; on unsupported — `!('showDirectoryPicker' in window)` — render the link disabled with the existing "Chrome/Edge" note). Copy: **CBZ · CBR** only.

- [ ] **Step 2: Build `AddSheet.svelte`**

A fixed-position dim layer + centered sheet (`.sheet` styling from mockups, tokens, 3px radius, `color-mix` shadow) containing `<ImportPanel oncomplete={oncomplete} />`. Close on backdrop click, ✕ button, and `Escape` (window keydown while `open`).

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ImportPanel.svelte src/lib/ui/AddSheet.svelte
git commit -m "feat(ui): add ImportPanel and AddSheet import flows (CBZ/CBR)"
```

---

