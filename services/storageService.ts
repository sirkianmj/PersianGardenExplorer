// Hybrid Storage Service: Web (IndexedDB) + Desktop (Tauri FS)
const DB_NAME = 'PardisScholarDB';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;
const TAURI_DIR_NAME = 'pardis-library';

// Check if running in Tauri environment
const isTauri = () => !!window.__TAURI__;

// --- Web: IndexedDB Implementation ---

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveFileWeb = async (id: string, file: File | Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getFileWeb = async (id: string): Promise<Blob | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const deleteFileWeb = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Desktop: Tauri FileSystem Implementation ---

const getTauriPath = async (filename: string): Promise<string> => {
    const path = window.__TAURI__!.path;
    const baseDir = await path.appLocalDataDir();
    return await path.join(baseDir, TAURI_DIR_NAME, filename);
};

const ensureTauriDir = async () => {
    const fs = window.__TAURI__!.fs;
    const path = window.__TAURI__!.path;
    const baseDir = await path.appLocalDataDir();
    const libDir = await path.join(baseDir, TAURI_DIR_NAME);
    
    if (!(await fs.exists(libDir))) {
        await fs.createDir(libDir, { recursive: true });
    }
};

const saveFileTauri = async (id: string, file: File | Blob): Promise<void> => {
    await ensureTauriDir();
    const fs = window.__TAURI__!.fs;
    const filePath = await getTauriPath(`${id}.pdf`);
    
    // Convert Blob/File to ArrayBuffer then Uint8Array
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    await fs.writeBinaryFile(filePath, uint8Array);
};

const getFileTauri = async (id: string): Promise<Blob | null> => {
    try {
        const fs = window.__TAURI__!.fs;
        const filePath = await getTauriPath(`${id}.pdf`);
        
        if (!(await fs.exists(filePath))) return null;
        
        const binary = await fs.readBinaryFile(filePath);
        return new Blob([binary], { type: 'application/pdf' });
    } catch (e) {
        console.error("Tauri FS Read Error:", e);
        return null;
    }
};

const deleteFileTauri = async (id: string): Promise<void> => {
    try {
        const fs = window.__TAURI__!.fs;
        const filePath = await getTauriPath(`${id}.pdf`);
        if (await fs.exists(filePath)) {
            await fs.removeFile(filePath);
        }
    } catch (e) {
        console.warn("Tauri file delete error (maybe already gone):", e);
    }
};

// --- Unified API ---

export const saveFile = async (id: string, file: File | Blob): Promise<void> => {
  if (isTauri()) {
      return saveFileTauri(id, file);
  }
  return saveFileWeb(id, file);
};

export const getFile = async (id: string): Promise<Blob | null> => {
  if (isTauri()) {
      return getFileTauri(id);
  }
  return getFileWeb(id);
};

export const deleteFile = async (id: string): Promise<void> => {
  if (isTauri()) {
      return deleteFileTauri(id);
  }
  return deleteFileWeb(id);
};

// --- Helper: Open External Links ---
export const openExternalLink = async (url: string) => {
  if (!url) return;
  if (isTauri()) {
    try {
      await window.__TAURI__!.shell.open(url);
    } catch (e) {
      console.error("Failed to open link in Tauri shell", e);
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};