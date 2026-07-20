## Task 10: `ContinueBand.svelte`

**Files:**
- Create: `src/lib/ui/ContinueBand.svelte`
- Reference: mockup `home-and-library-v2.html` (`.continue`/`.pagebg`/`.scrim`/`.c-inner`)

**Interfaces:**
- Consumes: `CoverArt` optional; comic + last-page image.
- Produces:
  ```ts
  let { comic, pageImage, onresume, onlibrary }: {
    comic: { title: string; currentPage: number; totalPages: number; updatedAt?: number };
    pageImage?: string; // data URL of the last-read page; falls back to a token panel when absent
    onresume?: () => void;
    onlibrary?: () => void;
  } = $props();
  ```

- [ ] **Step 1: Build the component**

Port `.continue` layout: right ~62% shows `pageImage` (`background-size:cover`) or, when absent, the neutral panel-grid fallback from the mockup; a `.scrim` gradient fades it to `var(--color-bg-main)` on the left; left content shows mono `Continue reading`, title, `page X of N`, a single orange progress line (`width: currentPage/totalPages`), and `▶ Resume` (`onresume`) + `Library` (`onlibrary`). Tokens only; the scrim gradient uses `var(--color-bg-main)`.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/ContinueBand.svelte
git commit -m "feat(ui): add ContinueBand over last-read page"
```

---

