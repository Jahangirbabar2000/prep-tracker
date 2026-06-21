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
  const [difficulty, setDifficulty] = useState('');
  const [feBucket, setFeBucket] = useState('');
  const [feQuestionSet, setFeQuestionSet] = useState('');
  const [pyCategory, setPyCategory] = useState('');

  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dsaPlatforms, setDsaPlatforms] = useState<string[]>([]);
  const [dsaLists, setDsaLists] = useState<string[]>([]);
  const [feBuckets, setFeBuckets] = useState<string[]>([]);
  const [feSets, setFeSets] = useState<string[]>([]);
  const [pyCategories, setPyCategories] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveDomain = defaultDomain ?? domain;

  useEffect(() => {
    fetch('/api/config/options?domain=dsa&field=platform')
      .then(r => r.json()).then((rows: { value: string }[]) => setDsaPlatforms(rows.map(r => r.value))).catch(() => {});
    fetch('/api/config/options?domain=dsa&field=question_list')
      .then(r => r.json()).then((rows: { value: string }[]) => setDsaLists(rows.map(r => r.value))).catch(() => {});
    fetch('/api/config/options?domain=frontend&field=fe_bucket')
      .then(r => r.json()).then((rows: { value: string }[]) => setFeBuckets(rows.map(r => r.value))).catch(() => {});
    fetch('/api/config/options?domain=frontend&field=fe_question_set')
      .then(r => r.json()).then((rows: { value: string }[]) => setFeSets(rows.map(r => r.value))).catch(() => {});
    fetch('/api/config/options?domain=python&field=py_category')
      .then(r => r.json()).then((rows: { value: string }[]) => setPyCategories(rows.map(r => r.value))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!effectiveDomain) return;
    fetch(`/api/config/options?domain=${effectiveDomain}&field=default_link`)
      .then(r => r.json())
      .then((rows: { value: string }[]) => { if (rows.length > 0) setLinkUrl(rows[0].value); })
      .catch(() => {});
  }, [effectiveDomain]);

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
      if (platform) meta.platform = platform;
      if (questionList) meta.question_list = questionList;
      if (patternTag) meta.pattern_tag = patternTag;
      if (difficulty) meta.difficulty = difficulty;
    } else if (effectiveDomain === 'frontend') {
      if (feBucket) meta.fe_bucket = feBucket;
      if (feQuestionSet) meta.fe_question_set = feQuestionSet;
    } else if (effectiveDomain === 'python') {
      if (pyCategory) meta.py_category = pyCategory;
    }
    if (Object.keys(meta).length > 0) {
      await fetch(`/api/problems/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
    }

    if (linkUrl.trim()) {
      const problemName = selectedProblem?.name ?? query.trim();
      await fetch(`/api/problems/${pid}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), label: problemName || null }),
      });
    }

    setSubmitting(false);
    if (onLogged) {
      onLogged();
    } else {
      const domainPath = effectiveDomain === 'system_design' ? '/system-design' : `/${effectiveDomain}`;
      router.push(`${domainPath}/${pid}`);
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
            <option value="python">Backend</option>
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
            className={`min-h-[42px] px-4 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${struggled
              ? 'bg-danger/10 border-danger/40 text-danger'
              : 'bg-accent/10 border-accent/40 text-accent'
              }`}
          >
            {struggled ? 'Yes' : 'No'}
          </button>
        </div>
      </div>

      {/* ── Classification card (domain-specific optional metadata + link) ── */}
      {!problemId && (
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Classification &amp; Link <span className="normal-case tracking-normal font-normal opacity-50">— optional</span>
          </p>

          {effectiveDomain === 'dsa' && (
            <>
              <div className="flex gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={inputCls}>
                    <option value="">— none —</option>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                    <option value="">— none —</option>
                    {dsaPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Question List</label>
                  <select value={questionList} onChange={e => setQuestionList(e.target.value)} className={inputCls}>
                    <option value="">— none —</option>
                    {dsaLists.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
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
            </>
          )}

          {effectiveDomain === 'frontend' && (
            <div className="flex gap-3 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs text-muted">Bucket</label>
                <select value={feBucket} onChange={e => setFeBucket(e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {feBuckets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs text-muted">Question Set</label>
                <select value={feQuestionSet} onChange={e => setFeQuestionSet(e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {feSets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {effectiveDomain === 'python' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Category</label>
              <select value={pyCategory} onChange={e => setPyCategory(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {pyCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Link2 size={11} /> Link
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/…"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Bottom action bar: struggled + submit */}
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
          disabled={submitting || !timeTaken || (!problemId && !selectedProblem && !query.trim())}
          className="min-h-[38px] px-5 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
        >
          {submitting ? 'Logging…' : 'Log Attempt'}
        </button>
      </div>
    </form>
  );
}
