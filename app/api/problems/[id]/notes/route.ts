import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';
import { Note } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await queryAll<Note>(
    'SELECT * FROM notes WHERE problem_id = ? ORDER BY created_at ASC',
    [id],
  );
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { question, answer } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  const note = await queryOne<Note>(
    'INSERT INTO notes (problem_id, question, answer) VALUES (?, ?, ?) RETURNING *',
    [id, question.trim(), answer?.trim() ?? ''],
  );

  return NextResponse.json(note, { status: 201 });
}
