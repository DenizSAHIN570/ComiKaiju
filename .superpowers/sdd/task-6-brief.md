## Task 6: `SiteFooter.svelte` and `FeatureColophon.svelte`

**Files:**
- Create: `src/lib/ui/SiteFooter.svelte`
- Create: `src/lib/ui/FeatureColophon.svelte`
- Reference: mockup `home-and-library-v2.html` (`footer`, `.colophon`/`.col`)

**Interfaces:**
- Produces: `<SiteFooter />` (renders `© {year} ComiKaiju. Built for readers.` computed via `new Date().getFullYear()`, and `Powered by Svelte` with the Svelte link in `--color-primary`); `<FeatureColophon />` (the fixed 3-column Offline/Private/Fast strip).

- [ ] **Step 1: Build `SiteFooter.svelte`**

Port the `footer` markup/CSS from the mockup, tokens only. Year is dynamic.

- [ ] **Step 2: Build `FeatureColophon.svelte`**

Port the `.colophon` 3-column strip (kickers `01 Offline` / `02 Private` / `03 Fast` with orange index, headline, one line each) verbatim in copy from the mockup, tokens only.

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/SiteFooter.svelte src/lib/ui/FeatureColophon.svelte
git commit -m "feat(ui): add SiteFooter and FeatureColophon"
```

---

