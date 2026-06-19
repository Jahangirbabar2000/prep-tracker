/** Maps a proficiency filter value to its SQL WHERE clause fragment. */
export function proficiencyClause(p: string): string {
  if (p === 'New')        return " AND interval_level = 0 AND next_due_date IS NULL";
  if (p === 'Struggling') return " AND interval_level = 0 AND next_due_date IS NOT NULL";
  if (p === 'Learning')   return " AND interval_level = 1";
  if (p === 'Familiar')   return " AND interval_level = 2";
  if (p === 'Confident')  return " AND interval_level = 3";
  return '';
}

export const PROFICIENCY_OPTIONS = ['New', 'Struggling', 'Learning', 'Familiar', 'Confident'];

/** Same options but without "New" — for review queue where all items already have next_due_date */
export const QUEUE_PROFICIENCY_OPTIONS = ['Struggling', 'Learning', 'Familiar', 'Confident'];
