import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';
import { withUser } from '@/lib/currentUser';
import { Note } from '@/lib/types';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;
  const notes = await queryAll<Note>(
    'SELECT * FROM notes WHERE problem_id = ? AND user_id = ? ORDER BY created_at ASC',
    [id, userId],
  );
  return NextResponse.json(notes);
});

export const POST = withUser(async (req, userId, { params }: Ctx) => {
  const { id } = await params;
  const { question, answer } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  // Only onto the caller's own card: the insert copies its user_id from it,
  // so a card id that isn't theirs inserts nothing.
  const note = await queryOne<Note>(
    `INSERT INTO notes (user_id, problem_id, question, answer)
     SELECT user_id, id, ?, ? FROM problems WHERE id = ? AND user_id = ?
     RETURNING *`,
    [question.trim(), answer?.trim() ?? '', id, userId],
  );
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(note, { status: 201 });
});
