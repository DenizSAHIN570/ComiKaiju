## Task 1: CSS foundation — de-hardcode layout colors

**Files:**
- Modify: `src/routes/+layout.svelte` (`<style>` block: `.loading-overlay`, `.loading-content`, `.global-error*`, ~lines 137-217)

**Interfaces:**
- Produces: nothing new; removes hardcoded colors from the global layout so the loading overlay + error toast honor the active theme. (No `--font-mono` token — see the Typography global constraint: all text uses `var(--font-base)`.)

- [ ] **Step 1: Replace hardcoded colors in `+layout.svelte` styles with tokens**

In the `<style>` block, make these exact replacements (keep everything else):
- `.loading-overlay { background: color-mix(in srgb, #000 70%, transparent); ... }` → `background: color-mix(in srgb, var(--color-text-main) 55%, transparent);`
- `.loading-content { box-shadow: 0 10px 25px -5px color-mix(in srgb, #000 10%, transparent), 0 8px 10px -6px color-mix(in srgb, #000 10%, transparent); ... }` → both `#000` → `var(--color-text-main)`.
- `.global-error.critical { background: color-mix(in srgb, var(--color-status-error) 60%, #000); color: white; }` → `background: color-mix(in srgb, var(--color-status-error) 78%, transparent); color: var(--color-bg-main);`
- `.global-error.error { background: var(--color-status-error); color: white; }` → `color: var(--color-bg-main);`
- `.global-error.warning { background: var(--color-status-warning); color: black; }` → `color: var(--color-bg-main);`
- `.global-error.info { background: var(--color-primary); color: white; }` → `color: var(--color-bg-main);`
- `.global-error { box-shadow: 0 4px 6px color-mix(in srgb, #000 10%, transparent); ... }` → `#000` → `var(--color-text-main)`.

- [ ] **Step 2: Verify types + lint + build**

Run: `npm run check && npm run lint && npm run build`
Expected: PASS, no errors. Then open `npm run dev`, toggle light/dark, trigger a loading state and an error toast — both legible in both modes.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "fix(ui): de-hardcode layout overlay/toast colors to theme tokens"
```

---

