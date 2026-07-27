// Current review streak: how many consecutive days up to today have at least
// one attempt. Today not being done yet doesn't break the streak — we count
// back from today if it has activity, otherwise from yesterday.

function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(attemptedAt: string[], today: string): number {
  const days = new Set(attemptedAt.map((t) => t.slice(0, 10)));
  if (days.size === 0) return 0;

  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
