'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ReviewQueueItem, Link as LinkType } from '@/lib/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const CONCEPT_DOMAINS = ['system_design', 'frontend', 'python'];

const DOMAIN_LABEL: Record<string, string> = {
  system_design: 'System Design',
  frontend: 'Frontend',
  python: 'Python',
};

const DOMAIN_STYLE: Record<string, string> = {
  system_design: 'bg-orange-500/10 text-orange-400',
  frontend:      'bg-purple-500/10  text-purple-400',
  python:        'bg-emerald-500/10 text-emerald-400',
};

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function cardTag(item: ReviewQueueItem): string | null {
  return item.sd_category ?? item.fe_bucket ?? item.py_category ?? item.question_list ?? null;
}

function domainPath(domain: string) {
  return domain === 'system_design' ? '/system-design' : `/${domain}`;
}

export default function SessionPage() {
  const [status, setStatus]     = useState<'loading' | 'ready' | 'empty' | 'done'>('loading');
  const [cards, setCards]       = useState<ReviewQueueItem[]>([]);
  const [idx, setIdx]           = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [links, setLinks]       = useState<LinkType[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults]   = useState<{ struggled: boolean }[]>([]);

  // Load due concept-domain cards
  useEffect(() => {
    fetch('/api/review-queue')
      .then(r => r.json())
      .then((all: ReviewQueueItem[]) => {
        const filtered = all.filter(i => CONCEPT_DOMAINS.includes(i.domain));
        if (filtered.length === 0) { setStatus('empty'); return; }
        setCards(filtered);
        setStatus('ready');
      });
  }, []);

  // Fetch links lazily when card is revealed
  const card = cards[idx] ?? null;
  useEffect(() => {
    if (!revealed || !card) return;
    setLinks(null);
    fetch(`/api/problems/${card.id}/links`)
      .then(r => r.json())
      .then(setLinks)
      .catch(() => setLinks([]));
  }, [revealed, card?.id]);

  const advance = useCallback(async (struggled: boolean) => {
    if (!card || submitting) return;
    setSubmitting(true);

    await fetch(`/api/problems/${card.id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time_taken_mins: 0,
        struggled,
        attempted_at: new Date().toLocaleDateString('en-CA'),
      }),
    });

    setResults(prev => [...prev, { struggled }]);
    setSubmitting(false);

    if (idx + 1 >= cards.length) {
      setStatus('done');
    } else {
      setIdx(i => i + 1);
      setRevealed(false);
      setLinks(null);
    }
  }, [card, idx, cards.length, submitting]);

  // Keyboard shortcuts
  useEffect(() => {
    if (status !== 'ready') return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === ' ' || e.key === 'Spacebar') && !revealed) {
        e.preventDefault();
        setRevealed(true);
      }
      if (revealed && !submitting) {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') advance(false);
        if (e.key === 'n' || e.key === 'N') advance(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, revealed, submitting, advance]);

  // ── States ────────────────────────────────────────────────────────────

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
        <p className="text-sm text-muted">No Python, Frontend, or System Design items are overdue.</p>
        <Link href="/" className="text-sm text-accent hover:text-accent-hover transition-colors">
          ← Review Queue
        </Link>
      </div>
    );
  }

  if (status === 'done') {
    const struggledCount = results.filter(r => r.struggled).length;
    const gotCount = results.length - struggledCount;
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

  // ── Active card ───────────────────────────────────────────────────────

  const progress = (idx / cards.length) * 100;
  const t = cardTag(card);

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
          <ArrowLeft size={13} /> Exit session
        </Link>
        <span className="text-xs text-muted tabular">{idx + 1} / {cards.length}</span>
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
        {/* Domain + tag */}
        <div className="flex items-center gap-2 px-6 pt-5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_STYLE[card.domain]}`}>
            {DOMAIN_LABEL[card.domain]}
          </span>
          {t && <span className="text-xs text-muted">{t}</span>}
        </div>

        {/* Question */}
        <p className="px-6 pt-4 pb-6 text-lg font-semibold text-fg leading-snug">
          {card.name}
        </p>

        {/* Divider + reveal / answer */}
        <div className="border-t border-border">
          {!revealed ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <button
                onClick={() => setRevealed(true)}
                className="px-6 py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Reveal answer
              </button>
              <span className="text-xs text-muted/50">Space</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-6 py-5">
              {/* Answer text */}
              {card.notes_text ? (
                <MarkdownRenderer content={card.notes_text} />
              ) : (
                <p className="text-sm text-muted italic">No answer saved yet.</p>
              )}

              {/* Links */}
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

              {/* Open full */}
              <div className="flex justify-end">
                <Link
                  href={`${domainPath(card.domain)}/${card.id}`}
                  target="_blank"
                  className="text-xs text-muted hover:text-fg transition-colors"
                >
                  Open full →
                </Link>
              </div>

              {/* Got it / Struggled */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => advance(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-accent/10 border border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/20 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  ✓ Got it <span className="text-xs font-normal opacity-50 ml-1">Y</span>
                </button>
                <button
                  onClick={() => advance(true)}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-danger/10 border border-danger/30 text-danger text-sm font-semibold rounded-lg hover:bg-danger/20 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  ✗ Struggled <span className="text-xs font-normal opacity-50 ml-1">N</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
