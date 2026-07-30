import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, localNow } from '@/lib/db';
import { Problem } from '@/lib/types';
import { execute } from '@/lib/db';
import { getProblems, getStudyDomain, validateProblemMetadata, legacyWrites } from '@/lib/domain-server';

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

  const problems = await getProblems(query, params);
  return NextResponse.json(problems);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, domain, metadata: rawMetadata } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }

  const definition = await getStudyDomain(String(domain));
  if (!definition) return NextResponse.json({ error: 'Unknown domain' }, { status: 400 });
  if (definition.archived_at) return NextResponse.json({ error: 'Domain is archived' }, { status: 409 });
  const validated = await validateProblemMetadata(definition.id, rawMetadata ?? {});
  if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  const writes = legacyWrites(validated.metadata, validated.fields);
  const columns = ['name', 'domain', 'metadata_json', 'created_at', ...writes.map(write => write.column)];
  const placeholders = columns.map(() => '?').join(', ');
  const args = [name.trim(), definition.id, JSON.stringify(validated.metadata), localNow(), ...writes.map(write => write.value)];
  const result = await queryOne<Problem & { metadata_json?: string }>(
    `INSERT INTO problems (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    args,
  );

  return NextResponse.json(result ? { ...result, metadata: validated.metadata } : result, { status: 201 });
}
