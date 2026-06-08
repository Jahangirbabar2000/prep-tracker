import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';
import DomainFilters from '@/components/DomainFilters';

export const dynamic = 'force-dynamic';

const DSA_PATTERNS = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search',
  'Linked List', 'Trees', 'Tries', 'Backtracking', 'Heap / Priority Queue',
  'Graphs', 'Depth-First Search', 'Breadth-First Search', 'Dynamic Programming',
  'Greedy', 'Intervals', 'Prefix Sum', 'Matrices', 'Math & Geometry',
];

function sortClause(sort: string) {
  if (sort === 'next_review') return 'ORDER BY next_due_date ASC NULLS LAST, created_at DESC';
  if (sort === 'oldest') return 'ORDER BY created_at ASC';
  return 'ORDER BY created_at DESC'; // default: newest first
}

export default async function DSAPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'dsa'";
  const params: string[] = [];
  if (sp.pattern)    { query += ' AND pattern_tag = ?';   params.push(sp.pattern); }
  if (sp.list)       { query += ' AND question_list = ?'; params.push(sp.list); }
  if (sp.difficulty) { query += ' AND difficulty = ?';    params.push(sp.difficulty); }
  query += ' ' + sortClause(sp.sort ?? '');

  const problems = db.prepare(query).all(...params) as Problem[];
  const withAvg = problems.map(p => {
    const rows = db.prepare('SELECT time_taken_mins FROM attempts WHERE problem_id = ?').all(p.id) as { time_taken_mins: number }[];
    const avg = rows.length ? Math.round(rows.reduce((s, a) => s + a.time_taken_mins, 0) / rows.length) : null;
    return { ...p, avg_time: avg };
  });

  const allPatterns = db.prepare(
    "SELECT DISTINCT pattern_tag FROM problems WHERE domain = 'dsa' AND pattern_tag IS NOT NULL"
  ).all() as { pattern_tag: string }[];
  const extraPatterns = allPatterns.filter(p => !DSA_PATTERNS.includes(p.pattern_tag)).map(p => p.pattern_tag);

  const todayCount = (db.prepare(`
    SELECT COUNT(*) as n FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE p.domain = 'dsa'
    AND substr(a.attempted_at, 1, 10) = date('now', 'localtime')
  `).get() as { n: number }).n;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">DSA</h1>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <Link href="/dsa/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Attempt
        </Link>
      </div>

      <DomainFilters
        basePath="/dsa"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'difficulty', placeholder: 'All difficulties', current: sp.difficulty ?? '', options: ['Easy', 'Medium', 'Hard'] },
          { key: 'pattern',    placeholder: 'All patterns',     current: sp.pattern    ?? '', options: [...DSA_PATTERNS, ...extraPatterns] },
          { key: 'list',       placeholder: 'All lists',        current: sp.list       ?? '', options: ['NeetCode 150', 'Blind 75', 'Other'] },
        ]}
      />

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
