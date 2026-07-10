import { writable, type Writable } from "svelte/store";
import { comicStorage } from "$lib/storage/comicStorage";
import type { FilterConfig } from "../../types/filterConfig.js";

export {
  premadeFilters,
  customFilterParameters,
  CUSTOM_FILTER_FUNCTIONS,
} from "../../types/filterConfig.js";
export type { FilterConfig } from "../../types/filterConfig.js";

// Global, reusable custom filter library (persisted in IndexedDB settings).
const createCustomFilterStore = () => {
  const { subscribe, set }: Writable<FilterConfig[]> = writable([]);
  return {
    subscribe,
    async init() {
      set(await comicStorage.getCustomFilters());
    },
    async save(config: FilterConfig) {
      await comicStorage.saveCustomFilter(config);
      set(await comicStorage.getCustomFilters());
    },
    async remove(id: string) {
      await comicStorage.deleteCustomFilter(id);
      set(await comicStorage.getCustomFilters());
    },
  };
};

export const customFilterStore = createCustomFilterStore();
