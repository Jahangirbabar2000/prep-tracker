import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computeNextDue } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as Attempt | undefined;
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: Record<string, string | number> = {};
  if (body.time_taken_mins !== undefined) fields.time_taken_mins = body.time_taken_mins;
  if (body.struggled !== undefined) fields.struggled = body.struggled ? 1 : 0;
  if (body.attempted_at !== undefined) {
    fields.attempted_at = new Date(body.attempted_at).toISOString().slice(0, 19).replace('T', ' ');
  }
  if (body.practice_type !== undefined) fields.practice_type = body.practice_type;

  if (Object.keys(fields).length) {
    const setClause = Object.keys(fields).map(f => `${f} = ?`).join(', ');
    db.prepare(`UPDATE attempts SET ${setClause} WHERE id = ?`).run(...Object.values(fields), id);
  }

  // Recompute SR from most recent attempt for this problem
  const latest = db.prepare(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC LIMIT 1'
  ).get(attempt.problem_id) as Attempt;

  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(attempt.problem_id) as Problem;
  const { newLevel, nextDueDate } = computeNextDue(
    !!latest.struggled,
    problem.interval_level,
    new Date(latest.attempted_at)
  );
  db.prepare('UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?')
    .run(newLevel, nextDueDate, attempt.problem_id);

  const updated = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as Attempt;
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;

  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as Attempt | undefined;
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM attempts WHERE id = ?').run(id);

  // Recompute SR from new latest attempt (or clear if none left)
  const latest = db.prepare(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC LIMIT 1'
  ).get(attempt.problem_id) as Attempt | undefined;

  if (latest) {
    const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(attempt.problem_id) as Problem;
    const { newLevel, nextDueDate } = computeNextDue(
      !!latest.struggled,
      problem.interval_level,
      new Date(latest.attempted_at)
    );
    db.prepare('UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?')
      .run(newLevel, nextDueDate, attempt.problem_id);
  } else {
    db.prepare('UPDATE problems SET interval_level = 0, next_due_date = NULL WHERE id = ?')
      .run(attempt.problem_id);
  }

  return NextResponse.json({ ok: true });
}
