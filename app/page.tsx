import { getDb } from '@/lib/db';
import { ReviewQueueItem as RQI } from '@/lib/types';
import ReviewQueueItemCard from '@/components/ReviewQueueItem';
import UpcomingForecast from '@/components/UpcomingForecast';
import ReviewQueueFilters from '@/components/ReviewQueueFilters';
import Link from 'next/link';
import { Check, History, Play } from 'lucide-react';
import { proficiencyClause } from '@/lib/filters';

export const dynamic = 'force-dynamic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function ReviewQueuePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();
  const filterDomain      = sp.domain      ?? '';
  const filterProficiency = sp.proficiency ?? '';

  // Only count reviews (problems attempted on a prior day), not first-time logs added today
  const { cnt: todayCount } = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM attempts a
    WHERE substr(a.attempted_at, 1, 10) = date('now', 'localtime')
      AND EXISTS (
        SELECT 1 FROM attempts prev
        WHERE prev.problem_id = a.problem_id
          AND substr(prev.attempted_at, 1, 10) < date('now', 'localtime')
      )
  `).get() as { cnt: number };

  // Per-domain reviewed count today (reviews only, not new logs)
  const todayByDomainRows = db.prepare(`
    SELECT p.domain, COUNT(*) AS cnt
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE substr(a.attempted_at, 1, 10) = date('now', 'localtime')
      AND EXISTS (
        SELECT 1 FROM attempts prev
        WHERE prev.problem_id = a.problem_id
          AND substr(prev.attempted_at, 1, 10) < date('now', 'localtime')
      )
    GROUP BY p.domain
  `).all() as { domain: string; cnt: number }[];
  const todayByDomain: Record<string, number> = {};
  for (const r of todayByDomainRows) todayByDomain[r.domain] = r.cnt;

  let queueQuery = `
    SELECT
      p.*,
      (SELECT COUNT(*) FROM attempts WHERE problem_id = p.id) AS attempt_count,
      a.attempted_at   AS last_attempted_at,
      a.struggled      AS last_struggled,
      CAST(julianday('now') - julianday(p.next_due_date) AS INTEGER) AS days_overdue
    FROM problems p
    JOIN attempts a ON a.id = (
      SELECT id FROM attempts
      WHERE problem_id = p.id
      ORDER BY attempted_at DESC
      LIMIT 1
    )
    WHERE p.next_due_date <= date('now', 'localtime')`;
  if (filterDomain)      queueQuery += ` AND p.domain = '${filterDomain}'`;
  if (filterProficiency) queueQuery += proficiencyClause(filterProficiency);
  queueQuery += ' ORDER BY p.next_due_date ASC';

  const items = db.prepare(queueQuery).all() as RQI[];

  const conceptDue = items.length; // all domains now supported in session

  // Today's progress summary
  const totalToday  = todayCount + items.length;
  const progressPct = totalToday > 0 ? Math.round((todayCount / totalToday) * 100) : 0;

  // Per-domain pending counts (from queue items)
  const pendingByDomain: Record<string, number> = {};
  for (const item of items) {
    pendingByDomain[item.domain] = (pendingByDomain[item.domain] ?? 0) + 1;
  }

  // All domains that have any activity today or are pending
  const DOMAIN_META: Record<string, { label: string; bar: string; dot: string }> = {
    dsa:           { label: 'DSA',           bar: 'bg-blue-500',   dot: 'bg-blue-500' },
    system_design: { label: 'System Design', bar: 'bg-orange-500', dot: 'bg-orange-500' },
    frontend:      { label: 'Frontend',      bar: 'bg-violet-500', dot: 'bg-violet-500' },
    python:        { label: 'Python',        bar: 'bg-emerald-500',dot: 'bg-emerald-500' },
    ai:            { label: 'AI',            bar: 'bg-rose-500',   dot: 'bg-rose-500' },
  };
  const DOMAIN_ORDER = ['dsa', 'system_design', 'frontend', 'python', 'ai'];
  const activeDomains = DOMAIN_ORDER.filter(
    d => (todayByDomain[d] ?? 0) + (pendingByDomain[d] ?? 0) > 0
  );

  // ── Upcoming 7-day forecast ───────────────────────────────────────────
  const upcomingRows = db.prepare(`
    SELECT p.next_due_date AS date, p.domain, COUNT(*) AS count
    FROM problems p
    WHERE p.next_due_date > date('now', 'localtime')
      AND p.next_due_date <= date('now', '+7 days', 'localtime')
    GROUP BY p.next_due_date, p.domain
    ORDER BY p.next_due_date ASC
  `).all() as { date: string; domain: string; count: number }[];

  // Per-date totals + per-date domain breakdown
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

  // Build 7 day slots (+1 … +7 from today)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted mt-1">Everything due across all domains, most overdue first.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/review/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-fg text-sm font-medium rounded-lg hover:border-border-strong transition-colors"
          >
            <History size={13} /> Today&apos;s History
            {todayCount > 0 && <span className="opacity-50 font-normal">({todayCount})</span>}
          </Link>
          {conceptDue > 0 && (
            <Link
              href="/review/session"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
            >
              <Play size={13} /> Start Session
              <span className="opacity-70 font-normal">({conceptDue})</span>
            </Link>
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

      <ReviewQueueFilters currentDomain={filterDomain} currentProficiency={filterProficiency} />

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
