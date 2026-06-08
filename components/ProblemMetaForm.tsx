'use client';

import { useState } from 'react';
import { Problem } from '@/lib/types';

const DSA_PATTERNS = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search',
  'Linked List', 'Trees', 'Tries', 'Backtracking', 'Heap / Priority Queue',
  'Graphs', 'Depth-First Search', 'Breadth-First Search', 'Dynamic Programming',
  'Greedy', 'Intervals', 'Prefix Sum', 'Matrices', 'Math & Geometry',
];
const SD_CATEGORIES = [
  'Caching', 'Databases', 'Messaging Queues', 'Load Balancing', 'Sharding',
  'API Design', 'Storage', 'Microservices', 'Consistency & Replication', 'Rate Limiting',
];
const SD_SOURCES = ['Hello Interview', 'Grokking', 'Alex Xu', 'YouTube', 'Other'];

interface Props {
  problem: Problem;
  onUpdated: (p: Problem) => void;
}

export default function ProblemMetaForm({ problem, onUpdated }: Props) {
  const [data, setData] = useState(problem);

  async function save(field: string, value: string) {
    const res = await fetch(`/api/problems/${problem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const updated: Problem = await res.json();
    setData(updated);
    onUpdated(updated);
  }

  const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

  const field = (label: string, key: keyof Problem, inputEl: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted uppercase tracking-wide">{label}</label>
      {inputEl}
    </div>
  );

  const select = (key: keyof Problem, options: string[], placeholder = '— none —') => (
    <select
      value={(data[key] as string) ?? ''}
      onChange={e => { setData(d => ({ ...d, [key]: e.target.value })); save(key, e.target.value); }}
      className={inputCls}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const freeInput = (key: keyof Problem, placeholder: string, list?: string) => (
    <input
      type="text"
      value={(data[key] as string) ?? ''}
      list={list}
      onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
      onBlur={e => save(key, e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {problem.domain === 'dsa' && <>
        {field('Difficulty', 'difficulty', select('difficulty', ['Easy', 'Medium', 'Hard']))}
        {field('Platform', 'platform', select('platform', ['LeetCode', 'NeetCode', 'Hello Interview', 'Other']))}
        {field('Question List', 'question_list', select('question_list', ['NeetCode 150', 'Blind 75', 'HelloInterview Learn Code', 'Other']))}
        {field('Pattern', 'pattern_tag', <>
          {freeInput('pattern_tag', 'e.g. Sliding Window', 'dsa-patterns')}
          <datalist id="dsa-patterns">
            {DSA_PATTERNS.map(p => <option key={p} value={p} />)}
          </datalist>
        </>)}
      </>}

      {problem.domain === 'system_design' && <>
        {field('Category', 'sd_category', select('sd_category', SD_CATEGORIES))}
        {field('Source', 'sd_source', select('sd_source', SD_SOURCES))}
      </>}

      {problem.domain === 'frontend' && <>
        {field('Bucket', 'fe_bucket', select('fe_bucket', ['JS Quirks', 'React Internals', 'Component Building']))}
        {field('Question Set', 'fe_question_set', select('fe_question_set', ['React 100', 'JS 500', 'Frontend 75', 'Other']))}
      </>}

      {problem.domain === 'python' && <>
        {field('Category', 'py_category', select('py_category', ['Language Quirks', 'stdlib', 'OOP', 'Concurrency', 'Other']))}
      </>}

      {field(problem.domain === 'system_design' ? 'What I Learned' : 'Reference Notes', 'notes_text',
        <textarea
          value={data.notes_text ?? ''}
          onChange={e => setData(d => ({ ...d, notes_text: e.target.value }))}
          onBlur={e => save('notes_text', e.target.value)}
          placeholder={problem.domain === 'system_design' ? 'Key takeaways, decisions, patterns…' : 'Short context (links live below)…'}
          className={`${inputCls} resize-none h-28`}
        />
      )}
    </div>
  );
}
