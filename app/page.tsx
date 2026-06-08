import { getDb } from '@/lib/db';
import { ReviewQueueItem as RQI } from '@/lib/types';
import ReviewQueueItemCard from '@/components/ReviewQueueItem';
import Link from 'next/link';
import { Check, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
    WHERE p.next_due_date <= date('now')
    ORDER BY p.next_due_date ASC
  `).all() as RQI[];

  const conceptDue = items.filter(i => i.domain !== 'dsa').length;

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
    </div>
  );
}
