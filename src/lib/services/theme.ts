import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { logger } from "./logger";

export type Theme = "light" | "dark" | "system";

function createThemeStore() {
  const { subscribe, set } = writable<Theme>("system");
  let isInitialized = false;

  return {
    subscribe,
    init: () => {
      if (!browser || isInitialized) return;

      const savedTheme = localStorage.getItem("theme") as Theme | null;
      const theme = savedTheme || "system";

      set(theme);
      applyTheme(theme);
      isInitialized = true;
      logger.info("ThemeService", `Initialized with theme: ${theme}`);
    },
    setTheme: (theme: Theme) => {
      if (!browser) return;

      localStorage.setItem("theme", theme);
      set(theme);
      applyTheme(theme);
      logger.info("ThemeService", `Theme changed to: ${theme}`);
    },
  };
}

function applyTheme(theme: Theme) {
  if (!browser) return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Tailwind often expects 'dark' class for dark mode
  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export const themeStore = createThemeStore();
