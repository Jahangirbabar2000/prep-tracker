import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, localNow } from '@/lib/db';
import { Problem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
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

  const problems = await queryAll<Problem>(query, params);
  return NextResponse.json(problems);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, domain } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }

  const result = await queryOne<Problem>(
    'INSERT INTO problems (name, domain, created_at) VALUES (?, ?, ?) RETURNING *',
    [name.trim(), domain, localNow()],
  );

  return NextResponse.json(result, { status: 201 });
}
