import { describe, it, expect } from 'vitest';
import {
  buildPracticeSet, parsePracticeSpec, parsePracticeOrder, practiceHref,
  isWeakSpot, seededShuffle, fieldValuesPresent,
  PRACTICE_ORDERS, type PracticeSpec,
} from './practice';
import { reviewQueue, matchesProficiency, toQueueItem } from './store/queries';
import { QUEUE_ORDER_OPTIONS } from './filters';
import type { StoreData } from './store/store';
import type { Problem, Attempt } from '@/lib/types';
import { LEGACY_DOMAIN_FALLBACKS } from '@/lib/domains';

const TODAY = '2026-07-26';

function problem(over: Partial<Problem> & { id: number }): Problem {
  return {
    name: `P${over.id}`,
    domain: 'dsa',
    metadata: {},
    interval_level: 0,
    created_at: `2026-07-01T00:00:00`,
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

function store(problems: Problem[], attempts: Attempt[] = []): StoreData {
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

function spec(over: Partial<PracticeSpec> = {}): PracticeSpec {
  return {
    domain: '', scope: 'due', order: 'overdue', limit: null,
    proficiency: '', field: '', value: '', seed: 0,
    ...over,
  };
}

// ── The invariant everything else rests on ────────────────────────────────────

describe('buildPracticeSet · scope "due" equivalence with reviewQueue', () => {
  // Exercises both orders, duplicate due dates, two domains, an unattempted
  // card, an unscheduled card and a not-yet-due card in one fixture.
  const data = store(
    [
      problem({ id: 1, next_due_date: '2026-07-20' }),
      problem({ id: 2, next_due_date: '2026-07-20' }),                    // tie on due date
      problem({ id: 3, next_due_date: '2026-07-26' }),
      problem({ id: 4, next_due_date: '2026-07-30' }),                    // future -> out
      problem({ id: 5, next_due_date: null }),                            // unscheduled -> out
      problem({ id: 6, next_due_date: '2026-07-01' }),                    // no attempts -> out
      problem({ id: 7, next_due_date: '2026-07-22', domain: 'lld' }),
      problem({ id: 8, next_due_date: '2026-07-22', interval_level: 1 }),
    ],
    [1, 2, 3, 4, 5, 7, 8].map(id => attempt({ id, problem_id: id })),
  );

  for (const order of ['overdue', 'due-soon'] as const) {
    it(`matches reviewQueue for order "${order}" with no filters`, () => {
      expect(buildPracticeSet(data, spec({ order }), TODAY))
        .toEqual(reviewQueue(data, TODAY, order));
    });

    it(`matches reviewQueue for order "${order}" filtered by domain`, () => {
      expect(buildPracticeSet(data, spec({ order, domain: 'dsa' }), TODAY))
        .toEqual(reviewQueue(data, TODAY, order).filter(it => it.domain === 'dsa'));
    });

    it(`matches reviewQueue for order "${order}" filtered by proficiency`, () => {
      expect(buildPracticeSet(data, spec({ order, proficiency: 'Learning' }), TODAY))
        .toEqual(reviewQueue(data, TODAY, order)
          .filter(it => matchesProficiency(it, 'Learning', it.attempt_count)));
    });
  }
});

// ── Selection ─────────────────────────────────────────────────────────────────

describe('buildPracticeSet · scope', () => {
  it('"weak" picks struggling and last-struggled cards, and skips a healthy one', () => {
    const data = store(
      [
        problem({ id: 1, interval_level: 0, next_due_date: '2026-07-20' }),  // missed twice
        problem({ id: 2, interval_level: 3, next_due_date: '2026-07-20' }),  // last one missed
        problem({ id: 3, interval_level: 3, next_due_date: '2026-07-20' }),  // never missed -> out
      ],
      [
        attempt({ id: 10, problem_id: 1, struggled: 1 }),
        attempt({ id: 11, problem_id: 1, struggled: 1 }),
        attempt({ id: 20, problem_id: 2, struggled: 1 }),
        attempt({ id: 30, problem_id: 3, struggled: 0 }),
      ],
    );
    expect(buildPracticeSet(data, spec({ scope: 'weak' }), TODAY).map(i => i.id)).toEqual([1, 2]);
  });

  it('"weak" includes a card that is NOT yet due — the point of the feature', () => {
    const data = store(
      [problem({ id: 1, interval_level: 2, next_due_date: '2099-01-01' })],
      [attempt({ id: 10, problem_id: 1, struggled: 1 })],
    );
    expect(buildPracticeSet(data, spec({ scope: 'due' }), TODAY)).toEqual([]);
    expect(buildPracticeSet(data, spec({ scope: 'weak' }), TODAY).map(i => i.id)).toEqual([1]);
  });

  it('"weak" excludes a card that struggled once and has since succeeded', () => {
    const data = store(
      [problem({ id: 1, interval_level: 2, next_due_date: '2026-07-20' })],
      [
        attempt({ id: 10, problem_id: 1, attempted_at: '2026-07-10T09:00:00', struggled: 1 }),
        attempt({ id: 11, problem_id: 1, attempted_at: '2026-07-15T09:00:00', struggled: 0 }),
      ],
    );
    expect(buildPracticeSet(data, spec({ scope: 'weak' }), TODAY)).toEqual([]);
  });

  it('"all" includes zero-attempt cards, which the queue can never show', () => {
    const data = store([
      problem({ id: 1, next_due_date: null }),
      problem({ id: 2, next_due_date: '2099-01-01' }),
    ]);
    expect(buildPracticeSet(data, spec({ scope: 'due' }), TODAY)).toEqual([]);
    expect(buildPracticeSet(data, spec({ scope: 'all', order: 'oldest' }), TODAY).map(i => i.id))
      .toEqual([1, 2]);
  });

  it('"unattempted" — combined with order "oldest" this is "resume": skip anything with any attempt at all, in add order', () => {
    const data = store([
      problem({ id: 1, created_at: '2026-07-01T00:00:00' }),                            // never attempted
      problem({ id: 2, created_at: '2026-07-02T00:00:00', next_due_date: '2026-07-17' }), // one successful attempt
      problem({ id: 3, created_at: '2026-07-03T00:00:00' }),                            // never attempted
      problem({ id: 4, created_at: '2026-07-04T00:00:00', next_due_date: '2026-07-17' }), // one struggled attempt
    ], [
      attempt({ id: 10, problem_id: 2, struggled: 0 }),
      attempt({ id: 20, problem_id: 4, struggled: 1 }),
    ]);
    expect(buildPracticeSet(data, spec({ scope: 'unattempted', order: 'oldest' }), TODAY).map(i => i.id))
      .toEqual([1, 3]);
  });
});

describe('buildPracticeSet · slicing', () => {
  it('matches one value of one metadata field', () => {
    const data = store([
      problem({ id: 1, metadata: { pattern_tag: 'Two Pointers' } }),
      problem({ id: 2, metadata: { pattern_tag: 'Sliding Window' } }),
      problem({ id: 3, metadata: {} }),
    ]);
    const set = buildPracticeSet(
      data, spec({ scope: 'all', field: 'pattern_tag', value: 'Two Pointers' }), TODAY,
    );
    expect(set.map(i => i.id)).toEqual([1]);
  });

  it('ignores a field with no value, rather than matching the empty string', () => {
    const data = store([problem({ id: 1, metadata: {} }), problem({ id: 2, metadata: { x: 'y' } })]);
    expect(buildPracticeSet(data, spec({ scope: 'all', field: 'x', value: '' }), TODAY)).toHaveLength(2);
  });

  it('composes proficiency with every scope', () => {
    const data = store(
      [
        problem({ id: 1, interval_level: 1, next_due_date: '2026-07-20' }),
        problem({ id: 2, interval_level: 2, next_due_date: '2026-07-20' }),
      ],
      [
        attempt({ id: 10, problem_id: 1, struggled: 1 }),
        attempt({ id: 20, problem_id: 2, struggled: 1 }),
      ],
    );
    for (const scope of ['due', 'weak', 'all'] as const) {
      expect(buildPracticeSet(data, spec({ scope, proficiency: 'Learning' }), TODAY).map(i => i.id))
        .toEqual([1]);
    }
  });
});

// ── Ordering ──────────────────────────────────────────────────────────────────

describe('buildPracticeSet · order', () => {
  const byDate = store([
    problem({ id: 1, created_at: '2026-07-03T00:00:00' }),
    problem({ id: 2, created_at: '2026-07-01T00:00:00' }),
    problem({ id: 3, created_at: '2026-07-02T00:00:00' }),
    problem({ id: 4, created_at: '2026-07-01T00:00:00' }), // ties with 2
  ]);

  it('"oldest" and "newest" sort on created_at, tie-breaking on id', () => {
    expect(buildPracticeSet(byDate, spec({ scope: 'all', order: 'oldest' }), TODAY).map(i => i.id))
      .toEqual([2, 4, 3, 1]);
    expect(buildPracticeSet(byDate, spec({ scope: 'all', order: 'newest' }), TODAY).map(i => i.id))
      .toEqual([1, 3, 2, 4]);
  });

  it('still flips the due ordering, so today’s ?order= links behave', () => {
    const data = store(
      [
        problem({ id: 1, next_due_date: '2026-07-25' }),
        problem({ id: 2, next_due_date: '2026-07-10' }),
      ],
      [attempt({ id: 10, problem_id: 1 }), attempt({ id: 20, problem_id: 2 })],
    );
    expect(buildPracticeSet(data, spec({ order: 'overdue' }), TODAY).map(i => i.id)).toEqual([2, 1]);
    expect(buildPracticeSet(data, spec({ order: 'due-soon' }), TODAY).map(i => i.id)).toEqual([1, 2]);
  });

  it('puts cards with no due date LAST in both due orders — the case reviewQueue never hits', () => {
    const data = store([
      problem({ id: 1, next_due_date: null }),
      problem({ id: 2, next_due_date: '2026-07-10' }),
      problem({ id: 3, next_due_date: null }),
      problem({ id: 4, next_due_date: '2026-07-25' }),
    ]);
    expect(buildPracticeSet(data, spec({ scope: 'all', order: 'overdue' }), TODAY).map(i => i.id))
      .toEqual([2, 4, 1, 3]);
    expect(buildPracticeSet(data, spec({ scope: 'all', order: 'due-soon' }), TODAY).map(i => i.id))
      .toEqual([4, 2, 1, 3]);
  });

  it('caps AFTER ordering, and does not cap at all when limit is null', () => {
    expect(buildPracticeSet(byDate, spec({ scope: 'all', order: 'oldest', limit: 2 }), TODAY).map(i => i.id))
      .toEqual([2, 4]);
    expect(buildPracticeSet(byDate, spec({ scope: 'all', order: 'oldest', limit: null }), TODAY))
      .toHaveLength(4);
  });
});

describe('seededShuffle', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('is deterministic for a seed and differs across seeds', () => {
    expect(seededShuffle(items, 7)).toEqual(seededShuffle(items, 7));
    expect(seededShuffle(items, 7)).not.toEqual(seededShuffle(items, 8));
  });

  it('is a permutation and leaves the input untouched', () => {
    const shuffled = seededShuffle(items, 42);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(items[0]).toBe(0);
  });

  it('survives seed 0, which is what an absent ?seed= parses to', () => {
    expect([...seededShuffle(items, 0)].sort((a, b) => a - b)).toEqual(items);
  });
});

// ── Parsing and URLs ──────────────────────────────────────────────────────────

describe('parsePracticeSpec', () => {
  const parse = (qs: string) => parsePracticeSpec(new URLSearchParams(qs));

  it('reads a link the review queue generates today as the due list', () => {
    expect(parse('domain=dsa&proficiency=Learning&order=due-soon')).toEqual(spec({
      domain: 'dsa', proficiency: 'Learning', order: 'due-soon', scope: 'due',
    }));
  });

  it('keeps the practice-only orders instead of collapsing them to overdue', () => {
    expect(parse('order=oldest').order).toBe('oldest');
    expect(parse('order=newest').order).toBe('newest');
    expect(parse('order=shuffle').order).toBe('shuffle');
  });

  it('falls back to defaults for unknown values', () => {
    expect(parse('scope=bogus').scope).toBe('due');
    expect(parse('order=bogus').order).toBe('overdue');
    expect(parsePracticeOrder(null)).toBe('overdue');
  });

  it('treats a non-positive or unparseable limit as no cap', () => {
    expect(parse('limit=0').limit).toBeNull();
    expect(parse('limit=-5').limit).toBeNull();
    expect(parse('limit=abc').limit).toBeNull();
    expect(parse('limit=20').limit).toBe(20);
  });

  it('defaults a missing or unparseable seed to 0', () => {
    expect(parse('order=shuffle').seed).toBe(0);
    expect(parse('order=shuffle&seed=abc').seed).toBe(0);
    expect(parse('order=shuffle&seed=99').seed).toBe(99);
  });
});

describe('practiceHref', () => {
  it('reproduces exactly the query string the review queue builds today', () => {
    expect(practiceHref(spec({ domain: 'dsa', proficiency: 'Learning', order: 'due-soon' })))
      .toBe('/review/session?domain=dsa&proficiency=Learning&order=due-soon');
  });

  it('omits every default, so a plain due session has no query string', () => {
    expect(practiceHref(spec())).toBe('/review/session');
  });

  it('carries the seed only for a shuffle', () => {
    expect(practiceHref(spec({ order: 'oldest', seed: 99 }))).not.toContain('seed');
    expect(practiceHref(spec({ order: 'shuffle', seed: 99 }))).toContain('seed=99');
  });

  it('round-trips: parsing a canonical URL and re-building it is a fixed point', () => {
    for (const s of [
      spec(),
      spec({ domain: 'dsa', scope: 'weak', order: 'oldest' }),
      spec({ domain: 'lld', scope: 'all', order: 'shuffle', limit: 20, seed: 7 }),
      spec({ scope: 'all', field: 'pattern_tag', value: 'Two Pointers', proficiency: 'Familiar' }),
    ]) {
      const href = practiceHref(s);
      const reparsed = parsePracticeSpec(new URLSearchParams(href.split('?')[1] ?? ''));
      expect(practiceHref(reparsed)).toBe(href);
      expect(reparsed).toEqual(s);
    }
  });
});

describe('PRACTICE_ORDERS', () => {
  // Drift guard: the two lists are separate values, so nothing but this stops
  // someone adding a queue order that practice sets silently cannot serve.
  it('covers every review-queue order', () => {
    for (const o of QUEUE_ORDER_OPTIONS) {
      expect(PRACTICE_ORDERS.some(p => p.value === o.value)).toBe(true);
    }
  });
});

// ── Small helpers ─────────────────────────────────────────────────────────────

describe('isWeakSpot', () => {
  const item = (p: Problem, attempts: Attempt[]) =>
    toQueueItem(store([p], attempts), p, TODAY);

  it('is false for a card that has never been attempted', () => {
    expect(isWeakSpot(item(problem({ id: 1, next_due_date: null }), []))).toBe(false);
  });

  it('is true at level 0 once the card has been missed twice', () => {
    const p = problem({ id: 1, interval_level: 0, next_due_date: '2026-07-20' });
    expect(isWeakSpot(item(p, [
      attempt({ id: 1, problem_id: 1, struggled: 1 }),
      attempt({ id: 2, problem_id: 1, struggled: 1 }),
    ]))).toBe(true);
  });
});

describe('fieldValuesPresent', () => {
  it('returns the distinct non-empty values, sorted', () => {
    const problems = [
      problem({ id: 1, metadata: { t: 'Graphs' } }),
      problem({ id: 2, metadata: { t: 'Arrays' } }),
      problem({ id: 3, metadata: { t: 'Graphs' } }),
      problem({ id: 4, metadata: { t: '' } }),
      problem({ id: 5, metadata: {} }),
    ];
    expect(fieldValuesPresent(problems, 't')).toEqual(['Arrays', 'Graphs']);
  });
});
