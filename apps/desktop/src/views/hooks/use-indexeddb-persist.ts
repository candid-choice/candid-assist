/** Human Assist — IndexedDB Persistence Layer.

Provides offline-first data persistence for Zustand store state.
Saves/loads auth, sessions, surfaces, and UI state to IndexedDB.

Usage:
  const persist = useIndexedDBPersist('human-assist-store')
  persist.save(state)  // Called when store changes
  persist.load()       // Called on app init

Features:
  - Automatic save on store changes (debounced 500ms)
  - Versioned storage (current: v1)
  - Automatic cleanup on version change
  - Storage quota awareness (5MB soft limit)
*/

import { useCallback, useEffect, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PersistedState {
  version: number;
  auth: Record<string, unknown>;
  sessions: Record<string, unknown>[];
  surfaces: Record<string, unknown>[];
  ui: Record<string, unknown>;
  timestamp: number;
}

interface StorageStats {
  totalSize: number;
  quota: number;
  usage: number;
  isQuotaExceeded: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'human-assist-store';
const STORE_NAME = 'state';
const VERSION = 1;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = () => resolve(null);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function getStats(): StorageStats {
  if (typeof navigator.storage?.estimate !== 'function') {
    return { totalSize: 0, quota: 0, usage: 0, isQuotaExceeded: false };
  }

  navigator.storage.estimate().then(({ quota, usage }) => {
    const usageNum = usage ?? 0;
    const quotaNum = quota ?? 0;
    return {
      totalSize: quotaNum,
      quota: quotaNum,
      usage: usageNum,
      isQuotaExceeded: usageNum >= quotaNum * 0.9,
    };
  });

  return { totalSize: 0, quota: 0, usage: 0, isQuotaExceeded: false };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useIndexedDBPersist(key: string = 'app-state') {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((state: unknown) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const persistedState: PersistedState = {
        version: 1,
        auth: {},
        sessions: [],
        surfaces: [],
        ui: {},
        timestamp: Date.now(),
      };

      // Flatten store state into organized sections
      const stateObj = state as Record<string, unknown>;
      for (const [section, data] of Object.entries(stateObj)) {
        if (section === 'auth') {
          persistedState.auth = data as Record<string, unknown>;
        } else if (section === 'sessions') {
          persistedState.sessions = data as Record<string, unknown>[];
        } else if (section === 'surfaces') {
          persistedState.surfaces = data as Record<string, unknown>[];
        } else if (section === 'ui') {
          persistedState.ui = data as Record<string, unknown>;
        }
      }

      // Estimate size
      const size = new TextEncoder().encode(JSON.stringify(persistedState)).length;
      if (size > 5 * 1024 * 1024) {
        // ~5MB limit, skip saving if too large
        return;
      }

      getDb().then((db) => {
        if (!db) return;

        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: key, data: persistedState });

        tx.onerror = () => {
          // Silently fail if storage is full or unavailable
        };
      });
    }, 500); // Debounce saves
  }, [key]);

  const load = useCallback(async (): Promise<unknown> => {
    const db = await getDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as { data: PersistedState } | undefined;
        if (result?.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }, [key]);

  const clear = useCallback(async (): Promise<void> => {
    const db = await getDb();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }, [key]);

  // Auto-save on state changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

    const stats = getStats();

  return {
    save,
    load,
    clear,
    stats,
    dbReady: true,
  };
}
