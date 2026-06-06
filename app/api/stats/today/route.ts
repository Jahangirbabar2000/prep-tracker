import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const db = getDb();

  // Count attempts logged today (comparing stored local-date string with today's local date)
  const rows = db.prepare(`
    SELECT p.domain, COUNT(*) as count
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE substr(a.attempted_at, 1, 10) = date('now', 'localtime')
    GROUP BY p.domain
  `).all() as { domain: string; count: number }[];

  const counts: Record<string, number> = {
    dsa: 0,
    system_design: 0,
    frontend: 0,
    python: 0,
  };
  for (const row of rows) {
    counts[row.domain] = row.count;
  }

  return NextResponse.json(counts);
}
