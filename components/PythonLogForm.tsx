'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Problem } from '@/lib/types';
import { Link2 } from 'lucide-react';
import { pasteAsMarkdown } from '@/lib/htmlToMarkdown';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function PythonLogForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [answer, setAnswer] = useState('');
  const [questionList, setQuestionList] = useState('');
  const [category, setCategory] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [struggled, setStruggled] = useState(true);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pyLists, setPyLists] = useState<string[]>([]);
  const [pyCategories, setPyCategories] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config/options?domain=python&field=question_list')
      .then(r => r.json())
      .then((rows: { value: string }[]) => {
        const vals = rows.map(r => r.value);
        setPyLists(vals);
        if (vals.length > 0) setQuestionList(vals[0]);
      })
      .catch(() => {});
    fetch('/api/config/options?domain=python&field=py_category')
      .then(r => r.json())
      .then((rows: { value: string }[]) => {
        const vals = rows.map(r => r.value);
        setPyCategories(vals);
        if (vals.length > 0) setCategory(vals[0]);
      })
      .catch(() => {});
  }, []);

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

    // Log attempt — no time, struggled captured explicitly
    await fetch(`/api/problems/${pid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_taken_mins: 0, struggled, attempted_at: new Date().toLocaleDateString('en-CA') }),
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

    // Save quick notes
    for (const note of notes) {
      await fetch(`/api/problems/${pid}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: note }),
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

      {/* Quick notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">
          Notes <span className="normal-case tracking-normal text-muted/60">(optional — one per line, Enter to add)</span>
        </label>
        {notes.length > 0 && (
          <ul className="flex flex-col gap-1">
            {notes.map((n, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-fg">
                <span className="flex-1">{n}</span>
                <button type="button" onClick={() => setNotes(ns => ns.filter((_, j) => j !== i))} className="text-muted hover:text-danger transition-colors cursor-pointer text-xs">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const t = noteInput.trim();
                if (t) { setNotes(ns => [...ns, t]); setNoteInput(''); }
              }
            }}
            placeholder="e.g. list is mutable, tuple is immutable"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => { const t = noteInput.trim(); if (t) { setNotes(ns => [...ns, t]); setNoteInput(''); } }}
            disabled={!noteInput.trim()}
            className="px-3 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Question list + Category */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            Question List <span className="normal-case tracking-normal text-muted/60">(optional)</span>
          </label>
          <select value={questionList} onChange={e => setQuestionList(e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {pyLists.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            Category <span className="normal-case tracking-normal text-muted/60">(optional)</span>
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {pyCategories.map(c => <option key={c} value={c}>{c}</option>)}
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

      {/* Struggled toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">Did you struggle?</span>
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setStruggled(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${!struggled ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:text-fg'}`}
          >
            No — knew it
          </button>
          <button
            type="button"
            onClick={() => setStruggled(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${struggled ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-fg'}`}
          >
            Yes — struggled
          </button>
        </div>
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
