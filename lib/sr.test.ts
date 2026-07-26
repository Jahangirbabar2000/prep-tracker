import { describe, it, expect } from 'vitest';
import { computeNextDue } from './sr';

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
