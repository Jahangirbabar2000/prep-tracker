'use client';

import { replaceAll, normalize, loadFromIDB } from './store';
import { flushQueue, withQueuedAttempts } from './writeQueue';

let syncing = false;

/**
 * Pull the full dataset from the server and replace the local store.
 * Flushes any queued offline writes first so the server is up to date before
 * we overwrite local state with its copy, then lays back over it whatever the
 * server didn't accept yet so those reviews stay visible until they land.
 */
export async function syncNow(): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  syncing = true;
  try {
    await flushQueue();
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    replaceAll(await withQueuedAttempts(normalize(data)));
  } catch {
    // offline or transient — keep whatever we already have
  } finally {
    syncing = false;
  }
}

/** App boot: hydrate instantly from IndexedDB, then refresh from the server. */
export async function bootStore(): Promise<void> {
  await loadFromIDB();
  await syncNow();
}
