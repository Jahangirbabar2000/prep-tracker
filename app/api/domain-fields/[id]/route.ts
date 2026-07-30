import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import type { DomainField } from '@/lib/types';

export const runtime = 'nodejs';

const EDITABLE = new Set(['label', 'placeholder', 'filterable', 'tag_role', 'sort_order']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await queryOne<DomainField>('SELECT * FROM domain_fields WHERE id = ?', [id]);
  if (!existing) return NextResponse.json({ error: 'Field not found' }, { status: 404 });
  const body = await req.json();
  if ('key' in body || 'kind' in body || 'domain_id' in body) {
    return NextResponse.json({ error: 'Field key, kind, and domain are immutable' }, { status: 400 });
  }
  if (body.tag_role && !['none', 'primary', 'secondary'].includes(body.tag_role)) {
    return NextResponse.json({ error: 'Invalid tag role' }, { status: 400 });
  }
  if (body.tag_role && body.tag_role !== 'none') {
    const conflict = await queryOne<{ id: number }>(
      `SELECT id FROM domain_fields
       WHERE domain_id = ? AND tag_role = ? AND archived_at IS NULL AND id <> ?`,
      [existing.domain_id, body.tag_role, id],
    );
    if (conflict) return NextResponse.json({ error: `A ${body.tag_role} tag field already exists` }, { status: 409 });
  }
  const updates = Object.entries(body)
    .filter(([key]) => EDITABLE.has(key))
    .map(([key, value]) => ({
      key,
      value: key === 'filterable' ? (value ? 1 : 0) : typeof value === 'string' ? value.trim() : value,
    }));
  if ('archived' in body) {
    updates.push({ key: 'archived_at', value: body.archived ? new Date().toISOString() : null });
  }
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  await execute(
    `UPDATE domain_fields SET ${updates.map(update => `${update.key} = ?`).join(', ')} WHERE id = ?`,
    [...updates.map(update => update.value), id],
  );
  return NextResponse.json(await queryOne<DomainField>('SELECT * FROM domain_fields WHERE id = ?', [id]));
}
