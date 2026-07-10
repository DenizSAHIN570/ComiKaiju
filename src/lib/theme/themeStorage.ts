import { comicStorage } from "$lib/storage/comicStorage";
import { themeValidator } from "./themeValidator";
import { DEFAULT_THEME_ID, type Theme, type ThemeMode } from "./themeSchema";

const K_THEMES = "themes";
const K_ACTIVE = "activeThemeId";
const K_MODE = "themeMode";

/** Persists the user theme library + active selection + mode in IndexedDB. */
export const themeStorage = {
  async getThemes(): Promise<Theme[]> {
    const raw = (await comicStorage.getSetting<unknown[]>(K_THEMES)) ?? [];
    return raw.filter((t) => themeValidator.validate(t).valid) as Theme[];
  },
  saveThemes(themes: Theme[]): Promise<void> {
    return comicStorage.saveSetting(K_THEMES, themes);
  },
  async getActiveThemeId(): Promise<string> {
    return (await comicStorage.getSetting<string>(K_ACTIVE)) ?? DEFAULT_THEME_ID;
  },
  setActiveThemeId(id: string): Promise<void> {
    return comicStorage.saveSetting(K_ACTIVE, id);
  },
  async getMode(): Promise<ThemeMode> {
    return (await comicStorage.getSetting<ThemeMode>(K_MODE)) ?? "system";
  },
  setMode(mode: ThemeMode): Promise<void> {
    return comicStorage.saveSetting(K_MODE, mode);
  },
};
