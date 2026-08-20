// Pure functions that replicate the server-side SQL queries against the
// in-memory local store. Reuse lib/sr.ts semantics; keep results identical
// to what the API/server pages return so presentational components are unchanged.
import { Problem, Attempt, ReviewQueueItem, Domain } from '@/lib/types';
import { isStrugglingState, proficiencyLabel, type ProficiencyLabel } from '@/lib/proficiency';
import { archivedDomainIds } from '@/lib/domains';
import { StoreData } from './store';

const TZ = 'America/New_York';

/** YYYY-MM-DD for today in Eastern time — matches lib/db.ts localToday(). */
export function clientToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD for N days from now in Eastern time — matches lib/db.ts. */
export function clientDaysFromNow(n: number): string {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** "YYYY-MM-DD HH:MM:SS" in Eastern time — matches lib/db.ts localNow(). */
export function clientNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

const dateOf = (datetime: string) => datetime.slice(0, 10);

/** Integer day difference (a - b) for two YYYY-MM-DD strings, parsed as UTC. */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/** attempts for a problem, newest first (tie-break by id desc) */
function attemptsFor(data: StoreData, problemId: number): Attempt[] {
  return data.attempts
    .filter(a => a.problem_id === problemId)
    .sort((x, y) => (x.attempted_at < y.attempted_at ? 1 : x.attempted_at > y.attempted_at ? -1 : y.id - x.id));
}

/**
 * Which end of the backlog to start from. 'overdue' (the default) is the
 * historical behaviour: oldest due date first. 'due-soon' walks the other way,
 * so cards that only just came due lead and the stalest ones sit at the end.
 */
export type QueueOrder = 'overdue' | 'due-soon';

/**
 * Build a queue item for any problem — including ones with no attempts and no
 * due date, which reviewQueue() itself can never return but practice sets
 * (lib/practice.ts) routinely do.
 *
 * `days_overdue` is only meaningful when `next_due_date` is set. It goes
 * negative for a card due in the future, and is 0 for one that was never
 * scheduled — the same 0 that means "due today" for a scheduled card. Read
 * `next_due_date` first; never render overdue text off this field alone.
 */
export function toQueueItem(data: StoreData, p: Problem, today: string): ReviewQueueItem {
  const atts = attemptsFor(data, p.id);
  const last = atts[0];
  return {
    ...p,
    attempt_count: atts.length,
    last_attempted_at: last?.attempted_at ?? '',
    last_struggled: last?.struggled ?? 0,
    days_overdue: p.next_due_date ? dayDiff(today, p.next_due_date) : 0,
  };
}

/**
 * Due-date comparator shared by the review queue and practice sets.
 *
 * Same-due-date items tie-break on id ASCENDING in BOTH directions — only the
 * due-date axis flips. Ties used to fall back to whatever order the store
 * happened to hold, which made the queue's second-level ordering incidental.
 *
 * Problems with no due date always sort LAST, in both directions. reviewQueue()
 * never sees one, but a practice set can, and `null < '2026-01-01'` is false
 * either way — ranking them by raw comparison would break the total order
 * Array.prototype.sort requires and leave the result implementation-defined.
 */
export function compareByDueDate(a: Problem, b: Problem, order: QueueOrder): number {
  if (!a.next_due_date || !b.next_due_date) {
    if (a.next_due_date) return -1;
    if (b.next_due_date) return 1;
    return a.id - b.id;
  }
  const direction = order === 'due-soon' ? -1 : 1;
  if (a.next_due_date < b.next_due_date) return -direction;
  if (a.next_due_date > b.next_due_date) return direction;
  return a.id - b.id;
}

/**
 * Review queue: problems whose due date has arrived.
 *
 * Admission is the due date alone — a card does NOT need a prior attempt. A
 * newly added card is scheduled one day out (level 0's interval) at creation,
 * so it joins the queue the day after you add it, which is what "add a
 * question and see it tomorrow" means. It gets there with zero attempts and no
 * synthetic "got it" backfill, so `computeStreak` still only counts days you
 * actually studied, and the Resume preset (`scope: 'unattempted'`) still finds
 * it. Cards with `next_due_date` NULL were never scheduled and stay out.
 *
 * Cards in an archived domain stay out too, however overdue they are: archiving
 * takes a domain out of rotation without touching its cards, so restoring it
 * brings the queue back exactly as it was. buildPracticeSet() skips the same
 * cards, which is what keeps the `scope: 'due'` equivalence in practice.test.ts
 * true for an archived domain as well as an active one.
 */
export function reviewQueue(
  data: StoreData,
  today: string,
  order: QueueOrder = 'overdue',
): ReviewQueueItem[] {
  const archived = archivedDomainIds(data.domains);
  return data.problems
    .filter(p => p.next_due_date && p.next_due_date <= today && !archived.has(p.domain))
    .map(p => toQueueItem(data, p, today))
    .sort((a, b) => compareByDueDate(a, b, order));
}

/** All problems in a domain with attempt_count + avg_time, newest first. */
export function domainProblems(data: StoreData, domain: Domain): Problem[] {
  return data.problems
    .filter(p => p.domain === domain)
    .map(p => {
      const atts = data.attempts.filter(a => a.problem_id === p.id);
      const timed = atts.filter(a => a.time_taken_mins > 0).map(a => a.time_taken_mins);
      const avg = timed.length ? Math.round(timed.reduce((s, n) => s + n, 0) / timed.length) : null;
      return { ...p, attempt_count: atts.length, avg_time: avg };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
}

/** Per-domain "added today" counts + "due now" counts — matches /api/stats/today. */
export function todayStats(data: StoreData, today: string): { counts: Record<string, number>; due: Record<string, number> } {
  const counts: Record<string, number> = { dsa: 0, system_design: 0, frontend: 0, python: 0, ai: 0, lld: 0, behavioral: 0 };
  const due: Record<string, number> = { dsa: 0, system_design: 0, frontend: 0, python: 0, ai: 0, lld: 0, behavioral: 0 };

  // "Added today" is literally that: the card was created today. It used to mean
  // "first-ever attempt was today", which made the badge invisible for the case
  // it exists to report — cards are seeded with zero attempts, so a batch you
  // just added counted for nothing until you studied it the next day.
  for (const p of data.problems) {
    if (dateOf(p.created_at) === today) counts[p.domain] = (counts[p.domain] ?? 0) + 1;
  }

  // "Due now": problems whose next_due_date has arrived (see reviewQueue).
  for (const item of reviewQueue(data, today)) {
    due[item.domain] = (due[item.domain] ?? 0) + 1;
  }

  return { counts, due };
}

export interface TodayAttempt {
  attempt_id: number;
  attempted_at: string;
  struggled: number;
  time_taken_mins: number;
  practice_type: string | null;
  id: number;
  name: string;
  domain: Domain;
  interval_level: number;
  next_due_date: string | null;
  attempt_count: number;
  metadata: Record<string, string>;
}

/** Today's attempts split into reviewed (re-attempt) vs added (first time). */
export function historyBuckets(
  data: StoreData,
  today: string,
  domainFilter?: string,
): { reviewed: TodayAttempt[]; added: TodayAttempt[] } {
  const problemById = new Map(data.problems.map(p => [p.id, p]));
  // problems that have any attempt on a date strictly before today
  const hasEarlier = new Set<number>();
  for (const a of data.attempts) {
    if (dateOf(a.attempted_at) < today) hasEarlier.add(a.problem_id);
  }

  const reviewed: TodayAttempt[] = [];
  const added: TodayAttempt[] = [];

  for (const a of data.attempts) {
    if (dateOf(a.attempted_at) !== today) continue;
    const p = problemById.get(a.problem_id);
    if (!p) continue;
    if (domainFilter && p.domain !== domainFilter) continue;
    const row: TodayAttempt = {
      attempt_id: a.id,
      attempted_at: a.attempted_at,
      struggled: a.struggled,
      time_taken_mins: a.time_taken_mins,
      practice_type: a.practice_type ?? null,
      id: p.id,
      name: p.name,
      domain: p.domain,
      interval_level: p.interval_level,
      next_due_date: p.next_due_date ?? null,
      attempt_count: data.attempts.filter(x => x.problem_id === p.id).length,
      metadata: p.metadata,
    };
    (hasEarlier.has(p.id) ? reviewed : added).push(row);
  }

  const byTimeDesc = (a: TodayAttempt, b: TodayAttempt) =>
    a.attempted_at < b.attempted_at ? 1 : a.attempted_at > b.attempted_at ? -1 : b.attempt_id - a.attempt_id;
  return { reviewed: reviewed.sort(byTimeDesc), added: added.sort(byTimeDesc) };
}

/** Upcoming due counts by (date, domain) for today < date <= until. */
export function forecast(data: StoreData, today: string, until: string): { date: string; domain: string; count: number }[] {
  const map = new Map<string, number>();
  const archived = archivedDomainIds(data.domains);
  for (const p of data.problems) {
    if (!p.next_due_date || archived.has(p.domain)) continue;
    if (p.next_due_date > today && p.next_due_date <= until) {
      const key = `${p.next_due_date} ${p.domain}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([key, count]) => { const [date, domain] = key.split(' '); return { date, domain, count }; })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface ProblemDetail extends Problem {
  attempts: Attempt[];
  notes: import('@/lib/types').Note[];
  links: import('@/lib/types').Link[];
  avg_time: number | null;
  prev_id: number | null;
  next_id: number | null;
  position: number;
  total: number;
}

/** Mirror of GET /api/problems/[id] built from the local store. */
export function problemDetail(data: StoreData, id: number): ProblemDetail | null {
  const problem = data.problems.find(p => p.id === id);
  if (!problem) return null;

  const attempts = data.attempts
    .filter(a => a.problem_id === id)
    .sort((x, y) => (x.attempted_at < y.attempted_at ? 1 : x.attempted_at > y.attempted_at ? -1 : y.id - x.id));
  const notes = data.notes
    .filter(n => n.problem_id === id)
    .sort((x, y) => (x.created_at < y.created_at ? -1 : x.created_at > y.created_at ? 1 : x.id - y.id));
  const links = data.links
    .filter(l => l.problem_id === id)
    .sort((x, y) => (x.created_at < y.created_at ? -1 : x.created_at > y.created_at ? 1 : x.id - y.id));

  const sameDomain = data.problems.filter(p => p.domain === problem.domain);
  const prevId = sameDomain.filter(p => p.id < id).reduce<number | null>((m, p) => (m === null || p.id > m ? p.id : m), null);
  const nextId = sameDomain.filter(p => p.id > id).reduce<number | null>((m, p) => (m === null || p.id < m ? p.id : m), null);
  const newerCount = sameDomain.filter(p => p.id > id).length;

  const avg_time = attempts.length
    ? attempts.reduce((s, a) => s + a.time_taken_mins, 0) / attempts.length
    : null;

  return {
    ...problem,
    attempts,
    notes,
    links,
    avg_time,
    prev_id: prevId,
    next_id: nextId,
    position: newerCount + 1,
    total: sameDomain.length,
  };
}

/**
 * JS equivalent of lib/filters.ts proficiencyClause, for client-side queue filtering.
 *
 * `attemptCount` defaults to the problem's own `attempt_count` (queue items and
 * history rows both carry it) rather than to 0: a 0 default silently made every
 * "Struggling" test fail for callers that didn't pass the count explicitly.
 */
export function matchesProficiency(
  p: Problem,
  prof: string,
  attemptCount = p.attempt_count ?? 0,
): boolean {
  switch (prof) {
    // "New" vs "Struggling" both sit at level 0; they split on whether the
    // problem has been missed twice (see lib/proficiency.ts) rather than on
    // the mere presence of a due date, since every first log now sets one.
    case 'New':        return p.interval_level === 0 && !isStrugglingState(0, !!p.next_due_date, attemptCount);
    case 'Struggling': return isStrugglingState(0, !!p.next_due_date, attemptCount) && p.interval_level === 0;
    case 'Learning':   return p.interval_level === 1;
    case 'Familiar':   return p.interval_level === 2;
    case 'Proficient': return p.interval_level === 3;
    case 'Confident':  return p.interval_level === 4;
    case 'Mastered':   return p.interval_level === 5;
    default:           return true;
  }
}

/** Count a problem's attempts — needed to tell "New" from "Struggling". */
export function attemptCountFor(data: StoreData, problemId: number): number {
  return data.attempts.reduce((n, a) => (a.problem_id === problemId ? n + 1 : n), 0);
}

export function proficiencyOf(p: Problem, attemptCount = 0): ProficiencyLabel {
  return proficiencyLabel(p.interval_level, !!p.next_due_date, attemptCount);
}
