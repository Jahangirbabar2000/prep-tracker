'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Clock, Plus, XCircle } from 'lucide-react';
import DomainBadge from './DomainBadge';
import ProficiencyBadge from './ProficiencyBadge';
import InfoTooltip from './InfoTooltip';
import { fmtDate } from '@/lib/fmt';
import { Domain } from '@/lib/types';
import { computeStudyVelocity } from '@/lib/studyVelocity';

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
  difficulty: string | null;
  pattern_tag: string | null;
  sd_category: string | null;
  sd_topic: string | null;
  fe_bucket: string | null;
  py_category: string | null;
  ai_category: string | null;
  lld_category: string | null;
  lld_topic: string | null;
}

const DOMAIN_ORDER: Domain[] = ['dsa', 'python', 'frontend', 'system_design', 'ai', 'lld'];
const DOMAIN_LABEL: Record<Domain, string> = {
  dsa: 'DSA', system_design: 'System Design', frontend: 'Frontend', python: 'Backend', ai: 'AI', lld: 'LLD',
};

function domainPath(d: string) {
  return d === 'system_design' ? '/system-design' : `/${d}`;
}
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
  return a.pattern_tag ?? a.sd_topic ?? a.sd_category ?? a.fe_bucket ?? a.py_category ?? a.ai_category ?? a.lld_topic ?? a.lld_category ?? null;
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

// Flat row used inside a group
function AttemptRow({ a, last }: { a: TodayAttempt; last: boolean }) {
  const tag = cardTag(a);
  const isDSA = a.domain === 'dsa';
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${!last ? 'border-b border-border' : ''}`}>
      <div className={`w-1 self-stretch rounded-full shrink-0 ${a.struggled ? 'bg-danger/60' : 'bg-accent/40'}`} />
      <div className="flex-1 min-w-0">
        <Link
          href={`${domainPath(a.domain)}/${a.id}`}
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
          {isDSA && a.difficulty && (
            <span className={`text-xs font-medium ${DIFFICULTY_STYLE[a.difficulty] ?? 'text-muted'}`}>
              {a.difficulty}
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
        {isDSA && a.time_taken_mins > 0 && (
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
  const struggled = attempts.filter(a => a.struggled).length;
  const gotIt = attempts.length - struggled;
  const loggedMins = domain === 'dsa'
    ? attempts.reduce((s, a) => s + (a.time_taken_mins || 0), 0)
    : 0;
  // Passive study velocity — median seconds between consecutive logged
  // attempts in this domain group, with long gaps (breaks) excluded automatically.
  const velocity = computeStudyVelocity(attempts.map(a => a.attempted_at));
  const estimatedMins = Math.round(velocity.totalActiveSeconds / 60);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <DomainBadge domain={domain} showIcon={false} />
          <span className="text-sm font-semibold text-fg">{DOMAIN_LABEL[domain]}</span>
          <span className="text-xs text-muted tabular">{attempts.length} reviewed</span>
          <span className="text-muted/40 text-xs">·</span>
          <span className="text-xs text-accent tabular">{gotIt} got it</span>
          {struggled > 0 && (
            <>
              <span className="text-muted/40 text-xs">·</span>
              <span className="text-xs text-danger tabular">{struggled} struggled</span>
            </>
          )}
          {loggedMins > 0 && velocity.sampleSize > 0 && (
            <>
              <span className="text-muted/40 text-xs">·</span>
              <InfoTooltip content={
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-fg font-medium">Time spent</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    <span className="text-fg font-medium tabular">{fmtMins(loggedMins)}</span> logged — the sum of the solve
                    time you entered per attempt.
                  </p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    <span className="text-fg font-medium tabular">~{fmtMins(estimatedMins)}</span> estimated — includes time
                    between questions, based on your median pace of{' '}
                    <span className="tabular">{fmtVelocity(velocity.medianDeltaSeconds)}</span> across {attempts.length} attempts.
                  </p>
                </div>
              }>
                <span className="inline-flex items-center gap-1 text-xs text-muted tabular">
                  <Clock size={11} /> ~{Math.min(loggedMins, estimatedMins)}–{Math.max(loggedMins, estimatedMins)} min
                </span>
              </InfoTooltip>
              <span className="text-xs text-muted/70 tabular">({fmtVelocity(velocity.medianDeltaSeconds)})</span>
            </>
          )}
          {/* DSA with only a single attempt today — nothing to estimate a range from, just show the logged time. */}
          {loggedMins > 0 && velocity.sampleSize === 0 && (
            <>
              <span className="text-muted/40 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted tabular">
                <Clock size={11} /> {fmtMins(loggedMins)}
              </span>
            </>
          )}
          {loggedMins === 0 && velocity.sampleSize > 0 && (
            <>
              <span className="text-muted/40 text-xs">·</span>
              <InfoTooltip content={
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-fg font-medium">Time spent (estimated)</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    <span className="text-fg font-medium tabular">~{fmtMins(estimatedMins)}</span> — based on your median pace
                    of <span className="tabular">{fmtVelocity(velocity.medianDeltaSeconds)}</span> across {attempts.length} attempts.
                    {' '}This domain doesn&apos;t log a per-attempt time, so there&apos;s no logged total to compare against.
                  </p>
                </div>
              }>
                <span className="inline-flex items-center gap-1 text-xs text-muted tabular">
                  <Clock size={11} /> ~{fmtMins(estimatedMins)}
                </span>
              </InfoTooltip>
              <span className="text-xs text-muted/70 tabular">({fmtVelocity(velocity.medianDeltaSeconds)})</span>
            </>
          )}
        </div>
        <ChevronDown
          size={14}
          className="text-muted shrink-0 ml-2 transition-transform duration-200"
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
  const [open, setOpen] = useState(false);
  const hasItems = attempts.length > 0;
  const totalMins = domain === 'dsa'
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
          <span className="text-sm font-semibold text-fg">{DOMAIN_LABEL[domain]}</span>
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
  // Group reviewed by domain
  const reviewedByDomain: Partial<Record<Domain, TodayAttempt[]>> = {};
  for (const a of reviewed) {
    if (!reviewedByDomain[a.domain]) reviewedByDomain[a.domain] = [];
    reviewedByDomain[a.domain]!.push(a);
  }
  const activeReviewDomains = DOMAIN_ORDER.filter(d => reviewedByDomain[d]?.length);

  // Open state for reviewed domain groups — lifted so we can collapse all at once
  const [reviewOpenMap, setReviewOpenMap] = useState<Partial<Record<Domain, boolean>>>({});
  const anyReviewOpen = activeReviewDomains.some(d => reviewOpenMap[d]);

  // Group added by domain — all domains always shown
  const addedByDomain: Record<Domain, TodayAttempt[]> = {
    dsa: [], python: [], frontend: [], system_design: [], ai: [], lld: [],
  };
  for (const a of added) addedByDomain[a.domain].push(a);

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
            {DOMAIN_ORDER.map(d => (
              <AddedDomainGroup key={d} domain={d} attempts={addedByDomain[d]} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
