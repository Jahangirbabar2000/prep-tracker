import { NextResponse } from 'next/server';
import { writeTransaction, type Queries } from '@/lib/db';
import { withUser } from '@/lib/currentUser';
import { replaySchedule } from '@/lib/sr';
import { Attempt } from '@/lib/types';

export const runtime = 'nodejs';

/** Recompute a problem's SR state from its full history — editing or deleting an
 *  old attempt must be able to demote/promote, which a single-transition update
 *  can't do. Runs inside the caller's transaction so the attempt change and the
 *  level derived from it commit together. */
async function replayProblem(tx: Queries, userId: string, problemId: number) {
  const all = await tx.queryAll<Attempt>(
    'SELECT id, struggled, attempted_at FROM attempts WHERE problem_id = ? AND user_id = ?',
    [problemId, userId],
  );
  const { level, nextDueDate } = replaySchedule(all);
  await tx.execute(
    'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ? AND user_id = ?',
    [level, nextDueDate, problemId, userId],
  );
}

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser(async (req, userId, { params }: Ctx) => {
  const { id } = await params;
  const body = await req.json();

  const updated = await writeTransaction(async tx => {
    const attempt = await tx.queryOne<Attempt>('SELECT * FROM attempts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!attempt) return null;

    const fields: Record<string, string | number> = {};
    if (body.time_taken_mins !== undefined) fields.time_taken_mins = body.time_taken_mins;
    if (body.struggled !== undefined) fields.struggled = body.struggled ? 1 : 0;
    if (body.attempted_at !== undefined) {
      // The edit form sends only a date (and sends it on every save), so keep
      // the attempt's time of day. Resetting it to midnight would reorder it
      // ahead of earlier attempts that day, and the level replays in that order.
      const time = String(attempt.attempted_at).slice(11, 19) || '00:00:00';
      fields.attempted_at = `${String(body.attempted_at).slice(0, 10)} ${time}`;
    }
    if (body.practice_type !== undefined) fields.practice_type = body.practice_type;

    if (Object.keys(fields).length) {
      const setClause = Object.keys(fields).map(f => `${f} = ?`).join(', ');
      await tx.execute(`UPDATE attempts SET ${setClause} WHERE id = ? AND user_id = ?`, [...Object.values(fields), id, userId]);
    }
    await replayProblem(tx, userId, attempt.problem_id);
    return tx.queryOne<Attempt>('SELECT * FROM attempts WHERE id = ? AND user_id = ?', [id, userId]);
  });

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

export const DELETE = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;

  const deleted = await writeTransaction(async tx => {
    const attempt = await tx.queryOne<Attempt>('SELECT * FROM attempts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!attempt) return false;

    await tx.execute('DELETE FROM attempts WHERE id = ? AND user_id = ?', [id, userId]);
    // Replay the remaining attempts (empty history → level 0 / no due date).
    await replayProblem(tx, userId, attempt.problem_id);
    return true;
  });

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
