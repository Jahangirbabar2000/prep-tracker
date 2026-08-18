import { NextResponse } from 'next/server';
import { queryAll, localToday } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const today = localToday();

  const [todayRows, dueRows] = await Promise.all([
    // "Added today" = created today. "Due now" = next_due_date has arrived,
    // with no attempt requirement. Both mirror todayStats() in lib/store/queries.ts.
    queryAll<{ domain: string; count: number }>(`
      SELECT domain, COUNT(*) as count
      FROM problems
      WHERE substr(created_at, 1, 10) = ?
      GROUP BY domain
    `, [today]),
    queryAll<{ domain: string; count: number }>(`
      SELECT domain, COUNT(*) as count
      FROM problems
      WHERE next_due_date IS NOT NULL AND next_due_date <= ?
      GROUP BY domain
    `, [today]),
  ]);

  const counts: Record<string, number> = { dsa: 0, system_design: 0, frontend: 0, python: 0, ai: 0, lld: 0, behavioral: 0 };
  for (const row of todayRows) counts[row.domain] = row.count;

  const due: Record<string, number> = { dsa: 0, system_design: 0, frontend: 0, python: 0, ai: 0, lld: 0, behavioral: 0 };
  for (const row of dueRows) due[row.domain] = row.count;

  return NextResponse.json({ counts, due });
}
