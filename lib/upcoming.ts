// Pure helpers behind the "Upcoming" forecast on the review queue.
//
// The forecast used to be a fixed 7-day strip. It now pages a week at a time so
// the pile waiting further out is reachable (swipe on touch, chevrons on
// desktop). Everything here is date-key math on "YYYY-MM-DD" strings — no
// Date-with-local-timezone drift — so the slots line up with the Eastern-time
// keys the store/scheduler already use.

export const UPCOMING_WEEK_DAYS = 7;
/** Hard ceiling on how far the pager can reach (~2 months). */
export const UPCOMING_MAX_WEEKS = 8;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface ForecastRow { date: string; domain: string; count: number }

export interface DaySlot {
  dateKey: string;
  /** Long form used in the hover title, e.g. "Tomorrow" / "Wed, Aug 20". */
  label: string;
  /** Column heading, e.g. "Tmrw" / "Wed". */
  shortLabel: string;
  total: number;
  domains: Record<string, number>;
}

export interface ForecastWeek {
  index: number;
  startKey: string;
  endKey: string;
  /** e.g. "Next 7 days" for the first page, "Aug 17 – 23" after that. */
  label: string;
  total: number;
  slots: DaySlot[];
  domainTotals: Record<string, number>;
}

function toUtc(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "YYYY-MM-DD" shifted by `n` days (negative shifts backwards). */
export function addDays(dateKey: string, n: number): string {
  return new Date(toUtc(dateKey) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** 0 = Sunday, matching Date#getDay. */
export function dayOfWeek(dateKey: string): number {
  return new Date(toUtc(dateKey)).getUTCDay();
}

/** "Aug 17 – 23", collapsing to one month name when the week doesn't cross over. */
export function weekRangeLabel(startKey: string, endKey: string): string {
  const [, startMonth, startDay] = startKey.split('-').map(Number);
  const [, endMonth, endDay] = endKey.split('-').map(Number);
  const start = `${MONTH_NAMES[startMonth - 1]} ${startDay}`;
  const end = startMonth === endMonth ? `${endDay}` : `${MONTH_NAMES[endMonth - 1]} ${endDay}`;
  return `${start} – ${end}`;
}

/**
 * Split forecast rows into week-sized pages starting tomorrow.
 *
 * Trailing empty weeks are dropped, so the pager only reaches as far as there is
 * actually something due (and never past `maxWeeks`). Returns [] when nothing is
 * upcoming, which is the caller's cue to hide the section entirely.
 */
export function buildForecastWeeks(
  rows: ForecastRow[],
  today: string,
  maxWeeks: number = UPCOMING_MAX_WEEKS,
): ForecastWeek[] {
  const byDate: Record<string, number> = {};
  const byDateDomain: Record<string, Record<string, number>> = {};
  let lastDue: string | null = null;

  for (const row of rows) {
    if (row.date <= today) continue;
    byDate[row.date] = (byDate[row.date] ?? 0) + row.count;
    byDateDomain[row.date] ??= {};
    byDateDomain[row.date][row.domain] = (byDateDomain[row.date][row.domain] ?? 0) + row.count;
    if (!lastDue || row.date > lastDue) lastDue = row.date;
  }
  if (!lastDue) return [];

  // Enough pages to reach the furthest due date, capped — a card scheduled a
  // year out shouldn't hand the user 52 mostly-empty pages to swipe through.
  const reach = daysBetween(today, lastDue);
  const weekCount = Math.min(Math.max(Math.ceil(reach / UPCOMING_WEEK_DAYS), 1), maxWeeks);

  return Array.from({ length: weekCount }, (_, week) => {
    const domainTotals: Record<string, number> = {};
    let total = 0;

    const slots = Array.from({ length: UPCOMING_WEEK_DAYS }, (_, day) => {
      const offset = week * UPCOMING_WEEK_DAYS + day + 1;
      const dateKey = addDays(today, offset);
      const dayName = DAY_NAMES[dayOfWeek(dateKey)];
      const [, month, dayNum] = dateKey.split('-').map(Number);
      const domains = byDateDomain[dateKey] ?? {};

      total += byDate[dateKey] ?? 0;
      for (const [domain, count] of Object.entries(domains)) {
        domainTotals[domain] = (domainTotals[domain] ?? 0) + count;
      }

      return {
        dateKey,
        label:      offset === 1 ? 'Tomorrow' : `${dayName}, ${MONTH_NAMES[month - 1]} ${dayNum}`,
        shortLabel: offset === 1 ? 'Tmrw'     : dayName,
        total:      byDate[dateKey] ?? 0,
        domains,
      };
    });

    const startKey = slots[0].dateKey;
    const endKey = slots[slots.length - 1].dateKey;
    return {
      index: week,
      startKey,
      endKey,
      label: week === 0 ? 'Next 7 days' : weekRangeLabel(startKey, endKey),
      total,
      slots,
      domainTotals,
    };
  });
}

/** Grand total across every page — used for the "N beyond this week" hint. */
export function totalUpcoming(weeks: ForecastWeek[]): number {
  return weeks.reduce((sum, week) => sum + week.total, 0);
}
