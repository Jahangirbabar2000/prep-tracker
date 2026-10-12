// Minimal promise-wrapped IndexedDB key/value store (single object store).
// Proven in the offline-test spike; generalized here for the local-first store.
import { isDemo } from '@/lib/demo/mode';
import { OWNER_USER_ID } from '@/lib/auth';
import { isAccountDb, planLocalCleanup, storeDbName, userHintFrom } from './localAccount';

const STORE = 'kv';

// One database per account (and the demo's own — sharing one would let a demo
// run in the owner's browser overwrite the real account's cached data, and
// leave demo attempts in the queue for the next real sync to upload). The
// name is fixed for the page's life: if a sync sets the user hint mid-page,
// the switch happens on the next load, where claimLocalData() moves the data.
let pageDbName: string | null = null;
const dbName = () => (pageDbName ??= storeDbName({ demo: isDemo(), userId: userHintFrom(document.cookie) }));

function open(name = dbName()): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
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

function deleteDb(name: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Every database on this device that holds an account's data (not the demo's). */
async function accountDbNames(): Promise<string[]> {
  if (typeof indexedDB.databases !== 'function') return [];
  return (await indexedDB.databases()).map(db => db.name ?? '').filter(isAccountDb);
}

/** Delete the whole database (store, offline queue, set-aside reviews, cached
 *  AI answers) and refuse every later read and write from this page. Each
 *  operation above closes its connection when done, so a deletion blocked by
 *  another tab mid-operation completes as soon as that operation does. */
export function idbDestroy(): Promise<void> {
  destroyed = true;
  return deleteDb(dbName());
}

/** Signing out of a shared device: this page's database and every other account's on it. */
export async function idbDestroyAllAccounts(): Promise<void> {
  const others = (await accountDbNames()).filter(name => name !== dbName());
  await idbDestroy();
  await Promise.all(others.map(deleteDb));
}

/**
 * Boot, before anything reads the store: make this device hold only the
 * signed-in account's data (see planLocalCleanup). The pre-accounts database
 * is the owner's — its queue may hold reviews never uploaded — so for the
 * owner it is copied over, key by key, unless their own already has data.
 */
export async function claimLocalData(): Promise<void> {
  const userId = userHintFrom(document.cookie);
  if (isDemo() || !userId) return;
  const plan = planLocalCleanup({ userId, existing: await accountDbNames(), ownerId: OWNER_USER_ID });

  if (plan.migrateLegacyInto) {
    const target = plan.migrateLegacyInto;
    const entries = await readAll('prep-store');
    const targetDb = await open(target);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = targetDb.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const count = store.count();
        count.onsuccess = () => {
          if (count.result === 0) for (const [key, value] of entries) store.put(value, key);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      targetDb.close();
    }
    await deleteDb('prep-store');
  }
  await Promise.all(plan.remove.map(deleteDb));
}

async function readAll(name: string): Promise<Array<[IDBValidKey, unknown]>> {
  const db = await open(name);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const keys = store.getAllKeys();
      const values = store.getAll();
      tx.oncomplete = () => resolve(keys.result.map((key, i) => [key, values.result[i]]));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
