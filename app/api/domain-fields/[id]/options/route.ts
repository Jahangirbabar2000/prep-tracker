import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { DomainField, DomainFieldOption } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = await queryOne<DomainField>('SELECT * FROM domain_fields WHERE id = ?', [id]);
  if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });
  if (field.kind !== 'select') return NextResponse.json({ error: 'Only select fields have options' }, { status: 409 });
  const body = await req.json();
  const value = String(body.value ?? '').trim();
  if (!value) return NextResponse.json({ error: 'Value is required' }, { status: 400 });
  const max = await queryOne<{ value: number | null }>(
    'SELECT MAX(sort_order) AS value FROM domain_field_options WHERE field_id = ?',
    [id],
  );
  try {
    const option = await queryOne<DomainFieldOption>(
      `INSERT INTO domain_field_options (field_id, value, sort_order)
       VALUES (?, ?, ?) RETURNING *`,
      [id, value, (max?.value ?? -1) + 1],
    );
    return NextResponse.json(option, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'That option already exists' }, { status: 409 });
  }
}
