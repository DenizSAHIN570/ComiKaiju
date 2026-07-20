## Task 9: `ComicShelf.svelte` — spine accordion

**Files:**
- Create: `src/lib/ui/ComicShelf.svelte`
- Reference: mockup `home-and-library-v2.html` (`.shelf`/`.spine`/`.art`/`.info`/`.num`)

**Interfaces:**
- Consumes: `CoverArt` (Task 7); comic list items shaped as the Home page's `recentComics` (`FileSystemItem & { metadata?: ComicBook }`).
- Produces:
  ```ts
  let { comics, autoOpenFirst = true, onopen, ondelete }: {
    comics: Array<{ id: string; name: string; size?: number; updatedAt?: number; thumbnail?: string;
                    metadata?: { title?: string; currentPage?: number; totalPages?: number; coverThumbnail?: string } }>;
    autoOpenFirst?: boolean;
    onopen?: (id: string) => void;
    ondelete?: (id: string) => void;
  } = $props();
  ```
  Renders the accordion; open unit shows `CoverArt` + info panel (kicker, title, mono spec table Pages/Size/Format/Added, progress + `page X / N · P%`, `Read →` + `⋯`). `Format` = filename extension uppercased; `Added` = `updatedAt` formatted; progress from `metadata.currentPage/totalPages`.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/ComicShelf.svelte`. Port `.shelf`/`.spine`/`.art`/`.info` markup + the `flex-basis/flex-grow` open transition and `5px` gap from the mockup (open unit `flex:0 0 490px`), tokens only. Use `let openId = $state<string | null>(autoOpenFirst ? comics[0]?.id ?? null : null)`.

- [ ] **Step 2: Make it accessible + touch-friendly (not hover-only)**

Each spine is a `<button>`/`role` element: hover OR focus OR click sets `openId`; the open card exposes `Read →` (calls `onopen(id)`) and `⋯` (calls `ondelete(id)`). Ensure keyboard focus opens the sliver (`onfocusin`), and a tap opens then a second tap of `Read` reads. Keep the CSS `:hover` expansion but also apply the open state via `openId` so focus/tap work without a pointer.

- [ ] **Step 3: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ComicShelf.svelte
git commit -m "feat(ui): add ComicShelf spine accordion (hover/focus/tap)"
```

---

