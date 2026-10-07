'use client';

import { idbDestroy } from './idb';
import { flushQueue, queuedCount } from './writeQueue';

/** Other open tabs of the app listen here, so signing out in one signs out all. */
export const SESSION_CHANNEL = 'prep-session';

export type SignOutResult =
  | { ok: true }
  | { ok: false; reason: 'offline' }
  | { ok: false; reason: 'unsynced'; pending: number }
  | { ok: false; reason: 'failed' };

/**
 * Sign out of what may be a shared device: upload what's waiting, end the
 * session, then remove everything this browser kept for the account.
 *
 * The order is the point. Pending reviews go up first, because the wipe would
 * destroy them. The session ends before the wipe, because if the server can't
 * clear the cookie the device is still signed in and the next sync would just
 * download everything again — so a failed sign-out leaves local data alone
 * rather than half-done. Offline, neither the upload nor the sign-out can
 * happen, so it refuses up front.
 *
 * Reviews that still won't upload (the server keeps refusing them) are only
 * discarded when the caller says so, after asking the person.
 */
export async function signOut({ discardUnsynced = false } = {}): Promise<SignOutResult> {
  if (!navigator.onLine) return { ok: false, reason: 'offline' };

  await flushQueue().catch(() => {});
  const pending = await queuedCount();
  if (pending > 0 && !discardUnsynced) return { ok: false, reason: 'unsynced', pending };

  const res = await fetch('/api/auth', { method: 'DELETE' }).catch(() => null);
  if (!res?.ok) return { ok: false, reason: 'failed' };

  await wipeLocalData();
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.postMessage('signed-out');
    channel.close();
  }
  return { ok: true };
}

/**
 * Everything this browser holds for the account: the IndexedDB database and
 * the service worker's caches (its copy of /api/sync above all). The hashed
 * JS/CSS bundles stay — they're identical for everyone. So do the theme and
 * sidebar choices in localStorage: they belong to the device, not the account.
 */
export async function wipeLocalData(): Promise<void> {
  await idbDestroy();
  if (typeof caches !== 'undefined') {
    const names = await caches.keys();
    await Promise.all(names.filter(name => !name.startsWith('assets-')).map(name => caches.delete(name)));
  }
}
