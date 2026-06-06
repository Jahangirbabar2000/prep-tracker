import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';

export const dynamic = 'force-dynamic';

const selectCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

export default async function FrontendPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const db = getDb();

  let query = "SELECT * FROM problems WHERE domain = 'frontend'";
  const params: string[] = [];
  if (sp.bucket) { query += ' AND fe_bucket = ?'; params.push(sp.bucket); }
  if (sp.set) { query += ' AND fe_question_set = ?'; params.push(sp.set); }
  query += ' ORDER BY next_due_date ASC NULLS LAST, created_at DESC';

  const problems = db.prepare(query).all(...params) as Problem[];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Frontend</h1>
        <Link href="/frontend/log" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> Log Attempt
        </Link>
      </div>

      <form className="flex flex-wrap gap-2 mb-6">
        <select name="bucket" defaultValue={sp.bucket ?? ''} className={selectCls}>
          <option value="">All buckets</option>
          {['JS Quirks', 'React Internals', 'Component Building'].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select name="set" defaultValue={sp.set ?? ''} className={selectCls}>
          <option value="">All sets</option>
          {['React 100', 'JS 500', 'Frontend 75', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="px-4 py-2 bg-surface-2 text-fg text-sm font-medium rounded-lg hover:bg-border transition-colors cursor-pointer">Filter</button>
        {(sp.bucket || sp.set) && <Link href="/frontend" className="px-3 py-2 text-sm text-muted hover:text-fg">Clear</Link>}
      </form>

      {problems.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No questions yet. Log your first attempt to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {problems.map(p => <ProblemListRow key={p.id} problem={p} basePath="/frontend" />)}
        </div>
      )}
    </div>
  );
}
