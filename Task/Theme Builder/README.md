# Theme Builder Implementation

## Feature Overview

Extend the shipped config-driven filter schema to cover user-defined **themes**,
so theming and per-page filtering share one typed system.

> The Custom Filters half of the original "Custom Filters & Theme Builder" task
> has shipped (config-driven filter engine, premade filters, colorblind daltonize
> assist, custom filter builder + reusable library, keyboard cycling, per-comic
> persistence). This card now tracks the remaining Theme Builder scope only.

## Requirements

### Config-Driven Themes

- User-defined themes described by the same fixed, typed schema used for image
  filters (already shipped).
- Named parameters: color values, spacing, fonts, etc.
- Not raw CSS/SVG markup (security: injection vector). A typed schema gives full
  expressiveness without sanitizing arbitrary strings.

### Thematic Integration

- Govern the Light/Dark/System adaptive modes through the schema.
- Theming and per-page filtering share one system instead of two.

### Quality-of-Life

- Remember theme/zoom preference per-series (or globally); don't reset each session.

## Technical Implementation

- Reuse the filter config schema + validator pattern (`src/types/filterConfig.ts`,
  `src/lib/services/configValidator.ts`) for themes.
- Build UI for creating/editing theme presets (mirror the custom filter editor).
- Apply themes via CSS custom properties driven by the schema.
- Wire theme presets into the Light/Dark/System mode switching.

## Security Notes

- Do not accept free-form CSS/SVG from users; the typed schema prevents injection.
- SVG especially can carry scripts/external references.
