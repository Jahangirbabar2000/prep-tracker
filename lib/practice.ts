// Practice sets: revising a domain on demand, off-schedule.
//
// The review queue answers one question — "what is due?" — and app/page.tsx has
// only ever needed that. A practice set generalises it into three independent
// axes (scope, order, size) so "weak spots in Two Pointers, oldest first, 20 of
// them" is a spec rather than a sixth hardcoded mode.
//
// The load-bearing property, asserted directly in practice.test.ts:
//
//     for any spec with scope 'due', buildPracticeSet returns exactly
//     reviewQueue(data, today, order) filtered by domain and proficiency
//
// Everything else — back-compatible /review/session links, an unchanged review
// queue, an unchanged session for the URLs that already exist — follows from it.

import type { Problem, ReviewQueueItem } from '@/lib/types';
import type { StoreData } from '@/lib/store/store';
import {
  compareByDueDate, matchesProficiency, toQueueItem, type QueueOrder,
} from '@/lib/store/queries';
import { DEFAULT_QUEUE_ORDER } from '@/lib/filters';
import { isStrugglingState } from '@/lib/proficiency';

/** Which cards are eligible, independent of how they get ordered. */
export type PracticeScope = 'due' | 'weak' | 'all';

/**
 * A superset of QueueOrder, expressed as one so the compiler enforces the
 * relationship: every order the review queue can ask for is one a practice set
 * can serve, which is what keeps today's ?order= links working.
 */
export type PracticeOrder = QueueOrder | 'oldest' | 'newest' | 'shuffle';

export interface PracticeSpec {
  domain: string;          // '' = every domain (the current global behaviour)
  scope: PracticeScope;
  order: PracticeOrder;
  limit: number | null;    // null = no cap
  proficiency: string;     // '' = any
  field: string;           // domain_field key, '' = none
  value: string;           // that field's value
  seed: number;            // shuffle seed, carried in the URL
}

export const PRACTICE_SCOPES: readonly { value: PracticeScope; label: string }[] = [
  { value: 'due',  label: 'Due now' },
  { value: 'weak', label: 'Weak spots' },
  { value: 'all',  label: 'Everything' },
];

export const PRACTICE_ORDERS: readonly { value: PracticeOrder; label: string }[] = [
  { value: 'overdue',  label: 'Most overdue' },
  { value: 'due-soon', label: 'Least overdue' },
  { value: 'oldest',   label: 'First added' },
  { value: 'newest',   label: 'Last added' },
  { value: 'shuffle',  label: 'Shuffled' },
];

export const PRACTICE_LIMITS: readonly { value: number | null; label: string }[] = [
  { value: 10,   label: '10 cards' },
  { value: 20,   label: '20 cards' },
  { value: 50,   label: '50 cards' },
  { value: null, label: 'No limit' },
];

/** No `scope` param means the historical behaviour: the due list. */
export const DEFAULT_PRACTICE_SCOPE: PracticeScope = 'due';

function parseScope(value: string | null | undefined): PracticeScope {
  return PRACTICE_SCOPES.some(s => s.value === value)
    ? value as PracticeScope
    : DEFAULT_PRACTICE_SCOPE;
}

/**
 * Deliberately NOT parseQueueOrder (lib/filters.ts): that validates against
 * QUEUE_ORDER_OPTIONS and returns 'overdue' for anything else, so it would
 * silently collapse ?order=oldest into the due ordering.
 */
export function parsePracticeOrder(value: string | null | undefined): PracticeOrder {
  return PRACTICE_ORDERS.some(o => o.value === value)
    ? value as PracticeOrder
    : DEFAULT_QUEUE_ORDER;
}

/** A cap of 0 or less is meaningless — treat it as "no cap", not "empty set". */
function parseLimit(value: string | null | undefined): number | null {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Absent or unparseable seeds fall to 0 so a hand-typed ?order=shuffle is still stable. */
function parseSeed(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

export function parsePracticeSpec(sp: URLSearchParams): PracticeSpec {
  return {
    domain:      sp.get('domain') ?? '',
    scope:       parseScope(sp.get('scope')),
    order:       parsePracticeOrder(sp.get('order')),
    limit:       parseLimit(sp.get('limit')),
    proficiency: sp.get('proficiency') ?? '',
    field:       sp.get('field') ?? '',
    value:       sp.get('value') ?? '',
    seed:        parseSeed(sp.get('seed')),
  };
}

/**
 * The canonical URL for a spec. Every default is omitted, so a plain due-list
 * session still produces exactly the query string app/page.tsx has always
 * generated, and parse → href round-trips to a stable string.
 */
export function practiceHref(spec: PracticeSpec): string {
  const params = new URLSearchParams();
  if (spec.domain) params.set('domain', spec.domain);
  if (spec.scope !== DEFAULT_PRACTICE_SCOPE) params.set('scope', spec.scope);
  if (spec.proficiency) params.set('proficiency', spec.proficiency);
  if (spec.order !== DEFAULT_QUEUE_ORDER) params.set('order', spec.order);
  if (spec.limit !== null) params.set('limit', String(spec.limit));
  if (spec.field && spec.value) {
    params.set('field', spec.field);
    params.set('value', spec.value);
  }
  // Only meaningful for a shuffle, and carrying it elsewhere would make two
  // identical specs produce two different URLs.
  if (spec.order === 'shuffle') params.set('seed', String(spec.seed));
  const qs = params.toString();
  return qs ? `/review/session?${qs}` : '/review/session';
}

/**
 * A card worth drilling: one the ladder already calls Struggling, or one whose
 * MOST RECENT attempt was a miss. attemptsFor() sorts newest-first, so a card
 * that stumbled once and has since been re-attempted successfully is not weak.
 */
export function isWeakSpot(item: ReviewQueueItem): boolean {
  return isStrugglingState(item.interval_level, !!item.next_due_date, item.attempt_count ?? 0)
    || item.last_struggled === 1;
}

/** mulberry32 — small, fast, and stable across runs for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates against a seeded PRNG. The seed rides in the URL so a reload or
 * a Suspense re-mount replays the same order instead of reshuffling the deck
 * out from under a half-finished session.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function matchesScope(item: ReviewQueueItem, scope: PracticeScope, today: string): boolean {
  if (scope === 'all')  return true;
  if (scope === 'weak') return isWeakSpot(item);
  // 'due' — reviewQueue()'s admission rule, restated. Both must agree; the
  // equivalence test in practice.test.ts is what holds them together.
  return !!item.next_due_date
    && item.next_due_date <= today
    && (item.attempt_count ?? 0) > 0;
}

function byCreatedAt(direction: 1 | -1) {
  return (a: Problem, b: Problem) =>
    a.created_at < b.created_at ? -direction
    : a.created_at > b.created_at ? direction
    : a.id - b.id;
}

function sortPracticeSet(items: ReviewQueueItem[], spec: PracticeSpec): ReviewQueueItem[] {
  switch (spec.order) {
    case 'shuffle': return seededShuffle(items, spec.seed);
    case 'oldest':  return [...items].sort(byCreatedAt(1));
    case 'newest':  return [...items].sort(byCreatedAt(-1));
    // Both due orders; compareByDueDate handles the null due dates that a
    // 'weak' or 'all' scope can hand it and reviewQueue never sees.
    default:        return [...items].sort((a, b) => compareByDueDate(a, b, spec.order as QueueOrder));
  }
}

export function buildPracticeSet(
  data: StoreData,
  spec: PracticeSpec,
  today: string,
): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];
  for (const p of data.problems) {
    if (spec.domain && p.domain !== spec.domain) continue;
    if (spec.field && spec.value && (p.metadata?.[spec.field] ?? '') !== spec.value) continue;
    const item = toQueueItem(data, p, today);
    if (!matchesScope(item, spec.scope, today)) continue;
    if (spec.proficiency && !matchesProficiency(item, spec.proficiency, item.attempt_count)) continue;
    items.push(item);
  }
  const ordered = sortPracticeSet(items, spec);
  // Cap AFTER ordering, so "20 of them" means the first 20 of the chosen order.
  return spec.limit === null ? ordered : ordered.slice(0, spec.limit);
}

/**
 * The distinct values a metadata field actually holds, for building a filter
 * dropdown that can't offer a zero-match option. Same rule as the domain
 * page's derivedOptions (components/DomainPageClient.tsx), in a form the
 * practice launcher can reuse without pulling in that component's shape.
 */
export function fieldValuesPresent(problems: Problem[], key: string): string[] {
  const values = new Set<string>();
  for (const p of problems) {
    const v = p.metadata?.[key];
    if (v != null && String(v) !== '') values.add(String(v));
  }
  return [...values].sort();
}
