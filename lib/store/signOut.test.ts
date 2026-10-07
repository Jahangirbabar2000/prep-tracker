import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as string[]);
const queue = vi.hoisted(() => ({ pendingAfterFlush: 0 }));

vi.mock('./idb', () => ({
  idbDestroy: vi.fn(async () => { calls.push('wipe idb'); }),
}));
vi.mock('./writeQueue', () => ({
  flushQueue: vi.fn(async () => { calls.push('flush'); }),
  queuedCount: vi.fn(async () => queue.pendingAfterFlush),
}));

import { signOut, SESSION_CHANNEL } from './signOut';

const cacheNames = ['pages-v2', 'assets-v2', 'api-v2'];
const fetchMock = vi.fn(async () => { calls.push('end session'); return new Response('{}', { status: 200 }); });

beforeEach(() => {
  calls.length = 0;
  queue.pendingAfterFlush = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('caches', {
    keys: vi.fn(async () => cacheNames),
    delete: vi.fn(async (name: string) => { calls.push(`delete cache ${name}`); return true; }),
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('signOut', () => {
  it('uploads pending reviews, ends the session, then wipes local data', async () => {
    expect(await signOut()).toEqual({ ok: true });

    expect(calls.slice(0, 3)).toEqual(['flush', 'end session', 'wipe idb']);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth', { method: 'DELETE' });
    // The /api/sync copy and page shells go; the shared, hashed bundles stay.
    expect(calls.slice(3).sort()).toEqual(['delete cache api-v2', 'delete cache pages-v2']);
  });

  it('refuses offline, touching nothing', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(await signOut()).toEqual({ ok: false, reason: 'offline' });
    expect(calls).toEqual([]);
  });

  it('stops before signing out when reviews still could not upload', async () => {
    queue.pendingAfterFlush = 2;

    expect(await signOut()).toEqual({ ok: false, reason: 'unsynced', pending: 2 });
    expect(calls).toEqual(['flush']);
  });

  it('discards reviews that will not upload only when told to', async () => {
    queue.pendingAfterFlush = 2;

    expect(await signOut({ discardUnsynced: true })).toEqual({ ok: true });
    expect(calls).toContain('wipe idb');
  });

  it('keeps local data when the server could not end the session', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('{}', { status: 500 }));

    expect(await signOut()).toEqual({ ok: false, reason: 'failed' });
    expect(calls).toEqual(['flush']);
  });

  it('tells other open tabs', async () => {
    const otherTab = new BroadcastChannel(SESSION_CHANNEL);
    const received = new Promise(resolve => { otherTab.onmessage = event => resolve(event.data); });

    await signOut();

    await expect(received).resolves.toBe('signed-out');
    otherTab.close();
  });
});
