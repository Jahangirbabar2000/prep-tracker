'use client';

import { computeNextDue } from '@/lib/sr';
import { Problem, Attempt, Link, Note } from '@/lib/types';
import { mutate } from './store';

/**
 * After a log form finishes creating/updating a problem + its first attempt
 * (+ optional links/notes) via direct API calls, fold the server's own
 * responses straight into the shared local store. Without this, a newly
 * logged question only appears on the exact page you're already viewing —
 * everywhere else (list pages, Review Queue, Nav badges, Stats) stays stale
 * until some unrelated background sync happens to fire, which could be a
 * long, unpredictable wait.
 *
 * Every argument here is a value already returned by an awaited API call
 * (all `RETURNING *` rows), so there's no read-after-write race: the writes
 * already committed before this function runs.
 */
export function syncCreatedProblem(input: {
  problem: Problem;
  attempt: Attempt;
  links?: Link[];
  notes?: Note[];
}): void {
  const { problem, attempt, links = [], notes = [] } = input;

  mutate(d => {
    // The attempt POST already recomputed interval_level/next_due_date server-side,
    // but its response only returns the attempt — mirror the same computeNextDue
    // call here so the problem's SR fields match what the server just wrote.
    const { newLevel, nextDueDate } = computeNextDue(
      !!attempt.struggled,
      problem.interval_level,
      new Date(`${String(attempt.attempted_at).slice(0, 10)}T12:00:00`),
    );
    const finalProblem: Problem = { ...problem, interval_level: newLevel, next_due_date: nextDueDate };

    const problems = [...d.problems.filter(p => p.id !== finalProblem.id), finalProblem];
    const attempts = [...d.attempts.filter(a => a.id !== attempt.id), attempt];
    const newLinkIds = new Set(links.map(l => l.id));
    const newNoteIds = new Set(notes.map(n => n.id));
    const mergedLinks = [...d.links.filter(l => !newLinkIds.has(l.id)), ...links];
    const mergedNotes = [...d.notes.filter(n => !newNoteIds.has(n.id)), ...notes];

    return { ...d, problems, attempts, links: mergedLinks, notes: mergedNotes };
  });
}
