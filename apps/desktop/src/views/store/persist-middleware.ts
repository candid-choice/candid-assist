/** Human Assist — IndexedDB storage adapter for Zustand `persist`.

Provides a browser-safe IndexedDB-backed `StateStorage` implementation so
the global store survives app restarts (offline-first).

Usage (in store/index.ts):
  import { persist, createJSONStorage } from 'zustand/middleware'
  import { idbStorage } from './persist-middleware'

  export const useStore = create<AppState>()(
    persist(
      (set, get) => ({ ... }),
      {
        name: 'human-assist-store',
        storage: createJSONStorage(() => idbStorage),
        partialize: (state) => persistableSlice(state),
      },
    ),
  )

IndexedDB details:
  - DB:    'human-assist-store'
  - Store: 'state' (keyPath 'id')
  - Records are JSON strings (zustand handles (de)serialization via
    createJSONStorage).
*/

const DB_NAME = 'human-assist-store';
const STORE_NAME = 'state';
const DB_VERSION = 1;
const SOFT_QUOTA_BYTES = 5 * 1024 * 1024; // ~5MB

let dbPromise: Promise<IDBDatabase | null> | null = null;

/** Open (or reuse) the IndexedDB connection. */
function openDatabase(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    if (!request) {
      // Malformed/absent return (e.g. broken mocks) — treat as no DB.
      resolve(null);
      return;
    }

    request.onerror = () => resolve(null);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

async function readValue(id: string): Promise<string | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const row = request.result as { id: string; value: string } | undefined;
      resolve(row ? row.value : null);
    };
    request.onerror = () => resolve(null);
  });
}

async function writeValue(id: string, value: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  // Soft quota guard — skip writes that would bloat storage.
  if (value.length > SOFT_QUOTA_BYTES) {
    console.warn(
      `[persist-middleware] Skipping save for '${id}': payload (${value.length}B) exceeds ${SOFT_QUOTA_BYTES}B soft quota`,
    );
    return;
  }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, value });

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function deleteValue(id: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Zustand `StateStorage` implementation backed by IndexedDB.
 * Safe to use with `createJSONStorage(() => idbStorage)`.
 */
export const idbStorage = {
  getItem: (name: string) => readValue(name),
  setItem: (name: string, value: string) => writeValue(name, value),
  removeItem: (name: string) => deleteValue(name),
};

/**
 * Convenience wrapper — returns the storage factory expected by
 * `createJSONStorage`.
 */
export function createIndexedDBStorage() {
  return idbStorage;
}

/**
 * Keys that should be persisted (data only — functions are dropped by
 * partialize, but this documents intent and is easy to reuse).
 */
export const PERSIST_KEY = 'human-assist-store';
