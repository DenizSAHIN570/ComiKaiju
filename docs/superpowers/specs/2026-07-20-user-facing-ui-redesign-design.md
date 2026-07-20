# User-Facing UI Redesign — Design Spec

**Date:** 2026-07-20
**Branch:** `development`
**Scope:** Home (`/`), Library (`/library`), Settings (`/settings`), plus the shared app chrome (masthead, menu, footer).
**Out of scope:** the Reader (`/reader`) viewer and its controls; storage/IndexedDB logic; archive extraction; routing. This is a visual/interaction redesign only — no data-layer or feature-behavior changes beyond what is listed under "Functional adjustments."

---

## 1. Goals

Move the user-facing pages from a generic, "vibe-coded" look to something deliberately modern, lean, and cared-for. Concretely:

1. **Kill the AI-template tells:** gradient-text hero, glowing/blurred surfaces, pill-radius everywhere, stock 3-up feature cards, emoji toasts, "Built for readers" filler.
2. **A real, consistent design language** across all three pages (currently each page looks different).
3. **Theme-correct:** no hardcoded colors anywhere in UI chrome; everything renders correctly across all themes (Default/Sepia/High Contrast + user themes) and light/dark/system modes.
4. **A distinctive, editorial identity** — flat surfaces, hairline rules, near-zero corner radius, a strict typographic grid, and orange used as a single precise accent rather than a mood.

---

## 2. Design language

The shared visual system all three pages follow.

- **Flat, not glassy.** No blurred glows, no large drop shadows. Depth comes from **hairline rules** (1px `--color-border`) and whitespace. The only shadows permitted are subtle, flat elevation on floating surfaces (dropdown, sheet), expressed via `color-mix` of a neutral, never raw `#000`.
- **Near-zero radius.** `0` on covers, panels, grids, and the shelf. `3px` only on buttons, inputs, chips, and floating surfaces. No pill/9999px radii.
- **Typographic grid.** Strong hierarchy: large tight display headings (weight 800–900, letter-spacing ≈ −0.03em), small uppercase tracked section labels (0.14–0.16em), regular body.
- **Mono accents.** Metadata, counts, storage, page numbers, kickers, and the wordmark use the monospace stack for a deliberate "technical / scan-line" texture. This is a defining trait, kept throughout.
- **Orange is one mark.** `--color-primary` appears only as: the primary button, progress fills, the active nav underline, hover keylines, and active-state highlights. Never as gradients, glows, or large fills.
- **Cover art is content, not chrome.** Comic covers/pages are imagery and may be any color. The "no hardcoded colors" rule applies to UI chrome only, not to rendered cover/page images. (In mockups, covers are stylized flat placeholders; in production they are the real extracted cover/page bitmaps.)

### 2.1 Color tokens (the only colors allowed in UI)

Use these CSS custom properties exclusively for all chrome. Mapping matches `src/lib/theme/themeSchema.ts` / `src/app.css`.

| Token | Role |
|---|---|
| `--color-primary` / `--color-primary-hover` | Accent (Primary/main) |
| `--color-secondary` / `--color-secondary-hover` | Secondary (side) |
| `--color-bg-main` | Background |
| `--color-bg-surface` | Surface |
| `--color-bg-secondary` | Inset |
| `--color-text-main` | Text |
| `--color-text-secondary` | Text (secondary) |
| `--color-text-muted` | Text (muted) |
| `--color-border` | Lines / Border |
| `--color-status-error` | Error / delete |
| `--color-status-success` | Success / accept |
| `--color-status-warning` | Warning |
| `--font-base` | Sans stack; a mono stack constant is used for mono accents |

**Prohibited:** any hardcoded hex/named color in UI CSS, including `#000`/`#fff`, `color: white/black`, and `#000`-based shadows/overlays. Where a translucent tint is needed, derive it from a token via `color-mix(in srgb, var(--token) N%, transparent)`. This explicitly replaces the current offenders (navbar `#000` background, `#000` shadows, `color: white` in logo/placeholders/buttons/delete, and the black/white error-toast fills).

---

## 3. Shared chrome

### 3.1 Masthead
A three-column grid: **left nav**, **centered wordmark**, **right utilities** — over a hairline bottom rule.

- **Wordmark:** "ComiKaiju" set in the **monospace stack, uppercase, letter-spaced (~0.32em)**. No bundled/pixel font is introduced in this work (a display face is a possible later enhancement, not part of this scope).
- **Left nav:** `Home` · `Library` (and `Settings` when useful). Active item gets an orange 2px underline. Mono, uppercase, tracked.
- **Right utilities:** `Search`, `Add`, then the **menu button** (see 3.2).

### 3.2 Menu button (multipurpose)
A single icon button (hamburger `☰`) at the far right replaces the old separate theme icon and settings gear. It opens a lean dropdown (flat paper surface, 1px border, 3px radius, subtle flat shadow) containing, top to bottom:

1. **Appearance** — a segmented `☀ Light / ☾ Dark / ◐ System` mode switch (active = orange).
2. **Theme** — a picker capped at **3 items** (see 3.3), with a `Builder →` link to the full editor in Settings.
3. `Settings →`
4. `Install app` (PWA install prompt) with a mono sub-label.

`Search` remains a separate bar action (not folded into the menu). Mode and theme are independent controls: a Theme carries both a light and dark palette; the mode selects which half renders — mirroring the existing Settings builder model.

### 3.3 Theme picker ordering
The dropdown theme list always shows **exactly 3** entries, each with a 5-swatch preview (primary, secondary, bg-main, bg-surface, text-main), a `Preset`/`Yours` tag, and a check on the active theme.

Ordering:
- **No user-made themes:** the 3 **most-recently-used** themes.
- **Has user-made themes:** **user themes first, newest-created first**, then most-recently-used themes fill any remaining slots up to 3.
- **4+ user-made themes:** the list is entirely user themes, newest-created first, capped at 3 (presets drop off the quick list; still reachable via `Builder →`).

Example (one custom theme just created): `Newsprint (Yours)` → `Default (last used)` → `Sepia (before that)`.

### 3.4 Footer
Restored to the original content, restyled lean/centered:
`© {year} ComiKaiju. Built for readers.` and a second line `Powered by Svelte.` (Svelte link in `--color-primary`). Muted text, hairline top rule.

---

## 4. Home page (`/`)

Top-to-bottom: **masthead → Continue band → "Jump back in" shelf → feature colophon → footer.**

### 4.1 Continue reading band
Shown when a last-read comic exists.
- The **page the reader left off on** fills the right ~62% of the band as a background image; a hard **gradient scrim fades it into clean `--color-bg-main`** on the left third (no blur — a paper-to-image gradient).
- Left content: mono eyebrow `Continue reading`, large display title, mono sub `page X of N · left off <relative time>`, a single orange **progress line**, and CTAs: **▶ Resume** (primary) + **Library** (ghost).

### 4.2 "Jump back in" shelf (spine accordion)
The signature interaction. Comics are shelved as **vertical slivers**; pointing at one opens it to its full cover while neighbors yield.

- **Excludes** the comic currently shown in Continue (no duplication).
- **Auto-opens the first** (most-recent remaining) comic on load.
- Each sliver shows a **mono index number** (hidden when open/hovered).
- **Open unit = cover (240px) + info panel (250px)**, sized to hug its content (no dead space), with a small consistent **5px gap** between slivers.
- Open transition: `flex-basis`/`flex-grow` eased (~0.42s, `cubic-bezier(.2,.7,.2,1)`).
- **Info panel** (revealed to the right of the opened cover): kicker (`Now reading` / `Comic`), title, volume/issue, a mono spec table (**Pages / Size / Format / Added**), a progress line + `page X / N · P%` (or `not started` / `finished`), and actions **Read →** (primary) + `⋯` menu (delete etc.).
- Section header: `Jump back in` with `all N →` linking to Library.

### 4.3 Feature colophon (the "stealth" cards)
The old Offline/Private/Fast feature cards, reborn as a **barely-there ruled 3-column strip** (no boxes, no icon tiles): each column has a mono kicker with an orange index (`01 Offline`, `02 Private`, `03 Fast`), a tight headline, and one calm sentence. Hairline dividers between columns; faint surface tint on hover.

### 4.4 First-run / empty state
When the library is empty there is no Continue band, shelf, or preview of comics (we ship no default covers). The **masthead, feature colophon, and footer are identical** to the populated Home; only the middle changes to a **centered explanatory hero**:

- Headline: **"Read your comics right in your browser"**, with the words **"Read"** and **"comics"** in `--color-secondary`.
- A one-line lead (private, offline, CBZ·CBR).
- A **centered import panel** as the focal action: a flat drop target + **Choose file**, a `or link` paste-a-link row, and a quiet underlined **"or sync a folder from your disk"** link below.
- **The hero is a self-contained section built to carry a background image** (a "scattered comics on a table" photo, supplied later — not shipped as a default). A **theme-safe scrim** sits between image and content: `background: color-mix(in srgb, var(--color-bg-main) ~78%, transparent)` so it tints toward whatever the current theme background is, keeping the headline and import legible on any photo and in any theme. The scrim/image is scoped to this section only, never the whole page. Scrim strength is a single tunable value.

---

## 5. Library page (`/library`)

- Masthead with **Library** active; a sub-bar showing `N comics` and a **sort** control (recent ▾).
- **Full-cover grid** (not slivers): every comic shown whole at 2:3, ~6 per row, tight gaps.
- Each card: full cover (1px border → orange keyline on hover), a **progress sliver** across the bottom, a `⋯` **menu** button that fades in on hover; below the cover a medium title and a mono `Np · Size` meta line.
- Shows **all** comics, including the one that's currently in Home's Continue band.
- **Local folder:** when a folder is synced from disk (existing `directoryService`), its files appear as a **second, labeled grid section** on this page (e.g. `Local · <folder name>`), rendered in the same card style, kept visually separate from the imported library.

---

## 6. Add flow

The `Add` action opens a **sheet/panel** (lean, flat) offering three routes, matching existing capabilities:
1. **Import a file** — drag-drop target / file browse.
2. **Import from link** — paste a direct download URL.
3. **Sync a folder** — File System Access (Chrome/Edge; gracefully disabled/explained where unsupported).

---

## 7. Settings page (`/settings`)

Keep the existing structure (this page is already the most solid) and **restyle it into the lean language**; no functional change to the three sections. Validated in mockup — layout confirmed.

- Masthead consistent with the other pages.
- A **left section-nav** (`Themes` / `Reader` / `Filters`) with mono labels and an active orange keyline; ruled content area to the right.
- **Themes = the full Theme Builder:** theme chips (presets + user), the always-visible palette editor (grouped color pickers + hex fields), Light/Dark edit toggle, font select, import/export, reset/delete — all restyled flat: hairline borders, 3px radius, theme-token colors only, mono micro-labels. This is the destination of the menu's `Builder →`.
- **Reader:** reading-layout radios (LTR / RTL / Vertical) and page-fit segmented control, restyled.
- **Filters:** preset + custom filter cards, restyled as flat ruled cards consistent with the Library card treatment.

---

## 8. Functional adjustments (small, in-scope)

- **Formats:** advertise **CBZ · CBR only** in all copy (drop ZIP/RAR everywhere it currently appears). Align the file-input `accept` attribute to `.cbz,.cbr`. (Confirm actual archive support during implementation; copy and picker must match reality.)
- Remove the GitHub/"open source" and marketing leftovers already trimmed previously; ensure no stray hardcoded-color/glow styles remain.
- `/settings` route added to `CLAUDE.md` route list (already done).

---

## 9. Accessibility & responsive

- **Shelf must not be hover-only:** clicking/tapping a sliver opens it; keyboard focus opens it; a focused open card exposes its **Read** and menu actions. Touch users tap to open, tap **Read →** to read.
- Preserve visible focus outlines (the app's existing `mouse-user` outline scheme).
- **Responsive:** masthead collapses gracefully; on narrow screens the shelf becomes a horizontally scrollable row of covers (or a stacked list) rather than the accordion, and the Library grid reflows to fewer columns. Continue band stacks text above the page image.
- Color contrast must hold across all preset themes (High Contrast especially) since only tokens are used.

---

## 10. Non-goals / constraints

- No changes to the Reader, storage schema, archive pipeline, or navigation/routing.
- No new runtime dependencies (no bundled webfont in this scope).
- Static client-side SvelteKit app unchanged (`prerender = true`, static adapter).
- Must remain fully themeable; the redesign is validated against Default (dark) and a light theme ("paper") but binds to tokens so all themes work.

---

## 11. Reference mockups

Interactive mockups produced during brainstorming live under `.superpowers/brainstorm/**/content/` (gitignored). The finalized set (visual source of truth):
- `home-and-library-v2.html` — Home (populated) + Library full-cover grid
- `menu-button-v3.html` — multipurpose menu + 3-item theme picker
- `empty-home-v2.html` — first-run/empty Home (centered, highlighted headline, image-ready hero)
- `empty-and-settings.html` — Settings (Themes builder + Reader + Filters)

Earlier iterations (`lean.html`, `library-shelf.html`, `home-v3.html`) show the language's evolution.
