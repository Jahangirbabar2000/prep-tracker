import { describe, it, expect } from 'vitest';
import { computeLoggedSessionTime } from './studyVelocity';

/** Attempt finished at `mins` past 12:00 local, with a logged solve time. */
function at(mins: number, timeTakenMins: number) {
  const h = 12 + Math.floor(mins / 60);
  const m = mins % 60;
  return {
    attemptedAt: `2026-09-01 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
    timeTakenMins,
  };
}

describe('computeLoggedSessionTime — between-question average', () => {
  it('averages the surplus over the gaps used, not over attempts', () => {
    // Gaps of 10 and 12 min; next solves are 5 and 2 min, so surplus 5 + 10.
    const r = computeLoggedSessionTime([at(0, 4), at(10, 5), at(22, 2)]);
    expect(r.gapSampleSize).toBe(2);
    expect(r.betweenMins).toBe(15);
    expect(r.avgBetweenSeconds).toBe((15 * 60) / 2);
  });

  it('excludes long breaks from both the total and the average', () => {
    // 40-min gap is a break; only the 10-min gap (surplus 5) is counted.
    const r = computeLoggedSessionTime([at(0, 4), at(10, 5), at(50, 3)]);
    expect(r.breaksDropped).toBe(1);
    expect(r.gapSampleSize).toBe(1);
    expect(r.avgBetweenSeconds).toBe(5 * 60);
  });

  it('is 0 when there are no usable gaps', () => {
    expect(computeLoggedSessionTime([at(0, 4)]).avgBetweenSeconds).toBe(0);
    // Both gaps are breaks -> no sample.
    expect(computeLoggedSessionTime([at(0, 4), at(90, 3)]).avgBetweenSeconds).toBe(0);
  });
});
