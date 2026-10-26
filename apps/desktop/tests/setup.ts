import { afterEach } from 'vitest';

// Auto cleanup after each test case
afterEach(() => {
  // Clean up DOM state if needed
});

// Mock DOM environment for tests
const mockNavigator = {
  platform: 'MacIntel',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// ── In-memory localStorage ─────────────────────────────────────────────────
const memoryStorage = new Map<string, string>();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
    clear: () => {
      memoryStorage.clear();
    },
    get length() {
      return memoryStorage.size;
    },
    key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
  },
  writable: true,
});

// ── In-memory IndexedDB ────────────────────────────────────────────────────
// Minimal but functional IDB emulation supporting the operations used by
// persist-middleware.ts:
//   indexedDB.open(name, version)
//     → request { onsuccess(result: db), onerror, onupgradeneeded }
//     → db { objectStoreNames.contains, createObjectStore, transaction }
//   tx.objectStore(name) → { get(key), put(value), delete(key) }
//   tx.oncomplete / tx.onerror
// Async callbacks fire via queueMicrotask (unaffected by fake timers).

interface FakeRequest {
  result?: unknown;
  onsuccess?: (ev?: unknown) => void;
  onerror?: (ev?: unknown) => void;
  onupgradeneeded?: (ev?: unknown) => void;
}

type ObjectStoreData = Map<string, unknown>;

function createFakeIndexedDB() {
  // db name → (object store name → records)
  const databases = new Map<string, Map<string, ObjectStoreData>>();

  function openDb(name: string, version: number): FakeRequest {
    const request = {} as FakeRequest;
    const dbStores = databases.get(name) ?? new Map<string, ObjectStoreData>();
    databases.set(name, dbStores);

    const db = {
      name,
      version,
      objectStoreNames: {
        contains: (storeName: string) => dbStores.has(storeName),
      },
      createObjectStore: (storeName: string) => {
        dbStores.set(storeName, new Map());
        return { name: storeName };
      },
      transaction: (storeName: string) => {
        const storeData = dbStores.get(storeName) ?? new Map<string, unknown>();
        dbStores.set(storeName, storeData);

        const tx = {
          oncomplete: null as (() => void) | null,
          onerror: null as (() => void) | null,
          objectStore: () => ({
            get: (key: string) => {
              const getReq = {} as FakeRequest;
              queueMicrotask(() => {
                getReq.result = storeData.get(key);
                getReq.onsuccess?.();
              });
              return getReq;
            },
            put: (value: { id: string }) => {
              const putReq = {} as FakeRequest;
              queueMicrotask(() => {
                storeData.set(value.id, value);
                tx.oncomplete?.();
                putReq.onsuccess?.();
              });
              return putReq;
            },
            add: (value: { id: string }) => {
              const addReq = {} as FakeRequest;
              queueMicrotask(() => {
                if (storeData.has(value.id)) {
                  addReq.error = new Error('ConstraintError: key already exists');
                  addReq.onerror?.();
                  return;
                }
                storeData.set(value.id, value);
                tx.oncomplete?.();
                addReq.onsuccess?.();
              });
              return addReq;
            },
            delete: (key: string) => {
              const delReq = {} as FakeRequest;
              queueMicrotask(() => {
                storeData.delete(key);
                tx.oncomplete?.();
                delReq.onsuccess?.();
              });
              return delReq;
            },
            count: () => {
              const countReq = {} as FakeRequest;
              queueMicrotask(() => {
                countReq.result = storeData.size;
                countReq.onsuccess?.();
              });
              return countReq;
            },
            clear: () => {
              const clearReq = {} as FakeRequest;
              queueMicrotask(() => {
                storeData.clear();
                tx.oncomplete?.();
                clearReq.onsuccess?.();
              });
              return clearReq;
            },
            getAll: () => {
              const allReq = {} as FakeRequest;
              queueMicrotask(() => {
                allReq.result = Array.from(storeData.values());
                allReq.onsuccess?.();
              });
              return allReq;
            },
          }),
        };
        return tx;
      },
    };

    queueMicrotask(() => {
      request.result = db;
      request.onsuccess?.();
    });

    return request;
  }

  return {
    open: (name: string, version?: number) => openDb(name, version ?? 1),
    deleteDatabase: (name: string) => {
      databases.delete(name);
    },
  };
}

Object.defineProperty(window, 'indexedDB', {
  value: createFakeIndexedDB(),
  writable: true,
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  value: class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  writable: true,
});
