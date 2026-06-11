import { getDb } from '@/lib/db';
import { getConfigOptions } from '@/lib/config-options';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemList from '@/components/ProblemList';
import DomainFilters from '@/components/DomainFilters';

export const dynamic = 'force-dynamic';

function sortClause(sort: string) {
  if (sort === 'next_review') return 'ORDER BY next_due_date ASC NULLS LAST, created_at DESC';
  if (sort === 'oldest') return 'ORDER BY created_at ASC';
  return 'ORDER BY created_at DESC'; // default: newest first
}

export default async function FrontendPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'frontend'";
  const params: string[] = [];
  if (sp.bucket) { query += ' AND fe_bucket = ?'; params.push(sp.bucket); }
  if (sp.set)    { query += ' AND fe_question_set = ?'; params.push(sp.set); }
  query += ' ' + sortClause(sp.sort ?? '');

  const problems = db.prepare(query).all(...params) as Problem[];

  const todayCount = (db.prepare(`
    SELECT COUNT(DISTINCT a.problem_id) as n
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE p.domain = 'frontend'
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
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Frontend</h1>
          <span className="text-sm text-muted">
            <span className="font-semibold text-fg tabular">{problems.length}</span> total
          </span>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              · <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <Link href="/frontend/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Attempt
        </Link>
      </div>

      <DomainFilters
        basePath="/frontend"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'bucket', placeholder: 'All buckets', current: sp.bucket ?? '', options: getConfigOptions('frontend', 'fe_bucket') },
          { key: 'set',    placeholder: 'All sets',    current: sp.set    ?? '', options: getConfigOptions('frontend', 'fe_question_set') },
        ]}
      />

      {problems.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No questions yet. Log your first attempt to get started.</p>
      ) : (
        <ProblemList problems={problems} basePath="/frontend" groupByDate={(sp.sort ?? '') !== 'next_review'} />
      )}
    </div>
  );
}
