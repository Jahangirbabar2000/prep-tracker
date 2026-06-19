import { NextResponse } from 'next/server';
import { queryAll, localToday } from '@/lib/db';
import { ReviewQueueItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  const today = localToday();

  const items = await queryAll<ReviewQueueItem>(`
    SELECT
      p.*,
      a.attempted_at   AS last_attempted_at,
      a.struggled      AS last_struggled,
      CAST(julianday(?) - julianday(p.next_due_date) AS INTEGER) AS days_overdue
    FROM problems p
    JOIN attempts a ON a.id = (
      SELECT id FROM attempts
      WHERE problem_id = p.id
      ORDER BY attempted_at DESC
      LIMIT 1
    )
    WHERE p.next_due_date <= ?
    ORDER BY p.next_due_date ASC
  `, [today, today]);

  return NextResponse.json(items);
}
