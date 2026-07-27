'use client';

import { Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Minus, AlertCircle, Target, Inbox, GraduationCap, Flame, type LucideIcon } from 'lucide-react';
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

type Tone = 'accent' | 'danger' | 'magenta';
const CHIP: Record<Tone, string> = {
  accent:  'bg-accent/10 text-accent',
  danger:  'bg-danger/10 text-danger',
  magenta: 'bg-accent-2/10 text-accent-2',
};
const FILL: Record<Tone, string> = { accent: 'bg-accent', danger: 'bg-danger', magenta: 'bg-accent-2' };

function StatCard({ icon: Icon, tone = 'accent', label, value, sub, topRight, viz, tip }: {
  icon: LucideIcon; tone?: Tone; label: string; value: ReactNode; sub?: ReactNode;
  topRight?: ReactNode; viz?: ReactNode; tip: ReactNode;
}) {
  return (
    <InfoTooltip className="block h-full" width={300} content={tip}>
      <div className="h-full bg-surface border border-border rounded-xl p-4 flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 hover:border-border-strong transition-all duration-200">
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${CHIP[tone]}`}>
            <Icon size={16} />
          </span>
          {topRight}
        </div>
        <div>
          <p className="text-[11px] text-muted font-medium uppercase tracking-wide">{label}</p>
          <p className="text-[26px] font-bold text-fg tabular leading-none mt-1">{value}</p>
        </div>
        {viz}
        {sub && <p className="text-xs text-muted mt-auto pt-0.5">{sub}</p>}
      </div>
    </InfoTooltip>
  );
}

function MicroBar({ pct, tone = 'accent' }: { pct: number; tone?: Tone }) {
  return (
    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
      <div className={`h-full rounded-full ${FILL[tone]} transition-[width] duration-500`}
           style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** 7-day review activity — echoes the review-queue forecast bars. */
function MiniBars({ values, tone = 'magenta' }: { values: number[]; tone?: Tone }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-6">
      {values.map((v, i) => (
        <div key={i} className="flex-1 h-full rounded-sm bg-surface-2 flex items-end overflow-hidden">
          <div className={`w-full rounded-sm ${FILL[tone]}`}
               style={{ height: v > 0 ? `${Math.max(18, (v / max) * 100)}%` : '0%' }} />
        </div>
      ))}
    </div>
  );
}

/** Compact corner delta for the recall card (higher recall = better). */
function CornerTrend({ recent, prior }: { recent: number; prior: number }) {
  const diff = recent - prior;
  if (Math.abs(diff) < 1) {
    return <span className="text-[11px] font-medium text-muted inline-flex items-center gap-0.5"><Minus size={11} /> flat</span>;
  }
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${diff > 0 ? 'text-accent' : 'text-danger'}`}>
      <Icon size={11} /> {Math.abs(diff)}pt
    </span>
  );
}

function Tip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="text-xs text-fg/90 leading-relaxed">
      <p className="font-semibold text-fg mb-1">{title}</p>
      <p>{children}</p>
    </div>
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
          icon={Target}
          tone="accent"
          label="Recall on reviews (7d)"
          value={m.recallRateRecent === null ? '—' : `${m.recallRateRecent}%`}
          topRight={showRecallTrend ? <CornerTrend recent={m.recallRateRecent!} prior={m.recallRatePrior!} /> : undefined}
          viz={m.recallRateRecent !== null ? <MicroBar pct={m.recallRateRecent} tone="accent" /> : undefined}
          sub={m.reviewCountRecent > 0 ? `${m.reviewCountRecent} reviews` : 'no reviews yet'}
          tip={
            <Tip title="Recall on reviews">
              Of your scheduled reviews in the last 7 days — repeat attempts, not first-ever sightings — the share you got right without struggling. This is the clearest sign spaced repetition is working: can you retrieve what you&apos;ve seen before? Higher is better.
            </Tip>
          }
        />
        <StatCard
          icon={Inbox}
          tone={m.dueCount > 0 ? 'danger' : 'accent'}
          label="Due to review"
          value={m.dueCount}
          sub={m.dueCount > 0 ? `avg ${m.avgDaysOverdue}d overdue · oldest ${m.oldestOverdueAge}d` : 'all caught up'}
          tip={
            <Tip title="Due to review">
              Questions whose next review date has arrived or passed. Spaced repetition only works if you review on time — a growing backlog means recall is decaying faster than you refresh it. Shows the average and oldest overdue age.
            </Tip>
          }
        />
        <StatCard
          icon={GraduationCap}
          tone="accent"
          label="Retained"
          value={m.familiarPlusCount}
          topRight={
            <span className={`text-[11px] font-medium tabular ${m.netLevelMovement7d > 0 ? 'text-accent' : m.netLevelMovement7d < 0 ? 'text-danger' : 'text-muted'}`}>
              {signed(m.netLevelMovement7d)} <span className="text-muted font-normal">7d</span>
            </span>
          }
          viz={<MicroBar pct={m.totalProblems ? Math.round((m.familiarPlusCount / m.totalProblems) * 100) : 0} tone="accent" />}
          sub={`${m.confidentCount} confident of ${m.totalProblems}`}
          tip={
            <Tip title="Retained">
              Questions that have stuck — at Familiar or Confident, meaning they&apos;ve survived multiple spaced reviews (intervals of 14–30 days). &ldquo;+N 7d&rdquo; is promotions minus demotions this week: getting a review right moves an item up a level, struggling moves it down. Positive means things are graduating to longer intervals.
            </Tip>
          }
        />
        <StatCard
          icon={Flame}
          tone="magenta"
          label="Reviews this week"
          value={m.reviewsCompleted7d}
          viz={<MiniBars values={m.reviewsByDay7d} tone="magenta" />}
          sub={`${m.streak}-day streak`}
          tip={
            <Tip title="Reviews this week">
              Review attempts completed in the last 7 days (first-ever attempts don&apos;t count), shown as a per-day bar, plus your consecutive-day streak. Consistency is the input that drives everything else — retention and maturity follow from showing up.
            </Tip>
          }
        />
      </div>

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
            Retention by Domain <span className="normal-case font-normal text-muted/70">— % at Familiar+ (retained, not just attempted)</span>
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
                  <span className="text-fg font-medium">{d.familiarPlus}</span>/{d.total} retained
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
