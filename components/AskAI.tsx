'use client';

import { useCallback, useRef, useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { idbGet, idbSet } from '@/lib/store/idb';

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface Cached { text: string; at: number }

export default function AskAI({
  problemId,
  question,
  answer,
}: {
  problemId: number;
  question: string;
  answer?: string | null;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const started = useRef(false);
  const cacheKey = `ai:${problemId}`;

  const run = useCallback(async (force: boolean) => {
    setError('');
    if (!force) {
      const cached = await idbGet<Cached>(cacheKey);
      if (cached?.text) { setText(cached.text); setStatus('done'); return; }
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('error');
      setError('You’re offline. Connect once to ask AI — it’s saved for next time.');
      return;
    }

    setText('');
    setStatus('loading');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer: answer ?? '' }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Something went wrong. Try again.');
      }
      setStatus('streaming');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
      setStatus('done');
      if (acc.trim()) void idbSet(cacheKey, { text: acc, at: Date.now() } satisfies Cached);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  }, [cacheKey, question, answer]);

  const open = () => { if (!started.current) { started.current = true; void run(false); } };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — no-op */ }
  };

  if (status === 'idle') {
    return (
      <button
        onClick={open}
        className="inline-flex items-center gap-2 self-start text-sm text-muted hover:text-fg bg-surface-2 border border-border rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
      >
        <Sparkles size={15} className="text-accent" />
        Ask AI to elaborate
      </button>
    );
  }

  return (
    <div className="flex">
      {/* Connector rail — makes the elaboration read as a margin note on the answer. */}
      <div className="w-0.5 bg-accent/60 ml-[18px] mr-4 shrink-0" aria-hidden />

      <div className="flex-1 min-w-0 bg-accent/5 border border-accent/25 rounded-r-xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-accent">
            <Sparkles size={13} /> AI · elaborated
          </span>
          {(status === 'done' || status === 'error') && (
            <button
              onClick={() => run(true)}
              title="Regenerate"
              aria-label="Regenerate"
              className="text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        {status === 'loading' && (
          <p className="text-sm text-muted">Thinking<span className="motion-safe:animate-pulse">…</span></p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {text && (
          <>
            <MarkdownRenderer content={text} />
            {status === 'streaming' && (
              <span className="inline-block w-1.5 h-4 bg-accent/70 align-text-bottom ml-0.5 motion-safe:animate-pulse" aria-hidden />
            )}
          </>
        )}

        {status === 'done' && text && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-accent/15">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
            >
              {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="text-[11px] text-muted/70">AI-generated — verify</span>
          </div>
        )}
      </div>
    </div>
  );
}
