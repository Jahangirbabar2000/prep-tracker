import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreData } from './store';

const idb = vi.hoisted(() => {
  const kv = new Map<string, unknown>();
  return {
    kv,
    idbGet: vi.fn(async (key: string) => structuredClone(kv.get(key))),
    idbSet: vi.fn(async (key: string, value: unknown) => { kv.set(key, structuredClone(value)); }),
  };
});
vi.mock('./idb', () => idb);

import { getData, normalize, replaceAll } from './store';
import { flushQueue, isRetryableStatus, logAttempt, withQueuedAttempts } from './writeQueue';

type Queued = { client_id?: string; problemId: number };

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

function seed(): StoreData {
  return normalize({
    problems: [
      { id: 1, name: 'Two Sum', domain: 'dsa', interval_level: 0, next_due_date: '2026-10-02', created_at: '2026-10-01' },
      { id: 2, name: 'Valid Parentheses', domain: 'dsa', interval_level: 0, next_due_date: null, created_at: '2026-10-01' },
    ] as never,
    attempts: [{ id: 10, problem_id: 1, attempted_at: '2026-10-01 09:00:00', time_taken_mins: 10, struggled: 0 }],
  });
}

const queue = () => (idb.kv.get('writeQueue') as Queued[] | undefined) ?? [];
const sentKeys = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).client_id);
const reply = (status: number) => new Response('{}', { status });

beforeEach(() => {
  idb.kv.clear();
  fetchMock.mockReset();
  replaceAll(seed());
});

describe('logAttempt', () => {
  it('shows the review at once and queues it under a fresh key', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });

    expect(getData().attempts).toHaveLength(3);
    const [a, b] = queue();
    expect(a.client_id).toMatch(/^[0-9a-f]{32}$/);
    expect(b.client_id).not.toBe(a.client_id);
  });
});

describe('flushQueue', () => {
  it('sends the same key on every retry of an entry', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(reply(201));

    await flushQueue(); // offline: stays queued
    expect(queue()).toHaveLength(1);
    await flushQueue();

    expect(queue()).toHaveLength(0);
    const [first, second] = sentKeys();
    expect(second).toBe(first);
  });

  it('keeps an entry the server could accept later, and everything behind it', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    await logAttempt({ problemId: 2, struggled: true, time_taken_mins: 5 });
    fetchMock.mockResolvedValue(reply(503));

    await flushQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queue()).toHaveLength(2);
  });

  it('sets aside an entry the server rejects so the rest still sync', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    await logAttempt({ problemId: 2, struggled: true, time_taken_mins: 5 });
    const rejectedKey = queue()[0].client_id;
    fetchMock.mockResolvedValueOnce(reply(404)).mockResolvedValueOnce(reply(201));

    await flushQueue();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queue()).toHaveLength(0);
    expect(idb.kv.get('writeQueueRejected')).toEqual([
      expect.objectContaining({ client_id: rejectedKey, problemId: 1, status: 404 }),
    ]);
  });

  it('runs concurrent calls as one flush, sending each entry once', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    await logAttempt({ problemId: 2, struggled: true, time_taken_mins: 5 });
    fetchMock.mockImplementation(async () => reply(201));

    await Promise.all([flushQueue(), flushQueue(), flushQueue()]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Set(sentKeys()).size).toBe(2);
  });

  it('keeps a review logged while a send is in flight', async () => {
    await logAttempt({ problemId: 1, struggled: false, time_taken_mins: 5 });
    let release!: (res: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve; }))
      .mockResolvedValueOnce(reply(201));

    const flushing = flushQueue();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await logAttempt({ problemId: 2, struggled: true, time_taken_mins: 5 });
    release(reply(201));
    await flushing;

    // Writing back the queue as read before the send would have dropped the second review.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queue()).toHaveLength(0);
  });

  it('keys an entry queued before keys existed, once, before sending it', async () => {
    idb.kv.set('writeQueue', [{ problemId: 1, struggled: false, time_taken_mins: 5, attempted_at: '2026-10-02 09:00:00' }]);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(reply(201));

    await flushQueue();
    await flushQueue();

    const [first, second] = sentKeys();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toBe(first);
  });
});

describe('isRetryableStatus', () => {
  it('retries server errors, sign-in and rate limits; not other rejections', () => {
    expect([500, 503, 401, 403, 408, 429].every(isRetryableStatus)).toBe(true);
    expect([400, 404, 409, 422].some(isRetryableStatus)).toBe(false);
  });
});

describe('withQueuedAttempts', () => {
  it('lays pending reviews over a server snapshot, skipping ones it already holds', async () => {
    idb.kv.set('writeQueue', [
      { client_id: 'stored', problemId: 1, struggled: false, time_taken_mins: 5, attempted_at: '2026-10-02 09:00:00' },
      { client_id: 'pending', problemId: 1, struggled: false, time_taken_mins: 5, attempted_at: '2026-10-05 09:00:00' },
    ]);
    const snapshot = seed();
    snapshot.attempts.push({ id: 11, problem_id: 1, attempted_at: '2026-10-02 09:00:00', time_taken_mins: 5, struggled: 0, client_id: 'stored' });

    const merged = await withQueuedAttempts(snapshot);

    expect(merged.attempts.map(a => a.client_id ?? null)).toEqual([null, 'stored', 'pending']);
    // Three "got it"s replayed: level 0 → 1 → 2, due 7 days after the last.
    expect(merged.problems.find(p => p.id === 1)).toMatchObject({ interval_level: 2, next_due_date: '2026-10-12' });
  });
});
