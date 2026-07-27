'use client';

import { computeNextDue } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';
import { idbGet, idbSet } from './idb';
import { mutate, getData, replaceAll } from './store';
import { clientNow } from './queries';

interface QueuedAttempt {
  problemId: number;
  struggled: boolean;
  time_taken_mins: number;
  attempted_at: string; // "YYYY-MM-DD HH:MM:SS" — the real moment the attempt was logged
}

const QUEUE_KEY = 'writeQueue';
let tempId = -1;

async function readQueue(): Promise<QueuedAttempt[]> {
  return (await idbGet<QueuedAttempt[]>(QUEUE_KEY)) ?? [];
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
  const { problemId, struggled, time_taken_mins } = input;
  const attemptedAt = clientNow();
  const attemptDate = new Date(attemptedAt.replace(' ', 'T'));

  mutate(d => {
    const problem = d.problems.find(p => p.id === problemId);
    const attempts = [
      ...d.attempts,
      {
        id: tempId--,
        problem_id: problemId,
        attempted_at: attemptedAt,
        time_taken_mins,
        struggled: struggled ? 1 : 0,
        practice_type: null,
      },
    ];
    if (!problem) return { ...d, attempts };
    const { newLevel, nextDueDate } = computeNextDue(struggled, problem.interval_level, attemptDate);
    const problems = d.problems.map(p =>
      p.id === problemId ? { ...p, interval_level: newLevel, next_due_date: nextDueDate } : p,
    );
    return { ...d, attempts, problems };
  });

  const queue = await readQueue();
  queue.push({ problemId, struggled, time_taken_mins, attempted_at: attemptedAt });
  await idbSet(QUEUE_KEY, queue);
}

/** Replay queued attempts to the server, in order. Stops on first failure (e.g. offline). */
export async function flushQueue(): Promise<void> {
  let queue = await readQueue();
  while (queue.length) {
    const item = queue[0];
    try {
      const res = await fetch(`/api/problems/${item.problemId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_taken_mins: item.time_taken_mins,
          struggled: item.struggled,
          attempted_at: item.attempted_at,
        }),
      });
      if (!res.ok) break;
    } catch {
      break; // offline — leave the rest queued
    }
    queue = queue.slice(1);
    await idbSet(QUEUE_KEY, queue);
  }
}

export async function hasQueued(): Promise<boolean> {
  return (await readQueue()).length > 0;
}

/** Recompute a problem's SR state from its latest remaining attempt — mirrors the
 *  logic in app/api/attempts/[id]/route.ts exactly, so the shared store stays
 *  consistent with what the server just computed, without waiting for a resync. */
function recomputeProblemSR(problemId: number, attempts: Attempt[], problems: Problem[]): Problem[] {
  const problem = problems.find(p => p.id === problemId);
  if (!problem) return problems;

  const latest = attempts
    .filter(a => a.problem_id === problemId)
    .sort((x, y) => (x.attempted_at < y.attempted_at ? 1 : x.attempted_at > y.attempted_at ? -1 : y.id - x.id))[0];

  if (latest) {
    const { newLevel, nextDueDate } = computeNextDue(
      !!latest.struggled,
      problem.interval_level,
      new Date(`${String(latest.attempted_at).slice(0, 10)}T12:00:00`),
    );
    return problems.map(p => p.id === problemId ? { ...p, interval_level: newLevel, next_due_date: nextDueDate } : p);
  }
  return problems.map(p => p.id === problemId ? { ...p, interval_level: 0, next_due_date: null } : p);
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
