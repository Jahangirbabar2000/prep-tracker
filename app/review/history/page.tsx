import { getDb } from '@/lib/db';
import { fmtDate } from '@/lib/fmt';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import DomainBadge from '@/components/DomainBadge';
import ProficiencyBadge from '@/components/ProficiencyBadge';
import { Domain } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface TodayAttempt {
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
  difficulty: string | null;
  pattern_tag: string | null;
  sd_category: string | null;
  fe_bucket: string | null;
  py_category: string | null;
}

function domainPath(domain: string) {
  return domain === 'system_design' ? '/system-design' : `/${domain}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const DOMAIN_ORDER: Domain[] = ['dsa', 'python', 'frontend', 'system_design'];
const DOMAIN_LABEL: Record<Domain, string> = {
  dsa: 'DSA',
  system_design: 'System Design',
  frontend: 'Frontend',
  python: 'Python',
};

export default function TodayHistoryPage() {
  const db = getDb();

  const attempts = db.prepare(`
    SELECT
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
      p.fe_bucket,
      p.py_category
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE substr(a.attempted_at, 1, 10) = date('now', 'localtime')
    ORDER BY a.attempted_at DESC
  `).all() as TodayAttempt[];

  const total      = attempts.length;
  const struggled  = attempts.filter(a => a.struggled).length;
  const gotIt      = total - struggled;

  // Per-domain counts
  const byDomain: Partial<Record<Domain, number>> = {};
  for (const a of attempts) {
    byDomain[a.domain] = (byDomain[a.domain] ?? 0) + 1;
  }

  const today = new Date().toLocaleDateString('en-CA');

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors mb-2"
          >
            <ArrowLeft size={13} /> Review Queue
          </Link>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Today&apos;s Review</h1>
          <p className="text-sm text-muted mt-0.5">{fmtDate(today)}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-fg font-medium">No reviews yet today.</p>
          <p className="text-sm text-muted mt-1 mb-5">Start a session to see your progress here.</p>
          <Link
            href="/review/session"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            Start Session
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-bold text-fg tabular">{total}</p>
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

            {/* Domain breakdown */}
            {Object.keys(byDomain).length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
                {DOMAIN_ORDER.filter(d => byDomain[d]).map(d => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-full"
                  >
                    <span className="font-medium text-fg">{byDomain[d]}</span>
                    {DOMAIN_LABEL[d]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attempt list */}
          <div className="flex flex-col gap-2">
            {attempts.map(a => {
              const tag = a.pattern_tag ?? a.sd_category ?? a.fe_bucket ?? a.py_category;
              return (
                <div
                  key={a.attempt_id}
                  className="group flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl"
                >
                  {/* Struggled/got-it bar */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${a.struggled ? 'bg-danger/60' : 'bg-accent/40'}`} />

                  {/* Domain badge */}
                  <div className="shrink-0">
                    <DomainBadge domain={a.domain} showIcon={false} />
                  </div>

                  {/* Name + tag + proficiency */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`${domainPath(a.domain)}/${a.id}`}
                      className="font-medium text-fg hover:text-accent transition-colors truncate block"
                    >
                      {a.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <ProficiencyBadge
                        level={a.interval_level}
                        nextDueDate={a.next_due_date ? fmtDate(a.next_due_date) : null}
                      />
                      {tag && (
                        <span className="text-xs text-muted">{tag}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: result + time */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {a.struggled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
                        <XCircle size={13} /> Struggled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                        <CheckCircle2 size={13} /> Got it
                      </span>
                    )}
                    <span className="text-[11px] text-muted tabular">{fmtTime(a.attempted_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
