'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Domain, Problem } from '@/lib/types';
import { Link2 } from 'lucide-react';

interface Props {
  defaultDomain?: Domain;
  inline?: boolean;
  problemId?: number;
  onLogged?: () => void;
}

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

const DSA_PATTERNS = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search',
  'Linked List', 'Trees', 'Tries', 'Backtracking', 'Heap / Priority Queue',
  'Graphs', 'Depth-First Search', 'Breadth-First Search', 'Dynamic Programming',
  'Greedy', 'Intervals', 'Prefix Sum', 'Matrices', 'Math & Geometry',
];

export default function QuickLogForm({ defaultDomain, inline, problemId, onLogged }: Props) {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>(defaultDomain ?? 'dsa');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [timeTaken, setTimeTaken] = useState('');
  const [attemptedAt, setAttemptedAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  });
  const [struggled, setStruggled] = useState(false);

  // Domain-specific optional metadata
  const [platform, setPlatform] = useState('');
  const [questionList, setQuestionList] = useState('');
  const [patternTag, setPatternTag] = useState('');
  const [feBucket, setFeBucket] = useState('');
  const [feQuestionSet, setFeQuestionSet] = useState('');
  const [pyCategory, setPyCategory] = useState('');

  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveDomain = defaultDomain ?? domain;

  useEffect(() => {
    if (inline && inputRef.current) inputRef.current.focus();
  }, [inline]);

  useEffect(() => {
    if (!query.trim() || selectedProblem) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/problems?domain=${effectiveDomain}`);
      const all: Problem[] = await res.json();
      setSuggestions(all.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    }, 150);
    return () => clearTimeout(t);
  }, [query, effectiveDomain, selectedProblem]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!timeTaken || (!problemId && !selectedProblem && !query.trim())) return;
    setSubmitting(true);

    let pid = problemId ?? selectedProblem?.id ?? null;

    if (!pid) {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query.trim(), domain: effectiveDomain }),
      });
      const p: Problem = await res.json();
      pid = p.id;
    }

    await fetch(`/api/problems/${pid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time_taken_mins: +timeTaken,
        struggled,
        attempted_at: attemptedAt,
      }),
    });

    // Patch optional metadata if any was filled in
    const meta: Record<string, string> = {};
    if (effectiveDomain === 'dsa') {
      if (platform)     meta.platform     = platform;
      if (questionList) meta.question_list = questionList;
      if (patternTag)   meta.pattern_tag  = patternTag;
    } else if (effectiveDomain === 'frontend') {
      if (feBucket)     meta.fe_bucket      = feBucket;
      if (feQuestionSet) meta.fe_question_set = feQuestionSet;
    } else if (effectiveDomain === 'python') {
      if (pyCategory)   meta.py_category  = pyCategory;
    }
    if (Object.keys(meta).length > 0) {
      await fetch(`/api/problems/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
    }

    if (linkUrl.trim()) {
      await fetch(`/api/problems/${pid}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), label: linkLabel.trim() || null }),
      });
    }

    setSubmitting(false);
    if (onLogged) {
      onLogged();
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!defaultDomain && !problemId && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Domain</label>
          <select
            value={domain}
            onChange={e => { setDomain(e.target.value as Domain); setSelectedProblem(null); setQuery(''); }}
            className={inputCls}
          >
            <option value="dsa">DSA</option>
            <option value="system_design">System Design</option>
            <option value="frontend">Frontend</option>
            <option value="python">Python</option>
          </select>
        </div>
      )}

      {!problemId && (
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Problem / Concept</label>
          <input
            ref={inputRef}
            type="text"
            value={selectedProblem ? selectedProblem.name : query}
            onChange={e => { setQuery(e.target.value); setSelectedProblem(null); }}
            placeholder="Type to search or add new…"
            className={inputCls}
            autoComplete="off"
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
                    {p.pattern_tag && <span className="ml-2 text-xs text-muted">{p.pattern_tag}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Time + date + struggled */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={attemptedAt}
            onChange={e => setAttemptedAt(e.target.value)}
            className={`${inputCls} tabular`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Time (min)</label>
          <input
            type="number"
            value={timeTaken}
            onChange={e => setTimeTaken(e.target.value)}
            placeholder="25"
            min={1}
            className={`${inputCls} w-24 tabular`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Struggled?</label>
          <button
            type="button"
            onClick={() => setStruggled(s => !s)}
            className={`min-h-[42px] px-4 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              struggled
                ? 'bg-danger/10 border-danger/40 text-danger'
                : 'bg-accent/10 border-accent/40 text-accent'
            }`}
          >
            {struggled ? 'Yes' : 'No'}
          </button>
        </div>
      </div>

      {/* ── DSA optional metadata ─────────────────────────────────────── */}
      {effectiveDomain === 'dsa' && !problemId && (
        <div className="flex flex-col gap-3 pt-1 border-t border-border">
          <p className="text-xs text-muted uppercase tracking-wide font-medium mt-2">Details <span className="normal-case tracking-normal opacity-60">(optional)</span></p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={`${inputCls}`}>
                <option value="">— none —</option>
                <option>LeetCode</option>
                <option>NeetCode</option>
                <option>Hello Interview</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Question List</label>
              <select value={questionList} onChange={e => setQuestionList(e.target.value)} className={`${inputCls}`}>
                <option value="">— none —</option>
                <option>NeetCode 150</option>
                <option>Blind 75</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1 relative">
            <label className="text-xs text-muted">Pattern</label>
            <input
              list="qf-dsa-patterns"
              type="text"
              value={patternTag}
              onChange={e => setPatternTag(e.target.value)}
              placeholder="e.g. Sliding Window"
              className={inputCls}
            />
            <datalist id="qf-dsa-patterns">
              {DSA_PATTERNS.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
        </div>
      )}

      {/* ── Frontend optional metadata ────────────────────────────────── */}
      {effectiveDomain === 'frontend' && !problemId && (
        <div className="flex flex-col gap-3 pt-1 border-t border-border">
          <p className="text-xs text-muted uppercase tracking-wide font-medium mt-2">Details <span className="normal-case tracking-normal opacity-60">(optional)</span></p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Bucket</label>
              <select value={feBucket} onChange={e => setFeBucket(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                <option>JS Quirks</option>
                <option>React Internals</option>
                <option>Component Building</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Question Set</label>
              <select value={feQuestionSet} onChange={e => setFeQuestionSet(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                <option>React 100</option>
                <option>JS 500</option>
                <option>Frontend 75</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Python optional metadata ──────────────────────────────────── */}
      {effectiveDomain === 'python' && !problemId && (
        <div className="flex flex-col gap-3 pt-1 border-t border-border">
          <p className="text-xs text-muted uppercase tracking-wide font-medium mt-2">Details <span className="normal-case tracking-normal opacity-60">(optional)</span></p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Category</label>
            <select value={pyCategory} onChange={e => setPyCategory(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              <option>Language Quirks</option>
              <option>stdlib</option>
              <option>OOP</option>
              <option>Concurrency</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      )}

      {/* Optional link */}
      <div className="flex flex-col gap-1">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
          <Link2 size={12} /> Link <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://leetcode.com/problems/…"
            className={`${inputCls} flex-1 min-w-[200px]`}
          />
          <input
            type="text"
            value={linkLabel}
            onChange={e => setLinkLabel(e.target.value)}
            placeholder="Label (e.g. Solution video)"
            className={`${inputCls} w-44`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !timeTaken || (!problemId && !selectedProblem && !query.trim())}
        className="min-h-[42px] px-6 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors self-start cursor-pointer"
      >
        {submitting ? 'Logging…' : 'Log Attempt'}
      </button>
    </form>
  );
}
