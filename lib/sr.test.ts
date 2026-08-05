import { describe, it, expect } from 'vitest';
import { computeNextDue, replaySchedule, intervalForLevel, MAX_LEVEL } from './sr';

// Intervals per level: [1, 3, 7, 14, 30, 60] days for levels 0–5.
const at = new Date(2026, 0, 1, 12, 0, 0); // 2026-01-01, local time

describe('intervalForLevel', () => {
  it('maps each level to its interval and clamps out-of-range input', () => {
    expect([0, 1, 2, 3, 4, 5].map(intervalForLevel)).toEqual([1, 3, 7, 14, 30, 60]);
    expect(intervalForLevel(-1)).toBe(1);
    expect(intervalForLevel(99)).toBe(60);
    expect(MAX_LEVEL).toBe(5);
  });
});

describe('computeNextDue', () => {
  it('promotes one level on success and schedules the longer interval', () => {
    expect(computeNextDue(false, 0, at)).toEqual({ newLevel: 1, nextDueDate: '2026-01-04' });
    expect(computeNextDue(false, 1, at)).toEqual({ newLevel: 2, nextDueDate: '2026-01-08' });
    expect(computeNextDue(false, 2, at)).toEqual({ newLevel: 3, nextDueDate: '2026-01-15' });
    expect(computeNextDue(false, 3, at)).toEqual({ newLevel: 4, nextDueDate: '2026-01-31' });
    expect(computeNextDue(false, 4, at)).toEqual({ newLevel: 5, nextDueDate: '2026-03-02' });
  });

  it('caps the level at 5 (max interval 60 days)', () => {
    expect(computeNextDue(false, 5, at)).toEqual({ newLevel: 5, nextDueDate: '2026-03-02' });
  });

  it('demotes one level when struggled and schedules the shorter interval', () => {
    expect(computeNextDue(true, 5, at)).toEqual({ newLevel: 4, nextDueDate: '2026-01-31' });
    expect(computeNextDue(true, 2, at)).toEqual({ newLevel: 1, nextDueDate: '2026-01-04' });
    expect(computeNextDue(true, 1, at)).toEqual({ newLevel: 0, nextDueDate: '2026-01-02' });
  });

  it('floors the level at 0 and comes back the next day', () => {
    expect(computeNextDue(true, 0, at)).toEqual({ newLevel: 0, nextDueDate: '2026-01-02' });
  });

  it('handles month/year rollover', () => {
    const dec = new Date(2026, 11, 20, 9, 0, 0); // 2026-12-20
    expect(computeNextDue(false, 3, dec)).toEqual({ newLevel: 4, nextDueDate: '2027-01-19' });
  });
});

describe('replaySchedule', () => {
  const a = (id: number, date: string, struggled: 0 | 1) =>
    ({ id, attempted_at: `${date} 00:00:00`, struggled });

  it('returns level 0 / null for no attempts', () => {
    expect(replaySchedule([])).toEqual({ level: 0, nextDueDate: null });
  });

  it('puts the first review one day out, however the first attempt went', () => {
    expect(replaySchedule([a(1, '2026-06-17', 0)])).toEqual({ level: 0, nextDueDate: '2026-06-18' });
    expect(replaySchedule([a(1, '2026-06-17', 1)])).toEqual({ level: 0, nextDueDate: '2026-06-18' });
  });

  it('folds from level 0 over the ordered history', () => {
    // first (→0), solve (→1), solve (→2): due last date + 7
    const r = replaySchedule([
      a(1, '2026-06-17', 1),
      a(2, '2026-06-20', 0),
      a(3, '2026-07-15', 0),
    ]);
    expect(r).toEqual({ level: 2, nextDueDate: '2026-07-22' });
  });

  it('is order-independent of the input array (sorts by date, then id)', () => {
    const attempts = [
      a(3, '2026-07-15', 0),
      a(1, '2026-06-17', 1),
      a(2, '2026-06-20', 0),
    ];
    expect(replaySchedule(attempts)).toEqual({ level: 2, nextDueDate: '2026-07-22' });
  });

  it('re-demotes when an old attempt becomes a struggle (the drift bug)', () => {
    const allSolves = replaySchedule([
      a(1, '2026-06-17', 0), a(2, '2026-06-20', 0), a(3, '2026-07-15', 0),
    ]);
    expect(allSolves.level).toBe(2);
    const middleStruggled = replaySchedule([
      a(1, '2026-06-17', 0), a(2, '2026-06-20', 1), a(3, '2026-07-15', 0),
    ]);
    expect(middleStruggled.level).toBe(1);
  });

  it('keeps returning a struggling card the next day until it sticks', () => {
    const r = replaySchedule([
      a(1, '2026-01-01', 0), // first → level 0
      a(2, '2026-01-02', 0), // → 1
      a(3, '2026-01-05', 1), // → 0, back to daily
      a(4, '2026-01-06', 1), // floored at 0
      a(5, '2026-01-07', 1), // floored at 0
    ]);
    expect(r).toEqual({ level: 0, nextDueDate: '2026-01-08' });
  });

  it('caps at 5 (Mastered) across a long success streak', () => {
    const r = replaySchedule([
      a(1, '2026-01-01', 0), a(2, '2026-01-02', 0), a(3, '2026-01-03', 0),
      a(4, '2026-01-04', 0), a(5, '2026-01-05', 0), a(6, '2026-01-06', 0),
      a(7, '2026-01-07', 0),
    ]);
    expect(r.level).toBe(5);
  });
});
