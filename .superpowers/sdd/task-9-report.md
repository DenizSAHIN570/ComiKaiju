# Task 9 Report: ComicShelf.svelte

## Summary

Built `src/lib/ui/ComicShelf.svelte` porting the `.shelf`/`.spine`/`.art`/`.info`/`.num`/`.cv` markup and CSS
from `.superpowers/brainstorm/503-1784537809/content/home-and-library-v2.html`, using the existing
`CoverArt` component (Task 7) for cover rendering instead of the mockup's inline `.cv` markup.

## Interface

Props match the brief exactly:

```ts
let { comics, autoOpenFirst = true, onopen, ondelete }: {
  comics: Array<{ id: string; name: string; size?: number; updatedAt?: number; thumbnail?: string;
    metadata?: { title?: string; currentPage?: number; totalPages?: number; coverThumbnail?: string } }>;
  autoOpenFirst?: boolean;
  onopen?: (id: string) => void;
  ondelete?: (id: string) => void;
} = $props();
```

`openId = $state<string | null>(autoOpenFirst ? comics[0]?.id ?? null : null)` — a one-time initial
value per the brief (produces two expected `state_referenced_locally` warnings from `svelte-check`,
zero errors — this is the specified behavior, not a bug).

No mismatch found between the brief's prop shape and `CoverArt`'s actual props (`title`, `thumbnail`,
`index`) — no NEEDS_CONTEXT stop was required.

## Structure / deviation from mockup markup

The mockup wraps the whole spine (art + info + Read/⋯ buttons) in one clickable unit. Doing that
literally in Svelte would require nesting `<button class="read">`/`<button class="del">` inside an
outer `<button class="spine">`, which is invalid HTML (interactive elements can't nest) and breaks
real button semantics/focus order. Instead each spine is a `<div role="button" tabindex="0"
aria-expanded aria-label>` — focusable and keyboard-activatable (Enter/Space open it), but the real
`<button>` elements for "Read →" and "⋯" live as proper siblings inside, each with
`e.stopPropagation()` in their `onclick` so activating them doesn't just re-toggle the open state.

## Formatting logic implemented

- `extension(name)` — text after last `.`, uppercased (CBZ/CBR/etc.)
- `formatSize(bytes)` — MB with 1 decimal (≥1MB) else KB; `—` when absent
- `formatDate(ms)` — short `Mon DD` via `toLocaleDateString`; `—` when absent
- `progressCaption(current, total)` — `"not started"` when no total or no current page, `"finished"`
  when `current + 1 >= total`, else `` `page ${current} / ${total} · ${pct}%` ``
- `progressPercent` — clamped 0–100 for the progress-bar fill width
- kicker: `"Now reading"` only for index 0 when `autoOpenFirst` is true, else `"Comic"`

## Design constraints

- Colors: only `var(--color-*)` tokens, mapped from the mockup's literal palette
  (`--surface`→`--color-bg-surface`, `--inset`→`--color-bg-secondary`, `--border`→`--color-border`,
  `--text2`→`--color-text-secondary`, `--muted`→`--color-text-muted`, `--primary`→`--color-primary`,
  `--text`→`--color-text-main`). The one exception is `color: white` on the `.read` button text,
  matching the codebase-wide convention already used on every other primary-colored button
  (`AppMenu`, `ThemeMenu`, `FilterButton`, `ImportPanel`, settings/reader pages) — `--color-text-main`
  is wrong here because in the light theme it resolves to near-black, which is illegible against the
  orange `--color-primary` background.
- Font: every text rule uses `var(--font-base)`; no `--font-mono` / monospace stack anywhere, per the
  constraint (mockup's mono index/spec-table/kicker feel is kept via uppercase + letter-spacing only).
- Radius: covers/spines/info are `border-radius: 0` (unset); `.read`/`.del` buttons are `3px`.
- Layout: `.shelf { gap: 5px }`; open unit is `flex: 0 0 490px` (240px art + 250px info, no dead
  space); collapsed slivers are `flex: 1 1 0` with `overflow: hidden` on `.art` so `CoverArt`'s
  absolutely-positioned cover crops correctly.

## Accessibility / interaction verification

Verified all three modes are wired independently of each other (not just CSS `:hover`):

1. **Hover** — CSS `.shelf:hover .spine:hover { flex: 0 0 490px }` (kept verbatim from mockup) plus an
   `onmouseenter` handler that also sets `openId`, so mouse users get both the CSS expansion and the
   info panel rendering (`{#if isOpen}`) in sync.
2. **Keyboard focus** — `onfocusin={() => open(comic.id)}` on the spine `div[role=button]` sets
   `openId` purely from focus, no pointer required; the `.spine.open` class (bound to `openId`) drives
   the same `flex: 0 0 490px` rule so tabbing through slivers expands each one. `onkeydown` handles
   Enter/Space to open explicitly (defensive, since focus already opens it).
3. **Tap/click** — `onclick={() => open(comic.id)}` on the spine opens it; the info panel's `Read →`
   and `⋯` are separate real `<button>` elements with their own `onclick` (each calling
   `onopen?.(id)` / `ondelete?.(id)` respectively) and `stopPropagation()`, so a tap on Read doesn't
   just re-trigger the spine's open toggle — it fires the callback as expected on the first tap once
   the sliver is already open (mockup's tap-to-open-then-tap-Read flow).

I did not have a running browser to visually confirm the hover animation frame-by-frame, but traced
the CSS rules and state bindings above and confirmed via `npm run build` that the component compiles
and renders without SSR errors (SvelteKit prerenders `+layout.ts` at build time).

## Verification gates

- `npm run check` — 0 errors (2 expected warnings about `state_referenced_locally` for
  `autoOpenFirst`/`comics`, which is the specified one-shot-init behavior from the brief).
- `npm run build` — passes, static site written to `build/`.
- `npx eslint src/lib/ui/ComicShelf.svelte` — clean, no output.
- `npm run lint` was intentionally NOT run, per instructions.

## Commit

`fb28b2a` — `feat(ui): add ComicShelf spine accordion (hover/focus/tap)` — 1 file changed, 295
insertions, no Co-Authored-By trailer. Only `src/lib/ui/ComicShelf.svelte` staged; pre-existing
unrelated working-tree changes (`CLAUDE.md`, deleted `GEMINI.md`, untracked planning docs) were left
untouched.

## Concerns

- None blocking. The `role="button"` div (instead of a real `<button>`) is a deliberate deviation from
  a literal "make the spine a `<button>`" reading of the brief, required to avoid nested interactive
  elements; it preserves full keyboard/focus/tap behavior and is the standard accessible pattern for
  this exact conflict.

## Fix

Fixed three review findings in `src/lib/ui/ComicShelf.svelte`:

1. Replaced hardcoded `color: white;` on `.info .read` with `color: var(--color-bg-main);` (on-accent token, matches AppMenu's active segment).
2. Reordered `progressCaption`/`progressPercent` so the "finished" check runs before the "not started" check, fixing the finished 1-page comic edge case. Caption returns `""` when there's no total.
3. Added `// svelte-ignore state_referenced_locally` above the `openId = $state(...)` initializer to suppress the intentional one-shot prop capture.

Commit: `12272c6` — `fix(ui): ComicShelf on-accent token, progress edge case, pristine check`

### `npm run check` tail (pristine)

```
1784555114873 START "c:\Users\Deniz\Projects\ComiKaiju"
1784555114874 COMPLETED 271 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

`npm run build` — passed. `npx eslint src/lib/ui/ComicShelf.svelte` — clean (no output).
