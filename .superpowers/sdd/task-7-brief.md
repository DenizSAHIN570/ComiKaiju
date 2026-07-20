## Task 7: `CoverArt.svelte` — real cover or flat placeholder

**Files:**
- Create: `src/lib/ui/CoverArt.svelte`
- Reference: mockup `.cv`/`.pcv` cover composition (`home-and-library-v2.html`, `empty-home-v2.html`)

**Interfaces:**
- Produces:
  ```ts
  let { title, thumbnail, index }: {
    title: string;
    thumbnail?: string; // data URL from FileSystemItem.thumbnail / ComicBook.coverThumbnail
    index?: number;     // shown as a mono #NNN glyph
  } = $props();
  ```
  Renders an absolutely-positioned fill (`position:absolute; inset:0`) so parents control the 2:3 box. When `thumbnail` is set → `<img>` cover-fit; else the flat placeholder composition (title text + a band), with a deterministic hue derived from the title so covers look distinct but stable.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/CoverArt.svelte`:

```svelte
<script lang="ts">
  let { title, thumbnail, index }: { title: string; thumbnail?: string; index?: number } = $props();
  // Deterministic hue from title (placeholder art only — content, not chrome).
  const hue = $derived([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
  const idx = $derived(index != null ? "#" + String(index).padStart(3, "0") : "");
</script>
```

Placeholder markup uses `hsl(var-free)` inline styles (allowed: cover art is content) — e.g. `background: hsl({hue} 45% 18%)` with a band at `hsl({hue} 60% 42%)` and the title in a bold uppercase overlay; port class names from `.cv`. When `thumbnail` present, render `<img src={thumbnail} alt={title} style="width:100%;height:100%;object-fit:cover" />` instead.

- [ ] **Step 2: Verify types + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/CoverArt.svelte
git commit -m "feat(ui): add CoverArt (thumbnail or deterministic placeholder)"
```

---

