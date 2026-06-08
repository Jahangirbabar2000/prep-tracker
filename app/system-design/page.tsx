import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';
import DomainFilters from '@/components/DomainFilters';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  'Caching', 'Databases', 'Messaging Queues', 'Load Balancing', 'Sharding',
  'API Design', 'Storage', 'Microservices', 'Consistency & Replication', 'Rate Limiting',
];
const SOURCES = ['Hello Interview', 'Grokking', 'Alex Xu', 'YouTube', 'Other'];

function sortClause(sort: string) {
  if (sort === 'next_review') return 'ORDER BY next_due_date ASC NULLS LAST, created_at DESC';
  if (sort === 'oldest') return 'ORDER BY created_at ASC';
  return 'ORDER BY created_at DESC'; // default: newest first
}

export default async function SystemDesignPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'system_design'";
  const params: string[] = [];
  if (sp.category) { query += ' AND sd_category = ?'; params.push(sp.category); }
  if (sp.source)   { query += ' AND sd_source = ?';   params.push(sp.source); }
  query += ' ' + sortClause(sp.sort ?? '');

  const problems = db.prepare(query).all(...params) as Problem[];

  const todayCount = (db.prepare(`
    SELECT COUNT(*) as n FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE p.domain = 'system_design'
    AND substr(a.attempted_at, 1, 10) = date('now', 'localtime')
  `).get() as { n: number }).n;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">System Design</h1>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <Link href="/system-design/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Concept
        </Link>
      </div>

      <DomainFilters
        basePath="/system-design"
        currentSort={sp.sort ?? ''}
        selects={[
          { key: 'category', placeholder: 'All categories', current: sp.category ?? '', options: CATEGORIES },
          { key: 'source',   placeholder: 'All sources',    current: sp.source   ?? '', options: SOURCES },
        ]}
      />

      {problems.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No concepts yet. Log your first concept to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {problems.map(p => <ProblemListRow key={p.id} problem={p} basePath="/system-design" />)}
        </div>
      )}
    </div>
  );
}
