import { describe, expect, it } from 'vitest';
import { adjacentActivityDay, adjacentDay, dayLabel, isDayKey, resolveHistoryDate } from './historyDay';

const TODAY = '2026-08-26';

describe('isDayKey', () => {
  it('accepts a real day key', () => {
    expect(isDayKey('2026-08-26')).toBe(true);
    expect(isDayKey('2024-02-29')).toBe(true); // leap year
  });

  it('rejects malformed and nonexistent dates', () => {
    expect(isDayKey('2026-8-26')).toBe(false);
    expect(isDayKey('2026-08-26T00:00:00')).toBe(false);
    expect(isDayKey('yesterday')).toBe(false);
    expect(isDayKey('')).toBe(false);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-13-01')).toBe(false);
    expect(isDayKey('2025-02-29')).toBe(false); // not a leap year
  });
});

describe('resolveHistoryDate', () => {
  it('defaults to today when absent', () => {
    expect(resolveHistoryDate(null, TODAY)).toBe(TODAY);
    expect(resolveHistoryDate(undefined, TODAY)).toBe(TODAY);
    expect(resolveHistoryDate('', TODAY)).toBe(TODAY);
  });

  it('keeps a valid past day', () => {
    expect(resolveHistoryDate('2026-01-04', TODAY)).toBe('2026-01-04');
    expect(resolveHistoryDate(TODAY, TODAY)).toBe(TODAY);
  });

  it('clamps the future to today — there is no history for a day that has not happened', () => {
    expect(resolveHistoryDate('2026-08-27', TODAY)).toBe(TODAY);
    expect(resolveHistoryDate('2099-01-01', TODAY)).toBe(TODAY);
  });

  it('falls back to today rather than erroring on junk', () => {
    expect(resolveHistoryDate('2026-02-30', TODAY)).toBe(TODAY);
    expect(resolveHistoryDate('../../etc/passwd', TODAY)).toBe(TODAY);
  });
});

describe('adjacentDay', () => {
  const FIRST = '2026-06-05';

  it('steps one calendar day, not to the next day with activity', () => {
    expect(adjacentDay('2026-08-20', -1, TODAY, FIRST)).toBe('2026-08-19');
    expect(adjacentDay('2026-08-20', 1, TODAY, FIRST)).toBe('2026-08-21');
  });

  it('lands on empty days — a rest day is part of the history', () => {
    // Walking back from the 24th reaches the 23rd even with nothing logged on it.
    expect(adjacentDay('2026-08-24', -1, TODAY, FIRST)).toBe('2026-08-23');
    expect(adjacentDay('2026-08-23', -1, TODAY, FIRST)).toBe('2026-08-22');
  });

  it('stops going forward at today', () => {
    expect(adjacentDay(TODAY, 1, TODAY, FIRST)).toBeNull();
    // A day past today (shouldn't happen — resolveHistoryDate clamps) still stops.
    expect(adjacentDay('2026-09-01', 1, TODAY, FIRST)).toBeNull();
    expect(adjacentDay('2026-08-25', 1, TODAY, FIRST)).toBe(TODAY);
  });

  it('stops going back at the first logged day', () => {
    expect(adjacentDay(FIRST, -1, TODAY, FIRST)).toBeNull();
    expect(adjacentDay('2026-06-06', -1, TODAY, FIRST)).toBe(FIRST);
    expect(adjacentDay('2026-01-01', -1, TODAY, FIRST)).toBeNull();
  });

  it('disables the back arrow entirely when nothing has ever been logged', () => {
    expect(adjacentDay(TODAY, -1, TODAY, undefined)).toBeNull();
    expect(adjacentDay(TODAY, 1, TODAY, undefined)).toBeNull();
  });

  it('crosses month and year boundaries', () => {
    expect(adjacentDay('2026-08-01', -1, TODAY, FIRST)).toBe('2026-07-31');
    expect(adjacentDay('2026-07-31', 1, TODAY, FIRST)).toBe('2026-08-01');
    expect(adjacentDay('2026-01-01', -1, '2026-08-26', '2025-01-01')).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(adjacentDay('2024-03-01', -1, '2024-12-31', '2024-01-01')).toBe('2024-02-29');
    expect(adjacentDay('2024-02-29', 1, '2024-12-31', '2024-01-01')).toBe('2024-03-01');
  });
});

describe('adjacentActivityDay', () => {
  const days = ['2026-08-03', '2026-08-10', '2026-08-11', '2026-08-25'];

  // Powers the empty state's "jump to the last session before this" link, so a
  // long gap doesn't have to be stepped one day at a time.
  it('skips empty days to reach the nearest one with activity', () => {
    expect(adjacentActivityDay(days, '2026-08-25', -1)).toBe('2026-08-11');
    expect(adjacentActivityDay(days, '2026-08-11', -1)).toBe('2026-08-10');
    expect(adjacentActivityDay(days, '2026-08-10', 1)).toBe('2026-08-11');
  });

  it('works from a day that has no activity of its own', () => {
    expect(adjacentActivityDay(days, TODAY, -1)).toBe('2026-08-25');
    expect(adjacentActivityDay(days, '2026-08-15', -1)).toBe('2026-08-11');
    expect(adjacentActivityDay(days, '2026-08-15', 1)).toBe('2026-08-25');
  });

  it('is strict — the current day is never its own neighbour', () => {
    expect(adjacentActivityDay(['2026-08-25'], '2026-08-25', -1)).toBeNull();
    expect(adjacentActivityDay(['2026-08-25'], '2026-08-25', 1)).toBeNull();
  });

  it('returns null at either end so the arrows can disable', () => {
    expect(adjacentActivityDay(days, '2026-08-03', -1)).toBeNull();
    expect(adjacentActivityDay(days, '2026-08-25', 1)).toBeNull();
    expect(adjacentActivityDay([], TODAY, -1)).toBeNull();
  });

  it('does not require sorted input', () => {
    expect(adjacentActivityDay(['2026-08-25', '2026-08-03', '2026-08-11'], '2026-08-25', -1))
      .toBe('2026-08-11');
  });

  it('crosses month and year boundaries', () => {
    expect(adjacentActivityDay(['2025-12-31'], '2026-01-01', -1)).toBe('2025-12-31');
    expect(adjacentActivityDay(['2026-01-01'], '2025-12-31', 1)).toBe('2026-01-01');
  });
});

describe('dayLabel', () => {
  it('names the recent days rather than making you read the date', () => {
    expect(dayLabel(TODAY, TODAY)).toBe('Today');
    expect(dayLabel('2026-08-25', TODAY)).toBe('Yesterday');
  });

  it('falls back to the weekday', () => {
    expect(dayLabel('2026-08-24', TODAY)).toBe('Monday');
    expect(dayLabel('2026-08-23', TODAY)).toBe('Sunday');
    expect(dayLabel('2026-01-04', TODAY)).toBe('Sunday');
  });

  it('handles a month boundary for "Yesterday"', () => {
    expect(dayLabel('2026-07-31', '2026-08-01')).toBe('Yesterday');
  });
});
