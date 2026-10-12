import { NextResponse } from 'next/server';
import { queryOne, queryAll, execute } from '@/lib/db';
import { Attempt, Link, Note } from '@/lib/types';
import { withUser } from '@/lib/currentUser';
import { getProblem, validateProblemMetadata, legacyWrites } from '@/lib/domain-server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;

  const problem = await getProblem(userId, id);
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // The domain is the user's own (the problem is), so prev/next/position stay
  // within their deck without another user_id filter on each query.
  const [attempts, notes, links, prevRow, nextRow, totalRow, newerRow] = await Promise.all([
    queryAll<Attempt>('SELECT * FROM attempts WHERE problem_id = ? AND user_id = ? ORDER BY attempted_at DESC', [id, userId]),
    queryAll<Note>('SELECT * FROM notes WHERE problem_id = ? AND user_id = ? ORDER BY created_at ASC', [id, userId]),
    queryAll<Link>('SELECT * FROM links WHERE problem_id = ? AND user_id = ? ORDER BY created_at ASC', [id, userId]),
    queryOne<{ id: number }>('SELECT id FROM problems WHERE user_id = ? AND domain = ? AND id < ? ORDER BY id DESC LIMIT 1', [userId, problem.domain, id]),
    queryOne<{ id: number }>('SELECT id FROM problems WHERE user_id = ? AND domain = ? AND id > ? ORDER BY id ASC LIMIT 1', [userId, problem.domain, id]),
    queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM problems WHERE user_id = ? AND domain = ?', [userId, problem.domain]),
    queryOne<{ newer_count: number }>('SELECT COUNT(*) AS newer_count FROM problems WHERE user_id = ? AND domain = ? AND id > ?', [userId, problem.domain, id]),
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
});

export const PATCH = withUser(async (req, userId, { params }: Ctx) => {
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

  const problem = await getProblem(userId, id);
  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields = Object.keys(body).filter(k => allowed.includes(k));
  let mergedMetadata = problem.metadata;
  const metadataFields = await queryAll<import('@/lib/types').DomainField>(
    'SELECT * FROM domain_fields WHERE domain_id = ? AND user_id = ? AND archived_at IS NULL',
    [problem.domain, userId],
  );
  const legacyMetadata = Object.fromEntries(
    metadataFields
      .filter(field => field.legacy_column && Object.hasOwn(body, field.legacy_column))
      .map(field => [field.key, body[field.legacy_column!]]),
  ) as Record<string, unknown>;
  let metadataPatch: Record<string, unknown> = legacyMetadata;
  if (body.metadata !== undefined) {
    const validated = await validateProblemMetadata(userId, problem.domain, body.metadata);
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    metadataPatch = { ...legacyMetadata, ...(body.metadata as Record<string, unknown>) };
    mergedMetadata = { ...problem.metadata, ...validated.metadata };
    for (const [key, value] of Object.entries(metadataPatch)) {
      if (value === '' || value == null) delete mergedMetadata[key];
      else mergedMetadata[key] = String(value).trim();
    }
  } else if (Object.keys(legacyMetadata).length) {
    mergedMetadata = { ...problem.metadata };
    for (const [key, value] of Object.entries(legacyMetadata)) {
      if (value === '' || value == null) delete mergedMetadata[key];
      else mergedMetadata[key] = String(value).trim();
    }
  }
  const hasMetadataUpdate = body.metadata !== undefined || Object.keys(legacyMetadata).length > 0;
  if (!fields.length && !hasMetadataUpdate) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const writes = !hasMetadataUpdate ? [] : legacyWrites(
    Object.fromEntries(Object.keys(metadataPatch).map(key => [key, mergedMetadata[key] ?? ''])),
    metadataFields,
  );
  const assignments = [
    ...fields.map(field => ({ column: field, value: body[field] })),
    ...(!hasMetadataUpdate ? [] : [{ column: 'metadata_json', value: JSON.stringify(mergedMetadata) }]),
    ...writes,
  ];
  const deduped = [...new Map(assignments.map(item => [item.column, item])).values()];
  const setClause = deduped.map(item => `${item.column} = ?`).join(', ');
  const values = deduped.map(item => item.value);

  await execute(`UPDATE problems SET ${setClause} WHERE id = ? AND user_id = ?`, [...values, id, userId]);
  const updated = await getProblem(userId, id);
  return NextResponse.json(updated);
});

export const DELETE = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;
  // Idempotent, so an offline-queue retry of a delete that landed still
  // succeeds; scoped, so it can only ever remove the caller's own row.
  await execute('DELETE FROM problems WHERE id = ? AND user_id = ?', [id, userId]);
  return NextResponse.json({ ok: true });
});
