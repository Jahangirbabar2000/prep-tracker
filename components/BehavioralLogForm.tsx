'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Problem, Attempt, Link as LinkType, Note } from '@/lib/types';
import { Link2, X } from 'lucide-react';
import { pasteAsMarkdown } from '@/lib/htmlToMarkdown';
import { syncCreatedProblem } from '@/lib/store/createProblem';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function BehavioralLogForm() {
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
  const [behLists, setBehLists] = useState<string[]>([]);
  const [behCategories, setBehCategories] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config/options?domain=behavioral&field=question_list')
      .then(r => r.json())
      .then((rows: { value: string }[]) => {
        const vals = rows.map(r => r.value);
        setBehLists(vals);
        if (vals.length > 0) setQuestionList(vals[0]);
      })
      .catch(() => {});
    fetch('/api/config/options?domain=behavioral&field=beh_category')
      .then(r => r.json())
      .then((rows: { value: string }[]) => {
        const vals = rows.map(r => r.value);
        setBehCategories(vals);
        if (vals.length > 0) setCategory(vals[0]);
      })
      .catch(() => {});
    fetch('/api/config/options?domain=behavioral&field=default_link')
      .then(r => r.json())
      .then((rows: { value: string }[]) => {
        if (rows[0]?.value) setLinkUrl(rows[0].value);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim() || selectedProblem) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch('/api/problems?domain=behavioral');
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

    let pid = selectedProblem?.id ?? null;
    let problem: Problem = selectedProblem as Problem;
    if (!pid) {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: 'behavioral' }),
      });
      problem = await res.json();
      pid = problem.id;
    }

    const attempt: Attempt = await fetch(`/api/problems/${pid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_taken_mins: 0, struggled, attempted_at: new Date().toLocaleDateString('en-CA') }),
    }).then(r => r.json());

    const meta: Record<string, string> = {};
    if (answer.trim())       meta.notes_text    = answer.trim();
    if (questionList.trim()) meta.question_list = questionList.trim();
    if (category)            meta.beh_category  = category;
    if (Object.keys(meta).length > 0) {
      problem = await fetch(`/api/problems/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      }).then(r => r.json());
    }

    const createdLinks: LinkType[] = [];
    if (linkUrl.trim()) {
      const link: LinkType = await fetch(`/api/problems/${pid}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), label: name }),
      }).then(r => r.json());
      createdLinks.push(link);
    }

    const createdNotes: Note[] = [];
    for (const note of notes) {
      const created: Note = await fetch(`/api/problems/${pid}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: note }),
      }).then(r => r.json());
      createdNotes.push(created);
    }

    syncCreatedProblem({ problem, attempt, links: createdLinks, notes: createdNotes });

    setSubmitting(false);
    router.push(`/behavioral/${pid}`);
  }

  function addNote() {
    const t = noteInput.trim();
    if (t) { setNotes(ns => [...ns, t]); setNoteInput(''); }
  }

  return (
    <form onSubmit={submit} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.currentTarget as HTMLFormElement).requestSubmit(); } }} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Question</label>
        <input
          ref={inputRef}
          type="text"
          value={selectedProblem ? selectedProblem.name : query}
          onChange={e => { setQuery(e.target.value); setSelectedProblem(null); }}
          placeholder="e.g. Tell me about a time you disagreed with a teammate"
          className={`${inputCls} text-base`}
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
                  {p.beh_category && <span className="ml-2 text-xs text-muted">{p.beh_category}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
          Answer <span className="normal-case tracking-normal font-normal text-muted/60">— optional</span>
        </label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onPaste={e => { const md = pasteAsMarkdown(e, answer); if (md !== null) setAnswer(md); }}
          placeholder="Situation, Task, Action, Result… (markdown supported)"
          className={`${inputCls} resize-y min-h-[160px]`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
          Notes <span className="normal-case tracking-normal font-normal text-muted/60">— optional, Enter to add</span>
        </label>
        {notes.length > 0 && (
          <ul className="flex flex-col gap-1">
            {notes.map((n, i) => (
              <li key={i} className="group flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-fg">
                <span className="flex-1 min-w-0">{n}</span>
                <button
                  type="button"
                  onClick={() => setNotes(ns => ns.filter((_, j) => j !== i))}
                  className="shrink-0 text-muted/40 hover:text-danger transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
            placeholder="e.g. Emphasize ownership and outcome metrics"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!noteInput.trim()}
            className="px-3 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          Classification &amp; Link <span className="normal-case tracking-normal font-normal opacity-50">— optional</span>
        </p>

        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-muted">Question List</label>
            <select value={questionList} onChange={e => setQuestionList(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {behLists.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs text-muted">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {behCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Link2 size={11} /> Link
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Struggled?</span>
          <div className="flex gap-0.5 bg-surface-2 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setStruggled(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${!struggled ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              No — knew it
            </button>
            <button
              type="button"
              onClick={() => setStruggled(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${struggled ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              Yes — struggled
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || (!selectedProblem && !query.trim())}
          className="min-h-[38px] px-5 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
        >
          {submitting ? 'Saving…' : <span>Log Question <span className="opacity-50 font-normal text-xs ml-0.5">⌘↵</span></span>}
        </button>
      </div>
    </form>
  );
}
