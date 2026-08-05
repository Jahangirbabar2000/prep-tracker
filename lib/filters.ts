import { PROFICIENCY_LABELS } from './proficiency';

/**
 * Maps a proficiency filter value to its SQL WHERE clause fragment.
 *
 * "New" vs "Struggling" both live at interval_level 0 and split on attempt
 * count — every first log now sets a due date, so the presence of one no
 * longer distinguishes them (see lib/proficiency.ts isStrugglingState).
 */
export function proficiencyClause(p: string): string {
  const attempts = '(SELECT COUNT(*) FROM attempts a WHERE a.problem_id = problems.id)';
  if (p === 'New')        return ` AND interval_level = 0 AND (next_due_date IS NULL OR ${attempts} < 2)`;
  if (p === 'Struggling') return ` AND interval_level = 0 AND next_due_date IS NOT NULL AND ${attempts} >= 2`;
  if (p === 'Learning')   return " AND interval_level = 1";
  if (p === 'Familiar')   return " AND interval_level = 2";
  if (p === 'Proficient') return " AND interval_level = 3";
  if (p === 'Confident')  return " AND interval_level = 4";
  if (p === 'Mastered')   return " AND interval_level = 5";
  return '';
}

export const PROFICIENCY_OPTIONS: readonly string[] = PROFICIENCY_LABELS;

/** Same options but without "New" — for review queue where all items already have next_due_date */
export const QUEUE_PROFICIENCY_OPTIONS: readonly string[] = PROFICIENCY_LABELS.filter(l => l !== 'New');
