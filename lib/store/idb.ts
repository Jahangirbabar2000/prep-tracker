// Minimal promise-wrapped IndexedDB key/value store (single object store).
// Proven in the offline-test spike; generalized here for the local-first store.
const DB_NAME = 'prep-store';
const STORE = 'kv';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Set by idbDestroy() for the rest of this page's life. Without it, any write
// still in flight when the account signs out — a sync finishing, an optimistic
// mutation persisting — would reopen the database and recreate it with the
// data that was just wiped. A fresh page load (signing in again) starts clear.
let destroyed = false;

export async function idbGet<T>(key: string): Promise<T | undefined> {
  if (destroyed) return undefined;
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result as T | undefined);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  if (destroyed) return;
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Delete the whole database (store, offline queue, set-aside reviews, cached
 *  AI answers) and refuse every later read and write from this page. Each
 *  operation above closes its connection when done, so a deletion blocked by
 *  another tab mid-operation completes as soon as that operation does. */
export function idbDestroy(): Promise<void> {
  destroyed = true;
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
