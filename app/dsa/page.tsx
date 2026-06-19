import { queryAll, queryOne, localToday } from '@/lib/db';
import { getConfigOptions } from '@/lib/config-options';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemList from '@/components/ProblemList';
import DomainFilters from '@/components/DomainFilters';
import LogShortcut from '@/components/LogShortcut';
import { proficiencyClause, PROFICIENCY_OPTIONS } from '@/lib/filters';

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
  return 'ORDER BY created_at DESC';
}

export default async function DSAPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const today = localToday();

  let query = "SELECT *, (SELECT COUNT(*) FROM attempts WHERE problem_id = problems.id) AS attempt_count FROM problems WHERE domain = 'dsa'";
  const params: string[] = [];
  if (sp.pattern)    { query += ' AND pattern_tag = ?';   params.push(sp.pattern); }
  if (sp.list)       { query += ' AND question_list = ?'; params.push(sp.list); }
  if (sp.difficulty) { query += ' AND difficulty = ?';    params.push(sp.difficulty); }
  if (sp.proficiency) query += proficiencyClause(sp.proficiency);
  query += ' ' + sortClause(sp.sort ?? '');

  const [problems, allPatterns, todayRow, dsaLists] = await Promise.all([
    queryAll<Problem>(query, params),
    queryAll<{ pattern_tag: string }>(
      "SELECT DISTINCT pattern_tag FROM problems WHERE domain = 'dsa' AND pattern_tag IS NOT NULL",
    ),
    queryOne<{ n: number }>(`
      SELECT COUNT(DISTINCT a.problem_id) as n
      FROM attempts a
      JOIN problems p ON p.id = a.problem_id
      WHERE p.domain = 'dsa'
        AND substr(a.attempted_at, 1, 10) = ?
        AND NOT EXISTS (
          SELECT 1 FROM attempts prev
          WHERE prev.problem_id = a.problem_id
            AND substr(prev.attempted_at, 1, 10) < ?
        )
    `, [today, today]),
    getConfigOptions('dsa', 'question_list'),
  ]);

  const withAvg = await Promise.all(problems.map(async p => {
    const rows = await queryAll<{ time_taken_mins: number }>(
      'SELECT time_taken_mins FROM attempts WHERE problem_id = ?', [p.id],
    );
    const avg = rows.length ? Math.round(rows.reduce((s, a) => s + a.time_taken_mins, 0) / rows.length) : null;
    return { ...p, avg_time: avg };
  }));

  const extraPatterns = allPatterns.filter(p => !DSA_PATTERNS.includes(p.pattern_tag)).map(p => p.pattern_tag);
  const todayCount = todayRow?.n ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">DSA</h1>
          <span className="text-sm text-muted">
            <span className="font-semibold text-fg tabular">{withAvg.length}</span> total
          </span>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              · <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <LogShortcut href="/dsa/log" />
        <Link href="/dsa/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Attempt <span className="opacity-50 font-normal text-xs ml-0.5">L</span>
        </Link>
      </div>

      <DomainFilters
        basePath="/dsa"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'difficulty',  placeholder: 'All difficulties', current: sp.difficulty  ?? '', options: ['Easy', 'Medium', 'Hard'] },
          { key: 'pattern',     placeholder: 'All patterns',     current: sp.pattern    ?? '', options: [...DSA_PATTERNS, ...extraPatterns] },
          { key: 'list',        placeholder: 'All lists',        current: sp.list       ?? '', options: dsaLists },
          { key: 'proficiency', placeholder: 'All levels',       current: sp.proficiency ?? '', options: PROFICIENCY_OPTIONS },
        ]}
      />

      {withAvg.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No problems yet. Log your first attempt to get started.</p>
      ) : (
        <ProblemList problems={withAvg} basePath="/dsa" groupByDate={(sp.sort ?? '') !== 'next_review'} />
      )}
    </div>
  );
}
