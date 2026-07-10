/**
 * Theme schema — the typed vocabulary for the Theme Builder.
 *
 * Themes are described entirely by typed values (hex colors + a font enum);
 * no raw CSS/SVG is ever accepted from users. Each theme carries a full light
 * and dark palette; the Light/Dark/System toggle selects which half renders.
 *
 * NOTE: The palette-key → CSS-var mapping in `CSS_VAR` is mirrored by the
 * inline boot script in `src/app.html`. Keep the two in sync.
 */

export type ThemeMode = "light" | "dark" | "system";
export type FontId =
  | "system-sans"
  | "system-serif"
  | "mono"
  | "rounded"
  | "humanist";

export interface Palette {
  primary: string;
  secondary: string;
  bgMain: string;
  bgSurface: string;
  bgSecondary: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  id: string;
  name: string;
  builtIn: boolean;
  light: Palette;
  dark: Palette;
  font: FontId;
}

export const PALETTE_KEYS: (keyof Palette)[] = [
  "primary",
  "secondary",
  "bgMain",
  "bgSurface",
  "bgSecondary",
  "textMain",
  "textSecondary",
  "textMuted",
  "border",
  "error",
  "success",
  "warning",
];

export const CSS_VAR: Record<keyof Palette, string> = {
  primary: "--color-primary",
  secondary: "--color-secondary",
  bgMain: "--color-bg-main",
  bgSurface: "--color-bg-surface",
  bgSecondary: "--color-bg-secondary",
  textMain: "--color-text-main",
  textSecondary: "--color-text-secondary",
  textMuted: "--color-text-muted",
  border: "--color-border",
  error: "--color-status-error",
  success: "--color-status-success",
  warning: "--color-status-warning",
};

export const FONT_STACKS: Record<FontId, string> = {
  "system-sans":
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  "system-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', Menlo, Consolas, monospace",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif",
  humanist:
    "'Segoe UI', Candara, 'Trebuchet MS', Verdana, system-ui, sans-serif",
};

export const DEFAULT_THEME_ID = "preset-default";

export const PRESETS: Theme[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "Default",
    builtIn: true,
    font: "system-sans",
    dark: {
      primary: "#ff6600",
      secondary: "#4f9cf9",
      bgMain: "#000000",
      bgSurface: "#0a0a0a",
      bgSecondary: "#111111",
      textMain: "#ffffff",
      textSecondary: "#a1a1aa",
      textMuted: "#52525b",
      border: "#1f1f1f",
      error: "#ef4444",
      success: "#22c55e",
      warning: "#eab308",
    },
    light: {
      primary: "#ff6600",
      secondary: "#2563eb",
      bgMain: "#ffffff",
      bgSurface: "#f9fafb",
      bgSecondary: "#f3f4f6",
      textMain: "#000000",
      textSecondary: "#4b5563",
      textMuted: "#9ca3af",
      border: "#e5e7eb",
      error: "#ef4444",
      success: "#22c55e",
      warning: "#eab308",
    },
  },
  {
    id: "preset-sepia",
    name: "Sepia",
    builtIn: true,
    font: "system-serif",
    light: {
      primary: "#a0522d",
      secondary: "#8a6d3b",
      bgMain: "#f4ecd8",
      bgSurface: "#ede0c8",
      bgSecondary: "#e4d5b7",
      textMain: "#3b2f2f",
      textSecondary: "#5c4a3a",
      textMuted: "#8a7a63",
      border: "#d9c7a3",
      error: "#b23c3c",
      success: "#5c7a3a",
      warning: "#b8860b",
    },
    dark: {
      primary: "#d2894f",
      secondary: "#b89968",
      bgMain: "#1c1712",
      bgSurface: "#241d16",
      bgSecondary: "#2d251b",
      textMain: "#ece0cc",
      textSecondary: "#c4b299",
      textMuted: "#8a7a63",
      border: "#3a2f22",
      error: "#d9736b",
      success: "#9cae72",
      warning: "#d9a441",
    },
  },
  {
    id: "preset-high-contrast",
    name: "High Contrast",
    builtIn: true,
    font: "system-sans",
    light: {
      primary: "#b34700",
      secondary: "#0033cc",
      bgMain: "#ffffff",
      bgSurface: "#ffffff",
      bgSecondary: "#f0f0f0",
      textMain: "#000000",
      textSecondary: "#1a1a1a",
      textMuted: "#404040",
      border: "#000000",
      error: "#cc0000",
      success: "#006600",
      warning: "#a65f00",
    },
    dark: {
      primary: "#ff8c1a",
      secondary: "#66aaff",
      bgMain: "#000000",
      bgSurface: "#000000",
      bgSecondary: "#141414",
      textMain: "#ffffff",
      textSecondary: "#e6e6e6",
      textMuted: "#bfbfbf",
      border: "#ffffff",
      error: "#ff5555",
      success: "#33cc33",
      warning: "#ffb84d",
    },
  },
];
