# Custom Filters & Theme Builder Implementation

## Feature Overview

Implement a config-driven system for user-defined filters and themes.

## Requirements

### Config-Driven System

- User-defined filters/themes described by fixed schema
- Named parameters: intensity, hue, contrast, color values, spacing, fonts, etc.
- Not raw CSS/SVG markup (security: injection vector)
- Typed schema gives full expressiveness without sanitizing arbitrary strings

### CSS/SVG Mapping

- Maps to CSS `filter` properties (blur, brightness, contrast, grayscale, hue-rotate, saturate, sepia, url())
- Maps to SVG filter primitives (feColorMatrix, feComponentTransfer, feMerge, etc.)
- Under the hood uses standard CSS/SVG under the hood

### Thematic Integration

- Govern Light/Dark/System adaptive modes
- Not just per-page filters
- Theming and filtering share one schema

### Quality-of-Life Features

- Keyboard shortcut to cycle filters
- Remember filter/zoom preference per-series (or globally)
- Don't reset each session

## Technical Implementation

- Create filter configuration schema
- Build UI for creating/editing filter presets
- Implement filter application logic
- Add keyboard shortcuts for cycling
- Store preferences per-series or globally

## Security Notes

- Do not accept free-form CSS or SVG from users
- Typed schema prevents injection attacks
- SVG especially can carry scripts/external references
