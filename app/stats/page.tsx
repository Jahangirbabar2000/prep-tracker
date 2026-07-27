'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';
import DomainBadge from '@/components/DomainBadge';
import HistoryFilters from '@/components/HistoryFilters';
import InfoTooltip from '@/components/InfoTooltip';
import { useStore } from '@/lib/store/store';
import { clientToday } from '@/lib/store/queries';
import { computeMetrics } from '@/lib/store/metrics';
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

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4">
      <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-fg tabular mt-1">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendBadge({ recent, prior, higherIsBetter = false, title, unit = '%' }: {
  recent: number; prior: number; higherIsBetter?: boolean; title: string; unit?: string;
}) {
  const diff = recent - prior;
  if (prior === 0 && recent === 0) return null;

  const flat = Math.abs(diff) < 1;
  const improving = higherIsBetter ? diff > 0 : diff < 0;
  const Icon = flat ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  const cls = flat ? 'text-muted' : improving ? 'text-accent' : 'text-danger';
  const label = flat ? 'flat vs prior week' : `${Math.abs(diff)}pt ${improving ? 'better' : 'worse'} vs prior week`;

  const tip = (
    <div className="text-xs text-fg/90 leading-relaxed">
      <p className="font-semibold text-fg mb-1">{title}</p>
      <p>
        Last 7 days (<span className="tabular font-medium text-fg">{recent}{unit}</span>) vs the 7 days before that
        {' '}(<span className="tabular font-medium text-fg">{prior}{unit}</span>). {higherIsBetter ? 'Higher' : 'Lower'} is better.
      </p>
    </div>
  );

  return (
    <InfoTooltip content={tip} width={280}>
      <span className={`inline-flex items-center gap-1 text-xs font-medium underline decoration-dotted decoration-muted/50 underline-offset-4 ${cls}`}>
        <Icon size={12} /> {label}
      </span>
    </InfoTooltip>
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

  const m = computeMetrics(data, clientToday(), filterDomain || undefined);
  const proficiencyOrder: Array<keyof typeof m.proficiencyCounts> = ['New', 'Struggling', 'Learning', 'Familiar', 'Confident'];
  const proficiencyTotal = Object.values(m.proficiencyCounts).reduce((a, b) => a + b, 0) || 1;
  const showRecallTrend = m.recallRateRecent !== null && m.recallRatePrior !== null;

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Stats {filterDomain && <span className="text-muted font-normal">· {DOMAIN_LABEL[filterDomain]}</span>}
        </h1>
        <p className="text-sm text-muted mt-1">Whether it&apos;s sticking, whether you&apos;re keeping up, and what keeps slipping.</p>
      </div>

      <HistoryFilters currentDomain={filterDomain} basePath="/stats" />

      {/* Headline KPIs — retention, adherence, maturity, consistency */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Recall on reviews (7d)"
          value={m.recallRateRecent === null ? '—' : `${m.recallRateRecent}%`}
          sub={m.reviewCountRecent > 0 ? `${m.reviewCountRecent} reviews` : 'no reviews yet'}
        />
        <StatCard
          label="Due to review"
          value={m.dueCount}
          sub={m.dueCount > 0 ? `avg ${m.avgDaysOverdue}d overdue · oldest ${m.oldestOverdueAge}d` : 'all caught up'}
        />
        <StatCard
          label="Mastered"
          value={m.familiarPlusCount}
          sub={
            <>
              {m.confidentCount} confident ·{' '}
              <InfoTooltip
                content={
                  <div className="text-xs text-fg/90 leading-relaxed">
                    <p className="font-semibold text-fg mb-1">Net level movement (7d)</p>
                    <p>Promotions minus demotions across your reviews this week — getting a review right moves an item up a level, struggling moves it down.</p>
                  </div>
                }
                width={280}
              >
                <span className="underline decoration-dotted decoration-muted/50 underline-offset-4">
                  net {signed(m.netLevelMovement7d)} (7d)
                </span>
              </InfoTooltip>
            </>
          }
        />
        <StatCard
          label="Reviews this week"
          value={m.reviewsCompleted7d}
          sub={`${m.streak}-day streak`}
        />
      </div>

      {showRecallTrend && (
        <div className="-mt-3">
          <TrendBadge recent={m.recallRateRecent!} prior={m.recallRatePrior!} higherIsBetter title="Recall-rate trend" />
        </div>
      )}

      {/* Proficiency distribution */}
      <section>
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Proficiency Distribution</h2>
        <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-col gap-3">
          <div className="h-3 rounded-full overflow-hidden flex bg-surface-2">
            {proficiencyOrder.map(key => {
              const n = m.proficiencyCounts[key];
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
                {key} <span className="text-fg font-medium tabular">{m.proficiencyCounts[key]}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Mastery by domain — only meaningful when not already scoped to one domain */}
      {!filterDomain && (
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Mastery by Domain <span className="normal-case font-normal text-muted/70">— % at Familiar+ (retained, not just attempted)</span>
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {m.masteryByDomain.map((d, i) => (
              <div key={d.domain} className={`px-5 py-3.5 flex items-center gap-4 ${i > 0 ? 'border-t border-border' : ''}`}>
                <div className="w-32 shrink-0"><DomainBadge domain={d.domain} /></div>
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${DOMAIN_DOT[d.domain]}`} style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted tabular shrink-0 w-28 text-right">
                  <span className="text-fg font-medium">{d.familiarPlus}</span>/{d.total} mastered
                </div>
                <div className="text-xs text-muted tabular shrink-0 w-24 text-right">
                  {d.attempts} attempts
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leeches — items that matured then lapsed */}
      <section>
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Leeches <span className="normal-case font-normal text-muted/70">
            — {m.leechesAreFallback ? 'still stuck after 3+ attempts' : 'reached Familiar+, then lapsed'}
          </span>
        </h2>
        {m.leeches.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-6 text-center">
            <p className="text-sm text-muted">None right now — nothing has lapsed after maturing.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {m.leeches.map((c, i) => (
              <Link
                key={c.id}
                href={`${c.domain === 'system_design' ? '/system-design' : c.domain === 'python' ? '/backend' : `/${c.domain}`}/${c.id}`}
                className={`px-5 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <AlertCircle size={14} className="text-danger shrink-0" />
                <span className="text-sm text-fg flex-1 truncate">{c.name}</span>
                <DomainBadge domain={c.domain} showIcon={false} />
                <span className="text-xs text-danger font-semibold tabular shrink-0">
                  {c.lapseCount > 0 ? `${c.lapseCount}× lapsed` : `${c.attemptCount}× attempted`}
                </span>
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
