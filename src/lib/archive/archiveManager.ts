// Archive Manager for OnlineCbrReader
// Supports ZIP (CBZ) and RAR (CBR) files using libarchive.js

import type { ComicPage } from "../../types/comic.js";
import { logger } from "../services/logger.js";
import { Archive } from "libarchive.js";

class ArchiveManager {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {}

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        Archive.init({
          workerUrl: "/libarchive/worker-bundle.js",
        });

        this.isInitialized = true;
        logger.info("ArchiveManager", "libarchive.js initialized");
      } catch (error: any) {
        throw new Error(`Failed to initialize libarchive.js: ${error.message}`);
      }
    })();

    return this.initPromise;
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return imageExtensions.includes(extension);
  }

  async openArchive(file: File): Promise<ComicPage[]> {
    await this.initialize();

    return new Promise(async (resolve, reject) => {
      try {
        // Open the archive
        const archive = await Archive.open(file);
        logger.info("ArchiveManager", `Opened archive: ${file.name}`);

        // Get file listing
        const filesObj = await archive.getFilesObject();

        // Flatten and convert to our format
        const entries: Array<{ name: string; size: number; archiveFile: any }> =
          [];

        const processFileObj = (obj: Record<string, any>, basePath = "") => {
          for (const [name, item] of Object.entries(obj)) {
            const fullPath = basePath ? `${basePath}/${name}` : name;

            if (item && typeof item === "object" && "extract" in item) {
              // This is a compressed file
              if (this.isImageFile(fullPath)) {
                entries.push({
                  name: fullPath,
                  size: (item as any).size || 0,
                  archiveFile: item,
                });
              }
            } else if (typeof item === "object") {
              // This is a directory, recurse
              processFileObj(item as Record<string, any>, fullPath);
            }
          }
        };

        processFileObj(filesObj as Record<string, any>);

        // Sort entries by filename
        const sortedEntries = entries.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );

        logger.info(
          "ArchiveManager",
          `Found ${sortedEntries.length} image files`,
        );

        // Convert entries to ComicPage format
        const pages: ComicPage[] = sortedEntries.map((entry, index) => ({
          index,
          filename: entry.name,
          entry: entry.archiveFile, // Store the raw entry for later data loading
        }));

        resolve(pages);
      } catch (error) {
        logger.error("ArchiveManager", "Failed to open archive", error);
        reject(error);
      }
    });
  }

  async loadPage(page: ComicPage): Promise<void> {
    if (page.blob) return; // Already loaded

    const archiveFile = (page as any).entry;
    if (!archiveFile) {
      throw new Error("Page archive file not found");
    }

    try {
      // Extract the file using libarchive.js
      const extractedFile = await archiveFile.extract();

      // Create blob and URL
      const mimeType = this.getMimeType(page.filename);
      page.blob = new Blob([extractedFile], { type: mimeType });
      page.url = URL.createObjectURL(page.blob);
    } catch (error) {
      logger.error(
        "ArchiveManager",
        `Failed to extract ${page.filename}`,
        error,
      );
      throw new Error(
        `Failed to extract page: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private getMimeType(filename: string): string {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
    };
    return mimeTypes[extension] || "image/jpeg";
  }

  // Helper method to check if a file is supported
  async isSupported(file: File): Promise<boolean> {
    const filename = file.name.toLowerCase();
    return (
      filename.endsWith(".cbz") ||
      filename.endsWith(".zip") ||
      filename.endsWith(".cbr") ||
      filename.endsWith(".rar")
    );
  }

  // Get file type for display purposes
  async getFileType(file: File): Promise<"zip" | "rar" | "unknown"> {
    const filename = file.name.toLowerCase();
    if (filename.endsWith(".cbz") || filename.endsWith(".zip")) {
      return "zip";
    } else if (filename.endsWith(".cbr") || filename.endsWith(".rar")) {
      return "rar";
    } else {
      return "unknown";
    }
  }

  // Clean up resources
  cleanup(): void {
    // The uncompress library doesn't provide explicit cleanup
    // But we can revoke any object URLs that were created
    logger.info("ArchiveManager", "Cleanup completed");
  }
}

export default ArchiveManager;
