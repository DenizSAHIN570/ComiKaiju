import { goto } from "$app/navigation";
import ArchiveManager from "$lib/archive/archiveManager.js";
import { comicStorage } from "$lib/storage/comicStorage.js";
import {
  setComic,
  setLoading,
  setError,
  clearError,
  setDownloadProgress,
} from "$lib/store/session.js";
import { logger } from "./logger.js";
import type { ComicBook } from "../../types/comic.js";

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function deriveFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      return decodeURIComponent(last);
    }
  } catch {
    // fall through to default below
  }
  return "comic.cbz";
}

let archiveManager: ArchiveManager | null = null;

// Clean pages array to remove proxy objects and make it serializable
function cleanPages(pages: any[]) {
  return pages.map((p) => ({
    filename: p.filename,
    index: p.index,
  }));
}

async function createThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      const maxWidth = 200;
      const maxHeight = 300;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (thumbnailBlob) => {
            if (thumbnailBlob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(thumbnailBlob);
            } else {
              reject(new Error("Failed to create thumbnail"));
            }
          },
          "image/jpeg",
          0.7,
        );
      } else {
        reject(new Error("Failed to get canvas context"));
      }

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(blob);
  });
}

export async function handleFile(file: File, loadComics: () => Promise<void>) {
  if (!archiveManager) {
    archiveManager = new ArchiveManager();
  }

  const isSupported = await archiveManager.isSupported(file);
  if (!isSupported) {
    setError("Please select a CBZ, ZIP, CBR, or RAR file.");
    setLoading(false);
    return;
  }

  clearError();
  setLoading(true, "Processing archive...");

  try {
    // 0. Check for duplicate before processing
    const existingItem = await comicStorage.findDuplicate(file);
    if (existingItem) {
      logger.info(
        "ComicProcessor",
        `Duplicate found: ${existingItem.name}, skipping processing.`,
      );

      let comic = await comicStorage.getComicMetadata(existingItem.id);
      if (comic) {
        // Determine page count if not set (legacy)
        if (!comic.totalPages) {
          const pages = await archiveManager.openArchive(file);
          comic.totalPages = pages.length;
          comic.pages = cleanPages(pages);
          await comicStorage.saveComicMetadata(comic);
        }

        await comicStorage.updateLastAccessed(existingItem.id, {
          currentPage: comic.currentPage,
          totalPages: comic.totalPages,
        });

        await loadComics();
        setComic(comic, file);
        logger.info("ComicProcessor", "Opening existing comic");
        await goto("/reader");
        return;
      }
    }

    logger.info("ComicProcessor", "New comic, processing...");
    const pages = await archiveManager.openArchive(file);
    logger.info("ComicProcessor", `Loaded ${pages.length} pages from archive`);

    if (pages.length === 0) {
      throw new Error(
        "No images found in archive. The file may be corrupted or use an unsupported RAR version.",
      );
    }

    let thumbnail: string | undefined;
    if (pages.length > 0) {
      try {
        await archiveManager.loadPage(pages[0]);
        if (pages[0].blob) {
          logger.info("ComicProcessor", "Creating thumbnail...");
          thumbnail = await createThumbnail(pages[0].blob);
          logger.info("ComicProcessor", "Thumbnail created successfully");
        }
      } catch (err) {
        logger.error("ComicProcessor", "Failed to create thumbnail", err);
      }
    }

    const cleanedPages = cleanPages(pages);

    // 1. Save File to File System (Root) - This handles the physical BLOB and Deduplication
    const fsItem = await comicStorage.saveFile(file, { thumbnail });
    logger.info("ComicProcessor", `Comic saved to FileSystem: ${fsItem.id}`);

    // 2. Prepare Comic Metadata for Reader
    const comic: ComicBook = {
      id: fsItem.id,
      title: file.name.replace(/\.(cbz|zip|cbr|rar)$/i, ""),
      filename: file.name,
      pages: cleanedPages,
      currentPage: 0,
      totalPages: pages.length,
      lastRead: new Date(),
      coverThumbnail: thumbnail,
    };

    // 3. Save Metadata for Reading Progress
    await comicStorage.saveComicMetadata(comic);

    await loadComics();

    setComic(comic, file);
    logger.info("ComicProcessor", "Comic ready for reading");
    await goto("/reader");
  } catch (error) {
    logger.error("ComicProcessor", "Failed to process file", error);
    setError(error instanceof Error ? error.message : "Failed to process file");
  } finally {
    setLoading(false);
  }
}

export async function handleUrlImport(
  url: string,
  loadComics: () => Promise<void>,
) {
  clearError();
  setLoading(true, "Downloading...");
  setDownloadProgress(null);

  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (err) {
    logger.error("ComicProcessor", "Failed to download from URL", err);
    setError(
      "Couldn't download from that link. The site may not allow direct downloads.",
    );
    setDownloadProgress(null);
    setLoading(false);
    return;
  }

  try {
    const contentLengthHeader = response.headers.get("Content-Length");
    const total = contentLengthHeader ? Number(contentLengthHeader) : null;
    const contentType = response.headers.get("Content-Type") || "";

    const reader = response.body?.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loaded = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(Uint8Array.from(value));
          loaded += value.length;
          setDownloadProgress({
            loaded,
            total: total && !Number.isNaN(total) ? total : null,
          });
        }
      }
    }

    const blob = reader
      ? new Blob(chunks, { type: contentType })
      : await response.blob();
    const filename = deriveFilenameFromUrl(url);
    const file = new File([blob], filename, { type: blob.type });

    setDownloadProgress(null);
    await handleFile(file, loadComics);
  } catch (err) {
    logger.error("ComicProcessor", "Failed to read downloaded file", err);
    setError("Couldn't read the downloaded file.");
    setDownloadProgress(null);
    setLoading(false);
  }
}

export function cleanupComicProcessor() {
  if (archiveManager) {
    archiveManager.cleanup();
    archiveManager = null;
  }
}
