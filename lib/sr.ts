const INTERVALS = [3, 7, 14, 30]; // days per level 0–3

export function computeNextDue(
  struggled: boolean,
  currentLevel: number,
  attemptDate: Date = new Date()
): { newLevel: number; nextDueDate: string } {
  const newLevel = struggled ? Math.max(0, currentLevel - 1) : Math.min(currentLevel + 1, 3);
  const due = new Date(attemptDate);
  due.setDate(due.getDate() + INTERVALS[newLevel]);
  return { newLevel, nextDueDate: due.toISOString().split('T')[0] };
}
