import { FileInput } from '@/types/api';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const processDroppedFiles = async (
  items: DataTransferItemList
): Promise<FileInput[]> => {
  const files: FileInput[] = [];
  let totalSize = 0;

  const processEntry = async (entry: FileSystemEntry, path = ''): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });

      if (file.name.endsWith('.py')) {
        totalSize += file.size;

        if (totalSize > MAX_SIZE_BYTES) {
          throw new Error(`Total file size exceeds 10MB limit`);
        }

        const content = await readFile(file);
        const filePath = path ? `${path}/${file.name}` : file.name;
        files.push({ path: filePath, content });
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();

      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });

      const newPath = path ? `${path}/${entry.name}` : entry.name;
      for (const childEntry of entries) {
        await processEntry(childEntry, newPath);
      }
    }
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = item.webkitGetAsEntry();

    if (entry) {
      await processEntry(entry);
    }
  }

  return files;
};

export const loadJSONFile = async (file: File): Promise<any> => {
  const content = await readFile(file);
  return JSON.parse(content);
};
