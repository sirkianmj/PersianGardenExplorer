
// Hybrid Storage Service: Web (IndexedDB) + Desktop (Tauri FS)
import { Paper } from '../types';

const DB_NAME = 'PardisScholarDB';
const STORE_FILES = 'pdfs'; // Web only
const STORE_PAPERS = 'papers'; // Metadata (Universal)
const DB_VERSION = 2;
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
      
      // Store for PDF blobs (Web only)
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
      
      // Store for Paper Metadata (Universal persistence)
      if (!db.objectStoreNames.contains(STORE_PAPERS)) {
        const paperStore = db.createObjectStore(STORE_PAPERS, { keyPath: 'id' });
        paperStore.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };
  });
};

// --- Metadata Operations (Universal) ---

export const savePaperMetadata = async (paper: Paper): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAPERS, 'readwrite');
    const store = tx.objectStore(STORE_PAPERS);
    const request = store.put(paper);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllPapers = async (): Promise<Paper[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAPERS, 'readonly');
    const store = tx.objectStore(STORE_PAPERS);
    const request = store.getAll();
    
    request.onsuccess = () => {
        // Sort DESC by default (newest first)
        const results = (request.result as Paper[]).sort((a, b) => b.addedAt - a.addedAt);
        resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deletePaperRecord = async (id: string): Promise<void> => {
    // 1. Delete File (Platform Specific)
    if (isTauri()) {
        await deleteFileTauri(id);
    } else {
        await deleteFileWeb(id);
    }

    // 2. Delete Metadata (Universal)
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PAPERS, 'readwrite');
        const paperStore = tx.objectStore(STORE_PAPERS);
        paperStore.delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// --- Database Backup/Restore ---

export const exportDatabase = async (): Promise<string> => {
    const papers = await getAllPapers();
    const backup = {
        version: 1,
        timestamp: Date.now(),
        library: papers
    };
    return JSON.stringify(backup, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<Paper[]> => {
    try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data.library)) throw new Error("Invalid Backup Format");
        
        const db = await initDB();
        const tx = db.transaction(STORE_PAPERS, 'readwrite');
        const store = tx.objectStore(STORE_PAPERS);
        
        for (const paper of data.library) {
            // We preserve existing files if they exist, but update metadata
            store.put(paper);
        }
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(data.library);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        throw e;
    }
};

// --- Web File Storage (IndexedDB) ---

const saveFileWeb = async (id: string, file: File | Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const request = store.put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteFileWeb = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        store.delete(id);
        tx.oncomplete = () => resolve();
    });
};

// --- Tauri File Storage (File System) ---

const getTauriDir = async (): Promise<string> => {
    const path = window.__TAURI__!.path;
    const baseDir = await path.appLocalDataDir();
    return await path.join(baseDir, TAURI_DIR_NAME);
};

const getTauriFilePath = async (id: string): Promise<string> => {
    const dir = await getTauriDir();
    const path = window.__TAURI__!.path;
    return await path.join(dir, `${id}.pdf`);
};

const ensureTauriDir = async () => {
    const fs = window.__TAURI__!.fs;
    const dir = await getTauriDir();
    if (!(await fs.exists(dir))) {
        await fs.createDir(dir, { recursive: true });
    }
};

const saveFileTauri = async (id: string, file: File | Blob): Promise<void> => {
    await ensureTauriDir();
    const fs = window.__TAURI__!.fs;
    const filePath = await getTauriFilePath(id);
    
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    await fs.writeBinaryFile(filePath, uint8Array);
};

const deleteFileTauri = async (id: string): Promise<void> => {
    try {
        const fs = window.__TAURI__!.fs;
        const filePath = await getTauriFilePath(id);
        if (await fs.exists(filePath)) {
            await fs.removeFile(filePath);
        }
    } catch (e) {
        console.warn("Tauri file delete error:", e);
    }
};

// --- Unified API ---

export const saveFile = async (id: string, file: File | Blob): Promise<void> => {
  if (isTauri()) {
      return saveFileTauri(id, file);
  }
  return saveFileWeb(id, file);
};

/**
 * Gets a displayable URL for the PDF.
 * - Web: Fetches Blob from IDB -> creates Blob URL.
 * - Tauri: Generates an Asset Protocol URL (asset://) using convertFileSrc.
 */
export const getPdfDisplayUrl = async (id: string): Promise<string | null> => {
    if (isTauri()) {
        try {
            const filePath = await getTauriFilePath(id);
            const fs = window.__TAURI__!.fs;
            if (await fs.exists(filePath)) {
                // Use Tauri's utility to create a safe asset URL
                // Updated to use the correct 'tauri' namespace for convertFileSrc
                return window.__TAURI__!.tauri.convertFileSrc(filePath);
            }
            return null;
        } catch (e) {
            console.error("Tauri PDF path error", e);
            return null;
        }
    } else {
        // Web Mode
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) {
                    resolve(URL.createObjectURL(request.result));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }
};

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