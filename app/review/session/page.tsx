'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, SkipForward } from 'lucide-react';
import { ReviewQueueItem, Link as LinkType } from '@/lib/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AskAI, { type AskAIHandle } from '@/components/AskAI';
import ProficiencyBadge from '@/components/ProficiencyBadge';
import AttemptHistory from '@/components/AttemptHistory';
import CopyLinkButton from '@/components/CopyLinkButton';
import { useStore, getData, mutate } from '@/lib/store/store';
import { reviewQueue, clientToday, matchesProficiency } from '@/lib/store/queries';
import { logAttempt as logQueued, flushQueue } from '@/lib/store/writeQueue';
import { cardTagsFromFields, domainPath, isTimedMode, resolveDomain } from '@/lib/domains';
import { domainPalette } from '@/components/domainVisuals';
import SwipeableReviewCard from '@/components/SwipeableReviewCard';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// Find nearest active (not logged, not skipped) card in a given direction, wrapping around.
// Returns `from` if no other active card exists.
function findAdjacent(
  cards: ReviewQueueItem[],
  from: number,
  dir: 'next' | 'prev',
  logged: Set<number>,
  skipped: Set<number>,
): number {
  const len = cards.length;
  const step = dir === 'next' ? 1 : -1;
  for (let offset = 1; offset < len; offset++) {
    const i = ((from + step * offset) % len + len) % len;
    if (!logged.has(cards[i].id) && !skipped.has(cards[i].id)) return i;
  }
  return from;
}

function CardPreview({
  card,
  domainName,
}: {
  card: ReviewQueueItem;
  domainName: string;
}) {
  return (
    <div className="min-h-40 overflow-hidden rounded-2xl border border-border bg-surface-2 px-6 pb-6 pt-5 shadow-sm">
      <p className="text-xs font-medium text-muted">{domainName}</p>
      <p className="mt-4 line-clamp-3 text-lg font-semibold leading-snug text-fg/80">
        {card.name}
      </p>
    </div>
  );
}

function SessionPageInner() {
  const sp = useSearchParams();
  const filterDomain      = sp.get('domain')      ?? '';
  const filterProficiency = sp.get('proficiency') ?? '';

  const [status, setStatus]         = useState<'loading' | 'ready' | 'empty' | 'done'>('loading');
  const [allCards, setAllCards]     = useState<ReviewQueueItem[]>([]);
  const [index, setIndex]           = useState(0);
  const [loggedIds, setLoggedIds]   = useState<Set<number>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());
  const [results, setResults]       = useState<{ struggled: boolean }[]>([]);

  const [revealed, setRevealed]   = useState(false);
  const [showAI, setShowAI]       = useState(true);
  const [aiExpanded, setAiExpanded] = useState(false);
  const aiRef                     = useRef<AskAIHandle>(null);
  const aiCardRef                 = useRef<HTMLDivElement>(null);
  const [links, setLinks]         = useState<LinkType[] | null>(null);
  const linksCache = useRef<Map<number, LinkType[]>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // DSA log form state
  const [dsaTime, setDsaTime]           = useState('');
  const [dsaStruggled, setDsaStruggled] = useState(true);

  // Notes state
  const [noteOpen, setNoteOpen]   = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const { data, ready } = useStore();
  const initialized = useRef(false);

  // Snapshot the queue once the store is hydrated. The session works on a frozen
  // copy so the queue doesn't reshuffle mid-session if a background sync lands.
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    const items = reviewQueue(data, clientToday()).filter(it =>
      (!filterDomain || it.domain === filterDomain) &&
      (!filterProficiency || matchesProficiency(it, filterProficiency, it.attempt_count)),
    );
    if (items.length === 0) { setStatus('empty'); return; }
    setAllCards(items);
    setStatus('ready');
  }, [ready, data, filterDomain, filterProficiency]);

  const card  = allCards[index] ?? null;
  const domainDefinition = resolveDomain(data.domains, card?.domain ?? '');
  const isTimed = isTimedMode(domainDefinition.study_mode);

  // Attempt history for the card currently being reviewed — newest first,
  // matching lib/store/queries.ts's problemDetail() ordering.
  const cardAttempts = useMemo(() => {
    if (!card) return [];
    return data.attempts
      .filter(a => a.problem_id === card.id)
      .sort((x, y) => (x.attempted_at < y.attempted_at ? 1 : x.attempted_at > y.attempted_at ? -1 : y.id - x.id));
  }, [data.attempts, card]);

  // Fetch links: eagerly for DSA, lazily on reveal for concept domains. Cached per card.
  useEffect(() => {
    if (!card) return;
    if (!isTimed && !revealed) return;
    const cached = linksCache.current.get(card.id);
    if (cached) { setLinks(cached); return; }
    const ls = getData().links.filter(l => l.problem_id === card.id) as LinkType[];
    linksCache.current.set(card.id, ls);
    setLinks(ls);
  }, [revealed, card?.id, isTimed]);

  const resetCardState = useCallback(() => {
    setRevealed(false);
    setAiExpanded(false);
    setLinks(null);
    setDsaTime('');
    setDsaStruggled(true);
    setNoteOpen(false);
    setNoteInput('');
  }, []);

  useEffect(() => {
    if (!aiExpanded) return;
    const frame = requestAnimationFrame(() => {
      aiCardRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [aiExpanded]);

  const isActive = useCallback((id: number, logged: Set<number>, skipped: Set<number>) =>
    !logged.has(id) && !skipped.has(id),
  []);

  const goNext = useCallback(() => {
    if (!card || allCards.length < 2) return;
    const next = findAdjacent(allCards, index, 'next', loggedIds, skippedIds);
    if (next !== index) { setIndex(next); resetCardState(); }
  }, [card, allCards, index, loggedIds, skippedIds, resetCardState]);

  const goPrev = useCallback(() => {
    if (!card || allCards.length < 2) return;
    const prev = findAdjacent(allCards, index, 'prev', loggedIds, skippedIds);
    if (prev !== index) { setIndex(prev); resetCardState(); }
  }, [card, allCards, index, loggedIds, skippedIds, resetCardState]);

  const skipSection = useCallback(() => {
    if (!card) return;
    const domain = card.domain;
    // Mark every unlogged card of this domain as skipped for this session
    const newSkipped = new Set(skippedIds);
    allCards.forEach(c => { if (c.domain === domain && !loggedIds.has(c.id)) newSkipped.add(c.id); });
    setSkippedIds(newSkipped);
    // Check if anything remains active
    const hasActive = allCards.some(c => isActive(c.id, loggedIds, newSkipped));
    if (!hasActive) { setStatus('done'); return; }
    const next = findAdjacent(allCards, index, 'next', loggedIds, newSkipped);
    setIndex(next);
    resetCardState();
  }, [card, allCards, index, loggedIds, skippedIds, isActive, resetCardState]);

  const advance = useCallback(async (struggled: boolean, timeTakenMins = 0, direction: 'next' | 'prev' = 'next') => {
    if (!card || submitting) return;
    setSubmitting(true);

    // Offline-first: record locally + queue for replay; push to server now if online.
    await logQueued({
      problemId: card.id,
      struggled,
      time_taken_mins: timeTakenMins,
    });
    if (typeof navigator !== 'undefined' && navigator.onLine) void flushQueue();

    const newLoggedIds = new Set([...loggedIds, card.id]);
    setLoggedIds(newLoggedIds);
    setResults(prev => [...prev, { struggled }]);
    setSubmitting(false);

    const hasActive = allCards.some(c => isActive(c.id, newLoggedIds, skippedIds));
    if (!hasActive) { setStatus('done'); return; }
    const target = findAdjacent(allCards, index, direction, newLoggedIds, skippedIds);
    setIndex(target);
    resetCardState();
  }, [card, allCards, index, loggedIds, skippedIds, submitting, isActive, resetCardState]);

  const advanceDsa = useCallback((direction: 'next' | 'prev' = 'next') => {
    advance(dsaStruggled, parseInt(dsaTime) || 0, direction);
  }, [advance, dsaStruggled, dsaTime]);

  async function saveNote() {
    if (!card || !noteInput.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/problems/${card.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: noteInput.trim() }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      const note = await res.json();
      // Reflect the new note in the local-first store so it persists and shows
      // on the problem page immediately, without waiting for the next full sync.
      mutate(d => ({ ...d, notes: [...d.notes, note] }));
      setNoteOpen(false);
      setNoteInput('');
    } catch {
      // notes are online-only; keep the draft open so the user can retry offline
    } finally {
      setNoteSaving(false);
    }
  }

  // Keyboard shortcuts (covers both ready and done states)
  useEffect(() => {
    if (status !== 'ready' && status !== 'done') return;
    function onKey(e: KeyboardEvent) {
      if (status === 'done') {
        if (e.key === 'Enter') { e.preventDefault(); window.location.href = '/'; }
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA';

      // AI card shortcuts (outside text fields)
      if (!inField && (e.key === 'c' || e.key === 'C')) {
        if (e.metaKey || e.ctrlKey) {
          // ⌘C / Ctrl+C triggers "elaborate" — but only when nothing is
          // selected, so normal copy still works.
          if (!window.getSelection()?.toString().trim()) {
            e.preventDefault();
            setShowAI(true);
            aiRef.current?.generate();
          }
        } else {
          setShowAI(v => !v); // plain "c" toggles the AI card
        }
        return;
      }

      // Navigation — always active (except inside text fields)
      if (!inField) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); return; }
        if (e.key === 's' || e.key === 'S') { skipSection(); return; }
      }

      if (isTimed) {
        // Y/N set the Solved/Struggled toggle (outside text fields)
        if (!inField && (e.key === 'y' || e.key === 'Y')) { setDsaStruggled(false); return; }
        if (!inField && (e.key === 'n' || e.key === 'N')) { setDsaStruggled(true);  return; }
        // Enter submits — works both outside fields and from inside the minutes input.
        // ⌘/Ctrl+Enter does the same log but steps back instead of forward, so a
        // struggled review of a much-earlier card doesn't leave you jumping forward.
        if (e.key === 'Enter' && !submitting) {
          e.preventDefault();
          advanceDsa(e.metaKey || e.ctrlKey ? 'prev' : 'next');
          return;
        }
      } else {
        if (inField) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setRevealed(r => !r); }
        if (revealed && !submitting) {
          if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
            advance(false, 0, e.key === 'Enter' && (e.metaKey || e.ctrlKey) ? 'prev' : 'next');
          }
          if (e.key === 'n' || e.key === 'N') advance(true);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, revealed, submitting, advance, advanceDsa, goNext, goPrev, skipSection, isTimed]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-muted">
        Loading session…
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-fg font-medium">Nothing due for a session right now.</p>
        <p className="text-sm text-muted">You&apos;re all caught up across all domains.</p>
        <Link href="/" className="text-sm text-accent hover:text-accent-hover transition-colors">
          ← Review Queue
        </Link>
      </div>
    );
  }

  if (status === 'done') {
    const struggledCount = results.filter(r => r.struggled).length;
    const gotCount       = results.length - struggledCount;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-fg">Session complete</p>
          <p className="text-sm text-muted">
            <span className="text-accent font-medium">{gotCount} got it</span>
            <span className="mx-2 opacity-40">·</span>
            <span className="text-danger font-medium">{struggledCount} struggled</span>
            <span className="mx-2 opacity-40">·</span>
            {results.length} reviewed
          </p>
          {skippedIds.size > 0 && (
            <p className="text-xs text-muted mt-1">{skippedIds.size} skipped — they&apos;ll stay in your queue</p>
          )}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
        >
          Back to Review Queue <span className="hidden md:inline opacity-50 text-xs font-normal ml-0.5">Enter</span>
        </Link>
      </div>
    );
  }

  const activeCount = allCards.filter(c => isActive(c.id, loggedIds, skippedIds)).length;
  const progress    = ((allCards.length - activeCount) / (allCards.length || 1)) * 100;
  const tags        = cardTagsFromFields(card!, data.domain_fields);
  const palette     = domainPalette(domainDefinition.color);
  const canGoPrev = findAdjacent(allCards, index, 'prev', loggedIds, skippedIds) !== index;
  const canGoNext = findAdjacent(allCards, index, 'next', loggedIds, skippedIds) !== index;
  const previousIndex = canGoPrev
    ? findAdjacent(allCards, index, 'prev', loggedIds, skippedIds)
    : index;
  const nextIndex = canGoNext
    ? findAdjacent(allCards, index, 'next', loggedIds, skippedIds)
    : index;
  const previousCard = canGoPrev ? allCards[previousIndex] : null;
  const nextCard = canGoNext ? allCards[nextIndex] : null;
  // Dock controls only while a compact, unrevealed flashcard is on screen.
  // Revealed answers, timed cards, and AI content can all grow vertically, so
  // their controls must participate in normal document flow.
  const controlsInFlow = isTimed || revealed || aiExpanded;

  return (
    <div className={`mx-auto flex max-w-xl flex-col gap-4 overflow-x-clip md:pb-0 ${
      controlsInFlow ? 'pb-4' : 'pb-40'
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
          <ArrowLeft size={13} /> Exit session <span className="hidden md:inline opacity-40 ml-0.5">Esc</span>
        </Link>
        <span className="text-xs text-muted tabular">{activeCount} remaining</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <SwipeableReviewCard
        key={card!.id}
        canSwipeLeft={canGoNext}
        canSwipeRight={canGoPrev}
        nextPreview={nextCard ? (
          <CardPreview
            card={nextCard}
            domainName={resolveDomain(data.domains, nextCard.domain).name}
          />
        ) : undefined}
        previousPreview={previousCard ? (
          <CardPreview
            card={previousCard}
            domainName={resolveDomain(data.domains, previousCard.domain).name}
          />
        ) : undefined}
        disabled={submitting}
        onSwipeLeft={goNext}
        onSwipeRight={goPrev}
      >
        {/* Domain + category on the left; topic, difficulty + proficiency right-aligned */}
        <div
          data-swipe-handle="true"
          className="flex items-start gap-2 px-4 pt-5 sm:px-6"
          style={{ touchAction: 'pan-y' }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${palette.badge}`}>
              {domainDefinition.name}
            </span>
            {tags[0] && <span className="text-xs text-muted">{tags[0]}</span>}
            {tags[1] && <span className="text-xs text-muted">{tags[1]}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {card!.metadata.difficulty && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                card!.metadata.difficulty === 'Easy'   ? 'bg-emerald-500/10 text-emerald-400' :
                card!.metadata.difficulty === 'Medium' ? 'bg-amber-500/10   text-amber-400'   :
                                               'bg-red-500/10     text-red-400'
              }`}>
                {card!.metadata.difficulty}
              </span>
            )}
            <ProficiencyBadge
              level={card!.interval_level}
              nextDueDate={card!.next_due_date ?? null}
              attemptCount={card!.attempt_count ?? 0}
            />
          </div>
        </div>

        {/* Question title */}
        <div
          data-swipe-handle="true"
          className="cursor-grab px-4 pb-6 pt-4 active:cursor-grabbing sm:px-6"
          style={{ touchAction: 'pan-y' }}
        >
          <p className="text-lg font-semibold text-fg leading-snug">{card!.name}</p>
          {(card!.attempt_count ?? 0) > 0 && (
            <p className="text-xs text-muted mt-1">
              {card!.attempt_count} attempt{card!.attempt_count === 1 ? '' : 's'} before
            </p>
          )}
        </div>

        {/* ── DSA: practice link + log form ── */}
        {isTimed ? (
          <div className="border-t border-border px-6 py-5 flex flex-col gap-5">
            {links && links.length > 0 && (
              <div className="flex flex-col gap-2">
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      <ExternalLink size={14} />
                      {l.label || hostOf(l.url)}
                    </a>
                    <CopyLinkButton url={l.url} />
                  </div>
                ))}
              </div>
            )}
            {links && links.length === 0 && (
              <p className="text-sm text-muted italic">No practice link saved.</p>
            )}

            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted font-medium uppercase tracking-wide">Log your attempt</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={dsaTime}
                    onChange={e => setDsaTime(e.target.value)}
                    placeholder="mins"
                    className={`${inputCls} w-20`}
                  />
                  <span className="text-xs text-muted">min</span>
                </div>
                <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setDsaStruggled(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${!dsaStruggled ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    Solved it <span className="hidden md:inline opacity-50 font-normal">Y</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDsaStruggled(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${dsaStruggled ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    Struggled <span className="hidden md:inline opacity-50 font-normal">N</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => advanceDsa()}
                disabled={submitting || !dsaTime.trim()}
                title="⌘/Ctrl+Enter logs and goes back instead of forward"
                className="py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {submitting ? 'Saving…' : <span>Log & Next → <span className="hidden md:inline opacity-50 font-normal text-xs">Enter · ⌘Enter back</span></span>}
              </button>
            </div>

            <div className="flex justify-end">
              <Link
                href={`${domainPath(data.domains, card!.domain)}/${card!.id}`}
                target="_blank"
                className="text-xs text-muted hover:text-fg transition-colors"
              >
                Open full →
              </Link>
            </div>
          </div>
        ) : (
          /* ── Concept domains: Q&A flashcard ── */
          <div className="border-t border-border">
            {!revealed ? (
              <div
                data-swipe-handle="true"
                className="flex flex-col items-center gap-3 py-8 cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'pan-y' }}
              >
                <button
                  onClick={() => setRevealed(true)}
                  className="px-6 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Reveal answer <span className="hidden md:inline text-xs font-normal opacity-50">Space</span>
                </button>
                <span className="text-xs text-muted/40"><span className="md:hidden">Swipe to navigate</span><span className="hidden md:inline">← → to navigate</span></span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-6 py-5">
                {card!.notes_text ? (
                  <MarkdownRenderer content={card!.notes_text} />
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

                <div className="flex justify-end">
                  <Link
                    href={`${domainPath(data.domains, card!.domain)}/${card!.id}`}
                    target="_blank"
                    className="text-xs text-muted hover:text-fg transition-colors"
                  >
                    Open full →
                  </Link>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => advance(true)}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-danger/10 border border-danger/30 text-danger text-sm font-semibold rounded-lg hover:bg-danger/20 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ✗ Struggled <span className="hidden md:inline text-xs font-normal opacity-50 ml-1">N</span>
                  </button>
                  <button
                    onClick={() => advance(false)}
                    disabled={submitting}
                    title="⌘/Ctrl+Enter logs and goes back instead of forward"
                    className="flex-1 py-2.5 bg-accent/10 border border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/20 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ✓ Got it <span className="hidden md:inline text-xs font-normal opacity-50 ml-1">Y · ⌘⏎ back</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notes section ── */}
        <div className="border-t border-border px-6 py-3">
          {!noteOpen ? (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="text-xs text-muted/60 hover:text-muted transition-colors cursor-pointer"
            >
              + Add note
            </button>
          ) : (
            <div className="flex flex-col gap-2 py-1">
              <textarea
                autoFocus
                rows={2}
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }}
                placeholder="Quick note…"
                className={`${inputCls} resize-none w-full`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={!noteInput.trim() || noteSaving}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {noteSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setNoteOpen(false); setNoteInput(''); }}
                  className="px-3 py-1.5 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <span className="hidden md:inline ml-auto text-[11px] text-muted/40 self-center">⌘↵ to save</span>
              </div>
            </div>
          )}
        </div>
      </SwipeableReviewCard>

      {/* ── Attempt history — standalone card, DSA only ── */}
      {isTimed && cardAttempts.length > 0 && (
        <div className="hidden rounded-2xl border border-border bg-surface p-5 md:block">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Attempt History</h2>
          <AttemptHistory
            attempts={cardAttempts}
            showTime
            onUpdated={() => {}}
            onDeleted={() => {}}
          />
        </div>
      )}

      {/* Navigation stays docked only for a compact, unrevealed flashcard.
          Expanded answers and AI content keep every control in document flow. */}
      <div
        data-testid="review-nav-dock"
        className={`mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)_minmax(0,1fr)] gap-2.5 md:static ${
          controlsInFlow
            ? 'relative w-full'
            : 'fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-30'
        }`}
      >
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 md:gap-2 md:px-4"
            title="Previous question"
          >
            <ChevronLeft size={16} className="md:hidden shrink-0" />
            <span className="truncate">Prev</span>
            <kbd className="hidden md:inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded border border-border-strong bg-surface-2 text-[10px] leading-none text-muted/70">←</kbd>
          </button>
          <button
            type="button"
            onClick={skipSection}
            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg md:gap-2 md:px-4"
          >
            <SkipForward size={14} className="shrink-0" />
            <span className="truncate"><span className="md:hidden">Skip {domainDefinition.short_name}</span><span className="hidden md:inline">Skip all {domainDefinition.name}</span></span>
            <kbd className="hidden md:inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded border border-border-strong bg-surface-2 text-[10px] leading-none text-muted/70">S</kbd>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 md:gap-2 md:px-4"
            title="Next question"
          >
            <span className="truncate">Next</span>
            <ChevronRight size={16} className="md:hidden shrink-0" />
            <kbd className="hidden md:inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded border border-border-strong bg-surface-2 text-[10px] leading-none text-muted/70">→</kbd>
          </button>
      </div>

      {/* The unopened AI trigger is docked below navigation. Once opened, this
          same mounted component returns to document flow and the page scrolls
          to it, so streamed content never overlays the review card. */}
      {card && (
        <div
          ref={aiCardRef}
          data-testid="ai-elaboration-card"
          className={!showAI
            ? 'hidden'
            : controlsInFlow
              ? `relative md:mt-0 ${aiExpanded ? 'scroll-mt-20' : ''}`
              : 'fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto max-w-xl md:static'}
        >
          <AskAI
            ref={aiRef}
            key={card.id}
            problemId={card.id}
            question={card.name}
            answer={card.notes_text}
            domain={domainDefinition.name}
            tags={tags}
            onExpandedChange={setAiExpanded}
          />
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionPageInner />
    </Suspense>
  );
}
