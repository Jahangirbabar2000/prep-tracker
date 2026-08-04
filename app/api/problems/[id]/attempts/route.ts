import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute, localToday, localNow } from '@/lib/db';
import { replaySchedule } from '@/lib/sr';
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

  // attempted_at may be a full "YYYY-MM-DD HH:MM:SS" (the write queue captures the
  // exact moment an attempt was logged, even offline) or just "YYYY-MM-DD" (log
  // forms, which default to today but also support backfilling a past date).
  const raw = attempted_at ? String(attempted_at) : localNow();
  const hasTime = raw.length > 10;
  const dateStr = raw.slice(0, 10);

  let attemptedAtStr: string;
  if (hasTime) {
    attemptedAtStr = raw;
  } else if (dateStr === localToday()) {
    attemptedAtStr = localNow(); // logged just now — record the real time
  } else {
    attemptedAtStr = `${dateStr} 00:00:00`; // backfilled past date — no time info available
  }

  const attempt = await queryOne<Attempt>(
    `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
    [id, attemptedAtStr, time_taken_mins, struggled ? 1 : 0, practice_type ?? null],
  );

  // Replay the whole history from level 0 so a backfilled/out-of-order date can't drift the level.
  const all = await queryAll<Attempt>('SELECT id, struggled, attempted_at FROM attempts WHERE problem_id = ?', [id]);
  const { level, nextDueDate } = replaySchedule(all);
  await execute(
    'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
    [level, nextDueDate, id],
  );

  return NextResponse.json(attempt, { status: 201 });
}
