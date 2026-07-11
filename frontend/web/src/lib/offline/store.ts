import type { OfflineMutation } from '@/lib/contracts/types';

// Storage adapter for queued offline mutations. The queue logic depends only on
// this interface, so it can run against IndexedDB in the browser and an
// in-memory map in unit tests / SSR — no fake-IndexedDB dependency required.
export interface MutationStore {
  getAll(): Promise<OfflineMutation[]>;
  put(mutation: OfflineMutation): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// --- in-memory (tests, SSR fallback) -----------------------------------------
export class MemoryMutationStore implements MutationStore {
  private map = new Map<string, OfflineMutation>();
  async getAll(): Promise<OfflineMutation[]> {
    return [...this.map.values()];
  }
  async put(m: OfflineMutation): Promise<void> {
    this.map.set(m.id, m);
  }
  async delete(id: string): Promise<void> {
    this.map.delete(id);
  }
  async clear(): Promise<void> {
    this.map.clear();
  }
}

// --- IndexedDB (browser) -----------------------------------------------------
const DB_NAME = 'storeflow-offline';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class IndexedDbMutationStore implements MutationStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private db(): Promise<IDBDatabase> {
    return (this.dbPromise ??= openDb());
  }
  async getAll(): Promise<OfflineMutation[]> {
    const db = await this.db();
    return tx<OfflineMutation[]>(db, 'readonly', (s) => s.getAll() as IDBRequest<OfflineMutation[]>);
  }
  async put(m: OfflineMutation): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.put(m));
  }
  async delete(id: string): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.delete(id));
  }
  async clear(): Promise<void> {
    const db = await this.db();
    await tx(db, 'readwrite', (s) => s.clear());
  }
}

/** Pick the best available store: IndexedDB when present, else in-memory. */
export function createMutationStore(): MutationStore {
  if (typeof indexedDB !== 'undefined') {
    try {
      return new IndexedDbMutationStore();
    } catch {
      /* fall through */
    }
  }
  return new MemoryMutationStore();
}
