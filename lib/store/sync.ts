'use client';

import { replaceAll, normalize, loadFromIDB, setSyncError } from './store';
import { idbGet, idbSet } from './idb';
import { clientNow, clientToday } from './queries';
import { isDemo } from '@/lib/demo/mode';
import { flushQueue, withQueuedAttempts } from './writeQueue';

let syncing = false;

/**
 * Pull the full dataset from the server and replace the local store.
 * Flushes any queued offline writes first so the server is up to date before
 * we overwrite local state with its copy, then lays back over it whatever the
 * server didn't accept yet so those reviews stay visible until they land.
 */
export async function syncNow(): Promise<void> {
  if (syncing || isDemo()) return; // the demo has no server copy to fetch
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  syncing = true;
  try {
    await flushQueue();
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) {
      // Keep whatever we already have, but say why — with nothing cached yet
      // (a first visit, a fresh deployment) this is the only thing to show.
      setSyncError(await failureMessage(res));
      return;
    }
    const data = await res.json();
    replaceAll(await withQueuedAttempts(normalize(data)));
    setSyncError(null);
  } catch {
    // Offline or a dropped connection — keep whatever we already have.
    if (typeof navigator !== 'undefined' && navigator.onLine) setSyncError('Couldn’t reach the server.');
  } finally {
    syncing = false;
  }
}

/** App boot: hydrate instantly from IndexedDB, then refresh from the server. */
export async function bootStore(): Promise<void> {
  if (isDemo()) return bootDemo();
  await loadFromIDB();
  await syncNow();
}

const DEMO_BUILT_KEY = 'demoBuiltOn';
/** A returning visitor keeps their demo progress for this long, then gets a fresh deck. */
const DEMO_KEEP_DAYS = 7;

/** Demo boot: the visitor's own demo progress if it's recent, else a fresh build. */
async function bootDemo(): Promise<void> {
  const builtOn = await idbGet<string>(DEMO_BUILT_KEY);
  const ageDays = builtOn ? (Date.parse(clientToday()) - Date.parse(builtOn)) / 86_400_000 : Infinity;
  if (ageDays < DEMO_KEEP_DAYS && (await loadFromIDB())) return;
  await resetDemo();
}

/** Rebuild the demo deck as of now, discarding the visitor's demo changes. */
export async function resetDemo(): Promise<void> {
  // Loaded on demand, so the deck stays out of the bundle for real accounts.
  const { buildDemoDataset } = await import('@/lib/demo/dataset');
  replaceAll(normalize(buildDemoDataset(clientNow())));
  await idbSet(DEMO_BUILT_KEY, clientToday());
}

/** The server's own explanation when it gave one (see /api/sync), else the status. */
async function failureMessage(res: Response): Promise<string> {
  if (res.status === 401) return 'Your session has ended. Sign in again.';
  try {
    const body = await res.json();
    if (typeof body?.error === 'string' && body.error) return body.error;
  } catch { /* not JSON */ }
  return `The server couldn’t load your data (HTTP ${res.status}).`;
}
