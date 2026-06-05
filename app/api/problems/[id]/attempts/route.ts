import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computeNextDue } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const attempts = db.prepare(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC'
  ).all(id) as Attempt[];
  return NextResponse.json(attempts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const { time_taken_mins, struggled, practice_type, attempted_at } = body;
  if (time_taken_mins === undefined || struggled === undefined) {
    return NextResponse.json({ error: 'time_taken_mins and struggled are required' }, { status: 400 });
  }

  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id) as Problem | undefined;
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const attemptDate = attempted_at ? new Date(attempted_at) : new Date();
  const attemptedAtStr = attemptDate.toISOString().slice(0, 19).replace('T', ' ');

  const attempt = db.prepare(
    `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).get(id, attemptedAtStr, time_taken_mins, struggled ? 1 : 0, practice_type ?? null) as Attempt;

  const { newLevel, nextDueDate } = computeNextDue(!!struggled, problem.interval_level, attemptDate);
  db.prepare('UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?')
    .run(newLevel, nextDueDate, id);

  return NextResponse.json(attempt, { status: 201 });
}
