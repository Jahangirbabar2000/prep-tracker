import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { normalizeDomainSlug } from '@/lib/domains';
import type { DomainField, DomainFieldKind, DomainFieldTagRole, StudyDomain } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domain = await queryOne<StudyDomain>('SELECT * FROM study_domains WHERE id = ?', [id]);
  if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

  const body = await req.json();
  const label = String(body.label ?? '').trim();
  const kind = String(body.kind ?? 'select') as DomainFieldKind;
  const tagRole = String(body.tag_role ?? 'none') as DomainFieldTagRole;
  const key = normalizeDomainSlug(String(body.key ?? label)).replaceAll('-', '_');
  if (!label || !key) return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  if (!['text', 'select'].includes(kind)) return NextResponse.json({ error: 'Invalid field kind' }, { status: 400 });
  if (!['none', 'primary', 'secondary'].includes(tagRole)) {
    return NextResponse.json({ error: 'Invalid tag role' }, { status: 400 });
  }
  if (tagRole !== 'none') {
    const conflict = await queryOne<{ id: number }>(
      'SELECT id FROM domain_fields WHERE domain_id = ? AND tag_role = ? AND archived_at IS NULL',
      [id, tagRole],
    );
    if (conflict) return NextResponse.json({ error: `A ${tagRole} tag field already exists` }, { status: 409 });
  }
  const max = await queryOne<{ value: number | null }>(
    'SELECT MAX(sort_order) AS value FROM domain_fields WHERE domain_id = ?',
    [id],
  );
  try {
    const field = await queryOne<DomainField>(
      `INSERT INTO domain_fields
        (domain_id, key, label, kind, placeholder, filterable, tag_role, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        id, key, label, kind, String(body.placeholder ?? '').trim(),
        body.filterable ? 1 : 0, tagRole, (max?.value ?? -1) + 1,
      ],
    );
    return NextResponse.json(field, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A field with that key already exists' }, { status: 409 });
  }
}
