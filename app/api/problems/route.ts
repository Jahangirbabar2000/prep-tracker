import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const pattern = searchParams.get('pattern');
  const bucket = searchParams.get('bucket');
  const questionSet = searchParams.get('question_set');
  const questionList = searchParams.get('question_list');

  let query = 'SELECT * FROM problems WHERE 1=1';
  const params: (string | number)[] = [];

  if (domain) { query += ' AND domain = ?'; params.push(domain); }
  if (pattern) { query += ' AND pattern_tag = ?'; params.push(pattern); }
  if (bucket) { query += ' AND fe_bucket = ?'; params.push(bucket); }
  if (questionSet) { query += ' AND fe_question_set = ?'; params.push(questionSet); }
  if (questionList) { query += ' AND question_list = ?'; params.push(questionList); }

  query += ' ORDER BY next_due_date ASC NULLS LAST, created_at DESC';

  const problems = db.prepare(query).all(...params) as Problem[];
  return NextResponse.json(problems);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { name, domain } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }

  const result = db.prepare(
    "INSERT INTO problems (name, domain, created_at) VALUES (?, ?, datetime('now', 'localtime')) RETURNING *"
  ).get(name.trim(), domain) as Problem;

  return NextResponse.json(result, { status: 201 });
}
