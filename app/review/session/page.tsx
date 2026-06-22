'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, SkipForward } from 'lucide-react';
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

export default function SessionPage() {
  const [status, setStatus]             = useState<'loading' | 'ready' | 'empty' | 'done'>('loading');
  const [queue, setQueue]               = useState<ReviewQueueItem[]>([]);
  const [totalCards, setTotalCards]     = useState(0);
  const [revealed, setRevealed]         = useState(false);
  const [links, setLinks]               = useState<LinkType[] | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [results, setResults]           = useState<{ struggled: boolean }[]>([]);
  const [skippedIds, setSkippedIds]     = useState<Set<number>>(new Set());
  const [skippedCount, setSkippedCount] = useState(0);

  // DSA log form state
  const [dsaTime, setDsaTime]           = useState('');
  const [dsaStruggled, setDsaStruggled] = useState(true);

  // Notes state
  const [noteOpen, setNoteOpen]         = useState(false);
  const [noteInput, setNoteInput]       = useState('');
  const [noteSaving, setNoteSaving]     = useState(false);

  useEffect(() => {
    fetch('/api/review-queue')
      .then(r => r.json())
      .then((all: ReviewQueueItem[]) => {
        if (all.length === 0) { setStatus('empty'); return; }
        setQueue(all);
        setTotalCards(all.length);
        setStatus('ready');
      });
  }, []);

  const card      = queue[0] ?? null;
  const isDSA     = card?.domain === 'dsa';
  const isRevisit = card ? skippedIds.has(card.id) : false;

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

  const skip = useCallback(() => {
    if (!card || submitting) return;
    const [head, ...rest] = queue;
    const newQueue = [...rest, head];
    const newSkipped = new Set(skippedIds);
    newSkipped.add(head.id);
    if (newQueue.every(c => newSkipped.has(c.id))) {
      setSkippedCount(sc => sc + newQueue.length);
      setStatus('done');
      return;
    }
    setQueue(newQueue);
    setSkippedIds(newSkipped);
    resetCardState();
  }, [card, queue, skippedIds, submitting, resetCardState]);

  const skipSection = useCallback(() => {
    if (!card) return;
    const domain = card.domain;
    const keep = queue.filter(c => c.domain !== domain);
    const move = queue.filter(c => c.domain === domain);
    const newQueue = [...keep, ...move];
    const newSkipped = new Set(skippedIds);
    move.forEach(c => newSkipped.add(c.id));
    if (keep.length === 0 || keep.every(c => newSkipped.has(c.id))) {
      setSkippedCount(sc => sc + newQueue.filter(c => newSkipped.has(c.id)).length);
      setStatus('done');
      return;
    }
    setQueue(newQueue);
    setSkippedIds(newSkipped);
    resetCardState();
  }, [card, queue, skippedIds, resetCardState]);

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

    const newSkipped = new Set(skippedIds);
    newSkipped.delete(card.id);
    setSkippedIds(newSkipped);
    setResults(prev => [...prev, { struggled }]);
    setSubmitting(false);

    const remaining = queue.slice(1);
    if (remaining.length === 0 || remaining.every(c => newSkipped.has(c.id))) {
      setSkippedCount(remaining.filter(c => newSkipped.has(c.id)).length);
      setStatus('done');
    } else {
      setQueue(remaining);
      resetCardState();
    }
  }, [card, queue, skippedIds, submitting, resetCardState]);

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

  // Keyboard shortcuts
  useEffect(() => {
    if (status !== 'ready') return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (!isDSA) {
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setRevealed(r => !r); }
        if (revealed && !submitting) {
          if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault(); advance(false);
          }
          if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowLeft') {
            e.preventDefault(); advance(true);
          }
        }
        // Arrow keys before reveal: skip
        if (!revealed) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); skip(); }
        }
      } else {
        // DSA: arrow keys skip
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); skip(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, revealed, submitting, advance, skip, isDSA]);

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
          {skippedCount > 0 && (
            <p className="text-xs text-muted mt-1">
              {skippedCount} skipped — they&apos;ll appear in your next session
            </p>
          )}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
        >
          Back to Review Queue
        </Link>
      </div>
    );
  }

  const reviewed = results.length;
  const progress = (reviewed / totalCards) * 100;
  const t = cardTag(card!);

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
          <ArrowLeft size={13} /> Exit session
        </Link>
        <span className="text-xs text-muted tabular">{reviewed + 1} / {totalCards}</span>
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
        {/* Domain + tag + proficiency badge + revisit indicator */}
        <div className="flex items-center gap-2 flex-wrap px-6 pt-5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_STYLE[card!.domain]}`}>
            {DOMAIN_LABEL[card!.domain]}
          </span>
          {t && <span className="text-xs text-muted">{t}</span>}
          <ProficiencyBadge
            level={card!.interval_level}
            nextDueDate={card!.next_due_date ?? null}
            attemptCount={card!.attempt_count ?? 0}
          />
          {isRevisit && (
            <span className="text-xs text-muted/50 italic ml-auto">revisiting</span>
          )}
        </div>

        {/* Question title */}
        <p className="px-6 pt-4 pb-6 text-lg font-semibold text-fg leading-snug">
          {card!.name}
        </p>

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
              </div>
              <button
                onClick={advanceDsa}
                disabled={submitting || !dsaTime.trim()}
                className="py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {submitting ? 'Saving…' : 'Log & Next →'}
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
                  Reveal answer
                </button>
                <span className="text-xs text-muted/40">Space to reveal · ← → to skip</span>
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
                    onClick={() => advance(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-accent/10 border border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/20 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ✓ Got it <span className="text-xs font-normal opacity-50 ml-1">→</span>
                  </button>
                  <button
                    onClick={() => advance(true)}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-danger/10 border border-danger/30 text-danger text-sm font-semibold rounded-lg hover:bg-danger/20 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ✗ Struggled <span className="text-xs font-normal opacity-50 ml-1">←</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notes section — always visible at card bottom ── */}
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

      {/* ── Skip actions — outside the card as proper buttons ── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={skip}
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer disabled:opacity-40"
        >
          <SkipForward size={14} />
          Skip question
          <span className="opacity-40 text-xs">← →</span>
        </button>
        <button
          type="button"
          onClick={skipSection}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer"
        >
          <SkipForward size={14} />
          Skip all {DOMAIN_LABEL[card!.domain]}
        </button>
      </div>
    </div>
  );
}
