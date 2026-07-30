import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import type { DomainFieldOption } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await queryOne<DomainFieldOption>('SELECT * FROM domain_field_options WHERE id = ?', [id]);
  if (!existing) return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  const body = await req.json();
  const updates: Array<{ key: string; value: unknown }> = [];
  if ('value' in body) {
    const value = String(body.value ?? '').trim();
    if (!value) return NextResponse.json({ error: 'Value cannot be empty' }, { status: 400 });
    updates.push({ key: 'value', value });
  }
  if ('sort_order' in body) updates.push({ key: 'sort_order', value: Number(body.sort_order) });
  if ('archived' in body) updates.push({ key: 'archived_at', value: body.archived ? new Date().toISOString() : null });
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  try {
    await execute(
      `UPDATE domain_field_options SET ${updates.map(update => `${update.key} = ?`).join(', ')} WHERE id = ?`,
      [...updates.map(update => update.value), id],
    );
  } catch {
    return NextResponse.json({ error: 'That option already exists' }, { status: 409 });
  }
  return NextResponse.json(await queryOne<DomainFieldOption>('SELECT * FROM domain_field_options WHERE id = ?', [id]));
}
