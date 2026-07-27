// Client-only analytics layer for the Stats page, built around the app's two
// goals: active recall (do you retrieve answers on reviews?) and spaced
// repetition (is it sticking, and are you reviewing on schedule?).
//
// No per-attempt level is stored, but the SR level trajectory is fully
// reconstructible: computeNextDue is deterministic and every problem starts at
// level 0, so folding it over a problem's ordered attempts reproduces the level
// after each attempt. Everything here is pure and unit-tested.

import { Attempt, Domain } from '@/lib/types';
import { StoreData } from './store';
import { computeNextDue } from '@/lib/sr';
import { computeStreak } from '@/lib/streak';
import { reviewQueue, proficiencyOf, DOMAIN_ORDER, DOMAIN_LABEL } from './queries';

const dateOf = (datetime: string) => datetime.slice(0, 10);

/** YYYY-MM-DD `delta` days from an ISO date, parsed as UTC (matches lib/streak). */
function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export interface AttemptReplay {
  attempt: Attempt;
  index: number;        // 0-based position in ascending (attempted_at, id) order
  levelBefore: number;
  levelAfter: number;
  isReview: boolean;    // any attempt that is NOT the first for its problem
  isLapse: boolean;     // struggled while already matured (levelBefore >= 2)
  isPromotion: boolean; // actual level increase (a capped success at 3 is not one)
  isDemotion: boolean;  // actual level decrease (a floored struggle at 0 is not one)
}

/** Annotate a single problem's attempts by replaying the SR level from 0. */
export function replayAttempts(attempts: Attempt[]): AttemptReplay[] {
  const ordered = [...attempts].sort((x, y) =>
    x.attempted_at < y.attempted_at ? -1 : x.attempted_at > y.attempted_at ? 1 : x.id - y.id,
  );
  let level = 0;
  return ordered.map((attempt, index) => {
    const struggled = !!attempt.struggled;
    const levelBefore = level;
    const { newLevel } = computeNextDue(struggled, levelBefore, new Date(attempt.attempted_at.replace(' ', 'T')));
    level = newLevel;
    return {
      attempt,
      index,
      levelBefore,
      levelAfter: newLevel,
      isReview: index > 0,
      isLapse: struggled && levelBefore >= 2,
      isPromotion: newLevel > levelBefore,
      isDemotion: newLevel < levelBefore,
    };
  });
}

type ProficiencyCounts = Record<'New' | 'Struggling' | 'Learning' | 'Familiar' | 'Confident', number>;

export interface DomainMastery {
  domain: Domain;
  label: string;
  total: number;         // problems in domain
  familiarPlus: number;  // interval_level >= 2
  pct: number;           // round(familiarPlus / total * 100), 0 when total === 0
  attempts: number;      // total attempts logged in domain
}

export interface Leech {
  id: number;
  name: string;
  domain: Domain;
  lapseCount: number;    // # attempts marked struggled while matured (0 for fallback rows)
  attemptCount: number;
}

export interface Metrics {
  // 1. Recall rate on reviews (higher is better) — null when the window has no reviews
  recallRateRecent: number | null;
  recallRatePrior: number | null;
  reviewCountRecent: number;
  reviewCountPrior: number;

  // 2. Review debt / adherence
  dueCount: number;
  avgDaysOverdue: number;
  oldestOverdueAge: number;

  // 3. Maturity
  confidentCount: number;
  familiarPlusCount: number;
  promotions7d: number;
  demotions7d: number;
  netLevelMovement7d: number;

  // 4. Consistency
  reviewsCompleted7d: number;
  reviewsByDay7d: number[]; // review count per day, oldest -> today (length 7)
  streak: number;

  // 5. Mastery by domain — ALWAYS all domains (ignores domainFilter)
  masteryByDomain: DomainMastery[];

  // 6. Leeches (+ fallback flag)
  leeches: Leech[];
  leechesAreFallback: boolean;

  // Kept snapshot
  proficiencyCounts: ProficiencyCounts;

  // Empty-state context
  totalProblems: number;
  attemptedProblems: number;
}

export function computeMetrics(data: StoreData, today: string, domainFilter?: Domain): Metrics {
  // "Last 7 days" = today and the 6 days before it; the prior block is the 7
  // days before that. Two equal, non-overlapping 7-day windows.
  const recentStart = addDays(today, -6);
  const priorStart = addDays(today, -13);

  // Scope problems/attempts to the active domain filter (mastery-by-domain stays global).
  const problems = domainFilter ? data.problems.filter(p => p.domain === domainFilter) : data.problems;
  const problemIds = new Set(problems.map(p => p.id));
  const attempts = domainFilter ? data.attempts.filter(a => problemIds.has(a.problem_id)) : data.attempts;

  // Group scoped attempts per problem and replay each.
  const byProblem = new Map<number, Attempt[]>();
  for (const a of attempts) {
    const arr = byProblem.get(a.problem_id);
    if (arr) arr.push(a); else byProblem.set(a.problem_id, [a]);
  }
  const allReplays: AttemptReplay[] = [];
  const lapsesByProblem = new Map<number, number>();
  for (const [pid, atts] of byProblem) {
    const replays = replayAttempts(atts);
    allReplays.push(...replays);
    const lapses = replays.filter(r => r.isLapse).length;
    if (lapses > 0) lapsesByProblem.set(pid, lapses);
  }

  const inRecent = (r: AttemptReplay) => dateOf(r.attempt.attempted_at) >= recentStart;
  const inPrior = (r: AttemptReplay) => {
    const d = dateOf(r.attempt.attempted_at);
    return d >= priorStart && d < recentStart;
  };

  // 1. Recall on reviews
  const reviews = allReplays.filter(r => r.isReview);
  const recentReviews = reviews.filter(inRecent);
  const priorReviews = reviews.filter(inPrior);
  const recallRate = (rs: AttemptReplay[]): number | null =>
    rs.length ? Math.round((rs.filter(r => !r.attempt.struggled).length / rs.length) * 100) : null;

  // 2. Review debt
  let q = reviewQueue(data, today);
  if (domainFilter) q = q.filter(i => i.domain === domainFilter);
  const dueCount = q.length;
  const avgDaysOverdue = dueCount ? Math.round(q.reduce((s, i) => s + i.days_overdue, 0) / dueCount) : 0;
  const oldestOverdueAge = dueCount ? Math.max(...q.map(i => i.days_overdue)) : 0;

  // 3. Maturity
  const confidentCount = problems.filter(p => p.interval_level === 3).length;
  const familiarPlusCount = problems.filter(p => p.interval_level >= 2).length;
  const promotions7d = recentReviews.filter(r => r.isPromotion).length;
  const demotions7d = recentReviews.filter(r => r.isDemotion).length;

  // 5. Mastery by domain — always all domains
  const masteryByDomain: DomainMastery[] = DOMAIN_ORDER.map(domain => {
    const dProblems = data.problems.filter(p => p.domain === domain);
    const total = dProblems.length;
    const familiarPlus = dProblems.filter(p => p.interval_level >= 2).length;
    return {
      domain,
      label: DOMAIN_LABEL[domain],
      total,
      familiarPlus,
      pct: total ? Math.round((familiarPlus / total) * 100) : 0,
      attempts: data.attempts.filter(a => dProblems.some(p => p.id === a.problem_id)).length,
    };
  });

  // 6. Leeches — items that matured then lapsed, most lapses first.
  const problemById = new Map(problems.map(p => [p.id, p]));
  let leechesAreFallback = false;
  let leeches: Leech[] = [...lapsesByProblem.entries()]
    .map(([pid, lapseCount]) => {
      const p = problemById.get(pid)!;
      return { id: pid, name: p.name, domain: p.domain, lapseCount, attemptCount: byProblem.get(pid)!.length };
    })
    .sort((a, b) => b.lapseCount - a.lapseCount || b.attemptCount - a.attemptCount || a.id - b.id)
    .slice(0, 10);

  if (leeches.length === 0) {
    // Fallback: the old "chronic strugglers" rule — stuck at level 0 after 3+ attempts.
    leechesAreFallback = true;
    leeches = problems
      .filter(p => p.interval_level === 0 && (byProblem.get(p.id)?.length ?? 0) >= 3)
      .map(p => ({ id: p.id, name: p.name, domain: p.domain, lapseCount: 0, attemptCount: byProblem.get(p.id)!.length }))
      .sort((a, b) => b.attemptCount - a.attemptCount || a.id - b.id)
      .slice(0, 10);
  }

  // Proficiency snapshot (scoped)
  const proficiencyCounts: ProficiencyCounts = { New: 0, Struggling: 0, Learning: 0, Familiar: 0, Confident: 0 };
  for (const p of problems) proficiencyCounts[proficiencyOf(p)]++;

  return {
    recallRateRecent: recallRate(recentReviews),
    recallRatePrior: recallRate(priorReviews),
    reviewCountRecent: recentReviews.length,
    reviewCountPrior: priorReviews.length,

    dueCount,
    avgDaysOverdue,
    oldestOverdueAge,

    confidentCount,
    familiarPlusCount,
    promotions7d,
    demotions7d,
    netLevelMovement7d: promotions7d - demotions7d,

    reviewsCompleted7d: recentReviews.length,
    reviewsByDay7d: Array.from({ length: 7 }, (_, k) => {
      const day = addDays(recentStart, k);
      return recentReviews.filter(r => dateOf(r.attempt.attempted_at) === day).length;
    }),
    streak: computeStreak(attempts.map(a => a.attempted_at), today),

    masteryByDomain,

    leeches,
    leechesAreFallback,

    proficiencyCounts,

    totalProblems: problems.length,
    attemptedProblems: byProblem.size,
  };
}
