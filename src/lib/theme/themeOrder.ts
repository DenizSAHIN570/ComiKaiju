import type { Theme } from "./themeSchema";

export interface ThemeMetaEntry {
  createdAt?: number;
  lastUsedAt?: number;
}
export type ThemeMeta = Record<string, ThemeMetaEntry>;

/**
 * The quick theme picker shows at most `limit` themes.
 * User-made themes come first, newest-created first; remaining slots are filled
 * by most-recently-used themes. With no user themes it is purely most-recently-used
 * (input order preserved where there is no usage data, thanks to stable sort).
 */
export function orderThemesForPicker(
  themes: Theme[],
  meta: ThemeMeta,
  presetIds: Set<string>,
  limit = 3,
): Theme[] {
  const customs = themes
    .filter((th) => !presetIds.has(th.id))
    .sort(
      (a, b) => (meta[b.id]?.createdAt ?? 0) - (meta[a.id]?.createdAt ?? 0),
    );
  const seen = new Set(customs.map((th) => th.id));
  const rest = themes
    .filter((th) => !seen.has(th.id))
    .sort(
      (a, b) => (meta[b.id]?.lastUsedAt ?? 0) - (meta[a.id]?.lastUsedAt ?? 0),
    );
  return [...customs, ...rest].slice(0, limit);
}
