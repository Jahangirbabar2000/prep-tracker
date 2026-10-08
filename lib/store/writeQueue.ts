'use client';

import { replaySchedule } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';
import { idbGet, idbSet } from './idb';
import { mutate, getData, replaceAll, type StoreData } from './store';
import { clientNow } from './queries';
import { isDemo } from '@/lib/demo/mode';

interface QueuedAttempt {
  /** Idempotency key, minted once when the attempt is logged and sent on every
   *  retry, so the server can tell a resend from a second attempt. Entries
   *  queued before keys existed have none until flushQueue assigns one. */
  client_id?: string;
  problemId: number;
  struggled: boolean;
  time_taken_mins: number;
  attempted_at: string; // "YYYY-MM-DD HH:MM:SS" — the real moment the attempt was logged
  practice_type?: string | null; // 'solo' | 'mock' — only set when restoring a deleted attempt
}

interface RejectedAttempt extends QueuedAttempt {
  status: number;
  rejected_at: string;
}

const QUEUE_KEY = 'writeQueue';
const REJECTED_KEY = 'writeQueueRejected';
let tempId = -1;

function newClientId(): string {
  // getRandomValues rather than randomUUID: randomUUID needs a secure context,
  // and the dev server opened from a phone over LAN HTTP isn't one.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}

async function readQueue(): Promise<QueuedAttempt[]> {
  return (await idbGet<QueuedAttempt[]>(QUEUE_KEY)) ?? [];
}

let queueChain: Promise<unknown> = Promise.resolve();

/**
 * Read-modify-write the queue with no other change landing in between. The
 * queue is one array under one IndexedDB key, so two unserialised writers — a
 * log appending and a flush removing — each write back the copy they read, and
 * one of the two changes is silently lost. Web Locks serialise across every
 * open tab; the promise chain covers environments without them (jsdom).
 */
async function updateQueue(fn: (queue: QueuedAttempt[]) => QueuedAttempt[]): Promise<void> {
  const run = async () => { await idbSet(QUEUE_KEY, fn(await readQueue())); };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request(QUEUE_KEY, run);
    return;
  }
  const next = queueChain.then(run, run);
  queueChain = next.catch(() => {});
  await next;
}

/** The store with one not-yet-synced attempt applied: the attempt row plus the
 *  problem's SR state replayed over its full history, as the server will compute it. */
function withAttempt(d: StoreData, item: QueuedAttempt): StoreData {
  const attempts: Attempt[] = [
    ...d.attempts,
    {
      id: tempId--,
      problem_id: item.problemId,
      attempted_at: item.attempted_at,
      time_taken_mins: item.time_taken_mins,
      struggled: item.struggled ? 1 : 0,
      practice_type: item.practice_type ?? null,
      client_id: item.client_id ?? null,
    },
  ];
  return { ...d, attempts, problems: recomputeProblemSR(item.problemId, attempts, d.problems) };
}

/**
 * Log a review attempt offline-first: optimistically insert the attempt into the
 * local store, recompute the problem's SR state locally (identical to the server),
 * and enqueue the write for replay. Returns immediately — no network required.
 *
 * Always represents "logged right now" (never a backfill to a past date — those
 * go through the online-only log forms), so the real clock time is captured here
 * and carried through to the server on replay, even if that replay happens later.
 */
export async function logAttempt(input: {
  problemId: number;
  struggled: boolean;
  time_taken_mins: number;
}): Promise<void> {
  const item: QueuedAttempt = {
    client_id: newClientId(),
    problemId: input.problemId,
    struggled: input.struggled,
    time_taken_mins: input.time_taken_mins,
    attempted_at: clientNow(),
  };
  mutate(d => withAttempt(d, item));
  await updateQueue(queue => [...queue, item]);
}

/**
 * Put back an attempt that was just deleted — the Undo on a delete. It goes
 * through the queue like a freshly logged attempt (its own idempotency key,
 * works offline) but keeps its original moment, so it replays into the
 * schedule exactly where it was. Its id is new; the deleted one is gone for
 * good on the server. The caller flushes, like after logAttempt.
 */
export async function restoreAttempt(attempt: Attempt): Promise<void> {
  const item: QueuedAttempt = {
    client_id: newClientId(),
    problemId: attempt.problem_id,
    struggled: !!attempt.struggled,
    time_taken_mins: attempt.time_taken_mins,
    attempted_at: attempt.attempted_at,
    practice_type: attempt.practice_type ?? null,
  };
  mutate(d => withAttempt(d, item));
  await updateQueue(queue => [...queue, item]);
}

/**
 * Lay attempts still in the queue over a fresh server snapshot. syncNow
 * replaces the whole store with the server's copy, so anything the server
 * hasn't accepted yet (it errored, or the session expired) would otherwise
 * vanish from the UI until it lands. An entry the snapshot already holds —
 * stored, but its response lost — is recognised by its key and not doubled.
 */
export async function withQueuedAttempts(data: StoreData): Promise<StoreData> {
  const stored = new Set(data.attempts.map(a => a.client_id).filter(Boolean));
  const pending = (await readQueue()).filter(item => !item.client_id || !stored.has(item.client_id));
  return pending.reduce(withAttempt, data);
}

/**
 * Statuses worth resending unchanged later: the server failed (5xx), the
 * session needs a sign-in (401/403), or a limit will reset (408/429). Any other
 * 4xx rejects this exact payload — e.g. 404 for a card deleted since it was
 * reviewed — so resending can never succeed, and waiting on it would hold up
 * every entry queued behind it.
 */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 401 || status === 403 || status === 408 || status === 429;
}

async function setAside(item: QueuedAttempt, status: number): Promise<void> {
  const rejected = (await idbGet<RejectedAttempt[]>(REJECTED_KEY)) ?? [];
  await idbSet(REJECTED_KEY, [...rejected, { ...item, status, rejected_at: clientNow() }]);
  console.warn(`Queued attempt for problem ${item.problemId} was rejected (${status}); kept under "${REJECTED_KEY}".`);
}

let flushing: Promise<void> | null = null;

/**
 * Replay queued attempts to the server, in order. Stops at a network error or
 * a retryable status and leaves the rest queued; an entry the server rejects
 * outright is set aside so it can't block the ones behind it. Concurrent calls
 * share one run — two loops would both send the head entry.
 */
export function flushQueue(): Promise<void> {
  if (isDemo()) return Promise.resolve(); // demo attempts stay in this browser
  if (!flushing) flushing = drainQueue().finally(() => { flushing = null; });
  return flushing;
}

async function drainQueue(): Promise<void> {
  // Key any entry queued before keys existed, persisted before it's sent, so
  // every retry of it reuses the same key.
  if ((await readQueue()).some(item => !item.client_id)) {
    await updateQueue(queue => queue.map(item => item.client_id ? item : { ...item, client_id: newClientId() }));
  }
  for (;;) {
    const item = (await readQueue())[0];
    if (!item) return;
    let res: Response;
    try {
      res = await fetch(`/api/problems/${item.problemId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: item.client_id,
          time_taken_mins: item.time_taken_mins,
          struggled: item.struggled,
          attempted_at: item.attempted_at,
          practice_type: item.practice_type ?? null,
        }),
      });
    } catch {
      return; // offline — leave the rest queued
    }
    if (!res.ok) {
      if (isRetryableStatus(res.status)) return;
      await setAside(item, res.status);
    }
    // Remove by key, not position: another tab's flush may already have
    // removed this entry, and dropping the head would then lose a different one.
    await updateQueue(queue => queue.filter(q => q.client_id !== item.client_id));
  }
}

/** How many logged reviews haven't reached the server yet. */
export async function queuedCount(): Promise<number> {
  return (await readQueue()).length;
}

/** Recompute a problem's SR state by replaying its full remaining history —
 *  mirrors app/api/attempts/[id]/route.ts exactly, so the shared store stays
 *  consistent with what the server computes, without waiting for a resync.
 *  Replaying (not a single transition) is what lets an edit/delete of an older
 *  attempt correctly demote/promote instead of leaving the level stuck. */
function recomputeProblemSR(problemId: number, attempts: Attempt[], problems: Problem[]): Problem[] {
  if (!problems.some(p => p.id === problemId)) return problems;
  const { level, nextDueDate } = replaySchedule(attempts.filter(a => a.problem_id === problemId));
  return problems.map(p => p.id === problemId ? { ...p, interval_level: level, next_due_date: nextDueDate } : p);
}

/**
 * Delete an attempt: hits the (online-only) API, then applies the exact same
 * removal + SR recompute to the shared local store so the change is reflected
 * everywhere immediately (Review Queue, History, Stats) instead of waiting on
 * the next unrelated background sync.
 */
export async function deleteAttemptRemote(attemptId: number): Promise<void> {
  const prev = getData();
  const removed = prev.attempts.find(a => a.id === attemptId);
  if (!removed) return;

  // Optimistic: update the local store now so the UI changes instantly.
  mutate(d => {
    const attempts = d.attempts.filter(a => a.id !== attemptId);
    const problems = recomputeProblemSR(removed.problem_id, attempts, d.problems);
    return { ...d, attempts, problems };
  });

  if (isDemo()) return; // the store change is the whole delete in the demo

  // Sync in the background; roll back if the server rejects it.
  try {
    const res = await fetch(`/api/attempts/${attemptId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete attempt');
  } catch (e) {
    replaceAll(prev);
    throw e;
  }
}

/**
 * Edit an attempt: hits the (online-only) API, then applies the server's
 * returned attempt + a matching SR recompute to the shared local store.
 */
export async function editAttemptRemote(
  attemptId: number,
  fields: Partial<Pick<Attempt, 'time_taken_mins' | 'struggled' | 'attempted_at' | 'practice_type'>>,
): Promise<Attempt> {
  const prev = getData();
  const existing = prev.attempts.find(a => a.id === attemptId);
  if (!existing) throw new Error('Attempt not found');

  // Build the optimistic attempt locally. Preserve the time-of-day if the edit
  // only changed the date (the form supplies YYYY-MM-DD).
  const optimistic: Attempt = {
    ...existing,
    ...fields,
    attempted_at: fields.attempted_at
      ? `${fields.attempted_at.slice(0, 10)}${existing.attempted_at.slice(10)}`
      : existing.attempted_at,
  };

  // Optimistic: update the local store now so the UI changes instantly.
  mutate(d => {
    const attempts = d.attempts.map(a => a.id === attemptId ? optimistic : a);
    const problems = recomputeProblemSR(existing.problem_id, attempts, d.problems);
    return { ...d, attempts, problems };
  });

  if (isDemo()) return optimistic; // the store change is the whole edit in the demo

  // Sync in the background; reconcile with the server's copy, roll back on error.
  try {
    const res = await fetch(`/api/attempts/${attemptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error('Failed to update attempt');
    const updated: Attempt = await res.json();
    mutate(d => {
      const attempts = d.attempts.map(a => a.id === updated.id ? updated : a);
      const problems = recomputeProblemSR(updated.problem_id, attempts, d.problems);
      return { ...d, attempts, problems };
    });
    return updated;
  } catch (e) {
    replaceAll(prev);
    throw e;
  }
}
