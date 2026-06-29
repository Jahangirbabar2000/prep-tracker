'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReviewQueueItemCard from '@/components/ReviewQueueItem';
import UpcomingForecast from '@/components/UpcomingForecast';
import ReviewQueueFilters from '@/components/ReviewQueueFilters';
import Link from 'next/link';
import { Check, History, Play } from 'lucide-react';
import { useStore } from '@/lib/store/store';
import {
  reviewQueue, historyBuckets, forecast, matchesProficiency, clientToday, clientDaysFromNow,
} from '@/lib/store/queries';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ReviewQueueInner() {
  const sp = useSearchParams();
  const { data, ready } = useStore();
  const today = clientToday();
  const filterDomain      = sp.get('domain')      ?? '';
  const filterProficiency = sp.get('proficiency') ?? '';

  const DOMAIN_LABELS: Record<string, string> = {
    dsa: 'DSA', system_design: 'System Design', frontend: 'Frontend', python: 'Backend', ai: 'AI',
  };
  const QUEUE_DOMAIN_ORDER = ['dsa', 'system_design', 'frontend', 'python', 'ai'];
  const PROFICIENCY_ORDER = ['Struggling', 'Learning', 'Familiar', 'Confident', 'Mastered'];
  function levelLabel(l: number) {
    if (l === 0) return 'Struggling';
    if (l === 1) return 'Learning';
    if (l === 2) return 'Familiar';
    if (l === 3) return 'Confident';
    return 'Mastered';
  }

  const allQueue = reviewQueue(data, today);
  const items = allQueue.filter(it =>
    (!filterDomain || it.domain === filterDomain) &&
    (!filterProficiency || matchesProficiency(it, filterProficiency)),
  );

  const availableDomains = QUEUE_DOMAIN_ORDER
    .filter(d => allQueue.some(it => it.domain === d))
    .map(d => ({ value: d, label: DOMAIN_LABELS[d] }));
  const availableProficiencies = PROFICIENCY_ORDER
    .filter(p => allQueue.some(it => levelLabel(it.interval_level) === p));

  // Reviewed (re-attempts) today — matches the server's todayCount / todayByDomain.
  const { reviewed } = historyBuckets(data, today);
  const todayCount = reviewed.length;
  const todayByDomain: Record<string, number> = {};
  for (const r of reviewed) todayByDomain[r.domain] = (todayByDomain[r.domain] ?? 0) + 1;

  const upcomingRows = forecast(data, today, clientDaysFromNow(7));

  const conceptDue = items.length;

  const totalToday  = todayCount + items.length;
  const progressPct = totalToday > 0 ? Math.round((todayCount / totalToday) * 100) : 0;

  const pendingByDomain: Record<string, number> = {};
  for (const item of items) {
    pendingByDomain[item.domain] = (pendingByDomain[item.domain] ?? 0) + 1;
  }

  const DOMAIN_META: Record<string, { label: string; bar: string; dot: string }> = {
    dsa:           { label: 'DSA',           bar: 'bg-blue-500',   dot: 'bg-blue-500' },
    system_design: { label: 'System Design', bar: 'bg-orange-500', dot: 'bg-orange-500' },
    frontend:      { label: 'Frontend',      bar: 'bg-violet-500', dot: 'bg-violet-500' },
    python:        { label: 'Backend',        bar: 'bg-emerald-500',dot: 'bg-emerald-500' },
    ai:            { label: 'AI',            bar: 'bg-rose-500',   dot: 'bg-rose-500' },
  };
  const DOMAIN_ORDER = ['dsa', 'system_design', 'frontend', 'python', 'ai'];
  const activeDomains = DOMAIN_ORDER.filter(
    d => (todayByDomain[d] ?? 0) + (pendingByDomain[d] ?? 0) > 0,
  );

  const byDate: Record<string, number> = {};
  const byDateDomain: Record<string, Record<string, number>> = {};
  const domainTotals: Record<string, number> = {};
  for (const row of upcomingRows) {
    byDate[row.date] = (byDate[row.date] ?? 0) + row.count;
    byDateDomain[row.date] ??= {};
    byDateDomain[row.date][row.domain] = (byDateDomain[row.date][row.domain] ?? 0) + row.count;
    domainTotals[row.domain] = (domainTotals[row.domain] ?? 0) + row.count;
  }
  const totalUpcoming = Object.values(domainTotals).reduce((s, n) => s + n, 0);

  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const dateKey = d.toLocaleDateString('en-CA');
    return {
      dateKey,
      label:      i === 0 ? 'Tomorrow' : DAYS[d.getDay()],
      shortLabel: i === 0 ? 'Tmrw'     : DAYS[d.getDay()],
      total:      byDate[dateKey] ?? 0,
      domains:    byDateDomain[dateKey] ?? {},
    };
  });

  if (!ready) return <ReviewQueueSkeleton />;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
            <p className="text-sm text-muted mt-1">Everything due across all domains, most overdue first.</p>
          </div>
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href="/review/history"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-fg text-sm font-medium rounded-lg hover:border-border-strong transition-colors"
            >
              <History size={13} /> Today&apos;s History
              {todayCount > 0 && <span className="opacity-50 font-normal">({todayCount})</span>}
              <span className="opacity-30 text-xs font-normal ml-0.5">H</span>
            </Link>
            {conceptDue > 0 && (
              <Link
                href="/review/session"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Play size={13} /> Start Session
                <span className="opacity-70 font-normal">({conceptDue})</span>
                <span className="opacity-40 text-xs font-normal ml-0.5">Enter</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile buttons — full-width row below the title */}
        <div className="flex md:hidden items-center gap-2 mt-4">
          <Link
            href="/review/history"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface border border-border text-fg text-sm font-medium rounded-xl hover:border-border-strong transition-colors"
          >
            <History size={14} /> History
            {todayCount > 0 && <span className="opacity-50 font-normal">({todayCount})</span>}
          </Link>
          {conceptDue > 0 ? (
            <Link
              href="/review/session"
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
          {/* Overall */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Today&apos;s progress</span>
              <span className="tabular">
                <span className="text-accent font-semibold">{todayCount}</span>
                <span className="text-muted"> / {totalToday}</span>
                {items.length > 0 && <span className="text-muted"> · {items.length} remaining</span>}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Per-domain chips — single row */}
          {activeDomains.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap pt-0.5 border-t border-border">
              {activeDomains.map(d => {
                const meta  = DOMAIN_META[d];
                const done  = todayByDomain[d] ?? 0;
                const total = done + (pendingByDomain[d] ?? 0);
                return (
                  <span key={d} className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                    <span className="whitespace-nowrap">
                      {meta.label}
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
        <div className="flex flex-col gap-2.5">
          {items.map(item => (
            <ReviewQueueItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <UpcomingForecast
        slots={slots}
        domainTotals={domainTotals}
        totalUpcoming={totalUpcoming}
      />
    </div>
  );
}

function ReviewQueueSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted mt-1">Everything due across all domains, most overdue first.</p>
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
