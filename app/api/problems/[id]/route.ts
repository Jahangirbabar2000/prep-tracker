import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Attempt, Link, Note, Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;

  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id) as Problem | undefined;
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const attempts = db.prepare(
    'SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempted_at DESC'
  ).all(id) as Attempt[];

  const notes = db.prepare(
    'SELECT * FROM notes WHERE problem_id = ? ORDER BY created_at ASC'
  ).all(id) as Note[];

  const links = db.prepare(
    'SELECT * FROM links WHERE problem_id = ? ORDER BY created_at ASC'
  ).all(id) as Link[];

  const avgTime = attempts.length
    ? attempts.reduce((s, a) => s + a.time_taken_mins, 0) / attempts.length
    : null;

  const prevId = (db.prepare(
    'SELECT id FROM problems WHERE domain = ? AND id < ? ORDER BY id DESC LIMIT 1'
  ).get(problem.domain, id) as { id: number } | undefined)?.id ?? null;

  const nextId = (db.prepare(
    'SELECT id FROM problems WHERE domain = ? AND id > ? ORDER BY id ASC LIMIT 1'
  ).get(problem.domain, id) as { id: number } | undefined)?.id ?? null;

  // position: 1 = newest (highest id), N = oldest. Count how many in same domain have id > this one.
  const { total } = db.prepare(
    'SELECT COUNT(*) AS total FROM problems WHERE domain = ?'
  ).get(problem.domain) as { total: number };

  const { newer_count } = db.prepare(
    'SELECT COUNT(*) AS newer_count FROM problems WHERE domain = ? AND id > ?'
  ).get(problem.domain, id) as { newer_count: number };

  const position = newer_count + 1;

  return NextResponse.json({ ...problem, attempts, notes, links, avg_time: avgTime, prev_id: prevId, next_id: nextId, position, total });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    'name', 'platform', 'pattern_tag', 'question_list', 'difficulty',
    'sd_category', 'sd_topic', 'sd_source',
    'fe_bucket', 'fe_question_set',
    'py_category',
    'ai_category',
    'resource_url', 'notes_text',
  ];

  const fields = Object.keys(body).filter(k => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);

  db.prepare(`UPDATE problems SET ${setClause} WHERE id = ?`).run(...values, id);
  const updated = db.prepare('SELECT * FROM problems WHERE id = ?').get(id) as Problem;
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  db.prepare('DELETE FROM problems WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
