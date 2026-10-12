import { NextResponse } from 'next/server';
import { queryOne, localNow } from '@/lib/db';
import { Problem } from '@/lib/types';
import { withUser } from '@/lib/currentUser';
import { getProblems, getStudyDomain, validateProblemMetadata, legacyWrites } from '@/lib/domain-server';

export const runtime = 'nodejs';

export const GET = withUser(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const pattern = searchParams.get('pattern');
  const bucket = searchParams.get('bucket');
  const questionSet = searchParams.get('question_set');
  const questionList = searchParams.get('question_list');

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (domain) { where.push('domain = ?'); params.push(domain); }
  if (pattern) { where.push('pattern_tag = ?'); params.push(pattern); }
  if (bucket) { where.push('fe_bucket = ?'); params.push(bucket); }
  if (questionSet) { where.push('fe_question_set = ?'); params.push(questionSet); }
  if (questionList) { where.push('question_list = ?'); params.push(questionList); }

  const problems = await getProblems(userId, where.join(' AND '), params, 'next_due_date ASC NULLS LAST, created_at DESC');
  return NextResponse.json(problems);
});

export const POST = withUser(async (req, userId) => {
  const body = await req.json();
  const { name, domain, metadata: rawMetadata } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }

  const definition = await getStudyDomain(userId, String(domain));
  if (!definition) return NextResponse.json({ error: 'Unknown domain' }, { status: 400 });
  if (definition.archived_at) return NextResponse.json({ error: 'Domain is archived' }, { status: 409 });
  const validated = await validateProblemMetadata(userId, definition.id, rawMetadata ?? {});
  if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  const writes = legacyWrites(validated.metadata, validated.fields);
  const columns = ['user_id', 'name', 'domain', 'metadata_json', 'created_at', ...writes.map(write => write.column)];
  const placeholders = columns.map(() => '?').join(', ');
  const args = [userId, name.trim(), definition.id, JSON.stringify(validated.metadata), localNow(), ...writes.map(write => write.value)];
  const result = await queryOne<Problem & { metadata_json?: string }>(
    `INSERT INTO problems (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    args,
  );

  return NextResponse.json(result ? { ...result, metadata: validated.metadata } : result, { status: 201 });
});
