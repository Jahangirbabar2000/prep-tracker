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
    // Ascending is the default — the explicit form must match the implicit one.
    expect(reviewQueue(data, TODAY, 'overdue')).toEqual(reviewQueue(data, TODAY));
  });

  it('orders by due date descending when asked for least overdue first', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-25' }),
        problem({ id: 2, next_due_date: '2026-07-10' }),
        problem({ id: 3, next_due_date: '2026-07-24' }),
      ],
      [attempt({ id: 1, problem_id: 1 }), attempt({ id: 2, problem_id: 2 }), attempt({ id: 3, problem_id: 3 })],
    );
    expect(reviewQueue(data, TODAY, 'due-soon').map(i => i.id)).toEqual([1, 3, 2]);
  });

  it('breaks same-due-date ties by id ascending in BOTH directions', () => {
    // Only the due-date axis flips; cards sharing a day keep a stable, defined
    // order either way (they used to depend on incidental store order).
    const data = store(
      [
        problem({ id: 2, next_due_date: '2026-07-20' }),
        problem({ id: 1, next_due_date: '2026-07-20' }),
        problem({ id: 3, next_due_date: '2026-07-10' }),
      ],
      [attempt({ id: 1, problem_id: 1 }), attempt({ id: 2, problem_id: 2 }), attempt({ id: 3, problem_id: 3 })],
    );
    expect(reviewQueue(data, TODAY, 'overdue').map(i => i.id)).toEqual([3, 1, 2]);
    expect(reviewQueue(data, TODAY, 'due-soon').map(i => i.id)).toEqual([1, 2, 3]);
  });

  it('changes only the order — never membership or derived fields', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-25' }),
        problem({ id: 2, next_due_date: '2026-07-10' }),
        problem({ id: 3, next_due_date: '2026-07-30' }), // not due -> out of both
      ],
      [
        attempt({ id: 1, problem_id: 1 }),
        attempt({ id: 2, problem_id: 2 }),
        attempt({ id: 3, problem_id: 2, attempted_at: '2026-07-11T09:00:00' }),
      ],
    );
    const asc = reviewQueue(data, TODAY, 'overdue');
    const desc = reviewQueue(data, TODAY, 'due-soon');
    expect([...desc].reverse()).toEqual(asc);
    expect(desc.find(i => i.id === 2)).toEqual(asc.find(i => i.id === 2));
  });
});

describe('matchesProficiency', () => {
  it('distinguishes New from Struggling by attempt count, not by having a due date', () => {
    const unscheduled = problem({ id: 1, interval_level: 0, next_due_date: null });
    const loggedOnce = problem({ id: 1, interval_level: 0, next_due_date: '2026-07-30' });
    expect(matchesProficiency(unscheduled, 'New', 0)).toBe(true);
    // A first log now always sets a due date — that alone must not read Struggling.
    expect(matchesProficiency(loggedOnce, 'New', 1)).toBe(true);
    expect(matchesProficiency(loggedOnce, 'Struggling', 1)).toBe(false);
    expect(matchesProficiency(loggedOnce, 'Struggling', 2)).toBe(true);
    expect(matchesProficiency(loggedOnce, 'New', 2)).toBe(false);
  });

  it('maps interval levels 1–5 to Learning/Familiar/Proficient/Confident/Mastered', () => {
    expect(matchesProficiency(problem({ id: 1, interval_level: 1 }), 'Learning')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 2 }), 'Familiar')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 3 }), 'Proficient')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 4 }), 'Confident')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 5 }), 'Mastered')).toBe(true);
    expect(matchesProficiency(problem({ id: 1, interval_level: 4 }), 'Mastered')).toBe(false);
  });

  it('an unknown/empty filter matches everything', () => {
    expect(matchesProficiency(problem({ id: 1, interval_level: 2 }), '')).toBe(true);
  });

  it('falls back to the item\'s own attempt_count when none is passed', () => {
    const struggling = problem({
      id: 1, interval_level: 0, next_due_date: '2026-07-20', attempt_count: 3,
    });
    // Omitting the count used to default it to 0, which made Struggling
    // unmatchable — the review session filtered itself down to nothing.
    expect(matchesProficiency(struggling, 'Struggling')).toBe(true);
    expect(matchesProficiency(struggling, 'New')).toBe(false);
  });

  it('filters a real queue down to the struggling cards (session start path)', () => {
    const data = store(
      [
        problem({ id: 1, interval_level: 0, next_due_date: '2026-07-20' }), // struggling: 2 attempts
        problem({ id: 2, interval_level: 0, next_due_date: '2026-07-22' }), // logged once -> New
        problem({ id: 3, interval_level: 3, next_due_date: '2026-07-21' }), // Proficient
      ],
      [
        attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00', struggled: 1 }),
        attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-15T09:00:00', struggled: 1 }),
        attempt({ id: 3, problem_id: 2, attempted_at: '2026-07-15T09:00:00' }),
        attempt({ id: 4, problem_id: 3, attempted_at: '2026-07-15T09:00:00' }),
      ],
    );
    const queue = reviewQueue(data, TODAY);
    expect(queue.filter(it => matchesProficiency(it, 'Struggling')).map(i => i.id)).toEqual([1]);
    expect(queue.filter(it => matchesProficiency(it, 'New')).map(i => i.id)).toEqual([2]);
    expect(queue.filter(it => matchesProficiency(it, 'Proficient')).map(i => i.id)).toEqual([3]);
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
