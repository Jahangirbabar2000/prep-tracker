// Pure helpers for the proficiency-badge tooltip: what the badge would read
// after one more success or struggle. Mirrors lib/sr.ts computeNextDue exactly
// (levels 0-4, capped at Mastered) so the tooltip can never promise a
// transition that the scheduler doesn't actually make.

export const PROFICIENCY_LEVEL_LABELS = ['New', 'Learning', 'Familiar', 'Confident', 'Mastered'] as const;

/**
 * Whether a problem at this level reads as "Struggling" rather than plain
 * "New". A struggled attempt always sets a due date, but the more alarming
 * label waits for a second attempt so one early stumble doesn't overreact.
 */
export function isStrugglingState(level: number, hasNextDue: boolean, attemptCount: number): boolean {
  return level === 0 && hasNextDue && attemptCount >= 2;
}

export interface TransitionPreview {
  label: string;
  changed: boolean; // differs from the currently displayed label
}

/** What the badge would read after one more successful (non-struggled) attempt. */
export function projectSuccess(level: number, currentLabel: string): TransitionPreview {
  const label = PROFICIENCY_LEVEL_LABELS[Math.min(level + 1, 4)];
  return { label, changed: label !== currentLabel };
}

/** What the badge would read after one more struggled attempt. */
export function projectStruggle(level: number, attemptCount: number, currentLabel: string): TransitionPreview {
  const next = Math.max(level - 1, 0);
  const label = isStrugglingState(next, true, attemptCount + 1) ? 'Struggling' : PROFICIENCY_LEVEL_LABELS[next];
  return { label, changed: label !== currentLabel };
}
