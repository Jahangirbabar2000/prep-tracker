'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Clock, Plus, XCircle } from 'lucide-react';
import DomainBadge from './DomainBadge';
import ProficiencyBadge from './ProficiencyBadge';
import InfoTooltip from './InfoTooltip';
import { fmtDate } from '@/lib/fmt';
import { Domain } from '@/lib/types';
import { computeLoggedSessionTime, computeStudyVelocity } from '@/lib/studyVelocity';

export interface TodayAttempt {
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
  attempt_count: number;
  metadata: Record<string, string>;
}

import { allDomains, domainPath, isTimedMode, resolveDomain, tagsForMetadata } from '@/lib/domains';
import { useStore } from '@/lib/store/store';
function fmtTime(iso: string) {
  return new Date(iso.replace(' ', 'T')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}
function cardTag(a: TodayAttempt) {
  return a.metadata;
}
/** "45s/q" for sub-minute velocities, "1.5m/q" above a minute. */
function fmtVelocity(seconds: number): string {
  return seconds < 60 ? `${Math.round(seconds)}s/q` : `${(seconds / 60).toFixed(1)}m/q`;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   'text-emerald-400',
  Medium: 'text-amber-400',
  Hard:   'text-red-400',
};

/** Recall-rate color — same rough bands as the Stats page's recall card. */
function recallTone(pct: number): string {
  if (pct >= 80) return 'text-accent';
  if (pct >= 50) return 'text-amber-500';
  return 'text-danger';
}

// Flat row used inside a group
function AttemptRow({ a, last }: { a: TodayAttempt; last: boolean }) {
  const { data } = useStore();
  const [tag] = tagsForMetadata(a.domain, cardTag(a), data.domain_fields);
  const definition = resolveDomain(data.domains, a.domain);
  const isTimed = isTimedMode(definition.study_mode);
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${!last ? 'border-b border-border' : ''}`}>
      <div className={`w-1 self-stretch rounded-full shrink-0 ${a.struggled ? 'bg-danger/60' : 'bg-accent/40'}`} />
      <div className="flex-1 min-w-0">
        <Link
          href={`${domainPath(data.domains, a.domain)}/${a.id}`}
          className="text-sm font-medium text-fg hover:text-accent transition-colors truncate block"
        >
          {a.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <ProficiencyBadge
            level={a.interval_level}
            nextDueDate={a.next_due_date ? fmtDate(a.next_due_date) : null}
            attemptCount={a.attempt_count}
          />
          {isTimed && a.metadata.difficulty && (
            <span className={`text-xs font-medium ${DIFFICULTY_STYLE[a.metadata.difficulty] ?? 'text-muted'}`}>
              {a.metadata.difficulty}
            </span>
          )}
          {tag && <span className="text-xs text-muted">{tag}</span>}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        {a.struggled ? (
          <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
            <XCircle size={12} /> Struggled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
            <CheckCircle2 size={12} /> Got it
          </span>
        )}
        {isTimed && a.time_taken_mins > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted tabular">
            <Clock size={10} /> {a.time_taken_mins} min
          </span>
        )}
        <span className="text-[11px] text-muted tabular">{fmtTime(a.attempted_at)}</span>
      </div>
    </div>
  );
}

// Collapsible domain group for reviewed items — controlled from parent
function DomainGroup({ domain, attempts, open, onToggle }: { domain: Domain; attempts: TodayAttempt[]; open: boolean; onToggle: () => void }) {
  const { data } = useStore();
  const definition = resolveDomain(data.domains, domain);
  const isTimed = isTimedMode(definition.study_mode);
  const struggled = attempts.filter(a => a.struggled).length;
  const gotIt = attempts.length - struggled;
  const recallPct = attempts.length ? Math.round((gotIt / attempts.length) * 100) : 0;

  // DSA logs per-attempt solve time; other domains don't. Avg pace for DSA
  // comes from entered times. Session total = logged solve + inferred time
  // between questions (gap surplus beyond the next solve; long breaks excluded).
  const dsaSession = isTimed
    ? computeLoggedSessionTime(
        attempts.map(a => ({ attemptedAt: a.attempted_at, timeTakenMins: a.time_taken_mins })),
      )
    : null;
  const loggedMins = dsaSession?.loggedMins ?? 0;
  const betweenMins = dsaSession?.betweenMins ?? 0;
  const sessionMins = dsaSession?.sessionMins ?? 0;
  const timedCount = isTimed
    ? attempts.filter(a => a.time_taken_mins > 0).length
    : 0;
  const avgLoggedSeconds = timedCount > 0 ? (loggedMins / timedCount) * 60 : 0;
  const showBetweenRange = loggedMins > 0 && betweenMins > 0;

  // Passive study velocity — sole estimate for domains without per-attempt times.
  const velocity = computeStudyVelocity(attempts.map(a => a.attempted_at));
  const estimatedMins = Math.round(velocity.totalActiveSeconds / 60);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <DomainBadge domain={domain} showIcon={false} />
          <span className="text-sm font-semibold text-fg truncate">{definition.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <InfoTooltip content={
            <div className="flex flex-col gap-2">
              <p className="text-xs text-fg font-medium">Breakdown</p>
              <p className="text-[11px] text-muted leading-relaxed">
                <span className="text-fg font-medium tabular">{attempts.length}</span> reviewed —{' '}
                <span className="text-accent font-medium tabular">{gotIt} got it</span>,{' '}
                <span className="text-danger font-medium tabular">{struggled} struggled</span>.
              </p>
              {loggedMins > 0 ? (
                <>
                  <p className="text-[11px] text-muted leading-relaxed">
                    <span className="text-fg font-medium tabular">{fmtMins(loggedMins)}</span> logged — the sum of the solve
                    time you entered per attempt
                    {' '}(<span className="tabular">{fmtVelocity(avgLoggedSeconds)}</span> average).
                  </p>
                  {showBetweenRange ? (
                    <p className="text-[11px] text-muted leading-relaxed">
                      <span className="text-fg font-medium tabular">+{fmtMins(betweenMins)}</span> between questions —
                      wall-clock gaps beyond each next solve (long breaks excluded). Session total{' '}
                      <span className="text-fg font-medium tabular">~{fmtMins(sessionMins)}</span>.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted leading-relaxed">
                      No extra time detected between questions (gaps match solve times, or only one timed attempt).
                    </p>
                  )}
                </>
              ) : velocity.sampleSize > 0 ? (
                <p className="text-[11px] text-muted leading-relaxed">
                  <span className="text-fg font-medium tabular">~{fmtMins(estimatedMins)}</span> estimated — based on your
                  median pace of <span className="tabular">{fmtVelocity(velocity.medianDeltaSeconds)}</span> across {attempts.length} attempts.
                  {' '}This domain doesn&apos;t log a per-attempt time, so there&apos;s no logged total to compare against.
                </p>
              ) : null}
            </div>
          }>
            <span className="inline-flex items-center gap-1.5 text-xs tabular">
              <span className={`font-semibold ${recallTone(recallPct)}`}>{recallPct}%</span>
              <span className="text-muted">recall</span>
              <span className="text-muted/40">·</span>
              <span className="text-muted">{attempts.length} reviewed</span>
              {(loggedMins > 0 || velocity.sampleSize > 0) && <Clock size={11} className="text-muted/70 ml-0.5" />}
            </span>
          </InfoTooltip>
          <ChevronDown
            size={14}
            className="text-muted shrink-0 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: open
            ? 'grid-template-rows 200ms ease-out'
            : 'grid-template-rows 150ms ease-in',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="border-t border-border">
            {attempts.map((a, i) => (
              <AttemptRow key={a.attempt_id} a={a} last={i === attempts.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible domain group for added items — shows all 5 domains, greyed out if empty
function AddedDomainGroup({ domain, attempts }: { domain: Domain; attempts: TodayAttempt[] }) {
  const { data } = useStore();
  const definition = resolveDomain(data.domains, domain);
  const [open, setOpen] = useState(false);
  const hasItems = attempts.length > 0;
  const totalMins = isTimedMode(definition.study_mode)
    ? attempts.reduce((s, a) => s + (a.time_taken_mins || 0), 0)
    : 0;

  return (
    <div className={`border border-border rounded-xl overflow-hidden bg-surface transition-opacity ${!hasItems ? 'opacity-40' : ''}`}>
      <button
        onClick={() => { if (hasItems) setOpen(o => !o); }}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hasItems ? 'hover:bg-surface-2 cursor-pointer' : 'cursor-default'}`}
        aria-expanded={hasItems ? open : undefined}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <DomainBadge domain={domain} showIcon={false} />
          <span className="text-sm font-semibold text-fg">{definition.name}</span>
          <span className="text-xs text-muted tabular">{attempts.length} added</span>
          {totalMins > 0 && (
            <>
              <span className="text-muted/40 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted tabular">
                <Clock size={11} /> {fmtMins(totalMins)}
              </span>
            </>
          )}
        </div>
        {hasItems && (
          <ChevronDown
            size={14}
            className="text-muted shrink-0 ml-2 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {hasItems && (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: open ? '1fr' : '0fr',
            transition: open
              ? 'grid-template-rows 200ms ease-out'
              : 'grid-template-rows 150ms ease-in',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div className="border-t border-border">
              {attempts.map((a, i) => (
                <AttemptRow key={a.attempt_id} a={a} last={i === attempts.length - 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible section wrapper — default open
function CollapsibleSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 cursor-pointer group"
        aria-expanded={open}
      >
        {icon}
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide group-hover:text-fg transition-colors">
          {title}
        </h2>
        <span className="text-muted/50 font-normal normal-case tracking-normal text-xs">({count})</span>
        <ChevronDown
          size={12}
          className="text-muted/50 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: open
            ? 'grid-template-rows 200ms ease-out'
            : 'grid-template-rows 150ms ease-in',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </section>
  );
}

interface Props {
  reviewed: TodayAttempt[];
  added: TodayAttempt[];
}

export default function HistoryList({ reviewed, added }: Props) {
  const { data } = useStore();
  const domainOrder = allDomains(data.domains).map(domain => domain.id);
  for (const domain of [...reviewed, ...added].map(attempt => attempt.domain)) {
    if (!domainOrder.includes(domain)) domainOrder.push(domain);
  }
  // Group reviewed by domain
  const reviewedByDomain: Partial<Record<Domain, TodayAttempt[]>> = {};
  for (const a of reviewed) {
    if (!reviewedByDomain[a.domain]) reviewedByDomain[a.domain] = [];
    reviewedByDomain[a.domain]!.push(a);
  }
  const activeReviewDomains = domainOrder.filter(d => reviewedByDomain[d]?.length);

  // Open state for reviewed domain groups — lifted so we can collapse all at once
  const [reviewOpenMap, setReviewOpenMap] = useState<Partial<Record<Domain, boolean>>>({});
  const anyReviewOpen = activeReviewDomains.some(d => reviewOpenMap[d]);

  // Group added by domain — all domains always shown
  const addedByDomain: Record<Domain, TodayAttempt[]> = Object.fromEntries(
    domainOrder.map(domain => [domain, []]),
  );
  for (const a of added) (addedByDomain[a.domain] ??= []).push(a);

  const isEmpty = reviewed.length === 0 && added.length === 0;
  if (isEmpty) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Reviewed from queue — grouped by domain, each closed by default */}
      {reviewed.length > 0 && (
        <CollapsibleSection title="Reviewed from queue" count={reviewed.length}>
          <div className="flex flex-col gap-2 pb-1">
            {anyReviewOpen && (
              <div className="flex justify-end pb-1">
                <button
                  onClick={() => setReviewOpenMap({})}
                  className="text-xs text-muted hover:text-fg transition-colors cursor-pointer"
                >
                  Collapse all
                </button>
              </div>
            )}
            {activeReviewDomains.map(d => (
              <DomainGroup
                key={d}
                domain={d}
                attempts={reviewedByDomain[d]!}
                open={!!reviewOpenMap[d]}
                onToggle={() => setReviewOpenMap(m => ({ ...m, [d]: !m[d] }))}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Added today — all 5 domains, empty ones greyed out */}
      {added.length > 0 && (
        <CollapsibleSection
          title="Added today"
          count={added.length}
          icon={<Plus size={12} className="text-muted" />}
        >
          <div className="flex flex-col gap-2 pb-1">
            {domainOrder.map(d => (
              <AddedDomainGroup key={d} domain={d} attempts={addedByDomain[d]} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
