import { comicStorage } from "../storage/comicStorage";
import { logger } from "./logger";

const SETTING_KEY = "comics-folder";

export interface DirectoryFile {
  handle: FileSystemFileHandle;
  name: string;
}

class DirectoryService {
  // 1. Pick and Store Directory Handle
  async openComicsFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
      // Check if API is supported
      if (!("showDirectoryPicker" in window)) {
        throw new Error(
          "File System Access API is not supported in this browser.",
        );
      }

      // User picks the folder
      const handle = await window.showDirectoryPicker({
        id: "comic-library",
        mode: "read",
      });

      // Store the handle in IndexedDB for next time
      await comicStorage.saveSetting(SETTING_KEY, handle);

      logger.info("DirectoryService", `Directory handle saved: ${handle.name}`);
      return handle;
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User cancelled
        return null;
      }
      logger.error("DirectoryService", "Failed to open directory", err);
      throw err;
    }
  }

  // 2. Re-verifying Access on Reload
  async getStoredFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle =
        await comicStorage.getSetting<FileSystemDirectoryHandle>(SETTING_KEY);

      if (!handle) return null;

      // Check if we already have permission
      const permission = await handle.queryPermission({ mode: "read" });
      if (permission === "granted") {
        return handle;
      }

      // If prompt needed, we can't request it here automatically without user gesture usually,
      // but we can return the handle and let the UI trigger requestPermission.
      // However, checking strictly:
      if (permission === "prompt") {
        return handle;
      }

      return null;
    } catch (err) {
      logger.error("DirectoryService", "Failed to retrieve stored folder", err);
      return null;
    }
  }

  async requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      const permission = await handle.requestPermission({ mode: "read" });
      return permission === "granted";
    } catch (err) {
      logger.error("DirectoryService", "Failed to request permission", err);
      return false;
    }
  }

  // 3. Reading Files (Comic Images/Archives)
  async listComics(
    directoryHandle: FileSystemDirectoryHandle,
  ): Promise<DirectoryFile[]> {
    const files: DirectoryFile[] = [];
    try {
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === "file") {
          const name = entry.name.toLowerCase();
          if (
            name.endsWith(".cbz") ||
            name.endsWith(".cbr") ||
            name.endsWith(".zip") ||
            name.endsWith(".rar")
          ) {
            files.push({
              handle: entry as FileSystemFileHandle,
              name: entry.name,
            });
          }
        }
      }
    } catch (err) {
      logger.error("DirectoryService", "Failed to list comics", err);
      throw err;
    }
    return files;
  }
}

export const directoryService = new DirectoryService();
