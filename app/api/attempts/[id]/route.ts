import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { computeNextDue } from '@/lib/sr';
import { Attempt, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const attempt = await queryOne<Attempt>('SELECT * FROM attempts WHERE id = ?', [id]);
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: Record<string, string | number> = {};
  if (body.time_taken_mins !== undefined) fields.time_taken_mins = body.time_taken_mins;
  if (body.struggled !== undefined) fields.struggled = body.struggled ? 1 : 0;
  if (body.attempted_at !== undefined) {
    fields.attempted_at = `${String(body.attempted_at).slice(0, 10)} 00:00:00`;
  }
  if (body.practice_type !== undefined) fields.practice_type = body.practice_type;

  if (Object.keys(fields).length) {
    const setClause = Object.keys(fields).map(f => `${f} = ?`).join(', ');
    await execute(`UPDATE attempts SET ${setClause} WHERE id = ?`, [...Object.values(fields), id]);
  }

  const [latest, problem] = await Promise.all([
    queryOne<Attempt>('SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC LIMIT 1', [attempt.problem_id]),
    queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [attempt.problem_id]),
  ]);

  if (latest && problem) {
    const { newLevel, nextDueDate } = computeNextDue(
      !!latest.struggled,
      problem.interval_level,
      new Date(`${String(latest.attempted_at).slice(0, 10)}T12:00:00`),
    );
    await execute(
      'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
      [newLevel, nextDueDate, attempt.problem_id],
    );
  }

  const updated = await queryOne<Attempt>('SELECT * FROM attempts WHERE id = ?', [id]);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const attempt = await queryOne<Attempt>('SELECT * FROM attempts WHERE id = ?', [id]);
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await execute('DELETE FROM attempts WHERE id = ?', [id]);

  const latest = await queryOne<Attempt>(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC LIMIT 1',
    [attempt.problem_id],
  );

  if (latest) {
    const problem = await queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [attempt.problem_id]);
    if (problem) {
      const { newLevel, nextDueDate } = computeNextDue(
        !!latest.struggled,
        problem.interval_level,
        new Date(`${String(latest.attempted_at).slice(0, 10)}T12:00:00`),
      );
      await execute(
        'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
        [newLevel, nextDueDate, attempt.problem_id],
      );
    }
  } else {
    await execute(
      'UPDATE problems SET interval_level = 0, next_due_date = NULL WHERE id = ?',
      [attempt.problem_id],
    );
  }

  return NextResponse.json({ ok: true });
}
