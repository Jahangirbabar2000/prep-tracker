import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute, localToday } from '@/lib/db';
import { computeNextDue } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attempts = await queryAll<Attempt>(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC',
    [id],
  );
  return NextResponse.json(attempts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { time_taken_mins, struggled, practice_type, attempted_at } = body;
  if (time_taken_mins === undefined || struggled === undefined) {
    return NextResponse.json({ error: 'time_taken_mins and struggled are required' }, { status: 400 });
  }

  const problem = await queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [id]);
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const dateStr = attempted_at ? String(attempted_at).slice(0, 10) : localToday();
  const attemptedAtStr = `${dateStr} 00:00:00`;
  const attemptDate = new Date(`${dateStr}T12:00:00`);

  const attempt = await queryOne<Attempt>(
    `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
    [id, attemptedAtStr, time_taken_mins, struggled ? 1 : 0, practice_type ?? null],
  );

  const { newLevel, nextDueDate } = computeNextDue(!!struggled, problem.interval_level, attemptDate);
  await execute(
    'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
    [newLevel, nextDueDate, id],
  );

  return NextResponse.json(attempt, { status: 201 });
}
