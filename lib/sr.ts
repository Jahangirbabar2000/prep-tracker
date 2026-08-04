const INTERVALS = [3, 7, 14, 30]; // days per level 0–3

export function computeNextDue(
  struggled: boolean,
  currentLevel: number,
  attemptDate: Date = new Date()
): { newLevel: number; nextDueDate: string } {
  const newLevel = struggled ? Math.max(0, currentLevel - 1) : Math.min(currentLevel + 1, 3);
  const due = new Date(attemptDate);
  due.setDate(due.getDate() + INTERVALS[newLevel]);
  return { newLevel, nextDueDate: due.toLocaleDateString('en-CA') };
}

/**
 * The SR state a problem *should* have given its full attempt history: level and
 * next-due are a pure function of the ordered attempts, replayed from level 0.
 *
 * Every write (log / edit / delete) must persist this, not a single transition
 * on top of the stored level — otherwise editing or deleting an older attempt,
 * or logging out of date order, silently drifts the level (e.g. a struggle edited
 * onto an old attempt never demotes a problem that already climbed to Confident).
 *
 * Returns level 0 / null when there are no attempts.
 */
export function replaySchedule(
  attempts: Array<{ id: number; struggled: number | boolean; attempted_at: string }>,
): { level: number; nextDueDate: string | null } {
  const ordered = [...attempts].sort((a, b) =>
    a.attempted_at < b.attempted_at ? -1 : a.attempted_at > b.attempted_at ? 1 : a.id - b.id,
  );
  let level = 0;
  let nextDueDate: string | null = null;
  for (const a of ordered) {
    const { newLevel, nextDueDate: due } = computeNextDue(
      !!a.struggled,
      level,
      new Date(`${String(a.attempted_at).slice(0, 10)}T12:00:00`),
    );
    level = newLevel;
    nextDueDate = due;
  }
  return { level, nextDueDate };
}
