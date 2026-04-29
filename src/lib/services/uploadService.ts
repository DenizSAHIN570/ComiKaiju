import { comicStorage } from "../storage/comicStorage";

export interface UploadProgress {
  filename: string;
  current: number;
  total: number;
  percentage: number;
}

export class UploadService {
  private isCancelled = false;

  cancel() {
    this.isCancelled = true;
  }

  async processDrop(
    items: DataTransferItemList,
    onProgress: (p: UploadProgress) => void,
  ) {
    this.isCancelled = false;
    const files: File[] = [];

    const scanEntry = async (entry: FileSystemEntry) => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject),
        );
        if (this.isComicFile(file.name)) files.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        // readEntries might not return all entries in one go, but for simplicity/revert we assume standard behavior or loop if needed.
        // To be robust, we'll just read once.
        const entries = await new Promise<FileSystemEntry[]>((resolve) =>
          reader.readEntries(resolve),
        );
        for (const child of entries) await scanEntry(child);
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry) await scanEntry(entry);
      }
    }

    await this.processFiles(files, onProgress);
  }

  async processFileList(
    fileList: FileList,
    onProgress: (p: UploadProgress) => void,
  ) {
    this.isCancelled = false;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      if (this.isComicFile(fileList[i].name)) {
        files.push(fileList[i]);
      }
    }
    await this.processFiles(files, onProgress);
  }

  private async processFiles(
    files: File[],
    onProgress: (p: UploadProgress) => void,
  ) {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      if (this.isCancelled) break;
      const file = files[i];
      await comicStorage.saveFile(file);
      onProgress({
        filename: file.name,
        current: i + 1,
        total: total,
        percentage: Math.round(((i + 1) / total) * 100),
      });
    }
  }

  private isComicFile(filename: string): boolean {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ["cbz", "cbr", "zip", "rar"].includes(ext || "");
  }
}

export const uploadService = new UploadService();
