// IndexedDB Storage Manager for Comic Files & Metadata
// Unified storage for file blobs, metadata, and reading progress

import type {
  ComicBook,
  FileSystemItem,
  BlobRecord,
} from "../../types/comic.js";
import { calculateHash } from "../utils/hash.js";
import { logger } from "../services/logger.js";

class ComicStorageManager {
  private dbName = "ComicReaderFilesDB";
  private dbVersion = 5; // Incremented for contentHash index

  // Stores
  private storeName = "comicFiles"; // Legacy
  private itemsStoreName = "items";
  private blobsStoreName = "blobs";
  private pagesStoreName = "comicPages";
  private metadataStoreName = "comicMetadata";
  private settingsStoreName = "settings";

  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => reject(new Error("Failed to open database"));

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = (event.target as IDBOpenDBRequest).transaction!;

          // Legacy store (keep for now or migrate if needed)
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "id" });
          }

          // Metadata & Cache
          if (!db.objectStoreNames.contains(this.metadataStoreName)) {
            const metadataStore = db.createObjectStore(this.metadataStoreName, {
              keyPath: "id",
            });
            metadataStore.createIndex("lastRead", "lastRead", {
              unique: false,
            });
          }
          if (!db.objectStoreNames.contains(this.pagesStoreName)) {
            const pagesStore = db.createObjectStore(this.pagesStoreName, {
              keyPath: "key",
            });
            pagesStore.createIndex("comicId", "comicId", { unique: false });
          }

          // Settings Store
          if (!db.objectStoreNames.contains(this.settingsStoreName)) {
            db.createObjectStore(this.settingsStoreName);
          }

          // File System Stores (Merged from fileSystem.ts)
          if (!db.objectStoreNames.contains(this.itemsStoreName)) {
            const itemStore = db.createObjectStore(this.itemsStoreName, {
              keyPath: "id",
            });
            itemStore.createIndex("updatedAt", "updatedAt", { unique: false });
            itemStore.createIndex("contentHash", "contentHash", {
              unique: false,
            });
          } else {
            // Ensure indexes exist if store existed
            const itemStore = tx.objectStore(this.itemsStoreName);
            if (!itemStore.indexNames.contains("updatedAt")) {
              itemStore.createIndex("updatedAt", "updatedAt", {
                unique: false,
              });
            }
            if (!itemStore.indexNames.contains("contentHash")) {
              itemStore.createIndex("contentHash", "contentHash", {
                unique: false,
              });
            }
          }

          if (!db.objectStoreNames.contains(this.blobsStoreName)) {
            db.createObjectStore(this.blobsStoreName, { keyPath: "hash" });
          }
        };
      });
    })();

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  // --- File System Operations ---

  async findDuplicate(file: File): Promise<FileSystemItem | undefined> {
    const db = await this.ensureDB();
    const hash = await calculateHash(file);

    return new Promise<FileSystemItem | undefined>((resolve, reject) => {
      const tx = db.transaction(this.itemsStoreName, "readonly");
      const store = tx.objectStore(this.itemsStoreName);

      if (store.indexNames.contains("contentHash")) {
        const index = store.index("contentHash");
        const req = index.get(hash);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      } else {
        resolve(undefined);
      }
    });
  }

  async saveFile(
    file: File,
    options?: { thumbnail?: string },
  ): Promise<FileSystemItem> {
    const db = await this.ensureDB();
    const hash = await calculateHash(file);

    // 0. Check for existing file (Deduplication via Index)
    const existingItem = await new Promise<FileSystemItem | undefined>(
      (resolve) => {
        const tx = db.transaction(this.itemsStoreName, "readonly");
        const store = tx.objectStore(this.itemsStoreName);
        // We need to check if the index exists, assuming init() ran it should.
        if (store.indexNames.contains("contentHash")) {
          const index = store.index("contentHash");
          const req = index.get(hash);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } else {
          // Fallback scan if migration failed for some reason (unlikely)
          resolve(undefined);
        }
      },
    );

    if (existingItem) {
      logger.info(
        "ComicStorage",
        `Duplicate file detected, returning existing: ${existingItem.name}`,
      );
      return existingItem;
    }

    const buffer = await file.arrayBuffer();

    // 1. Check/Save Blob (Deduplication)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.blobsStoreName, "readwrite");
      const store = tx.objectStore(this.blobsStoreName);
      const getReq = store.get(hash);

      getReq.onsuccess = () => {
        const record = getReq.result as BlobRecord;
        if (record) {
          record.refCount++;
          store.put(record);
        } else {
          store.add({
            hash,
            data: buffer,
            refCount: 1,
          } as BlobRecord);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to save blob"));
    });

    // 2. Create File Entry
    const item: FileSystemItem = {
      id: crypto.randomUUID(),
      name: file.name,
      type: "file",
      contentHash: hash,
      size: file.size,
      mimeType: file.type,
      thumbnail: options?.thumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.itemsStoreName, "readwrite");
      const store = tx.objectStore(this.itemsStoreName);
      const request = store.add(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(new Error("Failed to save file item"));
    });
  }

  async getAllFiles(): Promise<FileSystemItem[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.itemsStoreName, "readonly");
      const store = tx.objectStore(this.itemsStoreName);
      const request = store.getAll();

      request.onsuccess = () => {
        let items = request.result as FileSystemItem[];
        // Filter logic if needed, currently we assume items store only has files after revert
        items = items.filter((i) => i.type === "file" || !i.type);
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };
      request.onerror = () => reject(new Error("Failed to list files"));
    });
  }

  async getRecentFiles(limit = 12): Promise<FileSystemItem[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.itemsStoreName, "readonly");
      const store = tx.objectStore(this.itemsStoreName);
      const index = store.index("updatedAt");
      const request = index.openCursor(null, "prev");
      const results: FileSystemItem[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          const item = cursor.value;
          if (item.type === "file" || !item.type) {
            results.push(item as FileSystemItem);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(new Error("Failed to fetch recent files"));
    });
  }

  async getFile(id: string): Promise<File | null> {
    const db = await this.ensureDB();

    const item = await this.getItem(id);
    if (!item || !item.contentHash) return null;

    const blobRecord = await new Promise<BlobRecord>((resolve, reject) => {
      const tx = db.transaction(this.blobsStoreName, "readonly");
      const store = tx.objectStore(this.blobsStoreName);
      const req = store.get(item.contentHash!);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to get blob"));
    });

    if (!blobRecord) return null;

    return new File([blobRecord.data], item.name, {
      type: item.mimeType || "application/octet-stream",
      lastModified: item.updatedAt,
    });
  }

  async getItem(id: string): Promise<FileSystemItem | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.itemsStoreName, "readonly");
      const store = tx.objectStore(this.itemsStoreName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(new Error("Failed to get item"));
    });
  }

  async deleteComic(id: string): Promise<void> {
    const db = await this.ensureDB();

    // 1. Get Item to find Hash
    const item = await this.getItem(id);

    // 2. Transaction across all stores
    return new Promise((resolve, reject) => {
      const stores = [
        this.itemsStoreName,
        this.metadataStoreName,
        this.pagesStoreName,
      ];
      // Only include blobs if we have a hash to check
      if (item?.contentHash) {
        stores.push(this.blobsStoreName);
      }

      const tx = db.transaction(stores, "readwrite");

      // Delete Item & Metadata
      tx.objectStore(this.itemsStoreName).delete(id);
      tx.objectStore(this.metadataStoreName).delete(id);
      // We should also delete cached pages for this comic
      // Index deletion is harder, usually we just let them stale or need a cursor
      // For now, let's leave pages or clear them if we can efficiently.
      // Clearing pages by index requires opening a cursor on the index.
      const pagesIndex = tx.objectStore(this.pagesStoreName).index("comicId");
      const pagesReq = pagesIndex.openKeyCursor(IDBKeyRange.only(id));
      pagesReq.onsuccess = () => {
        const cursor = pagesReq.result;
        if (cursor) {
          tx.objectStore(this.pagesStoreName).delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      // Handle Blob Reference Counting
      if (item?.contentHash) {
        const blobStore = tx.objectStore(this.blobsStoreName);
        const getBlob = blobStore.get(item.contentHash);
        getBlob.onsuccess = () => {
          const blobRecord = getBlob.result as BlobRecord;
          if (blobRecord) {
            blobRecord.refCount--;
            if (blobRecord.refCount <= 0) {
              blobStore.delete(item.contentHash!);
            } else {
              blobStore.put(blobRecord);
            }
          }
        };
      }

      tx.oncomplete = () => {
        logger.info("ComicStorage", `Comic deleted: ${id}`);
        resolve();
      };
      tx.onerror = () => reject(new Error("Failed to delete comic"));
    });
  }

  // --- Metadata & Cache Operations ---

  async saveFilterSetting(comicId: string, filter: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.metadataStoreName, "readwrite");
      const store = transaction.objectStore(this.metadataStoreName);
      const getRequest = store.get(comicId);
      getRequest.onsuccess = () => {
        const record = getRequest.result as ComicBook | undefined;
        if (record) {
          // Add filter to metadata object
          (record as any).filter = filter;
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(new Error("Failed to save filter setting"));
        } else {
          resolve(); // Not found
        }
      };
      getRequest.onerror = () =>
        reject(new Error("Failed to get metadata for filter update"));
    });
  }

  async loadAllFilterSettings(): Promise<Record<string, string>> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.metadataStoreName, "readonly");
      const store = transaction.objectStore(this.metadataStoreName);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result as ComicBook[];
        const settings: Record<string, string> = {};
        for (const record of records) {
          if ((record as any).filter) {
            settings[record.id] = (record as any).filter;
          }
        }
        resolve(settings);
      };
      request.onerror = () =>
        reject(new Error("Failed to load filter settings"));
    });
  }

  async saveComicMetadata(comic: ComicBook): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.metadataStoreName, "readwrite");
      const store = transaction.objectStore(this.metadataStoreName);
      // Simple deep clone to ensure no proxies
      const cleanComic = JSON.parse(JSON.stringify(comic));
      const request = store.put(cleanComic);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getComicMetadata(id: string): Promise<ComicBook | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.metadataStoreName, "readonly");
      const store = transaction.objectStore(this.metadataStoreName);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as ComicBook) || null);
      request.onerror = () =>
        reject(new Error("Failed to retrieve comic metadata"));
    });
  }

  async updateLastAccessed(
    id: string,
    data?: { currentPage?: number; totalPages?: number },
  ): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.metadataStoreName, "readwrite");
      const store = transaction.objectStore(this.metadataStoreName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result as ComicBook | undefined;
        if (record) {
          record.lastRead = new Date();
          if (data && typeof data.currentPage === "number") {
            record.currentPage = data.currentPage;
          }
          if (data && typeof data.totalPages === "number") {
            record.totalPages = data.totalPages;
          }
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(new Error("Failed to update metadata"));
        } else {
          resolve(); // If no metadata, nothing to update (it will be created on first open)
        }
      };
      getRequest.onerror = () =>
        reject(new Error("Failed to get comic metadata"));
    });
  }

  async updateProgress(
    id: string,
    currentPage: number,
    totalPages?: number,
  ): Promise<void> {
    await this.updateLastAccessed(id, { currentPage, totalPages });
  }

  async savePageBlob(
    comicId: string,
    pageIndex: number,
    blob: Blob,
  ): Promise<void> {
    const db = await this.ensureDB();
    const key = `${comicId}-${pageIndex}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.pagesStoreName, "readwrite");
      const store = transaction.objectStore(this.pagesStoreName);
      const request = store.put({
        key,
        comicId,
        pageIndex,
        blob,
        cachedAt: new Date(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPageBlob(comicId: string, pageIndex: number): Promise<Blob | null> {
    const db = await this.ensureDB();
    const key = `${comicId}-${pageIndex}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.pagesStoreName, "readonly");
      const store = transaction.objectStore(this.pagesStoreName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
    });
  }

  async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        usage,
        quota,
        percentage: Math.round(percentage * 100) / 100,
      };
    }
    return { usage: 0, quota: 0, percentage: 0 };
  }

  // --- Settings Operations ---

  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.settingsStoreName, "readwrite");
      const store = tx.objectStore(this.settingsStoreName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to save setting: ${key}`));
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.settingsStoreName, "readonly");
      const store = tx.objectStore(this.settingsStoreName);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () =>
        reject(new Error(`Failed to get setting: ${key}`));
    });
  }
}

export const comicStorage = new ComicStorageManager();
