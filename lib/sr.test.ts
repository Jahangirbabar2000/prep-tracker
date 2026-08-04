import { describe, it, expect } from 'vitest';
import { computeNextDue, replaySchedule } from './sr';

// Intervals per level: [3, 7, 14, 30] days for levels 0–3.
const at = new Date(2026, 0, 1, 12, 0, 0); // 2026-01-01, local time

describe('computeNextDue', () => {
  it('promotes one level on success and schedules the longer interval', () => {
    expect(computeNextDue(false, 0, at)).toEqual({ newLevel: 1, nextDueDate: '2026-01-08' });
    expect(computeNextDue(false, 1, at)).toEqual({ newLevel: 2, nextDueDate: '2026-01-15' });
    expect(computeNextDue(false, 2, at)).toEqual({ newLevel: 3, nextDueDate: '2026-01-31' });
  });

  it('caps the level at 3 (max interval 30 days)', () => {
    expect(computeNextDue(false, 3, at)).toEqual({ newLevel: 3, nextDueDate: '2026-01-31' });
  });

  it('demotes one level when struggled and schedules the shorter interval', () => {
    expect(computeNextDue(true, 3, at)).toEqual({ newLevel: 2, nextDueDate: '2026-01-15' });
    expect(computeNextDue(true, 1, at)).toEqual({ newLevel: 0, nextDueDate: '2026-01-04' });
  });

  it('floors the level at 0 when struggling at level 0', () => {
    expect(computeNextDue(true, 0, at)).toEqual({ newLevel: 0, nextDueDate: '2026-01-04' });
  });

  it('handles month/year rollover', () => {
    const dec = new Date(2026, 11, 20, 9, 0, 0); // 2026-12-20
    expect(computeNextDue(false, 2, dec)).toEqual({ newLevel: 3, nextDueDate: '2027-01-19' });
  });
});

describe('replaySchedule', () => {
  const a = (id: number, date: string, struggled: 0 | 1) =>
    ({ id, attempted_at: `${date} 00:00:00`, struggled });

  it('returns level 0 / null for no attempts', () => {
    expect(replaySchedule([])).toEqual({ level: 0, nextDueDate: null });
  });

  it('folds from level 0 over the ordered history', () => {
    // struggle (0), solve (→1), solve (→2): should be Familiar, due last date + 14
    const r = replaySchedule([
      a(1, '2026-06-17', 1),
      a(2, '2026-06-20', 0),
      a(3, '2026-07-15', 0),
    ]);
    expect(r).toEqual({ level: 2, nextDueDate: '2026-07-29' });
  });

  it('is order-independent of the input array (sorts by date, then id)', () => {
    const attempts = [
      a(3, '2026-07-15', 0),
      a(1, '2026-06-17', 1),
      a(2, '2026-06-20', 0),
    ];
    expect(replaySchedule(attempts)).toEqual({ level: 2, nextDueDate: '2026-07-29' });
  });

  it('re-demotes when an old attempt becomes a struggle (the drift bug)', () => {
    // Three solves would reach Confident (3); flipping the earliest to a struggle
    // must replay down to Familiar (2), not stay stuck at 3.
    const allSolves = replaySchedule([
      a(1, '2026-06-17', 0),
      a(2, '2026-06-20', 0),
      a(3, '2026-07-15', 0),
    ]);
    expect(allSolves.level).toBe(3);
    const firstStruggled = replaySchedule([
      a(1, '2026-06-17', 1),
      a(2, '2026-06-20', 0),
      a(3, '2026-07-15', 0),
    ]);
    expect(firstStruggled.level).toBe(2);
  });

  it('caps at 3 across a long success streak', () => {
    const r = replaySchedule([
      a(1, '2026-01-01', 0), a(2, '2026-01-02', 0), a(3, '2026-01-03', 0),
      a(4, '2026-01-04', 0), a(5, '2026-01-05', 0),
    ]);
    expect(r.level).toBe(3);
  });
});
