# Task 14 Report: Settings restyle

## Summary

Restyled `src/routes/settings/+page.svelte` into the lean design language. Only
markup classes/structure and the `<style>` block changed — no script logic,
handler names, or state (`section`, `GROUPS`, `LABELS`, `NAV`, `draft`,
`editMode`, etc.) were touched.

## Markup changes

- Added `<AppBar active="settings" />` at the top and `<SiteFooter />` at the
  bottom (imports added: `$lib/ui/AppBar.svelte`, `$lib/ui/SiteFooter.svelte`).
- Removed the standalone `.back` link + `<h1>Settings</h1>` sidebar header —
  AppBar now provides that chrome. Section titles (`<h2>`) inside `.scontent`
  (via `.shead`) still identify each section.
- Renamed the layout wrapper from `.settings-layout`/`.sidebar`/`.content`/
  `.content-inner` to the mockup's `.settings` (2-col grid) / `.snav` /
  `.scontent`, preserving the existing `section` state and `NAV` loop — only
  the button's class changed from `.nav-item` to a plain button with
  `class:active`.
- Theme chips: added the `Preset`/`Yours` tag (`<span class="tg">`) derived
  from the existing `PRESET_IDS.has(t.id)` check (pure display, no new state)
  and restyled swatches/name/tag to `.sws`/`.sw`/`.nm`/`.tg` per mockup. The
  `+ New` chip kept its `newTheme` handler.
- Editor: renamed classes to mockup's `.etop`, `.modetabs`, `.groups`/`.grp`/
  `.gt`, `.pick`/`.pl`/`.col-input`/`.hex`, `.fontrow`, `.eactions`/
  `.ghost-sm`/`.danger`. All bindings (`draft`, `oninput`/`onchange` on hex
  and color inputs, `commit`, `previewNow`, font `<select>`, import/export
  file input) are unchanged.
- Reader: `.radio-list`/`.radio-row`/`.radio`/`.rl`/`.rd` and `.segmented`
  restyled per mockup; `setLayout` and `readerSettings.update({ fitMode })`
  unchanged.
- Filters: `.fgrid`/`.fcard`/`.fn`/`.fd`/`.fa` restyled per mockup;
  `createFilter`, `editFilter`, `customFilterStore.remove` unchanged.
- Added `type="button"` to plain action buttons (previously implicit) — no
  behavior change, avoids implicit submit semantics.
- Removed the now-unused `resolve` import (was only used by the dropped back
  link).

## Logic preserved (confirmed unchanged)

No edits were made inside `<script>` beyond the two import lines swapping the
`resolve` import for `AppBar`/`SiteFooter` imports. Verified every handler
referenced in the new markup still exists and is wired:
`selectTheme`, `newTheme`, `setColor`, `commit`, `switchMode`, `exportTheme`,
`importFile`, `resetPreset`, `deleteCustom`, `setLayout`,
`readerSettings.update`, `createFilter`, `editFilter`,
`customFilterStore.remove`, plus `previewNow`/`reseed`/`onMount`/`onDestroy`
theme-preview lifecycle — all untouched.

## Design constraints

- Colors: audited final CSS — all chrome colors are `var(--color-*)` tokens.
  The only literal hex remaining is `color: #fff` on 4 rules
  (`.chip .tg`? no — on `.modetabs button.sel`, `.segmented button.sel`,
  `.btn-primary`/theme-mode-tab text on primary background), which matches
  the existing repo convention for on-primary button text (see
  `src/lib/ui/ThemeMenu.svelte` and `src/lib/ui/ReaderShell.svelte`, both use
  literal `#fff` for text on `--color-primary` backgrounds). The color-swatch
  preview squares (`.sw`, `.col-input`) render the theme's actual hex values
  via inline `style="background:{...}"` — that is data (the color picker),
  not chrome, and was already the case before this task.
- Font: all rules use `var(--font-base)`; no `--font-mono` or monospace
  font-family anywhere in the styles. (The literal string `'mono'` at line 62
  is the pre-existing `FontId` value/label for the theme's own selectable
  font — unrelated to UI chrome typography.)
- Radius: inputs/buttons/chips/cards use 3px (or 4px for the editor container/
  fcard, matching the mockup's `.editor`/`.fcard` radius of 4px) — flat,
  hairline `var(--color-border)` borders throughout.

## Verification

- `npm run check` → `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` (273 files).
- `npx eslint src/routes/settings/+page.svelte` → no output (clean).
- `npm run build` → succeeded (`✓ built`, static adapter wrote to `build/`).

## Concerns

- None blocking. Minor note: the mockup's `.snav` links use `--mono`; per the
  task's explicit instruction this was overridden to `var(--font-base)`
  everywhere, including `.snav`, `.gt`, `.tg`, `.glabel` (all mono in the
  mockup) — this is an intentional deviation mandated by the brief's "no
  monospace" constraint, not an oversight.
- Did not manually run `npm run dev` to click through the live preview (per
  task instructions, `npm run lint` was skipped as instructed; interactive
  dev-server click-through was not performed but static analysis + build
  confirm no behavioral regressions since script code is byte-for-byte
  unchanged except the two import lines).
