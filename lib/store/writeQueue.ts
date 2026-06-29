'use client';

import { computeNextDue } from '@/lib/sr';
import { idbGet, idbSet } from './idb';
import { mutate, getData } from './store';

interface QueuedAttempt {
  problemId: number;
  struggled: boolean;
  time_taken_mins: number;
  attempted_at: string; // YYYY-MM-DD captured at log time
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
 */
export async function logAttempt(input: {
  problemId: number;
  struggled: boolean;
  time_taken_mins: number;
  attempted_at: string;
}): Promise<void> {
  const { problemId, struggled, time_taken_mins, attempted_at } = input;
  const attemptDate = new Date(`${attempted_at}T12:00:00`);

  mutate(d => {
    const problem = d.problems.find(p => p.id === problemId);
    const attempts = [
      ...d.attempts,
      {
        id: tempId--,
        problem_id: problemId,
        attempted_at: `${attempted_at} 00:00:00`,
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
  queue.push({ problemId, struggled, time_taken_mins, attempted_at });
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
