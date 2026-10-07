import { NextRequest, NextResponse } from 'next/server';
import { queryAll, writeTransaction, localToday, localNow } from '@/lib/db';
import { replaySchedule } from '@/lib/sr';
import { Attempt } from '@/lib/types';

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

  const { time_taken_mins, struggled, practice_type, attempted_at, client_id } = body;
  if (time_taken_mins === undefined || struggled === undefined) {
    return NextResponse.json({ error: 'time_taken_mins and struggled are required' }, { status: 400 });
  }
  // The idempotency key the offline write queue sends: one per logged attempt,
  // reused on every retry of it. Optional — the online log forms don't send one.
  if (client_id != null && (typeof client_id !== 'string' || client_id.length === 0 || client_id.length > 64)) {
    return NextResponse.json({ error: 'client_id must be a string of 1–64 characters' }, { status: 400 });
  }

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

  // The insert and the SR recompute commit together: a crash between them can't
  // leave an attempt the card's schedule doesn't reflect, and two requests for
  // the same card can't each replay a history missing the other's attempt.
  const result = await writeTransaction(async tx => {
    const problem = await tx.queryOne<{ id: number }>('SELECT id FROM problems WHERE id = ?', [id]);
    if (!problem) return { status: 404 as const };

    const inserted = await tx.queryOne<Attempt>(
      `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type, client_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_id) DO NOTHING
       RETURNING *`,
      [id, attemptedAtStr, time_taken_mins, struggled ? 1 : 0, practice_type ?? null, client_id ?? null],
    );

    if (!inserted) {
      // A retry of an attempt we already recorded (the first response never
      // made it back). Hand back the stored row rather than inserting it twice,
      // which would also step the card's level twice.
      const existing = await tx.queryOne<Attempt>('SELECT * FROM attempts WHERE client_id = ?', [client_id]);
      if (!existing || existing.problem_id !== problem.id) return { status: 409 as const };
      return { status: 200 as const, attempt: existing };
    }

    // Replay the whole history from level 0 so a backfilled/out-of-order date can't drift the level.
    const all = await tx.queryAll<Attempt>('SELECT id, struggled, attempted_at FROM attempts WHERE problem_id = ?', [id]);
    const { level, nextDueDate } = replaySchedule(all);
    await tx.execute(
      'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
      [level, nextDueDate, id],
    );
    return { status: 201 as const, attempt: inserted };
  });

  if (result.status === 404) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result.status === 409) {
    return NextResponse.json({ error: 'client_id already used for a different attempt' }, { status: 409 });
  }
  return NextResponse.json(result.attempt, { status: result.status });
}
