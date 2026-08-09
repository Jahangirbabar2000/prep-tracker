import { describe, it, expect } from 'vitest';
import {
  addDays,
  buildForecastWeeks,
  daysBetween,
  dayOfWeek,
  totalUpcoming,
  weekRangeLabel,
  UPCOMING_MAX_WEEKS,
} from './upcoming';

const TODAY = '2026-08-09'; // a Sunday

describe('date key helpers', () => {
  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-08-09', 1)).toBe('2026-08-10');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('survives a DST transition (US spring forward is 2026-03-08)', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-03-01', '2026-03-15')).toBe(14);
  });

  it('measures signed day distance', () => {
    expect(daysBetween(TODAY, '2026-08-16')).toBe(7);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
    expect(daysBetween('2026-08-16', TODAY)).toBe(-7);
  });

  it('reports weekdays', () => {
    expect(dayOfWeek('2026-08-09')).toBe(0);
    expect(dayOfWeek('2026-08-10')).toBe(1);
    expect(dayOfWeek('2026-08-15')).toBe(6);
  });
});

describe('weekRangeLabel', () => {
  it('collapses the month when the week stays inside one', () => {
    expect(weekRangeLabel('2026-08-17', '2026-08-23')).toBe('Aug 17 – 23');
  });

  it('names both months when the week crosses over', () => {
    expect(weekRangeLabel('2026-08-31', '2026-09-06')).toBe('Aug 31 – Sep 6');
  });
});

describe('buildForecastWeeks', () => {
  it('returns no weeks when nothing is upcoming', () => {
    expect(buildForecastWeeks([], TODAY)).toEqual([]);
    expect(totalUpcoming([])).toBe(0);
  });

  it('builds the first week starting tomorrow', () => {
    const weeks = buildForecastWeeks(
      [{ date: '2026-08-10', domain: 'dsa', count: 3 }],
      TODAY,
    );
    expect(weeks).toHaveLength(1);
    expect(weeks[0].label).toBe('Next 7 days');
    expect(weeks[0].startKey).toBe('2026-08-10');
    expect(weeks[0].endKey).toBe('2026-08-16');
    expect(weeks[0].slots.map(s => s.shortLabel)).toEqual([
      'Tmrw', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ]);
    expect(weeks[0].slots[0].label).toBe('Tomorrow');
    expect(weeks[0].slots[1].label).toBe('Tue, Aug 11');
  });

  it('aggregates counts per day, per domain, and per week', () => {
    const weeks = buildForecastWeeks(
      [
        { date: '2026-08-10', domain: 'dsa', count: 2 },
        { date: '2026-08-10', domain: 'backend', count: 5 },
        { date: '2026-08-12', domain: 'dsa', count: 1 },
        { date: '2026-08-20', domain: 'backend', count: 4 },
      ],
      TODAY,
    );

    expect(weeks).toHaveLength(2);
    expect(weeks[0].slots[0].total).toBe(7);
    expect(weeks[0].slots[0].domains).toEqual({ dsa: 2, backend: 5 });
    expect(weeks[0].slots[1].total).toBe(0);
    expect(weeks[0].total).toBe(8);
    expect(weeks[0].domainTotals).toEqual({ dsa: 3, backend: 5 });

    expect(weeks[1].label).toBe('Aug 17 – 23');
    expect(weeks[1].total).toBe(4);
    expect(weeks[1].domainTotals).toEqual({ backend: 4 });
    expect(totalUpcoming(weeks)).toBe(12);
  });

  it('pages far enough to reach the furthest due date', () => {
    const weeks = buildForecastWeeks(
      [
        { date: '2026-08-10', domain: 'dsa', count: 1 },
        { date: '2026-09-01', domain: 'dsa', count: 1 },
      ],
      TODAY,
    );
    // Sep 1 is 23 days out → week index 3 (Aug 31 – Sep 6).
    expect(weeks).toHaveLength(4);
    expect(weeks[3].startKey).toBe('2026-08-31');
    expect(weeks[3].total).toBe(1);
    // Intervening weeks are still rendered, just empty.
    expect(weeks[1].total).toBe(0);
    expect(weeks[2].total).toBe(0);
  });

  it('caps the number of pages for far-future cards', () => {
    const weeks = buildForecastWeeks(
      [{ date: '2027-08-09', domain: 'dsa', count: 1 }],
      TODAY,
    );
    expect(weeks).toHaveLength(UPCOMING_MAX_WEEKS);
    expect(buildForecastWeeks([{ date: '2027-08-09', domain: 'dsa', count: 1 }], TODAY, 2))
      .toHaveLength(2);
  });

  it('ignores rows that are due today or earlier', () => {
    const weeks = buildForecastWeeks(
      [
        { date: TODAY, domain: 'dsa', count: 9 },
        { date: '2026-08-01', domain: 'dsa', count: 4 },
        { date: '2026-08-11', domain: 'dsa', count: 2 },
      ],
      TODAY,
    );
    expect(weeks).toHaveLength(1);
    expect(totalUpcoming(weeks)).toBe(2);
  });
});
