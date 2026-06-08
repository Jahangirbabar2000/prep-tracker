import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const db = getDb();

  // Count NEW problems first attempted today (exclude review-queue revisits)
  const rows = db.prepare(`
    SELECT p.domain, COUNT(DISTINCT a.problem_id) as count
    FROM attempts a
    JOIN problems p ON p.id = a.problem_id
    WHERE substr(a.attempted_at, 1, 10) = date('now', 'localtime')
      AND NOT EXISTS (
        SELECT 1 FROM attempts prev
        WHERE prev.problem_id = a.problem_id
          AND substr(prev.attempted_at, 1, 10) < date('now', 'localtime')
      )
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
