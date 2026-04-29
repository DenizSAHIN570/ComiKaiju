import { writable } from "svelte/store";
import type { ComicBook } from "../../types/comic.js";

// Current comic book being viewed
export const currentComic = writable<ComicBook | null>(null);

// Current file being viewed
export const currentFile = writable<File | null>(null);

// Current page index
export const currentPageIndex = writable<number>(0);

// Loading states
export const isLoading = writable<boolean>(false);
export const loadingMessage = writable<string>("");

// View settings
export const viewSettings = writable({
  fitMode: "fit-width" as "fit-width" | "fit-height" | "original",
  singlePageMode: true,
  showThumbnails: false,
  readingMode: "horizontal" as "horizontal" | "vertical",
  zoomLevel: 1,
});

// Error state
export interface AppError {
  message: string;
  code?: string;
  severity: "info" | "warning" | "error" | "critical";
  timestamp: number;
}

export const error = writable<AppError | null>(null);

// Helper functions
export function setComic(comic: ComicBook, file?: File) {
  currentComic.set(comic);
  currentPageIndex.set(comic.currentPage || 0);
  if (file) {
    currentFile.set(file);
  }
}

export function setPage(index: number) {
  currentPageIndex.set(index);
  currentComic.update((comic) => {
    if (comic) {
      comic.currentPage = index;
    }
    return comic;
  });
}

export function setLoading(loading: boolean, message = "") {
  isLoading.set(loading);
  loadingMessage.set(message);
}

export function setError(
  errorMessage: string,
  severity: AppError["severity"] = "error",
  code?: string,
) {
  error.set({
    message: errorMessage,
    severity,
    code,
    timestamp: Date.now(),
  });
}

export function clearError() {
  error.set(null);
}
