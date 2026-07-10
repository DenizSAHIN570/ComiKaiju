import {
  CSS_VAR,
  FONT_STACKS,
  PALETTE_KEYS,
  type Palette,
  type Theme,
  type ThemeMode,
} from "./themeSchema";
import { deriveHover } from "./colorUtil";

function prefersDark(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolvePalette(
  theme: Theme,
  mode: ThemeMode,
): { palette: Palette; isDark: boolean } {
  const isDark = mode === "dark" || (mode === "system" && prefersDark());
  return { palette: isDark ? theme.dark : theme.light, isDark };
}

export function applyTheme(theme: Theme, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const { palette, isDark } = resolvePalette(theme, mode);
  const root = document.documentElement;

  for (const key of PALETTE_KEYS) {
    root.style.setProperty(CSS_VAR[key], palette[key]);
  }
  root.style.setProperty(
    "--color-primary-hover",
    deriveHover(palette.primary, isDark),
  );
  root.style.setProperty(
    "--color-secondary-hover",
    deriveHover(palette.secondary, isDark),
  );
  root.style.setProperty("--font-base", FONT_STACKS[theme.font]);

  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", palette.bgMain);
}

let mediaQuery: MediaQueryList | null = null;
let watchHandler: (() => void) | null = null;

export function startSystemWatch(onChange: () => void): void {
  if (typeof matchMedia === "undefined") return;
  stopSystemWatch();
  mediaQuery = matchMedia("(prefers-color-scheme: dark)");
  watchHandler = () => onChange();
  mediaQuery.addEventListener("change", watchHandler);
}

export function stopSystemWatch(): void {
  if (mediaQuery && watchHandler)
    mediaQuery.removeEventListener("change", watchHandler);
  mediaQuery = null;
  watchHandler = null;
}
