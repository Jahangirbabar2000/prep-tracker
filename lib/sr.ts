// Days per level 0–5. The bottom step is 1 day because the forgetting curve is
// steepest immediately after learning — the first review belongs the next day,
// and a card you keep missing walks back down to it and repeats daily until it
// sticks. The top gap 30→60 (rather than another ~2x bump) mirrors Cepeda et
// al. (2008): ideal spacing scales with how long you want the material to
// stick, roughly 10–20% of the target retention window — for exam/interview
// prep (months out), that lands squarely on ~60 days.
const INTERVALS = [1, 3, 7, 14, 30, 60];

export const MAX_LEVEL = INTERVALS.length - 1;

/** Days until the next review at a given level. Clamped to the ladder. */
export function intervalForLevel(level: number): number {
  return INTERVALS[Math.min(Math.max(level, 0), MAX_LEVEL)];
}

export function computeNextDue(
  struggled: boolean,
  currentLevel: number,
  attemptDate: Date = new Date()
): { newLevel: number; nextDueDate: string } {
  const newLevel = struggled ? Math.max(0, currentLevel - 1) : Math.min(currentLevel + 1, MAX_LEVEL);
  return { newLevel, nextDueDate: dueDateFor(newLevel, attemptDate) };
}

/** The due date for a level, measured from an attempt date. */
export function dueDateFor(level: number, attemptDate: Date = new Date()): string {
  const due = new Date(attemptDate);
  due.setDate(due.getDate() + intervalForLevel(level));
  return due.toLocaleDateString('en-CA');
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
 * The first attempt always lands at level 0 (due in 1 day) however it went: the
 * point of that review is to catch the material before the initial steep drop,
 * not to reward getting it right once. Later attempts step ±1 as usual.
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
  for (const [index, a] of ordered.entries()) {
    const date = new Date(`${String(a.attempted_at).slice(0, 10)}T12:00:00`);
    if (index === 0) {
      level = 0;
      nextDueDate = dueDateFor(0, date);
      continue;
    }
    const { newLevel, nextDueDate: due } = computeNextDue(!!a.struggled, level, date);
    level = newLevel;
    nextDueDate = due;
  }
  return { level, nextDueDate };
}
