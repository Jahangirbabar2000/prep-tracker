import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryAll, execute } from '@/lib/db';
import { replaySchedule } from '@/lib/sr';
import { Attempt } from '@/lib/types';

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

  // Recompute from the full history — editing an old attempt must be able to
  // demote/promote, which a single-transition update can't do.
  const all = await queryAll<Attempt>('SELECT id, struggled, attempted_at FROM attempts WHERE problem_id = ?', [attempt.problem_id]);
  const { level, nextDueDate } = replaySchedule(all);
  await execute(
    'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
    [level, nextDueDate, attempt.problem_id],
  );

  const updated = await queryOne<Attempt>('SELECT * FROM attempts WHERE id = ?', [id]);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const attempt = await queryOne<Attempt>('SELECT * FROM attempts WHERE id = ?', [id]);
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await execute('DELETE FROM attempts WHERE id = ?', [id]);

  // Replay the remaining attempts (empty history → level 0 / no due date).
  const all = await queryAll<Attempt>('SELECT id, struggled, attempted_at FROM attempts WHERE problem_id = ?', [attempt.problem_id]);
  const { level, nextDueDate } = replaySchedule(all);
  await execute(
    'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
    [level, nextDueDate, attempt.problem_id],
  );

  return NextResponse.json({ ok: true });
}
