## Task 14: Settings restyle (`src/routes/settings/+page.svelte`)

**Files:**
- Modify: `src/routes/settings/+page.svelte` (replace `<style>` + adjust template chrome; **keep all logic** — theme builder, reader, filters handlers)
- Reference: mockup `empty-and-settings.html` (Settings windows)

**Interfaces:**
- Consumes: `AppBar`, `SiteFooter`.

- [ ] **Step 1: Add shared chrome + section nav**

Wrap the page with `<AppBar active="settings" />` and `<SiteFooter />`. Keep the existing `section` state and the `Themes`/`Reader`/`Filters` switch, restyling the left `.snav` per the mockup (mono labels, active orange left keyline).

- [ ] **Step 2: Restyle the three sections**

Replace the page `<style>` with the mockup's flat treatment: theme chips (swatches + name + `Preset`/`Yours` tag + `+ New`), the palette editor (Light/Dark tabs, grouped pickers using the exact token labels already in the file's `LABELS`/`GROUPS`, hex fields, font select + sample, Import/Export/Reset), the Reader radios + segmented control, and the Filters cards. **Do not change the script logic or handler names** — only markup classes and CSS. Tokens only; 3px radius; hairline rules.

- [ ] **Step 3: Verify**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS. In `npm run dev`: theme editing still applies live and persists; reader/filter settings still save; matches the Settings mockups. Confirm `Builder →` from `AppMenu` lands here.

- [ ] **Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "feat(settings): restyle themes/reader/filters into lean language"
```

---

