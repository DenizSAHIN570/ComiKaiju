# Task 4 Report — AppMenu.svelte

## What was built

Created `src/lib/ui/AppMenu.svelte` (Svelte 5 runes), a self-contained hamburger
menu component with no props:

- **Hamburger button** (`.menubtn`) toggles a dropdown; click uses
  `stopPropagation` so it doesn't immediately re-close via the outside-click
  handler.
- **Outside-click close**: `<svelte:window onclick={close} />` — any click
  that bubbles to the window (including a selection inside the dropdown)
  closes the menu, matching mockup UX of "pick and dismiss."
- **Appearance segmented control** (`.seg`): Light / Dark / System buttons,
  active state highlighted, calling `themeStore.setMode(m.id)`.
- **Theme picker** (`.themes`): rows built from
  `orderThemesForPicker(allThemesFrom(state.userThemes), state.meta, PRESET_IDS, 3)`.
  Each row renders 5 swatches (`primary`, `secondary`, `bgMain`, `bgSurface`,
  `textMain`) read from `isDark ? t.dark : t.light` as literal hex values via
  `style:background` (data, not chrome — per brief's exception), the theme
  name, a `Preset`/`Yours` tag (`PRESET_IDS.has(t.id)`), and a checkmark shown
  only on the row matching `active.id` (`getActiveTheme(state)`). Clicking a
  row calls `themeStore.setActiveTheme(t.id)`.
- **Builder →**: link in the `Theme` label row to `resolve('/settings')`.
- **Settings**: `dd-item` link to `resolve('/settings')`.
- **Install app**: `beforeinstallprompt` is captured in an `$effect` (adds/
  removes the window listener, `preventDefault()`s and stores the event
  typed as a local `InstallPromptEvent` interface — avoids the `any` eslint
  warning the brief's snippet would have produced). The `Install app` row
  only renders `{#if deferredPrompt}`; clicking calls `deferredPrompt.prompt()`
  then clears it.

Markup/CSS structure and class names (`.menubtn`, `.dropdown`, `.seg`,
`.dd-label`, `.dd-div`, `.themes`, `.theme`, `.swatches`, `.sw`, `.nm`, `.tag`,
`.chk`, `.dd-item`, `.ic`, `.arr`, `.sub`) are ported 1:1 from
`menu-button-v3.html`. Two structural adaptations from the mockup:
- Theme rows and dropdown items that don't navigate are `<button>` elements
  (not `<div>`/anchors with no href) for a11y/semantics, styled identically
  (`width:100%; background:transparent; border:none; text-align:left;`) to
  the mockup's `.theme`/`.dd-item` box model.
- `☀ Light`, `☾ Dark`, `◐ System` labels built from a `MODES` array instead
  of being hardcoded per the mockup, for terser markup.

## Naming pitfall found & fixed

The brief's script contract names the derived store snapshot `state`. Under
Svelte 5 runes compilation, a local binding named `state` combined with any
later `$state(...)` rune call in the same file causes the compiler to
misparse `$state` as a legacy `$`-prefixed auto-subscription to the `state`
variable ("Block-scoped variable '$state' used before its declaration" /
"Cannot use 'state' as a store"). Renamed the derived snapshot to
`themeState` throughout to avoid the collision — functionally identical to
the brief's contract, just a different local identifier.

## Verification

- `npm run check` → `COMPLETED 264 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`
- `npm run build` → succeeded (`✓ built`, static adapter wrote `build/`)
- `npx eslint src/lib/ui/AppMenu.svelte` → no output (clean; zero errors,
  zero warnings — the initial `no-explicit-any` warning on `deferredPrompt`
  was eliminated by introducing the `InstallPromptEvent` interface instead
  of `any`)
- Did not run `npm run lint` per instructions (pre-existing broken).
- No render harness exists; performed a static/manual trace instead of
  mounting a scratch page: confirmed button toggle + outside-click-close
  wiring, confirmed `class:active` bindings for seg buttons and theme rows,
  confirmed the checkmark visibility rule (`.theme:not(.active) .chk` /
  `visibility:hidden`) mirrors the mockup exactly, confirmed the install row
  is gated behind `{#if deferredPrompt}`. No scratch/dev-harness code was
  added to the repo.

**Zero hardcoded colors**: every color in `<style>` uses `var(--color-*)`
tokens (`--color-border`, `--color-text-main`, `--color-primary`,
`--color-bg-main`, `--color-bg-surface`, `--color-text-secondary`,
`--color-text-muted`), or `color-mix(in srgb, var(--token) N%, transparent)`
for the shadow and swatch border tints. The only literal hex values in the
file are the theme swatches' `style:background={palette[key]}` bindings,
which render each theme's actual palette data (explicitly allowed by the
brief as data, not chrome).

**Zero monospace**: every `font-family` declaration in the component is
`var(--font-base)`; no `--font-mono` or literal monospace stack appears
anywhere.

## Files changed

- `src/lib/ui/AppMenu.svelte` (new, 336 lines)

## Concerns

- `src/lib/ui/ThemeMenu.svelte` is an older, functionally-overlapping
  component still wired into `src/routes/+page.svelte` and
  `src/routes/+error.svelte`. AppMenu is not yet wired into any route (that's
  presumably a later task, e.g. an `AppBar.svelte` that composes it per the
  redesign plan doc). Left `ThemeMenu.svelte` and its call sites untouched —
  out of scope for Task 4, but flagging so a follow-up task removes the
  duplication once `AppMenu` is integrated.
- The outside-click-close via `<svelte:window onclick>` closes the dropdown
  on *any* click that bubbles to `window`, including clicks on theme rows /
  seg buttons inside the dropdown itself (since those are regular DOM clicks
  that bubble up). This matches "pick and dismiss" UX and is what the brief's
  contract describes, but it means there's no way to make multiple selections
  without reopening the menu — flagging in case that wasn't the intent.

Fix: dropdown radius 3px
