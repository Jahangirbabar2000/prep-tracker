'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';
import DomainBadge from '@/components/DomainBadge';
import HistoryFilters from '@/components/HistoryFilters';
import { useStore } from '@/lib/store/store';
import { overallStats } from '@/lib/store/queries';
import { Domain } from '@/lib/types';

const DOMAIN_DOT: Record<Domain, string> = {
  dsa:           'bg-blue-500',
  system_design: 'bg-orange-500',
  frontend:      'bg-violet-500',
  python:        'bg-emerald-500',
  ai:            'bg-rose-500',
  lld:           'bg-amber-500',
  behavioral:    'bg-teal-500',
};

const DOMAIN_LABEL: Record<Domain, string> = {
  dsa: 'DSA', system_design: 'System Design', frontend: 'Frontend', python: 'Backend', ai: 'AI', lld: 'LLD', behavioral: 'Behavioral',
};

const PROFICIENCY_COLOR: Record<string, string> = {
  New:        'bg-surface-2',
  Struggling: 'bg-danger',
  Learning:   'bg-orange-500',
  Familiar:   'bg-blue-500',
  Confident:  'bg-accent',
};

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4">
      <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-fg tabular mt-1">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendBadge({ recent, prior }: { recent: number; prior: number }) {
  const diff = recent - prior;
  if (prior === 0 && recent === 0) return null;
  if (Math.abs(diff) < 1) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted"><Minus size={12} /> flat vs prior week</span>;
  }
  const improving = diff < 0; // lower struggle rate = improving
  const Icon = improving ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${improving ? 'text-accent' : 'text-danger'}`}>
      <Icon size={12} /> {Math.abs(diff)}pt {improving ? 'better' : 'worse'} vs prior week
    </span>
  );
}

function StatsInner() {
  const sp = useSearchParams();
  const { data, ready } = useStore();
  const filterDomain = (sp.get('domain') ?? '') as Domain | '';

  if (!ready) {
    return (
      <div className="max-w-4xl flex flex-col gap-4">
        <div className="h-8 w-40 bg-surface border border-border rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const s = overallStats(data, filterDomain || undefined);
  const proficiencyOrder: Array<keyof typeof s.proficiencyCounts> = ['New', 'Struggling', 'Learning', 'Familiar', 'Confident'];
  const proficiencyTotal = Object.values(s.proficiencyCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Stats {filterDomain && <span className="text-muted font-normal">· {DOMAIN_LABEL[filterDomain]}</span>}
        </h1>
        <p className="text-sm text-muted mt-1">How much you&apos;ve done, and whether it&apos;s actually sticking.</p>
      </div>

      <HistoryFilters currentDomain={filterDomain} basePath="/stats" />

      {/* Top-line numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Attempts" value={s.totalAttempts} />
        <StatCard
          label="Questions Attempted"
          value={s.attemptedProblems}
          sub={`of ${s.totalProblems} total`}
        />
        <StatCard
          label="Struggled Rate (all-time)"
          value={`${s.struggledRateOverall}%`}
        />
        <StatCard
          label="Struggled Rate (7d)"
          value={s.recentAttemptCount > 0 ? `${s.struggledRateRecent}%` : '—'}
          sub={s.recentAttemptCount > 0 ? `${s.recentAttemptCount} attempts` : 'no attempts yet'}
        />
      </div>

      {s.recentAttemptCount > 0 && (
        <div className="-mt-3">
          <TrendBadge recent={s.struggledRateRecent} prior={s.struggledRatePrior} />
        </div>
      )}

      {/* Proficiency distribution */}
      <section>
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Proficiency Distribution</h2>
        <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-col gap-3">
          <div className="h-3 rounded-full overflow-hidden flex bg-surface-2">
            {proficiencyOrder.map(key => {
              const n = s.proficiencyCounts[key];
              if (!n) return null;
              return (
                <div
                  key={key}
                  className={PROFICIENCY_COLOR[key]}
                  style={{ width: `${(n / proficiencyTotal) * 100}%` }}
                  title={`${key}: ${n}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {proficiencyOrder.map(key => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={`w-2 h-2 rounded-full shrink-0 ${PROFICIENCY_COLOR[key]}`} />
                {key} <span className="text-fg font-medium tabular">{s.proficiencyCounts[key]}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Per-domain coverage — only meaningful when not already scoped to one domain */}
      {!filterDomain && (
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Coverage by Domain</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {s.byDomain.map((d, i) => {
              const pct = d.total > 0 ? Math.round((d.attempted / d.total) * 100) : 0;
              return (
                <div key={d.domain} className={`px-5 py-3.5 flex items-center gap-4 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="w-32 shrink-0"><DomainBadge domain={d.domain} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${DOMAIN_DOT[d.domain]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-xs text-muted tabular shrink-0 w-28 text-right">
                    <span className="text-fg font-medium">{d.attempted}</span>/{d.total} covered
                  </div>
                  <div className="text-xs text-muted tabular shrink-0 w-24 text-right">
                    {d.attempts} attempts
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Chronic strugglers */}
      <section>
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Chronic Strugglers <span className="normal-case font-normal text-muted/70">— still stuck after 3+ attempts</span>
        </h2>
        {s.chronicStrugglers.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-6 text-center">
            <p className="text-sm text-muted">None right now — nothing has resisted 3+ attempts.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {s.chronicStrugglers.map((c, i) => (
              <Link
                key={c.id}
                href={`${c.domain === 'system_design' ? '/system-design' : c.domain === 'python' ? '/backend' : `/${c.domain}`}/${c.id}`}
                className={`px-5 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <AlertCircle size={14} className="text-danger shrink-0" />
                <span className="text-sm text-fg flex-1 truncate">{c.name}</span>
                <DomainBadge domain={c.domain} showIcon={false} />
                <span className="text-xs text-danger font-semibold tabular shrink-0">{c.attempt_count}× struggled</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={null}>
      <StatsInner />
    </Suspense>
  );
}
