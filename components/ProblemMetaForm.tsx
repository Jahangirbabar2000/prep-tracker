'use client';

import { useState } from 'react';
import { Problem } from '@/lib/types';
import MarkdownRenderer from './MarkdownRenderer';

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
  const [notesPreview, setNotesPreview] = useState(true);

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

  const notesLabel =
    problem.domain === 'system_design' ? 'What I Learned' :
    problem.domain === 'python'        ? 'Answer' :
                                         'Reference Notes';

  const notesPlaceholder =
    problem.domain === 'system_design' ? 'Key takeaways, decisions, patterns… (markdown supported)' :
    problem.domain === 'python'        ? 'Key points, gotchas, syntax… (markdown supported)' :
                                         'Short context… (markdown supported)';

  return (
    <div className="flex flex-col gap-4">
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
          {field('Question List', 'question_list', <>
            <input
              list="py-lists-meta"
              type="text"
              value={(data.question_list as string) ?? ''}
              onChange={e => setData(d => ({ ...d, question_list: e.target.value }))}
              onBlur={e => save('question_list', e.target.value)}
              placeholder="e.g. GFG Top 50"
              className={inputCls}
              autoComplete="off"
            />
            <datalist id="py-lists-meta">
              {['GFG Top 50', 'GFG Top 100', 'GFG Python Interview Questions', 'Python Interview Questions', 'Other'].map(l => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </>)}
          {field('Category', 'py_category', select('py_category', ['Language Quirks', 'stdlib', 'OOP', 'Concurrency', 'Other']))}
        </>}
      </div>

      {/* Notes / Answer — full width with Write / Preview toggle */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">{notesLabel}</label>
          <div className="flex gap-0.5 bg-surface-2 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setNotesPreview(false)}
              className={`text-xs px-2.5 py-0.5 rounded transition-colors cursor-pointer ${!notesPreview ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >Write</button>
            <button
              type="button"
              onClick={() => { save('notes_text', data.notes_text ?? ''); setNotesPreview(true); }}
              className={`text-xs px-2.5 py-0.5 rounded transition-colors cursor-pointer ${notesPreview ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >Preview</button>
          </div>
        </div>
        {notesPreview ? (
          <div className="min-h-28 px-3 py-2.5 border border-border rounded-lg bg-background">
            {data.notes_text
              ? <MarkdownRenderer content={data.notes_text} />
              : <span className="text-sm text-muted italic">Nothing to preview.</span>
            }
          </div>
        ) : (
          <textarea
            value={data.notes_text ?? ''}
            onChange={e => setData(d => ({ ...d, notes_text: e.target.value }))}
            onBlur={e => save('notes_text', e.target.value)}
            placeholder={notesPlaceholder}
            className={`${inputCls} resize-none h-28`}
          />
        )}
      </div>
    </div>
  );
}
