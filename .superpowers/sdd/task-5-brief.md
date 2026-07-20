## Task 5: `AppBar.svelte` — the masthead

**Files:**
- Create: `src/lib/ui/AppBar.svelte`
- Reference: mockup `home-and-library-v2.html` (`.mast`, `.nav`, `.word`, `.rule`)

**Interfaces:**
- Consumes: `AppMenu` (Task 4); `resolve` from `$app/paths`; `page` from `$app/state` for the active route (or an explicit prop).
- Produces: `<AppBar active="home" | "library" | "settings" onadd={() => ...} onsearch={() => ...} />`. Props:
  ```ts
  let { active = "home", onadd, onsearch }: {
    active?: "home" | "library" | "settings";
    onadd?: () => void;
    onsearch?: () => void;
  } = $props();
  ```

- [ ] **Step 1: Build the component**

Create `src/lib/ui/AppBar.svelte`. Port the `.mast` three-column grid (left nav `Home`/`Library`, centered `.word` wordmark set in `var(--font-base)`, uppercase letter-spaced, right `Search`/`Add` + `<AppMenu />`) and the `.rule` hairline from the mockup, tokens only. `Home`/`Library` are `<a href={resolve('/')}>` / `resolve('/library')`; the one matching `active` gets the orange-underline `active` class. `Search` calls `onsearch?.()`; `Add` calls `onadd?.()`.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/AppBar.svelte
git commit -m "feat(ui): add AppBar masthead with centered wordmark + nav"
```

---

