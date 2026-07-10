import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import { logger } from "$lib/services/logger";
import {
  PRESETS,
  DEFAULT_THEME_ID,
  FONT_STACKS,
  type Theme,
  type ThemeMode,
} from "./themeSchema";
import {
  applyTheme,
  resolvePalette,
  startSystemWatch,
  stopSystemWatch,
} from "./themeEngine";
import { deriveHover } from "./colorUtil";
import { themeValidator } from "./themeValidator";
import { themeStorage } from "./themeStorage";

interface State {
  mode: ThemeMode;
  activeThemeId: string;
  userThemes: Theme[];
}

const BOOT_KEY = "ck-theme-boot";

export function allThemesFrom(userThemes: Theme[]): Theme[] {
  return [...PRESETS, ...userThemes];
}

export function getActiveTheme(state: State): Theme {
  return (
    allThemesFrom(state.userThemes).find((t) => t.id === state.activeThemeId) ??
    PRESETS[0]
  );
}

function writeBoot(state: State) {
  if (!browser) return;
  const theme = getActiveTheme(state);
  const lightHov = {
    primary: deriveHover(theme.light.primary, false),
    secondary: deriveHover(theme.light.secondary, false),
  };
  const darkHov = {
    primary: deriveHover(theme.dark.primary, true),
    secondary: deriveHover(theme.dark.secondary, true),
  };
  const { isDark } = resolvePalette(theme, state.mode);
  localStorage.setItem(
    BOOT_KEY,
    JSON.stringify({
      mode: state.mode,
      font: FONT_STACKS[theme.font],
      light: theme.light,
      dark: theme.dark,
      hovers: isDark ? darkHov : lightHov,
    }),
  );
}

function createThemeStore() {
  const store = writable<State>({
    mode: "system",
    activeThemeId: DEFAULT_THEME_ID,
    userThemes: [],
  });
  const { subscribe, set, update } = store;
  let initialized = false;

  function render(state: State) {
    applyTheme(getActiveTheme(state), state.mode);
    writeBoot(state);
    if (state.mode === "system")
      startSystemWatch(() => applyTheme(getActiveTheme(get(store)), "system"));
    else stopSystemWatch();
  }

  return {
    subscribe,
    async init() {
      if (!browser || initialized) return;
      initialized = true;
      const [mode, activeThemeId, userThemes] = await Promise.all([
        themeStorage.getMode(),
        themeStorage.getActiveThemeId(),
        themeStorage.getThemes(),
      ]);
      const state = { mode, activeThemeId, userThemes };
      set(state);
      render(state);
      logger.info(
        "ThemeStore",
        `Initialized mode=${mode} theme=${activeThemeId}`,
      );
    },
    setMode(mode: ThemeMode) {
      update((s) => {
        const ns = { ...s, mode };
        render(ns);
        void themeStorage.setMode(mode);
        return ns;
      });
    },
    setActiveTheme(id: string) {
      update((s) => {
        const ns = { ...s, activeThemeId: id };
        render(ns);
        void themeStorage.setActiveThemeId(id);
        return ns;
      });
    },
    saveTheme(theme: Theme) {
      themeValidator.validateOrThrow(theme);
      update((s) => {
        const userThemes = s.userThemes.some((t) => t.id === theme.id)
          ? s.userThemes.map((t) => (t.id === theme.id ? theme : t))
          : [...s.userThemes, theme];
        const ns = { ...s, userThemes, activeThemeId: theme.id };
        render(ns);
        void themeStorage.saveThemes(userThemes);
        void themeStorage.setActiveThemeId(theme.id);
        return ns;
      });
    },
    deleteTheme(id: string) {
      update((s) => {
        const userThemes = s.userThemes.filter((t) => t.id !== id);
        const activeThemeId =
          s.activeThemeId === id ? DEFAULT_THEME_ID : s.activeThemeId;
        const ns = { ...s, userThemes, activeThemeId };
        render(ns);
        void themeStorage.saveThemes(userThemes);
        void themeStorage.setActiveThemeId(activeThemeId);
        return ns;
      });
    },
    importTheme(json: string): Theme {
      const parsed = JSON.parse(json);
      const theme = themeValidator.validateOrThrow({
        ...parsed,
        id: `custom-${crypto.randomUUID()}`,
        builtIn: false,
      });
      this.saveTheme(theme);
      return theme;
    },
    exportTheme(id: string): string {
      const theme = allThemesFrom(get(store).userThemes).find(
        (t) => t.id === id,
      );
      if (!theme) throw new Error("Theme not found");
      return JSON.stringify({ ...theme, builtIn: false }, null, 2);
    },
    /** Preview an in-progress theme without persisting (builder live preview). */
    preview(theme: Theme, mode: ThemeMode) {
      if (browser) applyTheme(theme, mode);
    },
    /** Restore the persisted active theme (builder cancel). */
    restore() {
      if (browser) render(get(store));
    },
  };
}

export const themeStore = createThemeStore();
