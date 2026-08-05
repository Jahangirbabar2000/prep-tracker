import { describe, it, expect } from 'vitest';
import { reviewQueue, matchesProficiency, todayStats } from './queries';
import type { StoreData } from './store';
import type { Problem, Attempt } from '@/lib/types';
import { LEGACY_DOMAIN_FALLBACKS } from '@/lib/domains';

const TODAY = '2026-07-26';

function problem(over: Partial<Problem> & { id: number }): Problem {
  return {
    name: `P${over.id}`,
    domain: 'dsa',
    interval_level: 0,
    created_at: `${TODAY}T00:00:00`,
    ...over,
  } as Problem;
}

function attempt(over: Partial<Attempt> & { id: number; problem_id: number }): Attempt {
  return {
    attempted_at: `${TODAY}T09:00:00`,
    time_taken_mins: 10,
    struggled: 0,
    ...over,
  } as Attempt;
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

describe('reviewQueue', () => {
  it('includes only attempted problems that are due on or before today', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-20' }),        // overdue, attempted -> in
        problem({ id: 2, next_due_date: '2026-07-30' }),        // future -> out
        problem({ id: 3, next_due_date: '2026-07-26' }),        // due today, attempted -> in
        problem({ id: 4, next_due_date: null }),                 // never scheduled -> out
        problem({ id: 5, next_due_date: '2026-07-01' }),        // overdue but NO attempt -> out
      ],
      [
        attempt({ id: 10, problem_id: 1 }),
        attempt({ id: 30, problem_id: 3 }),
      ],
    );
    const q = reviewQueue(data, TODAY);
    expect(q.map(i => i.id)).toEqual([1, 3]); // most overdue first
  });

  it('computes attempt_count, last_struggled and days_overdue', () => {
    const data = store(
      [problem({ id: 1, next_due_date: '2026-07-20' })],
      [
        attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00', struggled: 0 }),
        attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-15T09:00:00', struggled: 1 }),
      ],
    );
    const [item] = reviewQueue(data, TODAY);
    expect(item.attempt_count).toBe(2);
    expect(item.last_struggled).toBe(1);              // newest attempt wins
    expect(item.last_attempted_at).toBe('2026-07-15T09:00:00');
    expect(item.days_overdue).toBe(6);                 // 07-26 minus 07-20
  });

  it('orders by due date ascending (most overdue first)', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-25' }),
        problem({ id: 2, next_due_date: '2026-07-10' }),
        problem({ id: 3, next_due_date: '2026-07-24' }),
      ],
      [attempt({ id: 1, problem_id: 1 }), attempt({ id: 2, problem_id: 2 }), attempt({ id: 3, problem_id: 3 })],
    );
    expect(reviewQueue(data, TODAY).map(i => i.id)).toEqual([2, 3, 1]);
  });
});

describe('matchesProficiency', () => {
  it('distinguishes New (never scheduled) from Struggling (scheduled at level 0)', () => {
    expect(matchesProficiency(problem({ id: 1, interval_level: 0, next_due_date: null }), 'New')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 0, next_due_date: '2026-07-30' }), 'New')).toBe(false);
    expect(matchesProficiency(problem({ id: 1, interval_level: 0, next_due_date: '2026-07-30' }), 'Struggling')).toBe(true);
  });

  it('maps interval levels 1/2/3/4 to Learning/Familiar/Confident/Mastered', () => {
    expect(matchesProficiency(problem({ id: 1, interval_level: 1 }), 'Learning')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 2 }), 'Familiar')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 3 }), 'Confident')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 4 }), 'Mastered')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 3 }), 'Mastered')).toBe(false);
  });

  it('an unknown/empty filter matches everything', () => {
    expect(matchesProficiency(problem({ id: 1, interval_level: 2 }), '')).toBe(true);
  });
});

describe('todayStats', () => {
  it('counts a first-ever-today attempt as "added" and a due item as "due"', () => {
    const data = store(
      [
        problem({ id: 1, domain: 'dsa', next_due_date: '2026-07-20' }),          // due today
        problem({ id: 2, domain: 'ai', next_due_date: '2026-07-30' }),           // added today, not due
      ],
      [
        attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00' }),  // earlier attempt -> not "added" today
        attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-26T09:00:00' }),
        attempt({ id: 3, problem_id: 2, attempted_at: '2026-07-26T10:00:00' }),  // first ever, today -> added
      ],
    );
    const { counts, due } = todayStats(data, TODAY);
    expect(counts.ai).toBe(1);   // problem 2 added today
    expect(counts.dsa).toBe(0);  // problem 1 had an earlier attempt
    expect(due.dsa).toBe(1);     // problem 1 is due
    expect(due.ai).toBe(0);      // problem 2 not due yet
  });
});
