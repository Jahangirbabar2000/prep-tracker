// Pure helpers behind the History page's day navigation.
//
// The history view used to be pinned to `clientToday()`. The data was always
// permanent — /api/sync returns every attempt row ever written — so making past
// days reachable is a matter of resolving a day key and stepping between the
// days that actually have activity. Everything here is string math on
// "YYYY-MM-DD" keys, same as lib/upcoming.ts, so there is no local-timezone
// drift against the Eastern-time keys the store and scheduler use.

import { addDays } from './upcoming';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Is this a real calendar day key — "2026-02-30" is not. */
export function isDayKey(raw: string): boolean {
  if (!DAY_KEY.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
}

/**
 * Resolve a `?date=` param to the day the page should render.
 *
 * Anything unusable falls back to today rather than erroring: a garbled key, a
 * nonexistent date, or a day in the future (there is no history to show for a
 * day that hasn't happened). A bookmarked `?date=` from months ago stays valid
 * forever, since nothing prunes attempts.
 */
export function resolveHistoryDate(raw: string | null | undefined, today: string): string {
  if (!raw || !isDayKey(raw)) return today;
  return raw > today ? today : raw;
}

/**
 * One calendar day either side of `from`, bounded — what the History arrows step.
 *
 * Empty days are included on purpose: a day you logged nothing is part of your
 * history, and skipping it hides the gap. The bounds are what keep that from
 * becoming an endless walk through nothing:
 *
 * - forward stops at `today` — there is no history for a day that hasn't happened;
 * - backward stops at `earliest`, the first day you ever logged, since every day
 *   before that is empty by definition.
 *
 * Returns null at either bound so the arrows can disable. A `from` already at or
 * outside a bound gets null for that direction.
 */
export function adjacentDay(
  from: string,
  dir: -1 | 1,
  today: string,
  earliest: string | undefined,
): string | null {
  if (dir > 0) return from >= today ? null : addDays(from, 1);
  if (!earliest || from <= earliest) return null;
  return addDays(from, -1);
}

/**
 * The nearest day in `days` strictly before (`dir: -1`) or after (`dir: 1`)
 * `from`, or null when there is none.
 *
 * Not what the arrows use (see adjacentDay) — this powers the "your last session
 * before this was on X" jump on an empty day's empty state, which is how you
 * skip a long gap without clicking through it one day at a time.
 *
 * `days` need not be sorted.
 */
export function adjacentActivityDay(days: Iterable<string>, from: string, dir: -1 | 1): string | null {
  let best: string | null = null;
  for (const day of days) {
    if (dir < 0 ? day >= from : day <= from) continue;
    // Nearest = the largest candidate below `from`, or the smallest above it.
    if (best === null || (dir < 0 ? day > best : day < best)) best = day;
  }
  return best;
}

/**
 * "Today" / "Yesterday" / "Tuesday" — the human handle for a day key, to sit
 * next to the numeric date rather than replace it.
 */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}
