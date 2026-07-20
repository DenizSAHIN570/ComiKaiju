# Task 5 Report: AppBar.svelte

## What was built

Created `src/lib/ui/AppBar.svelte`, the shared masthead used by Home/Library/Settings.

- Ported the `.mast` three-column grid, `.nav`, `.word`, and `.rule` structure/CSS from
  `.superpowers/brainstorm/503-1784537809/content/home-and-library-v2.html` (lines 26-30, 113-114).
- Left column: `Home` / `Library` nav links via `<a href={resolve('/')}>` and `<a href={resolve('/library')}>`
  (from `$app/paths`), with `class:active` bound to `active === 'home'` / `active === 'library'`.
- Center column: `.word` wordmark "ComiKaiju", uppercase + `letter-spacing: 0.32em` + `text-indent: 0.32em`,
  set in `var(--font-base)` (NOT monospace, per constraint — mockup used `var(--mono)`, replaced).
- Right column: `Search` and `Add` rendered as unstyled `<button>` elements (visually matching the `.nav`
  link styling) calling `onsearch?.()` / `onadd?.()` respectively, followed by `<AppMenu />` (Task 4).
- Props match the brief exactly:
  ```ts
  let { active = "home", onadd, onsearch }: {
    active?: "home" | "library" | "settings";
    onadd?: () => void;
    onsearch?: () => void;
  } = $props();
  ```
  (The `active="settings"` case has no corresponding nav link — matches brief, which only lists Home/Library
  as the ported nav links; `settings` simply renders with neither link active, consistent with AppMenu's own
  settings entry.)

## Token / font conversion (mockup → app tokens)

| Mockup (hex/var) | Replaced with |
|---|---|
| `var(--mono)` (font-family, nav + word) | `var(--font-base)` |
| `var(--text2)` (nav color) | `var(--color-text-secondary)` |
| `var(--text)` (active nav color) | `var(--color-text-main)` |
| `var(--primary)` (active underline) | `var(--color-primary)` |
| `var(--border)` (`.rule` background) | `var(--color-border)` |
| `text-shadow: 1px 0 0 var(--text)` (word emphasis) | dropped; used plain `color: var(--color-text-main)` instead (no hardcoded shadow color needed, avoids a non-token shadow) |

No hardcoded hex/named colors and no `--font-mono`/monospace usage remain in the file.

## Verification

- `npm run check` — PASS (0 errors, 0 warnings, 0 files with problems).
- `npm run build` — PASS (site written to `build/`, no errors).
- `npx eslint src/lib/ui/AppBar.svelte` — PASS (no output, clean).
- Did **not** run `npm run lint` per instructions (that would run Prettier as well, out of scope for this gate).

## Self-review checklist

- [x] All colors are theme tokens (`--color-primary`, `--color-text-main`, `--color-text-secondary`, `--color-border`) — no hex/named colors.
- [x] No monospace / `--font-mono` anywhere — only `var(--font-base)`.
- [x] Active underline (`.nav a.active::after`) uses `var(--color-primary)`, 2px height, applied only to the link matching the `active` prop.
- [x] `<AppMenu />` renders on the right, after Search/Add.
- [x] `Search` button fires `onsearch?.()`; `Add` button fires `onadd?.()`.

## Files changed

- `C:\Users\Deniz\Projects\ComiKaiju\src\lib\ui\AppBar.svelte` (new)

## Concerns

- None blocking. Minor note: brief mentions `page` from `$app/state` as an alternative to the `active` prop
  for detecting the current route — I used the explicit `active` prop only (per the props contract given),
  so route-detection logic is the responsibility of consuming pages (Home/Library/Settings), not AppBar itself.
- The mockup's `Search`/`Add` were literal `<a href="#">` styled identically to nav links; I used `<button>`
  elements instead per the brief's callback contract, with CSS normalizing button font/appearance to match
  the `.nav a` look exactly (no visual difference expected).

## Commit

`cac9c76` — `feat(ui): add AppBar masthead with centered wordmark + nav` (no Co-Authored-By trailer).
