import { describe, it, expect } from 'vitest';
import {
  activeCards, compareByDueDate, forecast, historyBuckets, matchesProficiency,
  reviewQueue, todayStats, toQueueItem,
} from './queries';
import type { StoreData } from './store';
import type { Problem, Attempt, StudyDomain } from '@/lib/types';
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

function store(
  problems: Problem[],
  attempts: Attempt[],
  domains: StudyDomain[] = LEGACY_DOMAIN_FALLBACKS,
): StoreData {
  return {
    problems,
    attempts,
    notes: [],
    links: [],
    config_options: [],
    domains,
    domain_fields: [],
    domain_field_options: [],
  };
}

/** The standard domains with some archived — archiving never touches the cards. */
function archiving(...ids: string[]): StudyDomain[] {
  return LEGACY_DOMAIN_FALLBACKS.map(domain =>
    ids.includes(domain.id) ? { ...domain, archived_at: '2026-07-25T12:00:00Z' } : domain,
  );
}

describe('reviewQueue', () => {
  it('includes every problem due on or before today, attempted or not', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-20' }),        // overdue, attempted -> in
        problem({ id: 2, next_due_date: '2026-07-30' }),        // future -> out
        problem({ id: 3, next_due_date: '2026-07-26' }),        // due today, attempted -> in
        problem({ id: 4, next_due_date: null }),                 // never scheduled -> out
        problem({ id: 5, next_due_date: '2026-07-01' }),        // overdue, never attempted -> in
      ],
      [
        attempt({ id: 10, problem_id: 1 }),
        attempt({ id: 30, problem_id: 3 }),
      ],
    );
    const q = reviewQueue(data, TODAY);
    expect(q.map(i => i.id)).toEqual([5, 1, 3]); // most overdue first
  });

  // The point of scheduling a brand-new card one day out: it shows up the day
  // after it was added, with no attempt and no synthetic first attempt.
  it('admits a just-added card on its due date and not before', () => {
    const data = store([problem({ id: 1, next_due_date: TODAY, interval_level: 0 })], []);
    expect(reviewQueue(data, '2026-07-25').map(i => i.id)).toEqual([]);
    const [item] = reviewQueue(data, TODAY);
    expect(item.id).toBe(1);
    expect(item.attempt_count).toBe(0);
    expect(item.last_attempted_at).toBe('');
    expect(item.days_overdue).toBe(0);
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

// toQueueItem is what lets practice sets carry cards reviewQueue can never
// return: no attempts, no due date, or a due date still in the future.
describe('toQueueItem', () => {
  it('reports empty attempt fields for a card that has never been attempted', () => {
    const p = problem({ id: 1, next_due_date: null });
    const item = toQueueItem(store([p], []), p, TODAY);
    expect(item.attempt_count).toBe(0);
    expect(item.last_attempted_at).toBe('');
    expect(item.last_struggled).toBe(0);
  });

  it('reports a NEGATIVE days_overdue for a card due in the future', () => {
    const p = problem({ id: 1, next_due_date: '2026-07-30' }); // TODAY + 4
    expect(toQueueItem(store([p], []), p, TODAY).days_overdue).toBe(-4);
  });

  it('reports days_overdue 0 for a card that was never scheduled', () => {
    const p = problem({ id: 1, next_due_date: null });
    expect(toQueueItem(store([p], []), p, TODAY).days_overdue).toBe(0);
  });

  it('takes last_struggled from the newest attempt, not the worst one', () => {
    const p = problem({ id: 1, next_due_date: '2026-07-20' });
    const data = store([p], [
      attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00', struggled: 1 }),
      attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-15T09:00:00', struggled: 0 }),
    ]);
    const item = toQueueItem(data, p, TODAY);
    expect(item.attempt_count).toBe(2);
    expect(item.last_struggled).toBe(0);
    expect(item.last_attempted_at).toBe('2026-07-15T09:00:00');
  });
});

describe('compareByDueDate', () => {
  it('sorts cards with no due date last, in BOTH directions', () => {
    const scheduled = problem({ id: 1, next_due_date: '2026-07-20' });
    const unscheduled = problem({ id: 2, next_due_date: null });
    for (const order of ['overdue', 'due-soon'] as const) {
      expect(compareByDueDate(scheduled, unscheduled, order)).toBeLessThan(0);
      expect(compareByDueDate(unscheduled, scheduled, order)).toBeGreaterThan(0);
    }
  });

  it('breaks ties between two unscheduled cards on id, so the sort stays total', () => {
    const a = problem({ id: 1, next_due_date: null });
    const b = problem({ id: 2, next_due_date: null });
    expect(compareByDueDate(a, b, 'overdue')).toBeLessThan(0);
    expect(compareByDueDate(b, a, 'overdue')).toBeGreaterThan(0);
    expect(compareByDueDate(a, a, 'overdue')).toBe(0);
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
  it('counts a card created today as "added" and a card whose due date arrived as "due"', () => {
    const data = store(
      [
        // Created earlier, due today -> "due", NOT "added".
        problem({ id: 1, domain: 'dsa', created_at: '2026-07-10T09:00:00', next_due_date: '2026-07-20' }),
        // Created today, studied today, scheduled ahead -> "added", not yet "due".
        problem({ id: 2, domain: 'ai', next_due_date: '2026-07-30' }),
      ],
      [
        attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00' }),
        attempt({ id: 2, problem_id: 1, attempted_at: '2026-07-26T09:00:00' }),
        attempt({ id: 3, problem_id: 2, attempted_at: '2026-07-26T10:00:00' }),
      ],
    );
    const { counts, due } = todayStats(data, TODAY);
    expect(counts.ai).toBe(1);
    expect(counts.dsa).toBe(0);
    expect(due.dsa).toBe(1);
    expect(due.ai).toBe(0);
  });

  // The regression that motivated counting created_at: seeded cards have zero
  // attempts, so a "first attempt today" rule reported 0 for a batch just added.
  it('counts a freshly seeded card — zero attempts, scheduled for tomorrow', () => {
    const data = store(
      [problem({ id: 1, domain: 'lld', next_due_date: '2026-07-27' })],
      [],
    );
    const { counts, due } = todayStats(data, TODAY);
    expect(counts.lld).toBe(1);
    expect(due.lld).toBe(0);
  });
});

describe('archived domains', () => {
  // The same three cards every time: archiving is the only variable.
  const problems = [
    problem({ id: 1, domain: 'dsa', next_due_date: '2026-07-20' }),  // overdue
    problem({ id: 2, domain: 'ai',  next_due_date: TODAY }),         // due today
    problem({ id: 3, domain: 'ai',  next_due_date: '2026-07-30' }),  // upcoming
  ];

  it('keeps every card while the domains are active', () => {
    const data = store(problems, []);
    expect(reviewQueue(data, TODAY).map(i => i.id)).toEqual([1, 2]);
    expect(todayStats(data, TODAY).due).toMatchObject({ dsa: 1, ai: 1 });
    expect(forecast(data, TODAY, '2026-08-30')).toEqual([
      { date: '2026-07-30', domain: 'ai', count: 1 },
    ]);
  });

  it('drops the archived domain from the queue, the due counts and the forecast', () => {
    const data = store(problems, [], archiving('ai'));
    expect(reviewQueue(data, TODAY).map(i => i.id)).toEqual([1]);
    expect(todayStats(data, TODAY).due).toMatchObject({ dsa: 1, ai: 0 });
    expect(forecast(data, TODAY, '2026-08-30')).toEqual([]);
  });

  it('leaves the cards untouched, so restoring the domain restores the queue', () => {
    const archived = store(problems, [], archiving('ai'));
    expect(reviewQueue(archived, TODAY).map(i => i.id)).toEqual([1]);
    // Same problems, domains restored — nothing about the cards ever changed.
    expect(reviewQueue(store(archived.problems, []), TODAY).map(i => i.id)).toEqual([1, 2]);
  });

  it('treats a domain missing from the store as active, matching fallbackDomain', () => {
    const data = store([problem({ id: 9, domain: 'nope', next_due_date: TODAY })], [], archiving('ai'));
    expect(reviewQueue(data, TODAY).map(i => i.id)).toEqual([9]);
  });

  it('stops counting an archived card as added today', () => {
    const cards = [problem({ id: 1, domain: 'ai', next_due_date: TODAY })];
    expect(todayStats(store(cards, []), TODAY).counts.ai).toBe(1);

    const { counts, due } = todayStats(store(cards, [], archiving('ai')), TODAY);
    expect(counts.ai).toBe(0);
    expect(due.ai).toBe(0);
  });

  it('keeps the archived cards and their attempts out of activeCards', () => {
    const attempts = [
      attempt({ id: 1, problem_id: 1 }),
      attempt({ id: 2, problem_id: 2 }),
      attempt({ id: 3, problem_id: 3 }),
    ];
    const active = activeCards(store(problems, attempts, archiving('ai')));
    expect(active.problems.map(p => p.id)).toEqual([1]);
    expect(active.attempts.map(a => a.id)).toEqual([1]);

    // Nothing was dropped from the store, so restoring the domain restores both.
    const restored = activeCards(store(problems, attempts));
    expect(restored.problems.map(p => p.id)).toEqual([1, 2, 3]);
    expect(restored.attempts.map(a => a.id)).toEqual([1, 2, 3]);
  });
});

describe('historyBuckets', () => {
  // One card reviewed today (it has an earlier attempt) and one added today, in
  // each of two domains. Archiving is the only variable.
  const problems = [
    problem({ id: 1, domain: 'dsa', created_at: '2026-07-10T09:00:00' }),
    problem({ id: 2, domain: 'dsa' }),
    problem({ id: 3, domain: 'ai', created_at: '2026-07-10T09:00:00' }),
    problem({ id: 4, domain: 'ai' }),
  ];
  const attempts = [
    attempt({ id: 1, problem_id: 1, attempted_at: '2026-07-10T09:00:00' }),
    attempt({ id: 2, problem_id: 1 }),
    attempt({ id: 3, problem_id: 2 }),
    attempt({ id: 4, problem_id: 3, attempted_at: '2026-07-10T09:00:00' }),
    attempt({ id: 5, problem_id: 3 }),
    attempt({ id: 6, problem_id: 4 }),
  ];

  it('splits today into reviewed (has an earlier attempt) and added (does not)', () => {
    const { reviewed, added } = historyBuckets(store(problems, attempts), TODAY);
    expect(reviewed.map(r => r.id)).toEqual([3, 1]);
    expect(added.map(r => r.id)).toEqual([4, 2]);
  });

  it('drops an archived domain from both buckets', () => {
    const { reviewed, added } = historyBuckets(store(problems, attempts, archiving('ai')), TODAY);
    expect(reviewed.map(r => r.id)).toEqual([1]);
    expect(added.map(r => r.id)).toEqual([2]);
  });

  it('is empty when the only activity today is in an archived domain', () => {
    const data = store(problems.slice(2), attempts.slice(3), archiving('ai'));
    expect(historyBuckets(data, TODAY)).toEqual({ reviewed: [], added: [] });
  });

  it('reports nothing when the filter names an archived domain', () => {
    const data = store(problems, attempts, archiving('ai'));
    expect(historyBuckets(data, TODAY, 'ai')).toEqual({ reviewed: [], added: [] });
    expect(historyBuckets(data, TODAY, 'dsa').added.map(r => r.id)).toEqual([2]);
  });
});
