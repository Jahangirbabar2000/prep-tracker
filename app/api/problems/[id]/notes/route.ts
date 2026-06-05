import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Note } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const notes = db.prepare(
    'SELECT * FROM notes WHERE problem_id = ? ORDER BY created_at ASC'
  ).all(id) as Note[];
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const { question, answer } = await req.json();

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'question and answer are required' }, { status: 400 });
  }

  const note = db.prepare(
    'INSERT INTO notes (problem_id, question, answer) VALUES (?, ?, ?) RETURNING *'
  ).get(id, question.trim(), answer.trim()) as Note;

  return NextResponse.json(note, { status: 201 });
}
