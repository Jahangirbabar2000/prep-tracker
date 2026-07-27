import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-07-24T09:00:00', '2026-07-25T10:00:00', '2026-07-26T08:00:00'], '2026-07-26')).toBe(3);
  });

  it('collapses multiple attempts on the same day', () => {
    expect(computeStreak(['2026-07-26T08:00:00', '2026-07-26T20:00:00'], '2026-07-26')).toBe(1);
  });

  it('keeps the streak alive when today has no attempt yet (counts from yesterday)', () => {
    expect(computeStreak(['2026-07-24T09:00:00', '2026-07-25T10:00:00'], '2026-07-26')).toBe(2);
  });

  it('breaks when the most recent activity is older than yesterday', () => {
    expect(computeStreak(['2026-07-20T09:00:00'], '2026-07-26')).toBe(0);
  });

  it('stops at the first gap', () => {
    // 26, 25 present, 24 missing, 23 present -> streak is 2
    expect(computeStreak(['2026-07-23T09:00:00', '2026-07-25T09:00:00', '2026-07-26T09:00:00'], '2026-07-26')).toBe(2);
  });

  it('returns 0 with no attempts', () => {
    expect(computeStreak([], '2026-07-26')).toBe(0);
  });
});
