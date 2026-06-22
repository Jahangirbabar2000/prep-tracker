'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, SkipForward } from 'lucide-react';
import { ReviewQueueItem, Link as LinkType } from '@/lib/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ProficiencyBadge from '@/components/ProficiencyBadge';

const DOMAIN_LABEL: Record<string, string> = {
  dsa:           'DSA',
  system_design: 'System Design',
  frontend:      'Frontend',
  python:        'Backend',
  ai:            'AI',
};

const DOMAIN_STYLE: Record<string, string> = {
  dsa:           'bg-blue-500/10    text-blue-400',
  system_design: 'bg-orange-500/10  text-orange-400',
  frontend:      'bg-violet-500/10  text-violet-400',
  python:        'bg-emerald-500/10 text-emerald-400',
  ai:            'bg-rose-500/10    text-rose-400',
};

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function cardTag(item: ReviewQueueItem): string | null {
  return item.pattern_tag ?? item.sd_topic ?? item.sd_category ?? item.fe_bucket ?? item.py_category ?? item.ai_category ?? item.question_list ?? null;
}

function domainPath(domain: string) {
  return domain === 'system_design' ? '/system-design' : domain === 'python' ? '/backend' : `/${domain}`;
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

export default function SessionPage() {
  const [status, setStatus]         = useState<'loading' | 'ready' | 'empty' | 'done'>('loading');
  const [allCards, setAllCards]     = useState<ReviewQueueItem[]>([]);
  const [index, setIndex]           = useState(0);
  const [loggedIds, setLoggedIds]   = useState<Set<number>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());
  const [results, setResults]       = useState<{ struggled: boolean }[]>([]);

  const [revealed, setRevealed]   = useState(false);
  const [links, setLinks]         = useState<LinkType[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // DSA log form state
  const [dsaTime, setDsaTime]           = useState('');
  const [dsaStruggled, setDsaStruggled] = useState(true);

  // Notes state
  const [noteOpen, setNoteOpen]   = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    fetch('/api/review-queue')
      .then(r => r.json())
      .then((items: ReviewQueueItem[]) => {
        if (items.length === 0) { setStatus('empty'); return; }
        setAllCards(items);
        setStatus('ready');
      });
  }, []);

  const card  = allCards[index] ?? null;
  const isDSA = card?.domain === 'dsa';

  // Fetch links: eagerly for DSA, lazily on reveal for concept domains
  useEffect(() => {
    if (!card) return;
    if (!isDSA && !revealed) return;
    setLinks(null);
    fetch(`/api/problems/${card.id}/links`)
      .then(r => r.json())
      .then(setLinks)
      .catch(() => setLinks([]));
  }, [revealed, card?.id, isDSA]);

  const resetCardState = useCallback(() => {
    setRevealed(false);
    setLinks(null);
    setDsaTime('');
    setDsaStruggled(true);
    setNoteOpen(false);
    setNoteInput('');
  }, []);

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

  const advance = useCallback(async (struggled: boolean, timeTakenMins = 0) => {
    if (!card || submitting) return;
    setSubmitting(true);

    await fetch(`/api/problems/${card.id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time_taken_mins: timeTakenMins,
        struggled,
        attempted_at: new Date().toLocaleDateString('en-CA'),
      }),
    });

    const newLoggedIds = new Set([...loggedIds, card.id]);
    setLoggedIds(newLoggedIds);
    setResults(prev => [...prev, { struggled }]);
    setSubmitting(false);

    const hasActive = allCards.some(c => isActive(c.id, newLoggedIds, skippedIds));
    if (!hasActive) { setStatus('done'); return; }
    const next = findAdjacent(allCards, index, 'next', newLoggedIds, skippedIds);
    setIndex(next);
    resetCardState();
  }, [card, allCards, index, loggedIds, skippedIds, submitting, isActive, resetCardState]);

  const advanceDsa = useCallback(() => {
    advance(dsaStruggled, parseInt(dsaTime) || 0);
  }, [advance, dsaStruggled, dsaTime]);

  async function saveNote() {
    if (!card || !noteInput.trim()) return;
    setNoteSaving(true);
    await fetch(`/api/problems/${card.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: noteInput.trim() }),
    });
    setNoteSaving(false);
    setNoteOpen(false);
    setNoteInput('');
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

      // Navigation — always active (except inside text fields)
      if (!inField) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); return; }
        if (e.key === 's' || e.key === 'S') { skipSection(); return; }
      }

      if (isDSA) {
        // Y/N set the Solved/Struggled toggle (outside text fields)
        if (!inField && (e.key === 'y' || e.key === 'Y')) { setDsaStruggled(false); return; }
        if (!inField && (e.key === 'n' || e.key === 'N')) { setDsaStruggled(true);  return; }
        // Enter submits — works both outside fields and from inside the minutes input
        if (e.key === 'Enter' && !submitting) { e.preventDefault(); advanceDsa(); return; }
      } else {
        if (inField) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setRevealed(r => !r); }
        if (revealed && !submitting) {
          if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') advance(false);
          if (e.key === 'n' || e.key === 'N') advance(true);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, revealed, submitting, advance, advanceDsa, goNext, goPrev, skipSection, isDSA]);

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
          Back to Review Queue <span className="opacity-50 text-xs font-normal ml-0.5">Enter</span>
        </Link>
      </div>
    );
  }

  const activeCount = allCards.filter(c => isActive(c.id, loggedIds, skippedIds)).length;
  const progress    = ((allCards.length - activeCount) / (allCards.length || 1)) * 100;
  const t = cardTag(card!);
  const canGoPrev = findAdjacent(allCards, index, 'prev', loggedIds, skippedIds) !== index;
  const canGoNext = findAdjacent(allCards, index, 'next', loggedIds, skippedIds) !== index;

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
          <ArrowLeft size={13} /> Exit session <span className="opacity-40 ml-0.5">Esc</span>
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
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {/* Domain + tag + proficiency badge */}
        <div className="flex items-center gap-2 flex-wrap px-6 pt-5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_STYLE[card!.domain]}`}>
            {DOMAIN_LABEL[card!.domain]}
          </span>
          {t && <span className="text-xs text-muted">{t}</span>}
          {card!.difficulty && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              card!.difficulty === 'Easy'   ? 'bg-emerald-500/10 text-emerald-400' :
              card!.difficulty === 'Medium' ? 'bg-amber-500/10   text-amber-400'   :
                                             'bg-red-500/10     text-red-400'
            }`}>
              {card!.difficulty}
            </span>
          )}
          <ProficiencyBadge
            level={card!.interval_level}
            nextDueDate={card!.next_due_date ?? null}
            attemptCount={card!.attempt_count ?? 0}
          />
        </div>

        {/* Question title */}
        <div className="px-6 pt-4 pb-6">
          <p className="text-lg font-semibold text-fg leading-snug">{card!.name}</p>
          {(card!.attempt_count ?? 0) > 0 && (
            <p className="text-xs text-muted mt-1">
              {card!.attempt_count} attempt{card!.attempt_count === 1 ? '' : 's'} before
            </p>
          )}
        </div>

        {/* ── DSA: practice link + log form ── */}
        {isDSA ? (
          <div className="border-t border-border px-6 py-5 flex flex-col gap-5">
            {links && links.length > 0 && (
              <div className="flex flex-col gap-2">
                {links.map(l => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    <ExternalLink size={14} />
                    {l.label || hostOf(l.url)}
                  </a>
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
                    Solved it <span className="opacity-50 font-normal">Y</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDsaStruggled(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${dsaStruggled ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    Struggled <span className="opacity-50 font-normal">N</span>
                  </button>
                </div>
              </div>
              <button
                onClick={advanceDsa}
                disabled={submitting || !dsaTime.trim()}
                className="py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {submitting ? 'Saving…' : <span>Log & Next → <span className="opacity-50 font-normal text-xs">Enter</span></span>}
              </button>
            </div>

            <div className="flex justify-end">
              <Link
                href={`/dsa/${card!.id}`}
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
              <div className="flex flex-col items-center gap-3 py-8">
                <button
                  onClick={() => setRevealed(true)}
                  className="px-6 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Reveal answer <span className="text-xs font-normal opacity-50">Space</span>
                </button>
                <span className="text-xs text-muted/40">← → to navigate</span>
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
                    href={`${domainPath(card!.domain)}/${card!.id}`}
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
                    ✗ Struggled <span className="text-xs font-normal opacity-50 ml-1">N</span>
                  </button>
                  <button
                    onClick={() => advance(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-accent/10 border border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/20 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ✓ Got it <span className="text-xs font-normal opacity-50 ml-1">Y</span>
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
                <span className="ml-auto text-[11px] text-muted/40 self-center">⌘↵ to save</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation + skip section ── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous question"
        >
          <ArrowLeft size={14} /> Prev <span className="opacity-40 text-xs">←</span>
        </button>
        <button
          type="button"
          onClick={skipSection}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer"
        >
          <SkipForward size={14} />
          Skip all {DOMAIN_LABEL[card!.domain]}
          <span className="opacity-40 text-xs">S</span>
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next question"
        >
          <span className="opacity-40 text-xs">→</span> Next <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
