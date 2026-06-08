import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';
import DomainFilters from '@/components/DomainFilters';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Language Quirks', 'stdlib', 'OOP', 'Concurrency', 'Other'];

function sortClause(sort: string) {
  if (sort === 'next_review') return 'ORDER BY next_due_date ASC NULLS LAST, created_at DESC';
  if (sort === 'oldest') return 'ORDER BY created_at ASC';
  return 'ORDER BY created_at DESC'; // default: newest first
}

export default async function PythonPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'python'";
  const params: string[] = [];
  if (sp.category) { query += ' AND py_category = ?';   params.push(sp.category); }
  if (sp.list)     { query += ' AND question_list = ?'; params.push(sp.list); }
  query += ' ' + sortClause(sp.sort ?? '');

  const problems = db.prepare(query).all(...params) as Problem[];

  const allLists = (db.prepare(
    "SELECT DISTINCT question_list FROM problems WHERE domain = 'python' AND question_list IS NOT NULL"
  ).all() as { question_list: string }[]).map(r => r.question_list);

  const todayCount = (db.prepare(`
    SELECT COUNT(DISTINCT a.problem_id) as n
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE p.domain = 'python'
      AND substr(a.attempted_at, 1, 10) = date('now', 'localtime')
      AND NOT EXISTS (
        SELECT 1 FROM attempts prev
        WHERE prev.problem_id = a.problem_id
          AND substr(prev.attempted_at, 1, 10) < date('now', 'localtime')
      )
  `).get() as { n: number }).n;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Python</h1>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <Link href="/python/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Question
        </Link>
      </div>

      <DomainFilters
        basePath="/python"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'list',     placeholder: 'All lists',       current: sp.list     ?? '', options: allLists },
          { key: 'category', placeholder: 'All categories',  current: sp.category ?? '', options: CATEGORIES },
        ]}
      />

      {problems.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No concepts yet. Log your first attempt to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {problems.map(p => <ProblemListRow key={p.id} problem={p} basePath="/python" />)}
        </div>
      )}
    </div>
  );
}
