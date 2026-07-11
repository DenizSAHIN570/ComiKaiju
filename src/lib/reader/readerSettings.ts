import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import { comicStorage } from "$lib/storage/comicStorage";
import { viewSettings } from "$lib/store/session";

export type ReadingMode = "horizontal" | "vertical";
export type ReadingDirection = "ltr" | "rtl";
export type FitMode = "fit-width" | "fit-height" | "original";

/** Global reader defaults, persisted in IndexedDB and applied to viewSettings. */
export interface ReaderDefaults {
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
  fitMode: FitMode;
}

const KEY = "readerDefaults";

const DEFAULTS: ReaderDefaults = {
  readingMode: "horizontal",
  readingDirection: "ltr",
  fitMode: "fit-width",
};

function applyToViewSettings(d: ReaderDefaults) {
  viewSettings.update((s) => ({
    ...s,
    readingMode: d.readingMode,
    readingDirection: d.readingDirection,
    fitMode: d.fitMode,
  }));
}

function createReaderSettings() {
  const store = writable<ReaderDefaults>(DEFAULTS);
  let initialized = false;

  return {
    subscribe: store.subscribe,
    async init() {
      if (!browser || initialized) return;
      initialized = true;
      const saved = await comicStorage.getSetting<Partial<ReaderDefaults>>(KEY);
      const merged = { ...DEFAULTS, ...(saved ?? {}) };
      store.set(merged);
      applyToViewSettings(merged);
    },
    /** Update one or more defaults: persist, update the store, and apply live. */
    update(partial: Partial<ReaderDefaults>) {
      const merged = { ...get(store), ...partial };
      store.set(merged);
      applyToViewSettings(merged);
      if (browser) void comicStorage.saveSetting(KEY, merged);
    },
  };
}

export const readerSettings = createReaderSettings();
