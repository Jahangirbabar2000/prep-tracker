import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryAll, execute } from '@/lib/db';
import { Attempt, Link, Note, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const problem = await queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [id]);
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [attempts, notes, links, prevRow, nextRow, totalRow, newerRow] = await Promise.all([
    queryAll<Attempt>('SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC', [id]),
    queryAll<Note>('SELECT * FROM notes WHERE problem_id = ? ORDER BY created_at ASC', [id]),
    queryAll<Link>('SELECT * FROM links WHERE problem_id = ? ORDER BY created_at ASC', [id]),
    queryOne<{ id: number }>('SELECT id FROM problems WHERE domain = ? AND id < ? ORDER BY id DESC LIMIT 1', [problem.domain, id]),
    queryOne<{ id: number }>('SELECT id FROM problems WHERE domain = ? AND id > ? ORDER BY id ASC LIMIT 1', [problem.domain, id]),
    queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM problems WHERE domain = ?', [problem.domain]),
    queryOne<{ newer_count: number }>('SELECT COUNT(*) AS newer_count FROM problems WHERE domain = ? AND id > ?', [problem.domain, id]),
  ]);

  const avgTime = attempts.length
    ? attempts.reduce((s, a) => s + a.time_taken_mins, 0) / attempts.length
    : null;

  return NextResponse.json({
    ...problem,
    attempts,
    notes,
    links,
    avg_time: avgTime,
    prev_id: prevRow?.id ?? null,
    next_id: nextRow?.id ?? null,
    position: (newerRow?.newer_count ?? 0) + 1,
    total: totalRow?.total ?? 0,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    'name', 'platform', 'pattern_tag', 'question_list', 'difficulty',
    'sd_category', 'sd_topic', 'sd_source',
    'fe_bucket', 'fe_question_set',
    'py_category',
    'ai_category',
    'lld_category', 'lld_topic',
    'beh_category',
    'resource_url', 'notes_text',
  ];

  const fields = Object.keys(body).filter(k => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);

  await execute(`UPDATE problems SET ${setClause} WHERE id = ?`, [...values, id]);
  const updated = await queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [id]);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await execute('DELETE FROM problems WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
