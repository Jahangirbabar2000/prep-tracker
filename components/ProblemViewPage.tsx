'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus } from 'lucide-react';
import { fmtDate } from '@/lib/fmt';
import ProficiencyBadge from './ProficiencyBadge';
import { Domain, Problem, StudyDomain, DomainField } from '@/lib/types';
import AttemptHistory from './AttemptHistory';
import QuickNotes from './QuickNotes';
import NoteCard from './NoteCard';
import MarkdownRenderer, { MarkdownInline } from './MarkdownRenderer';
import AskAI from './AskAI';
import CopyLinkButton from './CopyLinkButton';
import SwipeableReviewCard from './SwipeableReviewCard';
import { useStore, mutate } from '@/lib/store/store';
import { problemDetail, clientToday, attemptCountFor } from '@/lib/store/queries';
import { logAttempt as logQueued, flushQueue } from '@/lib/store/writeQueue';
import { cardTagsFromFields, domainById, isTimedMode, resolveDomain } from '@/lib/domains';
import { domainPalette } from './domainVisuals';

interface Props {
  id: string;
  domain: Domain;
  basePath: string;
  backLabel: string;
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';
const sectionTitle = 'text-xs font-semibold text-muted uppercase tracking-wide';

function ProblemViewSkeleton() {
  return (
    <div className="max-w-5xl flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 bg-surface-2 rounded" />
          <div className="h-3 w-10 bg-surface-2 rounded" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="h-7 w-16 bg-surface-2 rounded-lg" />
          <div className="h-7 w-28 bg-surface-2 rounded-lg" />
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-6 pt-5">
          <div className="h-5 w-20 bg-surface-2 rounded-full" />
          <div className="h-4 w-24 bg-surface-2 rounded" />
        </div>
        <div className="px-6 pt-4 pb-5">
          <div className="h-5 w-3/4 bg-surface-2 rounded" />
        </div>
        <div className="border-t border-border px-6 py-8 flex justify-center">
          <div className="h-10 w-32 bg-surface-2 rounded-xl" />
        </div>
      </div>

      {/* Attempt history */}
      <div className="hidden md:block">
        <div className="h-3 w-28 bg-surface-2 rounded mb-3" />
        <div className="h-16 w-full bg-surface-2 rounded-xl" />
      </div>
    </div>
  );
}

// Mid-swipe peek at the adjacent card — mirrors the real card's header
// exactly (badges, tags, proficiency, question) so there's no visual mismatch
// the instant it becomes active. Matches the equivalent CardPreview in the
// review session; unlike there, this header layout is already identical
// between DSA/timed and flashcard domains, so one preview covers both.
function ProblemPreview({
  problem,
  domains,
  domainFields,
  attemptCount,
}: {
  problem: Problem;
  domains: StudyDomain[];
  domainFields: DomainField[];
  attemptCount: number;
}) {
  const domainDefinition = resolveDomain(domains, problem.domain);
  const palette = domainPalette(domainDefinition.color);
  const tags = cardTagsFromFields(problem, domainFields);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-6 pt-5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ring-1 ring-inset ${palette.badge}`}>
            {domainDefinition.name}
          </span>
          {tags.map((t, i) => (
            <span key={`${t}-${i}`} className="text-xs text-muted truncate">
              {i > 0 && <span className="text-muted/40 mx-1">·</span>}
              {t}
            </span>
          ))}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <ProficiencyBadge
            level={problem.interval_level}
            nextDueDate={problem.next_due_date ? fmtDate(problem.next_due_date) : null}
            attemptCount={attemptCount}
          />
        </div>
      </div>
      <div className="px-6 pt-4 pb-5 text-lg font-semibold text-fg leading-snug">
        <MarkdownInline content={problem.name} />
      </div>
    </div>
  );
}

export default function ProblemViewPage({ id, domain, basePath, backLabel }: Props) {
  const router = useRouter();

  // Read straight from the already-synced local store — no per-navigation
  // network round trip. `problemDetail()` mirrors GET /api/problems/[id]
  // (attempts, notes, links, prev/next, position) entirely from local data.
  const store = useStore();
  const domainDefinition = resolveDomain(store.data.domains, domain);
  const canLog = !!domainById(store.data.domains, domain) && !domainDefinition.archived_at;
  const isTimed = isTimedMode(domainDefinition.study_mode);
  const palette = domainPalette(domainDefinition.color);
  const data = useMemo(() => problemDetail(store.data, Number(id)), [store.data, id]);
  const links = data?.links ?? null;

  const [revealed, setRevealed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  // DSA-specific log form state
  const [dsaTime, setDsaTime]           = useState('');
  const [dsaStruggled, setDsaStruggled] = useState(true);

  // Reset the reveal/result state whenever the question changes — adjusted
  // during render (not an effect) to avoid an extra cascading render.
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setRevealed(false);
    setLastResult(null);
  }

  // Record an attempt: offline-first via the local write queue (recomputes SR
  // locally + persists + queues for replay) — the store update flows back
  // into `data` above automatically via useSyncExternalStore.
  const recordAttempt = useCallback(async (struggled: boolean, time_taken_mins: number) => {
    if (!data) return;
    await logQueued({
      problemId: data.id,
      struggled,
      time_taken_mins,
    });
    // Push the queued write to the server without a full /api/sync re-pull —
    // that immediate full resync raced the write and could revert the
    // optimistic update if Turso's read lagged behind the write by even a moment.
    if (typeof navigator !== 'undefined' && navigator.onLine) void flushQueue();
  }, [data]);

  // Log attempt — non-DSA (no time)
  const logAttempt = useCallback(async (struggled: boolean) => {
    if (!data || submitting) return;
    setSubmitting(true);
    await recordAttempt(struggled, 0);
    setSubmitting(false);
    setLastResult(!struggled);
    setTimeout(() => setLastResult(null), 2000);
  }, [data, submitting, recordAttempt]);

  // Log attempt — DSA (with time)
  const logDsaAttempt = useCallback(async () => {
    if (!data || submitting) return;
    setSubmitting(true);
    await recordAttempt(dsaStruggled, parseInt(dsaTime) || 0);
    setSubmitting(false);
    setLastResult(!dsaStruggled);
    setDsaTime('');
    setTimeout(() => setLastResult(null), 2000);
  }, [data, submitting, dsaTime, dsaStruggled, recordAttempt]);

  // Keyboard shortcuts (desktop only — touch handled separately)
  useEffect(() => {
    if (!data) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!isTimed) {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          setRevealed(r => !r);
        }
        if (revealed && !submitting && lastResult === null) {
          if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') logAttempt(false);
          if (e.key === 'n' || e.key === 'N') logAttempt(true);
        }
      }
      if (e.key === 'Escape') router.push(basePath);
      if (canLog && (e.key === 'l' || e.key === 'L')) router.push(`${basePath}/log`);
      if (e.key === 'e' || e.key === 'E') router.push(`${basePath}/${id}/edit`);
      if (e.key === 'ArrowLeft'  && data?.next_id) router.push(`${basePath}/${data.next_id}`);
      if (e.key === 'ArrowRight' && data?.prev_id) router.push(`${basePath}/${data.prev_id}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, revealed, submitting, lastResult, logAttempt, basePath, router, isTimed, id, canLog]);

  if (!data) return <ProblemViewSkeleton />;

  const tags = cardTagsFromFields(data, store.data.domain_fields);
  // Same animated drag-to-navigate card used in the review session — dragging
  // in either direction peeks the adjacent problem before committing to it.
  // Direction naming matches SwipeableReviewCard's convention (left ⇒ "next",
  // right ⇒ "previous"), which here maps onto the pre-existing prev/next
  // semantics: swipe left goes to prev_id, swipe right goes to next_id (same
  // as the arrow keys and chevrons above).
  const prevProblem = data.prev_id ? store.data.problems.find(p => p.id === data.prev_id) ?? null : null;
  const nextProblem = data.next_id ? store.data.problems.find(p => p.id === data.next_id) ?? null : null;

  return (
    <div className="max-w-5xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(basePath)}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} /> {backLabel}
            <span className="hidden md:inline opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
          </button>

          {/* Position counter — always visible */}
          <span className="text-xs text-muted/50 tabular-nums">
            {data.position} / {data.total}
          </span>

          {/* Chevron arrows — desktop only; mobile uses swipe */}
          <div className="hidden md:flex items-center gap-0.5">
            <Link
              href={data.next_id ? `${basePath}/${data.next_id}` : '#'}
              aria-disabled={!data.next_id}
              className={`p-1 rounded transition-colors ${data.next_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
              title="Newer (←)"
            >
              <ChevronLeft size={15} />
            </Link>
            <Link
              href={data.prev_id ? `${basePath}/${data.prev_id}` : '#'}
              aria-disabled={!data.prev_id}
              className={`p-1 rounded transition-colors ${data.prev_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
              title="Older (→)"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        {/* Edit + Log — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href={`${basePath}/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-fg hover:border-border-strong transition-colors"
          >
            <Pencil size={12} /> Edit <span className="opacity-40 font-normal text-[10px] ml-0.5">E</span>
          </Link>
          {canLog && <Link
            href={`${basePath}/log`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Plus size={12} /> {domainDefinition.log_label} <span className="opacity-50 font-normal text-[10px] ml-0.5">L</span>
          </Link>}
        </div>
      </div>

      {/* Card */}
      <SwipeableReviewCard
        key={data.id}
        canSwipeLeft={!!data.prev_id}
        canSwipeRight={!!data.next_id}
        nextPreview={prevProblem ? (
          <ProblemPreview
            problem={prevProblem}
            domains={store.data.domains}
            domainFields={store.data.domain_fields}
            attemptCount={attemptCountFor(store.data, prevProblem.id)}
          />
        ) : undefined}
        previousPreview={nextProblem ? (
          <ProblemPreview
            problem={nextProblem}
            domains={store.data.domains}
            domainFields={store.data.domain_fields}
            attemptCount={attemptCountFor(store.data, nextProblem.id)}
          />
        ) : undefined}
        onSwipeLeft={() => { if (data.prev_id) router.push(`${basePath}/${data.prev_id}`); }}
        onSwipeRight={() => { if (data.next_id) router.push(`${basePath}/${data.next_id}`); }}
      >
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {/* Domain + tag + proficiency */}
        <div
          data-swipe-handle="true"
          className="flex items-center justify-between gap-2 px-6 pt-5"
          style={{ touchAction: 'pan-y' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ring-1 ring-inset ${palette.badge}`}>
              {domainDefinition.name}
            </span>
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="text-xs text-muted truncate">
                {i > 0 && <span className="text-muted/40 mx-1">·</span>}
                {t}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <ProficiencyBadge
              level={data.interval_level}
              nextDueDate={data.next_due_date ? fmtDate(data.next_due_date) : null}
              attemptCount={data.attempts.length}
            />
            {data.next_due_date && (
              <span className={`text-[11px] tabular ${data.next_due_date < clientToday() ? 'text-danger font-medium' : 'text-muted'}`}>
                Next review {fmtDate(data.next_due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        <div
          data-swipe-handle="true"
          className="px-6 pt-4 pb-5 text-lg font-semibold text-fg leading-snug"
          style={{ touchAction: 'pan-y' }}
        >
          <MarkdownInline content={data.name} />
        </div>

        {/* ── DSA: compact single-row ── */}
        {isTimed ? (
          <div className="border-t border-border px-6 py-3 flex items-center gap-3 flex-wrap">
            {links && links.length > 0 && links.map(l => (
              <div key={l.id} className="inline-flex items-center gap-1">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <ExternalLink size={12} />
                  {l.label || hostOf(l.url)}
                </a>
                <CopyLinkButton url={l.url} />
              </div>
            ))}
            {links && links.length === 0 && (
              <span className="text-xs text-muted italic">No practice link — add via Edit.</span>
            )}

            {lastResult !== null && (
              <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                lastResult ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
              }`}>
                {lastResult ? '✓ Solved it' : '✗ Struggled'}
              </span>
            )}
            {/* Log controls — desktop only */}
            {lastResult === null && (
              <div className="hidden md:flex ml-auto items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min="0"
                  value={dsaTime}
                  onChange={e => setDsaTime(e.target.value)}
                  placeholder="mins"
                  className={`${inputCls} w-20 text-sm`}
                />
                <div className="flex gap-0.5 bg-surface-2 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setDsaStruggled(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${!dsaStruggled ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    Solved it
                  </button>
                  <button
                    type="button"
                    onClick={() => setDsaStruggled(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${dsaStruggled ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    Struggled
                  </button>
                </div>
                <button
                  onClick={logDsaAttempt}
                  disabled={submitting}
                  className="px-4 py-1.5 bg-accent text-accent-fg text-xs font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {submitting ? 'Saving…' : 'Log'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Non-DSA: flashcard reveal ── */
          <div className="border-t border-border">
            {!revealed ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <button
                  onClick={() => setRevealed(true)}
                  className="px-8 py-3 bg-accent text-accent-fg text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Reveal answer
                </button>
                <span className="hidden md:block text-xs text-muted/50">Space</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-6 py-5">
                {data.notes_text ? (
                  <MarkdownRenderer content={data.notes_text} />
                ) : (
                  <p className="text-sm text-muted italic">No answer saved yet.</p>
                )}

                {links && links.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {links.map(l => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                      >
                        {l.label || hostOf(l.url)}
                        <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                )}

                {lastResult !== null ? (
                  <div className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ${
                    lastResult ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
                  }`}>
                    {lastResult ? '✓ Logged — Got it' : '✗ Logged — Struggled'}
                  </div>
                ) : (
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => logAttempt(false)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-accent/10 border border-accent/30 text-accent text-sm font-semibold rounded-xl hover:bg-accent/20 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      ✓ Got it
                      <span className="hidden md:inline text-xs font-normal opacity-50 ml-1">Y</span>
                    </button>
                    <button
                      onClick={() => logAttempt(true)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-danger/10 border border-danger/30 text-danger text-sm font-semibold rounded-xl hover:bg-danger/20 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      ✗ Struggled
                      <span className="hidden md:inline text-xs font-normal opacity-50 ml-1">N</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </SwipeableReviewCard>

      {/* Ask AI — its own standalone card, same as the review queue's
          ai-elaboration-card, not nested inside the main card. AskAI renders
          its own bg-surface/border/rounded-2xl chrome, so no wrapper here. */}
      {!isTimed && revealed && (
        <AskAI problemId={data.id} question={data.name} answer={data.notes_text} domain={domainDefinition.name} tags={tags} />
      )}

      {/* Attempt history — desktop only */}
      <section className="hidden md:block">
        <h2 className={`${sectionTitle} mb-3`}>Attempt History</h2>
        <AttemptHistory
          attempts={data.attempts}
          showTime={isTimed}
          // editAttemptRemote/deleteAttemptRemote already write through to the
          // shared store — `data` picks up the change automatically.
          onUpdated={() => {}}
          onDeleted={() => {}}
        />
      </section>

      {/* Notes — one-liners for non-DSA */}
      {!isTimed && data.notes.length > 0 && (
        <section className="hidden md:block">
          <h2 className={`${sectionTitle} mb-3`}>Notes</h2>
          <QuickNotes
            problemId={data.id}
            notes={data.notes}
            onChange={notes => mutate(d => ({ ...d, notes: [...d.notes.filter(n => n.problem_id !== data.id), ...notes] }))}
          />
        </section>
      )}

      {/* Active recall Q&A — DSA only */}
      {isTimed && data.notes.length > 0 && (
        <section className="hidden md:block">
          <h2 className={`${sectionTitle} mb-3`}>Active Recall Notes</h2>
          <div className="flex flex-col gap-3">
            {data.notes.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onDelete={async nid => {
                  await fetch(`/api/problems/${data.id}/notes/${nid}`, { method: 'DELETE' });
                  mutate(d => ({ ...d, notes: d.notes.filter(x => x.id !== nid) }));
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
