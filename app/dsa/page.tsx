import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';

export const dynamic = 'force-dynamic';

const selectCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

const DSA_PATTERNS = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search',
  'Linked List', 'Trees', 'Tries', 'Backtracking', 'Heap / Priority Queue',
  'Graphs', 'Depth-First Search', 'Breadth-First Search', 'Dynamic Programming',
  'Greedy', 'Intervals', 'Prefix Sum', 'Matrices', 'Math & Geometry',
];

export default async function DSAPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'dsa'";
  const params: string[] = [];

  if (sp.pattern) { query += ' AND pattern_tag = ?'; params.push(sp.pattern); }
  if (sp.list) { query += ' AND question_list = ?'; params.push(sp.list); }
  query += ' ORDER BY next_due_date ASC NULLS LAST, created_at DESC';

  const problems = db.prepare(query).all(...params) as Problem[];

  const withAvg = problems.map(p => {
    const attempts = db.prepare(
      'SELECT time_taken_mins FROM attempts WHERE problem_id = ?'
    ).all(p.id) as { time_taken_mins: number }[];
    const avg = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.time_taken_mins, 0) / attempts.length)
      : null;
    return { ...p, avg_time: avg };
  });

  const patterns = db.prepare(
    "SELECT DISTINCT pattern_tag FROM problems WHERE domain = 'dsa' AND pattern_tag IS NOT NULL"
  ).all() as { pattern_tag: string }[];

  const lists = db.prepare(
    "SELECT DISTINCT question_list FROM problems WHERE domain = 'dsa' AND question_list IS NOT NULL"
  ).all() as { question_list: string }[];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">DSA</h1>
        <Link
          href="/dsa/log"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <Plus size={16} /> Log Attempt
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 mb-6">
        <select name="pattern" defaultValue={sp.pattern ?? ''} className={selectCls}>
          <option value="">All patterns</option>
          {DSA_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
          {patterns.filter(p => !DSA_PATTERNS.includes(p.pattern_tag)).map(p => (
            <option key={p.pattern_tag} value={p.pattern_tag}>{p.pattern_tag}</option>
          ))}
        </select>
        <select name="list" defaultValue={sp.list ?? ''} className={selectCls}>
          <option value="">All lists</option>
          {['NeetCode 150', 'Blind 75', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}
          {lists.filter(l => !['NeetCode 150', 'Blind 75', 'Other'].includes(l.question_list)).map(l => (
            <option key={l.question_list} value={l.question_list}>{l.question_list}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 bg-surface-2 text-fg text-sm font-medium rounded-lg hover:bg-border transition-colors cursor-pointer">
          Filter
        </button>
        {(sp.pattern || sp.list) && (
          <Link href="/dsa" className="px-3 py-2 text-sm text-muted hover:text-fg">Clear</Link>
        )}
      </form>

      {withAvg.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No problems yet. Log your first attempt to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {withAvg.map(p => <ProblemListRow key={p.id} problem={p} basePath="/dsa" />)}
        </div>
      )}
    </div>
  );
}
