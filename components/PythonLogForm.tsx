'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Problem } from '@/lib/types';
import { Link2 } from 'lucide-react';
import { pasteAsMarkdown } from '@/lib/htmlToMarkdown';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

const PY_CATEGORIES = ['Language Quirks', 'stdlib', 'OOP', 'Concurrency', 'Other'];

const PY_LISTS = [
  'GFG Top 50',
  'GFG Top 100',
  'GFG Python Interview Questions',
  'Python Interview Questions',
  'Other',
];

export default function PythonLogForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [answer, setAnswer] = useState('');
  const [questionList, setQuestionList] = useState('GFG Top 50');
  const [category, setCategory] = useState('Language Quirks');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim() || selectedProblem) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch('/api/problems?domain=python');
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
        body: JSON.stringify({ name, domain: 'python' }),
      });
      const p: Problem = await res.json();
      pid = p.id;
    }

    // Log attempt (no time, no struggled — concept review)
    await fetch(`/api/problems/${pid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_taken_mins: 0, struggled: false, attempted_at: new Date().toLocaleDateString('en-CA') }),
    });

    // Patch metadata
    const meta: Record<string, string> = {};
    if (answer.trim())       meta.notes_text    = answer.trim();
    if (questionList.trim()) meta.question_list = questionList.trim();
    if (category)            meta.py_category   = category;
    if (Object.keys(meta).length > 0) {
      await fetch(`/api/problems/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
    }

    // Save link
    if (linkUrl.trim()) {
      await fetch(`/api/problems/${pid}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), label: name }),
      });
    }

    setSubmitting(false);
    router.push(`/python/${pid}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Question title */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Question</label>
        <input
          ref={inputRef}
          type="text"
          value={selectedProblem ? selectedProblem.name : query}
          onChange={e => { setQuery(e.target.value); setSelectedProblem(null); }}
          placeholder="e.g. What is the difference between list and tuple?"
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
                  {p.py_category && <span className="ml-2 text-xs text-muted">{p.py_category}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Answer */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">
          Answer <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onPaste={e => { const md = pasteAsMarkdown(e, answer); if (md !== null) setAnswer(md); }}
          placeholder="Key points, gotchas, syntax…"
          className={`${inputCls} resize-none h-28`}
        />
      </div>

      {/* Question list + Category */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            Question List <span className="normal-case tracking-normal text-muted/60">(optional)</span>
          </label>
          <input
            list="py-lists"
            type="text"
            value={questionList}
            onChange={e => setQuestionList(e.target.value)}
            placeholder="e.g. GFG Top 50"
            className={inputCls}
            autoComplete="off"
          />
          <datalist id="py-lists">
            {PY_LISTS.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            Category <span className="normal-case tracking-normal text-muted/60">(optional)</span>
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {PY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Link */}
      <div className="flex flex-col gap-1">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
          <Link2 size={12} /> Link <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <input
          type="url"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="https://geeksforgeeks.org/…"
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || (!selectedProblem && !query.trim())}
        className="min-h-[42px] px-6 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors self-start cursor-pointer"
      >
        {submitting ? 'Saving…' : 'Log Question'}
      </button>
    </form>
  );
}
