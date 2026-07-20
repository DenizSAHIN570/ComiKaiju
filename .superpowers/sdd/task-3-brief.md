## Task 3: Persist theme meta + expose it from the store

**Files:**
- Modify: `src/lib/theme/themeStorage.ts`
- Modify: `src/lib/theme/themeStore.ts`

**Interfaces:**
- Consumes: `ThemeMeta` from Task 2.
- Produces:
  - `themeStorage.getThemeMeta(): Promise<ThemeMeta>` and `themeStorage.saveThemeMeta(meta: ThemeMeta): Promise<void>`.
  - `themeStore` state gains `meta: ThemeMeta`; `setActiveTheme` stamps `lastUsedAt = Date.now()`; `saveTheme` stamps `createdAt` for a genuinely new custom id if absent. State shape consumed by `AppMenu` (Task 4): `{ mode, activeThemeId, userThemes, meta }`.

- [ ] **Step 1: Add meta persistence to `themeStorage.ts`**

Add the key constant `const K_META = "themeMeta";` and these methods to the exported object (import `ThemeMeta` from `./themeOrder`):

```ts
  async getThemeMeta(): Promise<ThemeMeta> {
    return (await comicStorage.getSetting<ThemeMeta>(K_META)) ?? {};
  },
  saveThemeMeta(meta: ThemeMeta): Promise<void> {
    return comicStorage.saveSetting(K_META, meta);
  },
```

- [ ] **Step 2: Thread meta through `themeStore.ts`**

- Add `meta: ThemeMeta;` to the `interface State` and `import type { ThemeMeta } from "./themeOrder";`.
- Initialize `meta: {}` in the `writable<State>` default.
- In `init()`, also `themeStorage.getThemeMeta()` in the `Promise.all` and include `meta` in the constructed `state`.
- In `setActiveTheme(id)`, before building `ns`, compute:
  ```ts
  const meta = { ...s.meta, [id]: { ...s.meta[id], lastUsedAt: Date.now() } };
  ```
  include `meta` in `ns`, and `void themeStorage.saveThemeMeta(meta);`.
- In `saveTheme(theme)` (the create/save path), stamp creation for new custom themes:
  ```ts
  const isNew = !s.userThemes.some((tt) => tt.id === theme.id);
  const meta = isNew && !PRESET_IDS.has(theme.id)
    ? { ...s.meta, [theme.id]: { ...s.meta[theme.id], createdAt: Date.now(), lastUsedAt: Date.now() } }
    : { ...s.meta, [theme.id]: { ...s.meta[theme.id], lastUsedAt: Date.now() } };
  ```
  include `meta` in `ns` and `void themeStorage.saveThemeMeta(meta);`.

- [ ] **Step 3: Verify types + existing theme tests still pass**

Run: `npm run check && npm run test -- theme`
Expected: PASS (existing `theme*` tests unaffected; no type errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme/themeStorage.ts src/lib/theme/themeStore.ts
git commit -m "feat(theme): persist theme created/last-used meta in the store"
```

---

