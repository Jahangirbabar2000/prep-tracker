import { queryAll, queryOne, localToday } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import DomainPageClient, { DomainFilterConfig } from '@/components/DomainPageClient';
import LogShortcut from '@/components/LogShortcut';

export const dynamic = 'force-dynamic';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'bucket', placeholder: 'All buckets', field: 'sd_category' },
  { key: 'topic',  placeholder: 'All topics',  field: 'sd_topic'    },
];

export default async function SystemDesignPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const today = localToday();

  const [problems, todayRow] = await Promise.all([
    queryAll<Problem>(`
      SELECT *, (SELECT COUNT(*) FROM attempts WHERE problem_id = problems.id) AS attempt_count
      FROM problems WHERE domain = 'system_design' ORDER BY created_at DESC
    `),
    queryOne<{ n: number }>(`
      SELECT COUNT(DISTINCT a.problem_id) as n
      FROM attempts a JOIN problems p ON p.id = a.problem_id
      WHERE p.domain = 'system_design'
        AND substr(a.attempted_at, 1, 10) = ?
        AND NOT EXISTS (
          SELECT 1 FROM attempts prev
          WHERE prev.problem_id = a.problem_id
            AND substr(prev.attempted_at, 1, 10) < ?
        )
    `, [today, today]),
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
        <Link href="/system-design/log" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Question <span className="opacity-50 font-normal text-xs ml-0.5">L</span>
        </Link>
      </div>

      <DomainPageClient
        allProblems={problems}
        basePath="/system-design"
        filterConfigs={FILTER_CONFIGS}
        initialParams={sp}
        emptyMessage="No concepts yet. Log your first concept to get started."
      />
    </div>
  );
}
