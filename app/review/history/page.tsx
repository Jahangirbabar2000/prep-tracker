import { queryAll, localToday } from '@/lib/db';
import { fmtDate } from '@/lib/fmt';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HistoryFilters from '@/components/HistoryFilters';
import HistoryList, { TodayAttempt } from '@/components/HistoryList';
import { Domain } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DOMAIN_ORDER: Domain[] = ['dsa', 'python', 'frontend', 'system_design', 'ai'];
const DOMAIN_LABEL: Record<Domain, string> = {
  dsa: 'DSA', system_design: 'System Design', frontend: 'Frontend', python: 'Backend', ai: 'AI',
};

const BASE_COLS = `
  a.id          AS attempt_id,
  a.attempted_at,
  a.struggled,
  a.time_taken_mins,
  a.practice_type,
  p.id,
  p.name,
  p.domain,
  p.interval_level,
  p.next_due_date,
  p.difficulty,
  p.pattern_tag,
  p.sd_category,
  p.sd_topic,
  p.fe_bucket,
  p.py_category,
  p.ai_category,
  (SELECT COUNT(*) FROM attempts WHERE problem_id = p.id) AS attempt_count
`;

export default async function TodayHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const filterDomain = sp.domain ?? '';
  const domainClause = filterDomain ? ` AND p.domain = '${filterDomain}'` : '';
  const today = localToday();

  const [reviewed, added] = await Promise.all([
    queryAll<TodayAttempt>(`
      SELECT ${BASE_COLS}
      FROM attempts a
      JOIN problems p ON p.id = a.problem_id
      WHERE substr(a.attempted_at, 1, 10) = ?
        AND EXISTS (SELECT 1 FROM attempts prev WHERE prev.problem_id = a.problem_id AND substr(prev.attempted_at,1,10) < ?)
        ${domainClause}
      ORDER BY a.attempted_at DESC
    `, [today, today]),

    queryAll<TodayAttempt>(`
      SELECT ${BASE_COLS}
      FROM attempts a
      JOIN problems p ON p.id = a.problem_id
      WHERE substr(a.attempted_at, 1, 10) = ?
        AND NOT EXISTS (SELECT 1 FROM attempts prev WHERE prev.problem_id = a.problem_id AND substr(prev.attempted_at,1,10) < ?)
        ${domainClause}
      ORDER BY a.attempted_at DESC
    `, [today, today]),
  ]);

  const totalReviewed = reviewed.length;
  const struggled     = reviewed.filter(a => a.struggled).length;
  const gotIt         = totalReviewed - struggled;

  const byDomain: Partial<Record<Domain, number>> = {};
  for (const a of reviewed) byDomain[a.domain] = (byDomain[a.domain] ?? 0) + 1;

  const isEmpty = reviewed.length === 0 && added.length === 0;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors mb-2">
            <ArrowLeft size={13} /> Review Queue
          </Link>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Today&apos;s History</h1>
          <p className="text-sm text-muted mt-0.5">{fmtDate(today)}</p>
        </div>
      </div>

      <HistoryFilters currentDomain={filterDomain} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-fg font-medium">No activity yet today.</p>
          <p className="text-sm text-muted mt-1 mb-5">Start a session or log a question to see it here.</p>
          <Link href="/review/session" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors">
            Start Session
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats — reviews only */}
          {totalReviewed > 0 && (
            <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-fg tabular">{totalReviewed}</p>
                  <p className="text-xs text-muted mt-0.5">reviewed</p>
                </div>
                <div className="w-px h-8 bg-border shrink-0" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent tabular">{gotIt}</p>
                  <p className="text-xs text-muted mt-0.5">got it</p>
                </div>
                <div className="w-px h-8 bg-border shrink-0" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-danger tabular">{struggled}</p>
                  <p className="text-xs text-muted mt-0.5">struggled</p>
                </div>
              </div>
              {Object.keys(byDomain).length > 1 && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
                  {DOMAIN_ORDER.filter(d => byDomain[d]).map(d => (
                    <span key={d} className="inline-flex items-center gap-1.5 text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-full">
                      <span className="font-medium text-fg">{byDomain[d]}</span>
                      {DOMAIN_LABEL[d]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <HistoryList reviewed={reviewed} added={added} />
        </>
      )}
    </div>
  );
}
