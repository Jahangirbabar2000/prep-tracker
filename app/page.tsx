import { getDb } from '@/lib/db';
import { ReviewQueueItem as RQI } from '@/lib/types';
import ReviewQueueItemCard from '@/components/ReviewQueueItem';
import UpcomingForecast from '@/components/UpcomingForecast';
import Link from 'next/link';
import { Check, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ReviewQueuePage() {
  const db = getDb();

  const items = db.prepare(`
    SELECT
      p.*,
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
    WHERE p.next_due_date <= date('now', 'localtime')
    ORDER BY p.next_due_date ASC
  `).all() as RQI[];

  const conceptDue = items.filter(i => i.domain !== 'dsa').length;

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
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted mt-1">Everything due across all domains, most overdue first.</p>
        </div>
        <div className="flex items-center gap-3">
          {conceptDue > 0 && (
            <Link
              href="/review/session"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
            >
              <Play size={13} /> Start Session
              <span className="opacity-70 font-normal">({conceptDue})</span>
            </Link>
          )}
          {items.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent tabular">
              {items.length} due
            </span>
          )}
        </div>
      </div>

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
