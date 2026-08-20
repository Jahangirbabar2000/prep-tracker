'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReviewQueueItemCard from '@/components/ReviewQueueItem';
import UpcomingForecast from '@/components/UpcomingForecast';
import ReviewQueueFilters from '@/components/ReviewQueueFilters';
import Link from 'next/link';
import { Check, History, Play, Flame } from 'lucide-react';
import { useStore } from '@/lib/store/store';
import {
  activeCards, reviewQueue, historyBuckets, forecast, matchesProficiency, clientToday, clientDaysFromNow,
} from '@/lib/store/queries';
import { proficiencyLabel } from '@/lib/proficiency';
import { DEFAULT_QUEUE_ORDER, parseQueueOrder, QUEUE_PROFICIENCY_OPTIONS } from '@/lib/filters';
import {
  buildPracticeSet, parsePracticeSpec, practiceHref, DEFAULT_PRACTICE_SCOPE,
} from '@/lib/practice';
import type { QueueOrder } from '@/lib/store/queries';
import { computeStreak } from '@/lib/streak';
import { fmtDateOrToday } from '@/lib/fmt';
import type { Problem } from '@/lib/types';
import { activeDomains, resolveDomain } from '@/lib/domains';
import { buildForecastWeeks, UPCOMING_MAX_WEEKS, UPCOMING_WEEK_DAYS } from '@/lib/upcoming';
import { domainPalette } from '@/components/domainVisuals';

// One definition so the live page and the loading skeleton can't drift. The
// leading clause is asserted by e2e/smoke.spec.ts — only the tail is dynamic.
const queueSubtitle = (order: QueueOrder) =>
  `Everything due across all domains, ${order === 'due-soon' ? 'least' : 'most'} overdue first.`;

function ReviewQueueInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { data, ready } = useStore();
  const today = clientToday();
  const filterDomain      = sp.get('domain')      ?? '';
  const filterProficiency = sp.get('proficiency') ?? '';
  const filterOrder       = parseQueueOrder(sp.get('order'));

  // One spec drives both the list below and the session the button starts, so
  // the two can no longer drift apart. Carrying the order is what makes the
  // session walk the queue the same way the list reads — both Start Session
  // links and the Enter shortcut use it.
  //
  // Scope and order are pinned rather than read straight off the URL: this page
  // IS the due list, and the date-grouped list below is a run-length grouper
  // that only holds together while the set is due-scoped and due-ordered. A
  // hand-typed ?scope=all or ?order=oldest must not reach buildPracticeSet here.
  const qs = sp.toString();
  const spec = useMemo(() => ({
    ...parsePracticeSpec(new URLSearchParams(qs)),
    scope: DEFAULT_PRACTICE_SCOPE,
    order: parseQueueOrder(new URLSearchParams(qs).get('order')),
  }), [qs]);
  const sessionHref = practiceHref(spec);

  // Enter starts a session with the current filters applied (moved here from
  // GlobalShortcuts so it has access to the active domain/proficiency filter).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') { e.preventDefault(); router.push(sessionHref); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, sessionHref]);

  const domainOrder = activeDomains(data.domains).map(domain => domain.id);
  // Everything in the queue has a due date and at least one attempt, so "New"
  // can't appear here — but a card logged once still reads New, not Struggling.
  const PROFICIENCY_ORDER = QUEUE_PROFICIENCY_OPTIONS;
  const levelLabel = (it: { interval_level: number; next_due_date?: string | null; attempt_count?: number }) =>
    proficiencyLabel(it.interval_level, !!it.next_due_date, it.attempt_count ?? 0);

  // allQueue stays unfiltered — it feeds the dropdown options below, which have
  // to reflect the whole queue. `items` is the filtered view, built from the
  // same spec the Start Session button links to.
  const allQueue = reviewQueue(data, today, filterOrder);
  const items = buildPracticeSet(data, spec, today);

  // Group the queue by due date (already sorted by due date, in whichever
  // direction the order filter asks for) so questions due on different days get
  // a dated divider + count, like the domain pages. This is a run-length
  // grouper, so it stays correct in both directions — equal dates are
  // contiguous either way — but it would break if a second sort key were ever
  // interleaved at the same level as the date.
  const dueGroups: { dateKey: string; label: string; items: typeof items }[] = [];
  for (const it of items) {
    const dateKey = (it.next_due_date ?? '').slice(0, 10);
    const last = dueGroups[dueGroups.length - 1];
    if (last && last.dateKey === dateKey) last.items.push(it);
    else dueGroups.push({ dateKey, label: dateKey ? fmtDateOrToday(dateKey) : '', items: [it] });
  }

  // Each dropdown's options reflect the OTHER active filter, not itself — so
  // picking DSA won't leave stale proficiency options on screen that have zero
  // matches once combined with the domain you actually selected, and vice versa.
  const queueForDomainOptions = allQueue.filter(it =>
    !filterProficiency || matchesProficiency(it, filterProficiency, it.attempt_count),
  );
  const queueForProficiencyOptions = allQueue.filter(it =>
    !filterDomain || it.domain === filterDomain,
  );

  const availableDomains = domainOrder
    .filter(d => queueForDomainOptions.some(it => it.domain === d))
    .map(d => ({ value: d, label: resolveDomain(data.domains, d).name }));
  const availableProficiencies = PROFICIENCY_ORDER
    .filter(p => queueForProficiencyOptions.some(it => levelLabel(it) === p));

  // Reviewed (re-attempts) today — matches the server's todayCount / todayByDomain.
  const { reviewed } = historyBuckets(data, today);
  const todayCount = reviewed.length;
  const todayByDomain: Record<string, number> = {};
  for (const r of reviewed) todayByDomain[r.domain] = (todayByDomain[r.domain] ?? 0) + 1;

  // Look a couple of months ahead so the forecast can page past the first week.
  const upcomingRows = forecast(data, today, clientDaysFromNow(UPCOMING_MAX_WEEKS * UPCOMING_WEEK_DAYS));

  const conceptDue = items.length;

  // Scope "done today" to the active filters so the ring/headline match the
  // filtered list. Proficiency is matched on the item's CURRENT level (a review
  // you complete can move it up a level, so it may then fall outside the filter).
  const inScope = (r: { domain: string; interval_level: number; next_due_date: string | null }) =>
    (!filterDomain || r.domain === filterDomain) &&
    (!filterProficiency || matchesProficiency(r as unknown as Problem, filterProficiency));
  const doneToday   = (filterDomain || filterProficiency) ? reviewed.filter(inScope).length : todayCount;
  const totalToday  = doneToday + items.length;
  const progressPct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
  // Archived domains are out of the streak too, so this and the Stats page's
  // streak read the same number off the same cards.
  const streak      = computeStreak(activeCards(data).attempts.map(a => a.attempted_at), today);

  const pendingByDomain: Record<string, number> = {};
  for (const item of items) {
    pendingByDomain[item.domain] = (pendingByDomain[item.domain] ?? 0) + 1;
  }

  const activeSummaryDomains = domainOrder.filter(
    d => (todayByDomain[d] ?? 0) + (pendingByDomain[d] ?? 0) > 0,
  );

  const upcomingWeeks = buildForecastWeeks(upcomingRows, today);

  if (!ready) return <ReviewQueueSkeleton order={filterOrder} />;

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
            <p className="text-sm text-muted mt-1">{queueSubtitle(filterOrder)}</p>
          </div>
          {/* Tablet + desktop: inline actions (wrap as a unit if the row gets tight) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Link
              href="/review/history"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-fg text-sm font-medium rounded-lg hover:border-border-strong transition-colors"
            >
              <History size={13} /> Today&apos;s History
              {todayCount > 0 && <span className="opacity-50 font-normal">({todayCount})</span>}
              <span className="hidden lg:inline opacity-30 text-xs font-normal ml-0.5">H</span>
            </Link>
            {conceptDue > 0 && (
              <Link
                href={sessionHref}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Play size={13} /> Start Session
                <span className="opacity-70 font-normal">({conceptDue})</span>
                <span className="hidden lg:inline opacity-40 text-xs font-normal ml-0.5">Enter</span>
              </Link>
            )}
          </div>
        </div>

        {/* Phone: full-width stacked actions for easy tapping */}
        <div className="flex sm:hidden items-center gap-2 mt-4">
          <Link
            href="/review/history"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface border border-border text-fg text-sm font-medium rounded-xl hover:border-border-strong transition-colors"
          >
            <History size={14} /> History
            {todayCount > 0 && <span className="opacity-50 font-normal">({todayCount})</span>}
          </Link>
          {conceptDue > 0 ? (
            <Link
              href={sessionHref}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Play size={14} /> Start Session
              <span className="opacity-70 font-normal">({conceptDue})</span>
            </Link>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface border border-border text-muted text-sm font-medium rounded-xl opacity-50 cursor-default">
              <Play size={14} /> All caught up
            </span>
          )}
        </div>
      </div>

      {/* Today's progress summary */}
      {totalToday > 0 && (
        <div className="mb-5 bg-surface border border-border rounded-xl px-4 py-3.5 flex flex-col gap-3">
          {/* Overall — progress ring + streak */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
                <circle cx="28" cy="28" r="23" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="23" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={144.513}
                  strokeDashoffset={144.513 * (1 - progressPct / 100)}
                  transform="rotate(-90 28 28)"
                  className="transition-[stroke-dashoffset] duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular text-fg">
                {progressPct}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">Today&apos;s progress</span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-2 bg-accent-2/10 px-2 py-0.5 rounded-full shrink-0">
                    <Flame size={12} /> {streak}-day streak
                  </span>
                )}
              </div>
              <div className="text-xs text-muted mt-1 tabular">
                <span className="text-accent font-semibold">{doneToday}</span> / {totalToday} done
                {items.length > 0 && <span> · {items.length} remaining</span>}
              </div>
            </div>
          </div>

          {/* Per-domain chips — single row */}
          {activeSummaryDomains.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap pt-0.5 border-t border-border">
              {activeSummaryDomains.map(d => {
                const definition = resolveDomain(data.domains, d);
                const palette = domainPalette(definition.color);
                const done  = todayByDomain[d] ?? 0;
                const total = done + (pendingByDomain[d] ?? 0);
                return (
                  <span key={d} className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${palette.dot}`} />
                    <span className="whitespace-nowrap">
                      {definition.name}
                      <span className="mx-1 opacity-30">·</span>
                      <span className={done > 0 ? 'text-fg font-medium' : ''}>{done}</span>
                      <span className="opacity-50">/{total}</span>
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ReviewQueueFilters
        currentDomain={filterDomain}
        currentProficiency={filterProficiency}
        currentOrder={filterOrder}
        availableDomains={availableDomains}
        availableProficiencies={availableProficiencies}
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <Check size={22} className="text-accent" />
          </div>
          <p className="text-fg font-medium">Nothing due</p>
          <p className="text-muted text-sm mt-1">You&apos;re all caught up. Come back tomorrow.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {dueGroups.map((group, gi) => (
            <div key={group.dateKey || gi}>
              <div className={`flex items-center gap-3 ${gi === 0 ? 'pb-2.5' : 'py-3'}`}>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-medium text-muted/50 tracking-wide uppercase whitespace-nowrap">
                  {group.label}
                  <span className="ml-1.5 opacity-60">· Count: {group.items.length}</span>
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex flex-col gap-2.5">
                {group.items.map(item => (
                  <ReviewQueueItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <UpcomingForecast weeks={upcomingWeeks} />
    </div>
  );
}

// The Suspense fallback renders before useSearchParams is available, so the
// order is optional there and falls back to the default caption.
function ReviewQueueSkeleton({ order = DEFAULT_QUEUE_ORDER }: { order?: QueueOrder }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted mt-1">{queueSubtitle(order)}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<ReviewQueueSkeleton />}>
      <ReviewQueueInner />
    </Suspense>
  );
}
