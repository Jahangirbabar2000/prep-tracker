import { describe, it, expect } from 'vitest';
import { replayAttempts, computeMetrics } from './metrics';
import type { StoreData } from './store';
import type { Attempt, Problem } from '@/lib/types';
import { LEGACY_DOMAIN_FALLBACKS } from '@/lib/domains';

const TODAY = '2026-07-26'; // sevenAgo = 2026-07-19, fourteenAgo = 2026-07-12

function attempt(over: Partial<Attempt> & { id: number; problem_id: number }): Attempt {
  return { attempted_at: `${TODAY} 09:00:00`, time_taken_mins: 10, struggled: 0, ...over } as Attempt;
}
function problem(over: Partial<Problem> & { id: number }): Problem {
  return { name: `P${over.id}`, domain: 'dsa', interval_level: 0, created_at: `${TODAY} 00:00:00`, ...over } as Problem;
}
function store(problems: Problem[], attempts: Attempt[]): StoreData {
  return {
    problems,
    attempts,
    notes: [],
    links: [],
    config_options: [],
    domains: LEGACY_DOMAIN_FALLBACKS,
    domain_fields: [],
    domain_field_options: [],
  };
}
/** Attempts for one problem across ascending days from `day`; s = struggled flags. */
function seq(problemId: number, startDay: number, struggles: number[]): Attempt[] {
  return struggles.map((s, i) =>
    attempt({ id: problemId * 100 + i, problem_id: problemId, struggled: s, attempted_at: `2026-07-${startDay + i} 09:00:00` }),
  );
}

describe('replayAttempts', () => {
  it('folds the level up on successes and flags reviews', () => {
    const r = replayAttempts(seq(1, 20, [0, 0, 0]));
    expect(r.map(x => x.levelAfter)).toEqual([1, 2, 3]);
    expect(r.map(x => x.isReview)).toEqual([false, true, true]);
    expect(r.every(x => x.isPromotion)).toBe(true);
  });

  it('does not count a capped success at level 4 (Mastered) as a promotion', () => {
    const r = replayAttempts(seq(1, 20, [0, 0, 0, 0, 0]));
    expect(r[4].levelBefore).toBe(4);
    expect(r[4].levelAfter).toBe(4);
    expect(r[4].isPromotion).toBe(false);
  });

  it('does not count a floored struggle at level 0 as a demotion', () => {
    const r = replayAttempts(seq(1, 20, [1, 1]));
    expect(r.every(x => x.levelAfter === 0)).toBe(true);
    expect(r.some(x => x.isDemotion)).toBe(false);
  });

  it('flags a lapse when struggling after reaching Familiar+', () => {
    const r = replayAttempts(seq(1, 20, [0, 0, 1])); // →1 →2 then struggle
    expect(r[2].levelBefore).toBe(2);
    expect(r[2].isLapse).toBe(true);
    expect(r[2].isDemotion).toBe(true);
    expect(r.filter(x => x.isLapse).length).toBe(1);
  });

  it('orders same-second attempts by id ascending', () => {
    const a = [
      attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-20 09:00:00' }),
      attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-20 09:00:00' }),
    ];
    const r = replayAttempts(a);
    expect(r[0].attempt.id).toBe(1);
    expect(r[1].attempt.id).toBe(2);
  });
});

describe('computeMetrics — recall & maturity', () => {
  // P1: s,s,s,s,s,x (07-20..25) → reviews idx1..5: promote,promote,promote,cap,demote
  // P2: x,x (07-20..21)         → review idx1: floored (neither)
  const data = store(
    [problem({ id: 1 }), problem({ id: 2 })],
    [...seq(1, 20, [0, 0, 0, 0, 0, 1]), ...seq(2, 20, [1, 1])],
  );
  const m = computeMetrics(data, TODAY);

  it('recall rate counts reviews only (first attempts excluded)', () => {
    expect(m.reviewCountRecent).toBe(6);      // 5 from P1 + 1 from P2
    expect(m.recallRateRecent).toBe(67);      // 4 of 6 not struggled
  });

  it('net movement excludes capped successes and floored struggles', () => {
    expect(m.promotions7d).toBe(3);
    expect(m.demotions7d).toBe(1);
    expect(m.netLevelMovement7d).toBe(2);
  });

  it('returns null recall when the window has no reviews', () => {
    const only = computeMetrics(store([problem({ id: 9 })], [attempt({ id: 1, problem_id: 9 })]), TODAY);
    expect(only.reviewCountRecent).toBe(0);
    expect(only.recallRateRecent).toBeNull();
  });
});

describe('computeMetrics — review debt', () => {
  it('counts due items with avg (incl. due-today 0) and oldest overdue', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-20' }), // 6 overdue
        problem({ id: 2, next_due_date: '2026-07-24' }), // 2 overdue
        problem({ id: 3, next_due_date: '2026-07-26' }), // due today (0)
        problem({ id: 4, next_due_date: '2026-08-01' }), // future → not due
      ],
      [attempt({ id: 1, problem_id: 1 }), attempt({ id: 2, problem_id: 2 }), attempt({ id: 3, problem_id: 3 }), attempt({ id: 4, problem_id: 4 })],
    );
    const m = computeMetrics(data, TODAY);
    expect(m.dueCount).toBe(3);
    expect(m.avgDaysOverdue).toBe(3); // round((6+2+0)/3)
    expect(m.oldestOverdueAge).toBe(6);
  });

  it('is zero when nothing is due', () => {
    const m = computeMetrics(store([problem({ id: 1, next_due_date: '2026-08-01' })], [attempt({ id: 1, problem_id: 1 })]), TODAY);
    expect(m.dueCount).toBe(0);
    expect(m.avgDaysOverdue).toBe(0);
    expect(m.oldestOverdueAge).toBe(0);
  });
});

describe('computeMetrics — leeches', () => {
  it('ranks by lapse count, most first', () => {
    const data = store(
      [problem({ id: 1 }), problem({ id: 2 })],
      [...seq(1, 20, [0, 0, 1, 0, 1]), ...seq(2, 20, [0, 0, 1])], // P1: 2 lapses, P2: 1 lapse
    );
    const m = computeMetrics(data, TODAY);
    expect(m.leechesAreFallback).toBe(false);
    expect(m.leeches.map(l => [l.id, l.lapseCount])).toEqual([[1, 2], [2, 1]]);
  });

  it('falls back to chronic strugglers (level 0, 3+ attempts) when no lapses', () => {
    const data = store([problem({ id: 1, interval_level: 0 })], seq(1, 20, [1, 1, 1]));
    const m = computeMetrics(data, TODAY);
    expect(m.leechesAreFallback).toBe(true);
    expect(m.leeches[0]).toMatchObject({ id: 1, lapseCount: 0, attemptCount: 3 });
  });
});

describe('computeMetrics — scoping & edges', () => {
  it('scopes metrics to the domain filter but keeps masteryByDomain global', () => {
    const data = store(
      [
        problem({ id: 1, domain: 'dsa', interval_level: 3 }),
        problem({ id: 2, domain: 'dsa', interval_level: 0 }),
        problem({ id: 3, domain: 'ai', interval_level: 2 }),
      ],
      [],
    );
    const m = computeMetrics(data, TODAY, 'dsa');
    expect(m.familiarPlusCount).toBe(1);            // scoped to dsa (only P1)
    expect(m.masteryByDomain).toHaveLength(7);      // always all domains
    expect(m.masteryByDomain.find(d => d.domain === 'dsa')).toMatchObject({ total: 2, familiarPlus: 1, pct: 50 });
    expect(m.masteryByDomain.find(d => d.domain === 'ai')).toMatchObject({ total: 1, familiarPlus: 1 });
  });

  it('handles an empty store without throwing', () => {
    const m = computeMetrics(store([], []), TODAY);
    expect(m.recallRateRecent).toBeNull();
    expect(m.dueCount).toBe(0);
    expect(m.streak).toBe(0);
    expect(m.leeches).toEqual([]);
    expect(m.masteryByDomain).toHaveLength(7);
  });
});

describe('computeMetrics — window boundaries & correctness', () => {
  it('splits the 7-day recent/prior windows at the right day boundaries', () => {
    // today 07-26 → recent = [07-20, 07-26], prior = [07-13, 07-19]
    const atts = [
      attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-12 09:00:00' }), // first + before prior window
      attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-13 09:00:00' }), // review, prior start
      attempt({ id: 3, problem_id: 1, attempted_at: '2026-07-19 09:00:00' }), // review, prior end
      attempt({ id: 4, problem_id: 1, attempted_at: '2026-07-20 09:00:00' }), // review, recent start
      attempt({ id: 5, problem_id: 1, attempted_at: '2026-07-26 09:00:00' }), // review, recent (today)
    ];
    const m = computeMetrics(store([problem({ id: 1 })], atts), TODAY);
    expect(m.reviewCountPrior).toBe(2);  // 07-13, 07-19
    expect(m.reviewCountRecent).toBe(2); // 07-20, 07-26 (07-12 is the first attempt, excluded)
  });

  it('computes the prior-window recall rate independently of the recent one', () => {
    const atts = [
      attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-13 09:00:00' }),               // first (not a review)
      attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-14 09:00:00', struggled: 1 }),  // review, prior, struggled
      attempt({ id: 3, problem_id: 1, attempted_at: '2026-07-15 09:00:00' }),               // review, prior, ok
    ];
    const m = computeMetrics(store([problem({ id: 1 })], atts), TODAY);
    expect(m.reviewCountPrior).toBe(2);
    expect(m.recallRatePrior).toBe(50);      // 1 of 2 not struggled
    expect(m.recallRateRecent).toBeNull();   // nothing in the recent window
  });

  it('scopes recall and review debt to the domain filter', () => {
    const data = store(
      [
        problem({ id: 1, domain: 'dsa', next_due_date: '2026-07-20' }),
        problem({ id: 2, domain: 'ai', next_due_date: '2026-07-20' }),
      ],
      [...seq(1, 20, [0, 0, 0]), ...seq(2, 20, [0, 0, 1])], // dsa reviews all pass; ai has a struggled review
    );
    const all = computeMetrics(data, TODAY);
    const dsa = computeMetrics(data, TODAY, 'dsa');
    expect(all.dueCount).toBe(2);
    expect(dsa.dueCount).toBe(1);
    expect(dsa.recallRateRecent).toBe(100);          // only dsa reviews (both pass)
    expect(all.recallRateRecent!).toBeLessThan(100); // ai's struggle drags the global rate down
  });

  it('buckets reviews per day (oldest -> today) for the sparkline', () => {
    // recentStart = 07-20; days [07-20 .. 07-26]
    const atts = [
      attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-19 09:00:00' }), // first, before window
      attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-20 09:00:00' }), // review, day 0
      attempt({ id: 3, problem_id: 1, attempted_at: '2026-07-26 09:00:00' }), // review, day 6
    ];
    const m = computeMetrics(store([problem({ id: 1 })], atts), TODAY);
    expect(m.reviewsByDay7d).toEqual([1, 0, 0, 0, 0, 0, 1]);
    expect(m.reviewsByDay7d.reduce((a, b) => a + b, 0)).toBe(m.reviewsCompleted7d);
  });

  it('computes mastery % per domain with rounding, over all attempts', () => {
    const data = store(
      [
        problem({ id: 1, domain: 'dsa', interval_level: 2 }),
        problem({ id: 2, domain: 'dsa', interval_level: 0 }),
        problem({ id: 3, domain: 'dsa', interval_level: 0 }),
      ],
      [attempt({ id: 1, problem_id: 1 }), attempt({ id: 2, problem_id: 1 })],
    );
    const dsa = computeMetrics(data, TODAY).masteryByDomain.find(d => d.domain === 'dsa')!;
    expect(dsa).toMatchObject({ total: 3, familiarPlus: 1, pct: 33, attempts: 2 }); // round(1/3*100)
  });
});
