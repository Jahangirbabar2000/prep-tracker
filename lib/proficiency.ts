// The single source of truth for proficiency labels. Mirrors lib/sr.ts exactly
// (levels 0-5, capped at Mastered) so a badge or tooltip can never promise a
// transition the scheduler doesn't actually make.

import { MAX_LEVEL } from './sr';

/** Label per interval level. Level 0 reads "Struggling" once it has been missed twice. */
export const PROFICIENCY_LEVEL_LABELS = [
  'New', 'Learning', 'Familiar', 'Proficient', 'Confident', 'Mastered',
] as const;

/** Every label a problem can display, in ladder order — for filters and legends. */
export const PROFICIENCY_LABELS = [
  'New', 'Struggling', 'Learning', 'Familiar', 'Proficient', 'Confident', 'Mastered',
] as const;

export type ProficiencyLabel = typeof PROFICIENCY_LABELS[number];

/**
 * Whether a problem at this level reads as "Struggling" rather than plain
 * "New". A struggled attempt always sets a due date, but the more alarming
 * label waits for a second attempt so one early stumble doesn't overreact —
 * and, since every card's first log now lands at level 0 with a due date, so
 * that freshly added questions don't all brand themselves "Struggling".
 */
export function isStrugglingState(level: number, hasNextDue: boolean, attemptCount: number): boolean {
  return level === 0 && hasNextDue && attemptCount >= 2;
}

/** The label a problem displays. The one definition every surface should use. */
export function proficiencyLabel(level: number, hasNextDue: boolean, attemptCount: number): ProficiencyLabel {
  if (isStrugglingState(level, hasNextDue, attemptCount)) return 'Struggling';
  return PROFICIENCY_LEVEL_LABELS[Math.min(Math.max(level, 0), MAX_LEVEL)];
}

export interface TransitionPreview {
  label: string;
  changed: boolean; // differs from the currently displayed label
}

/** What the badge would read after one more successful (non-struggled) attempt. */
export function projectSuccess(level: number, currentLabel: string): TransitionPreview {
  const label = PROFICIENCY_LEVEL_LABELS[Math.min(level + 1, MAX_LEVEL)];
  return { label, changed: label !== currentLabel };
}

/** What the badge would read after one more struggled attempt. */
export function projectStruggle(level: number, attemptCount: number, currentLabel: string): TransitionPreview {
  const next = Math.max(level - 1, 0);
  const label = proficiencyLabel(next, true, attemptCount + 1);
  return { label, changed: label !== currentLabel };
}
