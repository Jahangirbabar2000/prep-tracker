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

function sortClause(sort: string) {
  if (sort === 'next_review') return 'ORDER BY next_due_date ASC NULLS LAST, created_at DESC';
  if (sort === 'oldest') return 'ORDER BY created_at ASC';
  return 'ORDER BY created_at DESC';
}

export default async function SystemDesignPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const today = localToday();

  let query = "SELECT *, (SELECT COUNT(*) FROM attempts WHERE problem_id = problems.id) AS attempt_count FROM problems WHERE domain = 'system_design'";
  const params: string[] = [];
  if (sp.bucket)      { query += ' AND sd_category = ?'; params.push(sp.bucket); }
  if (sp.topic)       { query += ' AND sd_topic = ?';    params.push(sp.topic); }
  if (sp.proficiency) query += proficiencyClause(sp.proficiency);
  query += ' ' + sortClause(sp.sort ?? '');

  const [problems, todayRow, sdCategories, sdTopics] = await Promise.all([
    queryAll<Problem>(query, params),
    queryOne<{ n: number }>(`
      SELECT COUNT(DISTINCT a.problem_id) as n
      FROM attempts a
      JOIN problems p ON p.id = a.problem_id
      WHERE p.domain = 'system_design'
        AND substr(a.attempted_at, 1, 10) = ?
        AND NOT EXISTS (
          SELECT 1 FROM attempts prev
          WHERE prev.problem_id = a.problem_id
            AND substr(prev.attempted_at, 1, 10) < ?
        )
    `, [today, today]),
    getConfigOptions('system_design', 'sd_category'),
    getConfigOptions('system_design', 'sd_topic'),
  ]);

  const todayCount = todayRow?.n ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">System Design</h1>
          <span className="text-sm text-muted">
            <span className="font-semibold text-fg tabular">{problems.length}</span> total
          </span>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              · <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <LogShortcut href="/system-design/log" />
        <Link href="/system-design/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Question <span className="opacity-50 font-normal text-xs ml-0.5">L</span>
        </Link>
      </div>

      <DomainFilters
        basePath="/system-design"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'bucket',      placeholder: 'All buckets', current: sp.bucket      ?? '', options: sdCategories },
          { key: 'topic',       placeholder: 'All topics',  current: sp.topic       ?? '', options: sdTopics },
          { key: 'proficiency', placeholder: 'All levels',  current: sp.proficiency ?? '', options: PROFICIENCY_OPTIONS },
        ]}
      />

      {problems.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No concepts yet. Log your first concept to get started.</p>
      ) : (
        <ProblemList problems={problems} basePath="/system-design" groupByDate={(sp.sort ?? '') !== 'next_review'} />
      )}
    </div>
  );
}
