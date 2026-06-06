'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Problem } from '@/lib/types';
import { Link2 } from 'lucide-react';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function SystemDesignLogForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [learned, setLearned] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim() || selectedProblem) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch('/api/problems?domain=system_design');
      const all: Problem[] = await res.json();
      setSuggestions(all.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    }, 150);
    return () => clearTimeout(t);
  }, [query, selectedProblem]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = selectedProblem?.name ?? query.trim();
    if (!name) return;
    setSubmitting(true);

    // Create problem if new
    let pid = selectedProblem?.id ?? null;
    if (!pid) {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: 'system_design' }),
      });
      const p: Problem = await res.json();
      pid = p.id;
    }

    // Log attempt (time=0, struggled=false — system design is concept review)
    await fetch(`/api/problems/${pid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_taken_mins: 0, struggled: false, attempted_at: new Date().toISOString().slice(0, 10) }),
    });

    // Save "what I learned" to notes_text
    if (learned.trim()) {
      await fetch(`/api/problems/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_text: learned.trim() }),
      });
    }

    // Save link
    if (linkUrl.trim()) {
      await fetch(`/api/problems/${pid}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), label: linkLabel.trim() || null }),
      });
    }

    setSubmitting(false);
    router.push(`/system-design/${pid}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Concept name */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Concept / Topic</label>
        <input
          ref={inputRef}
          type="text"
          value={selectedProblem ? selectedProblem.name : query}
          onChange={e => { setQuery(e.target.value); setSelectedProblem(null); }}
          placeholder="e.g. Design Twitter Feed, When to use Kafka vs Redis…"
          className={inputCls}
          autoComplete="off"
          autoFocus
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {suggestions.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedProblem(p); setQuery(''); setSuggestions([]); }}
                  className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface-2 cursor-pointer"
                >
                  {p.name}
                  {p.sd_category && <span className="ml-2 text-xs text-muted">{p.sd_category}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* What I learned */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">
          What I Learned <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <textarea
          value={learned}
          onChange={e => setLearned(e.target.value)}
          placeholder="Key takeaways, decisions, patterns…"
          className={`${inputCls} resize-none h-28`}
        />
      </div>

      {/* Link */}
      <div className="flex flex-col gap-1">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
          <Link2 size={12} /> Link <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={`${inputCls} flex-1 min-w-[200px]`}
          />
          <input
            type="text"
            value={linkLabel}
            onChange={e => setLinkLabel(e.target.value)}
            placeholder="Label (e.g. Hello Interview video)"
            className={`${inputCls} w-52`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || (!selectedProblem && !query.trim())}
        className="min-h-[42px] px-6 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors self-start cursor-pointer"
      >
        {submitting ? 'Saving…' : 'Log Concept'}
      </button>
    </form>
  );
}
